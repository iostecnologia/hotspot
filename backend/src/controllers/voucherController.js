const db = require("../../db");

// Gerar código de voucher único alfanumérico com 8 caracteres
function gerarCodigoUnico() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Listar vouchers da empresa
async function listarVouchers(req, res) {
  try {
    const [rows] = await db.execute(`
      SELECT v.*, p.nome AS plano_nome, m.nome AS mikrotik_nome
      FROM vouchers v
      JOIN planos p ON p.id = v.plano_id
      LEFT JOIN mikrotiks m ON m.id = p.mikrotik_id
      WHERE v.empresa_id = ?
      ORDER BY v.id DESC
    `, [req.empresa_id]);

    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar vouchers:", err);
    res.status(500).json({ message: "Erro ao listar vouchers" });
  }
}

// Gerar lote de vouchers
async function gerarVouchersLote(req, res) {
  const { plano_id, quantidade } = req.body;

  if (!plano_id || !quantidade || quantidade <= 0) {
    return res.status(400).json({ message: "Plano e quantidade válida são obrigatórios" });
  }

  try {
    // Verificar se o plano existe e pertence à empresa
    const [[plano]] = await db.execute(
      "SELECT id FROM planos WHERE id = ? AND empresa_id = ?",
      [plano_id, req.empresa_id]
    );

    if (!plano) {
      return res.status(404).json({ message: "Plano não encontrado" });
    }

    const insertData = [];
    const codigosGerados = new Set();

    for (let i = 0; i < quantidade; i++) {
      let code;
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 10) {
        code = gerarCodigoUnico();
        if (!codigosGerados.has(code)) {
          // Verificar no banco se o código já existe
          const [[row]] = await db.execute("SELECT id FROM vouchers WHERE codigo = ?", [code]);
          if (!row) {
            exists = false;
            codigosGerados.add(code);
          }
        }
        attempts++;
      }

      insertData.push([req.empresa_id, plano_id, code]);
    }

    if (insertData.length > 0) {
      await db.query(
        "INSERT INTO vouchers (empresa_id, plano_id, codigo) VALUES ?",
        [insertData]
      );
    }

    res.status(201).json({ message: `${insertData.length} vouchers gerados com sucesso` });
  } catch (err) {
    console.error("Erro ao gerar vouchers:", err);
    res.status(500).json({ message: "Erro ao gerar vouchers" });
  }
}

