import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { redirecionarHotspot } from "../../utils/hotspotRedirect";
import { Ticket, Camera, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function VoucherLogin() {
  const [searchParams] = useSearchParams();
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cfg, setCfg] = useState({});

  // Parametros do MikroTik Captive Portal
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [mikrotikId, setMikrotikId] = useState("");
  const [empresaId, setEmpresaId] = useState("");

  // Estado do Leitor de QR Code
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);

  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("codigo") || "";
    const macParam = searchParams.get("mac") || "";
    const ipParam = searchParams.get("ip") || "";
    const mkIdParam = searchParams.get("mikrotik_id") || "";
    const empIdParam = searchParams.get("empresa_id") || "";

    setMac(macParam);
    setIp(ipParam);
    setMikrotikId(mkIdParam);
    setEmpresaId(empIdParam);

    if (codeParam) {
      setCodigo(codeParam);
      // Login automático se o código já vier na URL (escaneamento de QR Code nativo)
      efetuarConexao(codeParam, macParam, ipParam, mkIdParam);
    }

    // Carregar configurações de design do portal
    if (empIdParam) {
      fetch(`/api/portal-config/login?empresa_id=${empIdParam}`)
        .then((r) => r.json())
        .then(setCfg)
        .catch(() => {});
    }
  }, [searchParams]);

  // Gerencia o ciclo de vida do scanner de QR Code
  useEffect(() => {
    if (showScanner) {
      // Iniciar scanner
      const scanner = new Html5QrcodeScanner(
        "qr-scanner-view",
        { 
          fps: 10, 
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(
        (decodedText) => {
          let code = decodedText;
          try {
            // Se for uma URL completa, extrair o parametro code
            if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
              const url = new URL(decodedText);
              code = url.searchParams.get("code") || url.searchParams.get("codigo") || decodedText;
            }
          } catch (e) {
            console.error("Erro ao analisar URL do QR Code:", e);
          }

          setCodigo(code);
          setShowScanner(false);
          scanner.clear().catch(e => console.error(e));
          
          // Conectar automaticamente
          efetuarConexao(code, mac, ip, mikrotikId);
        },
        (error) => {
          // Silencioso para evitar logs repetitivos de erro de foco
        }
      );

      setScannerInstance(scanner);
    } else {
      if (scannerInstance) {
        scannerInstance.clear().catch(e => console.error(e));
        setScannerInstance(null);
      }
    }

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(e => console.error(e));
      }
    };
  }, [showScanner]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!codigo.trim()) {
      setErro("Informe o código do seu Voucher");
      return;
    }
    efetuarConexao(codigo, mac, ip, mikrotikId);
  };

  const efetuarConexao = async (codeToSubmit, clientMac, clientIp, mkId) => {
    if (enviando) return;
    
    setEnviando(true);
    setMensagem("Validando Voucher...");
    setErro(null);

    try {
      const res = await fetch("/api/public/vouchers/autenticar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codeToSubmit,
          mac: clientMac,
          ip: clientIp,
          mikrotik_id: mkId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao validar o Voucher");
      }

      setMensagem("Conectando à internet...");

      // Executar o redirecionamento final para o MikroTik
      if (data.gateway && data.username) {
        redirecionarHotspot(data.gateway, data.username, data.password || data.username, 1500);
      } else {
        throw new Error("Resposta de autenticação inválida do servidor");
      }
    } catch (err) {
      setErro(err.message);
      setMensagem(null);
    } finally {
      setEnviando(false);
    }
  };

  const handleVoltar = () => {
    // Retorna para a página de seleção de planos mantendo os parâmetros originais
    const qs = new URLSearchParams(window.location.search).toString();
    window.location.href = `/planos-cliente?${qs}`;
  };

  const bgStyle = cfg.cor_fundo_1 
    ? { background: `linear-gradient(135deg, ${cfg.cor_fundo_1}, ${cfg.cor_fundo_2 || cfg.cor_fundo_1})` } 
    : undefined;
  const btnStyle = cfg.cor_botao ? { backgroundColor: cfg.cor_botao } : undefined;

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center text-gray-300 px-4 py-8 ${!bgStyle ? 'bg-gradient-to-br from-[#0f111a] via-[#1a1d27] to-black' : ''}`} 
      style={bgStyle}
    >
      <div className="w-full max-w-md">
        
        {/* Logo/Brand Header */}
        <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="Logo" className="max-h-20 mx-auto mb-4 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-full mb-3 text-blue-500">
              <Ticket className="w-7 h-7" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-1">
            {cfg.titulo || "Acesso por Voucher"}
          </h1>
          <p className="text-sm text-gray-400">
            Entre com o código do seu cartão ou escaneie o código QR.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
          
          {/* Status/Mensagens */}
          {mensagem && (
            <div className="mb-4 p-3.5 rounded-lg bg-blue-900/30 border border-blue-800/50 text-blue-300 text-sm font-medium flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{erro}</div>
            </div>
          )}

          {/* Interface Normal (Digitação) */}
          {!showScanner ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Código de Acesso
                </label>
                <input
                  type="text"
                  placeholder="EX: ABC12345"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  disabled={enviando}
                  className="w-full bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center font-mono font-bold text-lg tracking-wider"
                  autoFocus
                />
              </div>

              {/* Botões Principais */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={enviando}
                  style={btnStyle}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50 text-sm cursor-pointer"
                >
                  {enviando ? "Conectando..." : "CONECTAR"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 bg-[#252b3b]/60 hover:bg-[#252b3b] text-white border border-gray-800 rounded-lg py-3 font-semibold transition-colors disabled:opacity-50 text-sm cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Escanear QR Code
                </button>
              </div>
            </form>
          ) : (
            /* Interface Leitor QR Code */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-2">
                <span className="text-sm font-semibold text-white">Aponte a câmera para o QR Code</span>
                <button
                  onClick={() => setShowScanner(false)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {/* Container onde o scanner do html5-qrcode injetará a câmera */}
              <div id="qr-scanner-view" className="w-full overflow-hidden rounded-xl border border-gray-800 bg-black max-h-[300px]"></div>

              <div className="text-center text-[10px] text-gray-500 leading-normal">
                Posicione o código QR impresso no centro do visor da câmera para conectar automaticamente.
              </div>
            </div>
          )}

          {/* Botão de Voltar */}
          {!showScanner && (
            <button
              onClick={handleVoltar}
              disabled={enviando}
              className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para Seleção de Planos
            </button>
          )}

        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600 mt-6 leading-relaxed">
          Este voucher garante o acesso exclusivo de um dispositivo à rede pelo tempo estipulado.
          <br />
          Desenvolvido por <span className="font-semibold text-gray-400">Forum Telecom</span>
        </div>

      </div>
    </div>
  );
}
