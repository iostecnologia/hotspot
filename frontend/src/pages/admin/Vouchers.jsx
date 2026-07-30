import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { Ticket, Plus, Trash2, Printer, Search, RefreshCw, X } from "lucide-react";
import QRCode from "qrcode";

export default function Vouchers() {
  const { empresaSlug } = useParams();
  const [vouchers, setVouchers] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planoFilter, setPlanoFilter] = useState("all");
  
  // Estados para geração em lote
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [quantidade, setQuantidade] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Seleção para impressão
  const [selectedIds, setSelectedIds] = useState([]);
  const [printVouchers, setPrintVouchers] = useState([]);

  // Token
  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    fetchDados();
  }, [empresaSlug]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      // Buscar Vouchers
      const resVouchers = await fetch("/api/vouchers", { headers });
      if (resVouchers.ok) {
        const data = await resVouchers.json();
        setVouchers(data);
      }

      // Buscar Planos
      const resPlanos = await fetch("/api/planos", { headers });
      if (resPlanos.ok) {
        const data = await resPlanos.json();
        setPlanos(data.filter(p => p.ativo));
        if (data.length > 0) {
          setSelectedPlanoId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarLote = async (e) => {
    e.preventDefault();
    if (!selectedPlanoId || quantidade <= 0) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/vouchers/gerar-lote", {
        method: "POST",
        headers,
        body: JSON.stringify({
          plano_id: parseInt(selectedPlanoId),
          quantidade: parseInt(quantidade)
        })
      });

      if (res.ok) {
        setModalOpen(false);
        fetchDados();
      } else {
        const data = await res.json();
        alert(data.message || "Erro ao gerar vouchers");
      }
    } catch (err) {
      console.error("Erro ao gerar vouchers:", err);
      alert("Erro de rede ao gerar vouchers");
    } finally {
      setGenerating(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este voucher? Isso também revogará o acesso no RADIUS se estiver ativo.")) return;

    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        setVouchers(prev => prev.filter(v => v.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Erro ao excluir voucher");
      }
    } catch (err) {
      console.error("Erro ao excluir voucher:", err);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredVouchers.map(v => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = async () => {
    const itemsToPrint = vouchers.filter(v => selectedIds.includes(v.id));
    if (itemsToPrint.length === 0) {
      alert("Selecione pelo menos um voucher para imprimir.");
      return;
    }

    try {
      // Gerar QR Codes locais assincronamente
      const promises = itemsToPrint.map(async (v) => {
        // Obter domínio atual e montar link de login
        const mikrotikId = v.plano_id ? v.plano_id : "0"; 
        // Nota: no captive portal, a URL precisa conter o mikrotik_id para carregar o portal correto.
        // v.mikrotik_id vem do plano (joined na query)
        const mkId = v.mikrotik_id || "1";
        const autoLoginUrl = `${window.location.origin}/voucher/login?code=${v.codigo}&mikrotik_id=${mkId}`;
        const qrCodeUrl = await QRCode.toDataURL(autoLoginUrl, { margin: 1, width: 80 });
        return { ...v, qrCodeUrl };
      });

      const itemsWithQr = await Promise.all(promises);
      setPrintVouchers(itemsWithQr);

      // Aguardar o React renderizar e disparar o print
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error("Erro ao gerar QR Codes para impressão:", err);
      alert("Erro ao processar vouchers para impressão.");
    }
  };

  // Filtragem dos Vouchers
  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = v.codigo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesPlano = planoFilter === "all" || String(v.plano_id) === planoFilter;
    return matchesSearch && matchesStatus && matchesPlano;
  });

  // Estatísticas
  const totalCount = vouchers.length;
  const disponivelCount = vouchers.filter(v => v.status === "disponivel").length;
  const ativoCount = vouchers.filter(v => v.status === "ativo").length;
  const expiradoCount = vouchers.filter(v => v.status === "expirado").length;

  return (
    <AdminLayout>
      <div className="screen-only">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Ticket className="text-blue-500 w-7 h-7" />
              Gerenciamento de Vouchers
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Gere, controle e imprima códigos de acesso temporários para planos de internet.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDados}
              className="p-2.5 bg-[#1a1d27] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium transition-colors cursor-pointer text-sm"
            >
              <Plus className="w-5 h-5" />
              Gerar Vouchers
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumo dos Vouchers</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Total Gerado</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalCount}</span>
          </div>
          <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
            <span className="text-xs text-gray-400 uppercase tracking-wider block text-green-400">Disponíveis</span>
            <span className="text-2xl font-bold text-white mt-1 block">{disponivelCount}</span>
          </div>
          <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
            <span className="text-xs text-gray-400 uppercase tracking-wider block text-blue-400">Em Uso (Ativos)</span>
            <span className="text-2xl font-bold text-white mt-1 block">{ativoCount}</span>
          </div>
          <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
            <span className="text-xs text-gray-400 uppercase tracking-wider block text-red-400">Expirados</span>
            <span className="text-2xl font-bold text-white mt-1 block">{expiradoCount}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
            {/* Busca */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filtro Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0d1117] border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="disponivel">Disponíveis</option>
              <option value="ativo">Ativos</option>
              <option value="expirado">Expirados</option>
            </select>

            {/* Filtro Plano */}
            <select
              value={planoFilter}
              onChange={(e) => setPlanoFilter(e.target.value)}
              className="bg-[#0d1117] border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos os Planos</option>
              {planos.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Ações em lote */}
          {selectedIds.length > 0 && (
            <div className="w-full md:w-auto flex items-center justify-end gap-3 border-t md:border-t-0 border-gray-800 pt-3 md:pt-0">
              <span className="text-xs text-gray-400">
                {selectedIds.length} selecionado(s)
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 font-medium transition-colors cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                Imprimir Vouchers
              </button>
            </div>
          )}
        </div>

        {/* Table List */}
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Listagem de Vouchers</h2>
        <div className="bg-[#1a1d27] border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando vouchers...</div>
          ) : filteredVouchers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum voucher encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase text-gray-500 font-semibold bg-[#151821]">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedIds.length === filteredVouchers.length && filteredVouchers.length > 0}
                        className="rounded border-gray-700 text-blue-500 focus:ring-blue-500 bg-[#0d1117]"
                      />
                    </th>
                    <th className="p-4">Código</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Roteador</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">MAC Conectado</th>
                    <th className="p-4">Ativação</th>
                    <th className="p-4">Validade / Expira em</th>
                    <th className="p-4 w-12 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {filteredVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-[#252b3b]/30 transition-colors">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(v.id)}
                          onChange={() => handleSelectOne(v.id)}
                          className="rounded border-gray-700 text-blue-500 focus:ring-blue-500 bg-[#0d1117]"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-white">{v.codigo}</td>
                      <td className="p-4">{v.plano_nome}</td>
                      <td className="p-4 text-gray-400">{v.mikrotik_nome || "N/A"}</td>
                      <td className="p-4">
                        {v.status === "disponivel" && (
                          <span className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded-full text-xs font-medium">
                            Disponível
                          </span>
                        )}
                        {v.status === "ativo" && (
                          <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full text-xs font-medium animate-pulse">
                            Ativo
                          </span>
                        )}
                        {v.status === "expirado" && (
                          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded-full text-xs font-medium">
                            Expirado
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-gray-400 text-xs">{v.mac || "-"}</td>
                      <td className="p-4 text-gray-400 text-xs">
                        {v.data_ativacao ? new Date(v.data_ativacao).toLocaleString() : "-"}
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        {v.expira_em ? new Date(v.expira_em).toLocaleString() : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleExcluir(v.id)}
                          className="p-1.5 text-gray-500 hover:text-red-500 rounded hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Geração Lote */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#1a1d27] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#151821]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ticket className="text-blue-500" />
                  Gerar Vouchers em Lote
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleGerarLote} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Plano Associado
                  </label>
                  <select
                    value={selectedPlanoId}
                    onChange={(e) => setSelectedPlanoId(e.target.value)}
                    required
                    className="w-full bg-[#0d1117] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {planos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Quantidade de Códigos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    required
                    className="w-full bg-[#0d1117] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Gera múltiplos códigos de acesso únicos de 8 dígitos para este plano.
                  </span>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {generating ? "Gerando..." : "Gerar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Print View Layout (Renderizado fora da tela, visível apenas no @media print) */}
      <div id="print-area" className="print-only">
        <style>{`
          @media screen {
            .print-only { display: none !important; }
          }
          @media print {
            /* Ocultar todo o corpo da página */
            body {
              visibility: hidden !important;
              background: white !important;
            }
            
            /* Tornar visível e forçar cores pretas apenas no print-area e seus filhos */
            #print-area, #print-area * {
              visibility: visible !important;
              color: black !important;
              background: transparent !important;
            }
            
            /* Posicionar de forma absoluta no canto superior esquerdo da folha */
            #print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            .page-break {
              page-break-after: always;
            }
            
            /* Layout Horizontal: 2 colunas x 9 linhas = 18 por folha A4 */
            .vouchers-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 90mm) !important;
              gap: 4mm 5mm !important;
              width: 190mm !important;
              margin: 0 auto !important;
              padding-top: 10mm !important;
              justify-content: center !important;
            }
            
            .voucher-ticket {
              width: 90mm !important;
              height: 25mm !important;
              border: 1px dashed #666 !important;
              padding: 1.5mm 3mm !important;
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              page-break-inside: avoid !important;
              position: relative !important;
              display: block !important;
            }
            
            .voucher-title {
              font-size: 7.5pt !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              border-bottom: 1px solid #ddd !important;
              padding-bottom: 0.5mm !important;
              margin-bottom: 1mm !important;
              color: #111 !important;
            }
            
            .voucher-body {
              display: flex !important;
              justify-content: space-between !important;
              height: 17mm !important;
            }
            
            .voucher-info {
              width: 64mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              gap: 0.5mm !important;
            }
            
            .voucher-plano {
              font-size: 8pt !important;
              font-weight: bold !important;
              color: #222 !important;
            }
            
            .voucher-codigo-box {
              background: #f0f0f0 !important;
              padding: 0.6mm 1.5mm !important;
              border-radius: 4px !important;
              text-align: center !important;
              margin: 0.2mm 0 !important;
              font-size: 7pt !important;
            }
            
            .voucher-codigo {
              font-family: monospace !important;
              font-size: 9.5pt !important;
              font-weight: bold !important;
              letter-spacing: 1px !important;
              color: black !important;
            }
            
            .voucher-specs {
              font-size: 6.5pt !important;
              color: #333 !important;
            }
            
            .voucher-instrucoes {
              font-size: 5.5pt !important;
              line-height: 1.2 !important;
              color: #555 !important;
              margin-top: 0.2mm !important;
            }
            
            .voucher-qr {
              width: 16mm !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
            }
            
            .voucher-qr img {
              width: 13mm !important;
              height: 13mm !important;
              background: white !important;
            }
            
            .voucher-qr-txt {
              font-size: 4pt !important;
              color: #666 !important;
              text-transform: uppercase !important;
              margin-top: 0.5mm !important;
              text-align: center !important;
            }
          }
        `}</style>
        
        {/* Fazer agrupamento por páginas A4 (máximo 18 por página no layout 2x9) */}
        {(() => {
          const pages = [];
          const itemsPerPage = 18;
          for (let i = 0; i < printVouchers.length; i += itemsPerPage) {
            pages.push(printVouchers.slice(i, i + itemsPerPage));
          }

          return pages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className={`vouchers-grid ${pageIdx < pages.length - 1 ? 'page-break' : ''}`}>
              {pageItems.map((v) => (
                <div key={v.id} className="voucher-ticket">
                  <div className="voucher-title">Wi-Fi Acesso Rápido</div>
                  <div className="voucher-body">
                    <div className="voucher-info">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="voucher-plano">{v.plano_nome}</div>
                        <div className="voucher-specs">
                          Duração: {v.duracao_minutos} min | Up: {v.velocidade_up}M | Down: {v.velocidade_down}M
                        </div>
                      </div>
                      <div className="voucher-codigo-box">
                        Código de Acesso: <span className="voucher-codigo">{v.codigo}</span>
                      </div>
                      <div className="voucher-instrucoes">
                        Conecte no Wi-Fi, clique em 'Entrar com Voucher' e digite o código ou escaneie o QR Code.
                      </div>
                    </div>
                    <div className="voucher-qr">
                      {v.qrCodeUrl && <img src={v.qrCodeUrl} alt="QR Code Login" />}
                      <span className="voucher-qr-txt">Escaneie</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Forçar clear floats no final de cada página */}
              <div style={{ clear: "both" }}></div>
            </div>
          ));
        })()}
      </div>
    </AdminLayout>
  );
}