// Excluir voucher (e suas credenciais do RADIUS)
async function excluirVoucher(req, res) {
  const { id } = req.params;

  try {
    const [[voucher]] = await db.execute(
      "SELECT * FROM vouchers WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );

    if (!voucher) {
      return res.status(404).json({ message: "Voucher não encontrado" });
    }

    // Excluir do banco local
    await db.execute("DELETE FROM vouchers WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);

    // Limpar tabelas do RADIUS
    await db.query("DELETE FROM radcheck WHERE username = ?", [voucher.codigo]);
    await db.query("DELETE FROM radreply WHERE username = ?", [voucher.codigo]);
    await db.query("DELETE FROM radusergroup WHERE username = ?", [voucher.codigo]);
    await db.query("DELETE FROM radacct WHERE username = ?", [voucher.codigo]);
    await db.query(
      "DELETE FROM radius_users WHERE username = ? AND empresa_id = ?",
      [voucher.codigo, req.empresa_id]
    );

    res.json({ message: "Voucher excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir voucher:", err);
    res.status(500).json({ message: "Erro ao excluir voucher" });
  }
}

// Autenticar e ativar voucher no Captive Portal (Endpoint Público)
async function ativarEAutenticarVoucher(req, res) {
  const { codigo, mac, mikrotik_id } = req.body;

  if (!codigo || !mac || !mikrotik_id) {
    return res.status(400).json({ message: "Código, MAC e Mikrotik ID são obrigatórios" });
  }

  const macLimpo = mac.trim().toUpperCase();
  const codigoLimpo = codigo.trim().toUpperCase();

  try {
    // 1. Resolver a empresa do MikroTik
    const [[mikrotik]] = await db.execute("SELECT empresa_id, end_hotspot, ip FROM mikrotiks WHERE id = ? LIMIT 1", [mikrotik_id]);
    if (!mikrotik) {
      return res.status(404).json({ message: "MikroTik não encontrado" });
    }
    const empresa_id = mikrotik.empresa_id;
    const gateway = mikrotik.end_hotspot || mikrotik.ip || "10.5.50.1";

    // 2. Buscar o voucher no banco
    const [[voucher]] = await db.execute(`
      SELECT v.*, p.duracao_minutos, p.velocidade_down, p.velocidade_up, p.id AS pid, p.mikrotik_id AS pm_id
      FROM vouchers v
      JOIN planos p ON p.id = v.plano_id
      WHERE v.codigo = ? AND v.empresa_id = ?
      LIMIT 1
    `, [codigoLimpo, empresa_id]);

    if (!voucher) {
      return res.status(400).json({ message: "Voucher inválido ou inexistente nesta rede" });
    }

    const tempoSegundosTotal = voucher.duracao_minutos * 60;
    const rateLimit = `${voucher.velocidade_up}M/${voucher.velocidade_down}M`;

    // 3. Verificar status do voucher
    if (voucher.status === "expirado") {
      return res.status(400).json({ message: "Este voucher já expirou" });
    }

    if (voucher.status === "ativo") {
      // Verificar se o MAC é o mesmo que ativou o voucher (Uso único estrito por dispositivo)
      if (voucher.mac && voucher.mac.toUpperCase() !== macLimpo) {
        return res.status(400).json({ message: "Este voucher já está em uso por outro dispositivo" });
      }

      // Verificar se o tempo decorrido já venceu
      const expiraMs = new Date(voucher.expira_em).getTime();
      const agoraMs = Date.now();
      if (agoraMs >= expiraMs) {
        // Marcar como expirado e limpar RADIUS
        await db.execute("UPDATE vouchers SET status = 'expirado' WHERE id = ?", [voucher.id]);
        await db.query("DELETE FROM radcheck WHERE username = ?", [codigoLimpo]);
        await db.query("DELETE FROM radreply WHERE username = ?", [codigoLimpo]);
        await db.query("DELETE FROM radusergroup WHERE username = ?", [codigoLimpo]);
        await db.query("DELETE FROM radius_users WHERE username = ?", [codigoLimpo]);
        return res.status(400).json({ message: "Este voucher expirou pelo tempo limite" });
      }

      // Caso reconexão dentro do prazo, recalcular tempo restante
      const segundosRestantes = Math.max(1, Math.floor((expiraMs - agoraMs) / 1000));

      // Atualizar no RADIUS
      await db.query("DELETE FROM radcheck WHERE username = ?", [codigoLimpo]);
      await db.query("DELETE FROM radreply WHERE username = ?", [codigoLimpo]);
      await db.query("DELETE FROM radusergroup WHERE username = ?", [codigoLimpo]);

      await db.query(
        `INSERT INTO radcheck (username, attribute, op, value) VALUES
         (?, 'Cleartext-Password', ':=', ?),
         (?, 'Max-All-Session', ':=', ?),
         (?, 'Simultaneous-Use', ':=', '1')`,
        [codigoLimpo, codigoLimpo, codigoLimpo, String(segundosRestantes)]
      );

      await db.query(
        `INSERT INTO radreply (username, attribute, op, value) VALUES
         (?, 'Mikrotik-Rate-Limit', ':=', ?),
         (?, 'Session-Timeout', ':=', ?)`,
        [codigoLimpo, rateLimit, codigoLimpo, String(segundosRestantes)]
      );

      await db.query("INSERT INTO radusergroup (username, groupname) VALUES (?, ?)", [codigoLimpo, String(voucher.pid)]);

      return res.json({
        success: true,
        message: "Voucher reconectado com sucesso",
        username: codigoLimpo,
        password: codigoLimpo,
        gateway: gateway
      });
    }

    // 4. Se o status for 'disponivel' (Primeira Ativação)
    const dataAtivacao = new Date();
    const expiraEm = new Date(dataAtivacao.getTime() + voucher.duracao_minutos * 60 * 1000);

    // Atualizar status do voucher
    await db.execute(`
      UPDATE vouchers
      SET status = 'ativo', mac = ?, data_ativacao = ?, expira_em = ?
      WHERE id = ?
    `, [macLimpo, dataAtivacao, expiraEm, voucher.id]);

    // Limpar registros antigos no RADIUS
    await db.query("DELETE FROM radcheck WHERE username = ?", [codigoLimpo]);
    await db.query("DELETE FROM radreply WHERE username = ?", [codigoLimpo]);
    await db.query("DELETE FROM radusergroup WHERE username = ?", [codigoLimpo]);
    await db.query("DELETE FROM radacct WHERE username = ?", [codigoLimpo]);

    // Inserir credenciais no RADIUS
    await db.query(
      `INSERT INTO radcheck (username, attribute, op, value) VALUES
       (?, 'Cleartext-Password', ':=', ?),
       (?, 'Max-All-Session', ':=', ?),
       (?, 'Simultaneous-Use', ':=', '1')`,
      [codigoLimpo, codigoLimpo, codigoLimpo, String(tempoSegundosTotal)]
    );

    await db.query(
      `INSERT INTO radreply (username, attribute, op, value) VALUES
       (?, 'Mikrotik-Rate-Limit', ':=', ?),
       (?, 'Session-Timeout', ':=', ?)`,
      [codigoLimpo, rateLimit, codigoLimpo, String(tempoSegundosTotal)]
    );

    await db.query("INSERT INTO radusergroup (username, groupname) VALUES (?, ?)", [codigoLimpo, String(voucher.pid)]);

    // Registrar no radius_users
    await db.query(`
      INSERT INTO radius_users (empresa_id, username, plano_id, nas_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE plano_id = VALUES(plano_id), nas_id = VALUES(nas_id), empresa_id = VALUES(empresa_id)
    `, [empresa_id, codigoLimpo, voucher.pid, voucher.pm_id]);

    res.json({
      success: true,
      message: "Voucher ativado e liberado com sucesso",
      username: codigoLimpo,
      password: codigoLimpo,
      gateway: gateway
    });
  } catch (err) {
    console.error("Erro na ativação de voucher:", err);
    res.status(500).json({ message: "Erro interno no servidor ao processar o voucher" });
  }
}

module.exports = {
  listarVouchers,
  gerarVouchersLote,
  excluirVoucher,
  ativarEAutenticarVoucher
};
