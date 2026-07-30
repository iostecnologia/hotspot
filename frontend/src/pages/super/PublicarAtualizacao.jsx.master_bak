import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicarAtualizacao() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("list"); // "list" | "detect" | "detail"
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Detect step state
  const [detectedChanges, setDetectedChanges] = useState(null); // { alterados, novos, removidos }
  const [selectedFiles, setSelectedFiles] = useState({});
  const [descricao, setDescricao] = useState("");
  const [changelog, setChangelog] = useState("");
  const [migrationsText, setMigrationsText] = useState("");
  const [schemaChanges, setSchemaChanges] = useState(null);
  const [noSnapshot, setNoSnapshot] = useState(false);

  // Detail step state
  const [detailUpdate, setDetailUpdate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = localStorage.getItem("admin_token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/super");
      return;
    }
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/update-publish", { headers });
      if (res.ok) {
        const data = await res.json();
        setUpdates(Array.isArray(data) ? data : data.data || []);
      } else {
        setError("Erro ao carregar atualizacoes.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao carregar atualizacoes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/update-publish/snapshot", {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setSuccessMsg("Snapshot criado com sucesso.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao criar snapshot.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao criar snapshot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDetectChanges = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    setNoSnapshot(false);
    try {
      const res = await fetch("/api/update-publish/detect-changes", {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const changes = data.data || data;
        setDetectedChanges(changes);
        setSchemaChanges(changes.schema_changes || null);

        // Pre-select all files
        const selection = {};
        const allFiles = [
          ...(changes.alterados || []).map((f) => ({ ...f, _cat: "alterados" })),
          ...(changes.novos || []).map((f) => ({ ...f, _cat: "novos" })),
          ...(changes.removidos || []).map((f) => ({ ...f, _cat: "removidos" })),
        ];
        allFiles.forEach((f) => {
          selection[f.path || f.file || f] = true;
        });
        setSelectedFiles(selection);
        setDescricao("");
        setChangelog("");
        // Auto-preencher com SQL sugerido baseado no diff de schema
        setMigrationsText(changes.suggested_migrations_sql || "");
        if (!changes.has_schema_snapshot) {
          setNoSnapshot(true);
        }
        setStep("detect");
      } else {
        if (
          (data.message || data.error || "")
            .toString()
            .toLowerCase()
            .includes("snapshot")
        ) {
          setNoSnapshot(true);
        }
        setError(data.message || data.error || "Erro ao detectar alteracoes.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao detectar alteracoes.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFile = (filePath) => {
    setSelectedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  const selectedCount = Object.values(selectedFiles).filter(Boolean).length;

  const handlePublish = async () => {
    if (!descricao.trim()) {
      setError("Descricao e obrigatoria.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    // Build files array from selected
    const allFiles = [
      ...(detectedChanges.alterados || []).map((f) => {
        const p = typeof f === "string" ? f : f.path || f.file || f;
        return { path: p, action: "update" };
      }),
      ...(detectedChanges.novos || []).map((f) => {
        const p = typeof f === "string" ? f : f.path || f.file || f;
        return { path: p, action: "create" };
      }),
      ...(detectedChanges.removidos || []).map((f) => {
        const p = typeof f === "string" ? f : f.path || f.file || f;
        return { path: p, action: "delete" };
      }),
    ];
    const files = allFiles.filter((f) => selectedFiles[f.path]);

    // Split migrations by --- separator
    const migrations = migrationsText
      .split("---")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    try {
      const res = await fetch("/api/update-publish/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          descricao: descricao.trim(),
          changelog: changelog.trim(),
          files,
          migrations,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessMsg("Atualizacao publicada com sucesso.");
        setStep("list");
        fetchUpdates();
      } else {
        setError(data.error || "Erro ao publicar atualizacao.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao publicar atualizacao.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDetail = async (id) => {
    setDetailLoading(true);
    setDetailUpdate(null);
    setError("");
    setStep("detail");
    try {
      const res = await fetch(`/api/update-publish/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDetailUpdate(data.data || data);
      } else {
        setError("Erro ao carregar detalhes da atualizacao.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao carregar detalhes.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Deseja realmente remover esta atualizacao?")) return;
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/update-publish/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setSuccessMsg("Atualizacao removida com sucesso.");
        fetchUpdates();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao remover atualizacao.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexao ao remover atualizacao.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const actionBadge = (action) => {
    if (action === "create")
      return (
        <span className="px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-400 border border-green-800/40">
          create
        </span>
      );
    if (action === "update")
      return (
        <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800/40">
          update
        </span>
      );
    if (action === "delete")
      return (
        <span className="px-2 py-0.5 rounded text-xs bg-red-900/40 text-red-400 border border-red-800/40">
          delete
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">
        {action}
      </span>
    );
  };

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  if (step === "list") {
    return (
      <div className="min-h-screen bg-[#0f111a] text-gray-300 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <Link
                to="/super"
                className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block"
              >
                &larr; Voltar ao Super Admin
              </Link>
              <h1 className="text-2xl font-bold text-white">Publicar Atualizacao</h1>
              <p className="text-gray-500 text-sm mt-1">
                Gerencie e publique atualizacoes do sistema para servidores clientes.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={handleSnapshot}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50"
              >
                {actionLoading ? "Aguarde..." : "Tirar Snapshot"}
              </button>
              <button
                onClick={handleDetectChanges}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm disabled:opacity-50"
              >
                {actionLoading ? "Detectando..." : "Detectar Alteracoes"}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 text-red-400 rounded-lg text-sm">
              {error}
              {noSnapshot && (
                <span className="block mt-1 text-red-300">
                  Tire um snapshot primeiro antes de detectar alteracoes.
                </span>
              )}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-800/50 text-green-400 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          {/* Updates list */}
          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : updates.length === 0 ? (
            <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">Nenhuma atualizacao publicada</p>
              <p className="text-gray-600 text-sm">
                Use "Tirar Snapshot" para criar uma base de comparacao, depois "Detectar
                Alteracoes" para publicar uma nova atualizacao.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs text-gray-500 bg-[#0d1117] px-2 py-0.5 rounded">
                        #{u.id}
                      </span>
                      <span className="font-medium text-white truncate">{u.descricao}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{u.total_files ?? 0} arquivo(s)</span>
                      <span>{u.total_migrations ?? 0} migration(s)</span>
                      <span>{formatDate(u.criado_em || u.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleDetail(u.id)}
                      className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded text-sm hover:bg-blue-600/30"
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() => handleRemove(u.id)}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DETECT VIEW ─────────────────────────────────────────────────────────────
  if (step === "detect") {
    const alterados = detectedChanges?.alterados || [];
    const novos = detectedChanges?.novos || [];
    const removidos = detectedChanges?.removidos || [];

    const renderFileList = (files, cat, colorClass, label) => {
      if (files.length === 0) return null;
      return (
        <div className="mb-6">
          <h3 className={`text-sm font-semibold mb-2 ${colorClass}`}>
            {label} ({files.length})
          </h3>
          <div className="space-y-1">
            {files.map((f) => {
              const key = f.path || f.file || f;
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#252b3b] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedFiles[key]}
                    onChange={() => toggleFile(key)}
                    className="accent-blue-500"
                  />
                  <span className="font-mono text-xs text-gray-300 break-all">{key}</span>
                  {f.md5 && (
                    <span className="font-mono text-xs text-gray-600 ml-auto whitespace-nowrap">
                      {f.md5.slice(0, 8)}...
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      );
    };

    const totalFiles = alterados.length + novos.length + removidos.length;
    const scNovas = schemaChanges?.tabelas_novas || [];
    const scAlteradas = schemaChanges?.tabelas_alteradas || [];
    const scRemovidas = schemaChanges?.tabelas_removidas || [];
    const totalSchema =
      scNovas.length + scAlteradas.length + scRemovidas.length;

    return (
      <div className="min-h-screen bg-[#0f111a] text-gray-300 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <button
                onClick={() => setStep("list")}
                className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block"
              >
                &larr; Voltar
              </button>
              <h1 className="text-2xl font-bold text-white">Detectar Alteracoes</h1>
              <p className="text-gray-500 text-sm mt-1">
                {totalFiles} arquivo(s) detectado(s) —{" "}
                <span className="text-blue-400">{selectedCount} selecionado(s)</span>
                {totalSchema > 0 && (
                  <>
                    {" • "}
                    <span className="text-purple-400">
                      {totalSchema} mudanca(s) de schema
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {totalFiles === 0 && totalSchema === 0 && (
            <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-10 text-center mb-6">
              <p className="text-gray-500">Nenhuma alteracao detectada em relacao ao snapshot.</p>
            </div>
          )}

          {noSnapshot && (
            <div className="mb-6 p-4 bg-yellow-600/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm">
              Snapshot de schema ainda nao existe. As mudancas de banco nao serao detectadas ate
              voce clicar em <strong>Tirar Snapshot</strong> uma primeira vez.
            </div>
          )}

          {totalSchema > 0 && (
            <div className="mb-6 bg-[#1a1d27] border border-purple-800/40 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">
                  Mudancas de Schema (banco){" "}
                  <span className="text-purple-400 text-sm ml-2">
                    ({totalSchema})
                  </span>
                </h2>
                <span className="text-xs text-gray-500">
                  SQL auto-gerado ja aplicado no campo Migrations ao lado
                </span>
              </div>

              {scNovas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">
                    Tabelas novas ({scNovas.length})
                  </h3>
                  <div className="space-y-2">
                    {scNovas.map((t) => (
                      <details
                        key={`new-${t.name}`}
                        className="bg-[#0d1117] border border-gray-800 rounded p-2"
                      >
                        <summary className="cursor-pointer font-mono text-xs text-green-300">
                          + {t.name}
                        </summary>
                        <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                          {t.sql}
                        </pre>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {scAlteradas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                    Tabelas alteradas ({scAlteradas.length})
                  </h3>
                  <div className="space-y-2">
                    {scAlteradas.map((t) => (
                      <details
                        key={`alt-${t.name}`}
                        className="bg-[#0d1117] border border-gray-800 rounded p-2"
                      >
                        <summary className="cursor-pointer font-mono text-xs text-yellow-300">
                          ~ {t.name}{" "}
                          <span className="text-gray-500">
                            ({t.sqls.length} statement(s))
                          </span>
                        </summary>
                        <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                          {t.sqls.join(";\n") + ";"}
                        </pre>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {scRemovidas.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">
                    Tabelas removidas ({scRemovidas.length})
                  </h3>
                  <div className="space-y-2">
                    {scRemovidas.map((t) => (
                      <div
                        key={`rem-${t.name}`}
                        className="bg-[#0d1117] border border-gray-800 rounded p-2 font-mono text-xs text-red-300"
                      >
                        - {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Revise o SQL sugerido no campo <strong>Migrations</strong> antes de publicar. Voce
                pode editar, adicionar novas migrations ou remover as que nao quer aplicar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: file changes */}
            <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Arquivos Alterados</h2>
                {totalFiles > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allKeys = [
                        ...alterados,
                        ...novos,
                        ...removidos,
                      ].map((f) => (typeof f === "string" ? f : f.path || f.file));
                      const allSelected = allKeys.every((k) => selectedFiles[k]);
                      const next = {};
                      allKeys.forEach((k) => {
                        next[k] = !allSelected;
                      });
                      setSelectedFiles(next);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    {selectedCount === totalFiles
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                )}
              </div>
              {totalFiles === 0 ? (
                <p className="text-gray-600 text-sm">Sem alteracoes.</p>
              ) : (
                <>
                  {renderFileList(
                    alterados,
                    "alterados",
                    "text-yellow-400",
                    "Alterados"
                  )}
                  {renderFileList(novos, "novos", "text-green-400", "Novos")}
                  {renderFileList(
                    removidos,
                    "removidos",
                    "text-red-400",
                    "Removidos"
                  )}
                </>
              )}
            </div>

            {/* Right: form */}
            <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-white">Dados da Publicacao</h2>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Descricao <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Correcao de bug no portal, melhoria no RADIUS..."
                  className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Changelog</label>
                <textarea
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  rows={4}
                  placeholder="Descreva as mudancas realizadas nesta versao..."
                  className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-600 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Migrations SQL</label>
                <textarea
                  value={migrationsText}
                  onChange={(e) => setMigrationsText(e.target.value)}
                  rows={6}
                  placeholder={
                    "-- Migration 1\nALTER TABLE planos ADD COLUMN ativo TINYINT(1) DEFAULT 1;\n---\n-- Migration 2\nCREATE INDEX idx_empresa ON leads(empresa_id);\n\nSepare cada migration com --- em uma linha separada."
                  }
                  className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-600 resize-y"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Separe cada migration com <code className="text-gray-400">---</code> em uma
                  linha separada.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("list")}
                  className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg hover:bg-gray-600 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublish}
                  disabled={
                    actionLoading ||
                    (selectedCount === 0 && !migrationsText.trim())
                  }
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading
                    ? "Publicando..."
                    : `Publicar Atualizacao (${selectedCount} arq${
                        migrationsText.trim() ? " + SQL" : ""
                      })`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (step === "detail") {
    return (
      <div className="min-h-screen bg-[#0f111a] text-gray-300 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => { setStep("list"); setDetailUpdate(null); setError(""); }}
              className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block"
            >
              &larr; Voltar
            </button>
            <h1 className="text-2xl font-bold text-white">Detalhes da Atualizacao</h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {detailLoading && <p className="text-gray-500">Carregando...</p>}

          {detailUpdate && (
            <div className="space-y-6">
              {/* Meta */}
              <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ID</p>
                    <p className="font-mono text-sm text-white">#{detailUpdate.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Data de Publicacao</p>
                    <p className="text-sm text-white">
                      {formatDate(detailUpdate.criado_em || detailUpdate.created_at)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Descricao</p>
                    <p className="text-sm text-white">{detailUpdate.descricao}</p>
                  </div>
                  {detailUpdate.changelog && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Changelog</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {detailUpdate.changelog}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Files */}
              {detailUpdate.files && detailUpdate.files.length > 0 && (
                <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
                  <h2 className="text-base font-semibold text-white mb-4">
                    Arquivos ({detailUpdate.files.length})
                  </h2>
                  <div className="space-y-1">
                    {detailUpdate.files.map((f, idx) => {
                      const filePath = f.path || f.file || f;
                      const action = f.action || "update";
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded hover:bg-[#252b3b]"
                        >
                          {actionBadge(action)}
                          <span className="font-mono text-xs text-gray-300 break-all">
                            {filePath}
                          </span>
                          {f.md5 && (
                            <span className="font-mono text-xs text-gray-600 ml-auto whitespace-nowrap">
                              {f.md5.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Migrations */}
              {detailUpdate.migrations && detailUpdate.migrations.length > 0 && (
                <div className="bg-[#1a1d27] border border-gray-800 rounded-xl p-5">
                  <h2 className="text-base font-semibold text-white mb-4">
                    Migrations ({detailUpdate.migrations.length})
                  </h2>
                  <div className="space-y-3">
                    {detailUpdate.migrations.map((m, idx) => (
                      <div key={idx}>
                        <p className="text-xs text-gray-500 mb-1">Migration {idx + 1}</p>
                        <pre className="bg-[#0d1117] border border-gray-800 rounded p-3 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                          <code>{typeof m === "string" ? m : m.sql || JSON.stringify(m, null, 2)}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
