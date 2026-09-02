"use client"

import { useCallback, useEffect, useState } from "react"

import { useToast } from "../components/Toast/useToast"

interface BackupRow {
  id: string
  fileName: string
  sizeBytes: number | null
  type: string
  status: string
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
  createdByName: string | null
}

interface BackupConfig {
  backupEnabled: boolean
  backupHour: number
  backupRetentionCount: number
  backupIncludeUploads: boolean
  lastBackupAt: string | null
}

const CONFIRMACAO = "RESTAURAR"

const ROTULO_TIPO: Record<string, string> = {
  AUTO: "Automático",
  MANUAL: "Manual",
  PRE_RESTORE: "Antes de restaurar",
}

const ROTULO_STATUS: Record<string, string> = {
  RUNNING: "Em andamento",
  SUCCESS: "Concluído",
  FAILED: "Falhou",
}

function formatarTamanho(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—"
  if (bytes < 1024) return `${bytes} B`
  const unidades = ["KB", "MB", "GB", "TB"]
  let valor = bytes / 1024
  let indice = 0
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice += 1
  }
  return `${valor.toFixed(valor >= 10 ? 0 : 1)} ${unidades[indice]}`
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function BackupTab() {
  const { toast } = useToast()

  const [carregando, setCarregando] = useState(true)
  const [backups, setBackups] = useState<BackupRow[]>([])
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [gerando, setGerando] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  // Estado do modal de restauração: um backup do histórico ou "upload".
  const [alvoRestauracao, setAlvoRestauracao] = useState<BackupRow | "upload" | null>(null)
  const [confirmacao, setConfirmacao] = useState("")
  const [arquivoEnviado, setArquivoEnviado] = useState<File | null>(null)
  const [restaurando, setRestaurando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backups")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast("error", "Erro ao carregar", data.error || "Não foi possível carregar os backups.")
        return
      }
      const data = await res.json()
      setBackups(data.backups || [])
      setConfig(data.config || null)
    } catch {
      toast("error", "Erro ao carregar", "Não foi possível falar com o servidor.")
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const gerarAgora = async () => {
    setGerando(true)
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast("success", "Backup gerado", `${data.backup?.fileName || "Arquivo"} criado com sucesso.`)
      } else {
        toast("error", "Falha no backup", data.error || "Não foi possível gerar o backup.")
      }
      // Recarrega nos dois casos: a falha também deixou registro no histórico.
      await carregar()
    } catch {
      toast("error", "Falha no backup", "Não foi possível falar com o servidor.")
    } finally {
      setGerando(false)
    }
  }

  const salvarConfig = async () => {
    if (!config) return
    setSalvandoConfig(true)
    try {
      const res = await fetch("/api/admin/backups/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupEnabled: config.backupEnabled,
          backupHour: config.backupHour,
          backupRetentionCount: config.backupRetentionCount,
          backupIncludeUploads: config.backupIncludeUploads,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setConfig(data.config)
        toast("success", "Agendamento salvo", "As novas regras já valem para o próximo ciclo.")
      } else {
        toast("error", "Erro ao salvar", data.error || "Não foi possível salvar o agendamento.")
      }
    } catch {
      toast("error", "Erro ao salvar", "Não foi possível falar com o servidor.")
    } finally {
      setSalvandoConfig(false)
    }
  }

  const excluir = async (backup: BackupRow) => {
    if (!window.confirm(`Excluir o backup ${backup.fileName}? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast("success", "Backup excluído", "O arquivo foi removido do servidor.")
        await carregar()
      } else {
        toast("error", "Erro ao excluir", data.error || "Não foi possível excluir.")
      }
    } catch {
      toast("error", "Erro ao excluir", "Não foi possível falar com o servidor.")
    }
  }

  const restaurar = async () => {
    if (!alvoRestauracao) return
    if (confirmacao.trim() !== CONFIRMACAO) return

    const form = new FormData()
    form.append("confirmacao", confirmacao.trim())
    if (alvoRestauracao === "upload") {
      if (!arquivoEnviado) return
      form.append("arquivo", arquivoEnviado)
    } else {
      form.append("backupId", alvoRestauracao.id)
    }

    setRestaurando(true)
    try {
      const res = await fetch("/api/admin/backups/restaurar", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast(
          "success",
          "Restauração concluída",
          `Os dados foram substituídos. Cópia de segurança do estado anterior: ${data.backupDeSeguranca}.`,
        )
        fecharModal()
        await carregar()
      } else {
        const extra = data.backupDeSeguranca
          ? ` A cópia de segurança ${data.backupDeSeguranca} foi criada antes da tentativa.`
          : ""
        toast("error", "Falha na restauração", `${data.error || "Não foi possível restaurar."}${extra}`)
      }
    } catch {
      toast("error", "Falha na restauração", "Não foi possível falar com o servidor.")
    } finally {
      setRestaurando(false)
    }
  }

  const fecharModal = () => {
    setAlvoRestauracao(null)
    setConfirmacao("")
    setArquivoEnviado(null)
  }

  const ultimoConcluido = backups.find((b) => b.status === "SUCCESS") || null

  if (carregando) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando backups…</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Backup e Restauração</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cópias do banco de dados e dos arquivos enviados, geradas automaticamente e guardadas no servidor.
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Último backup</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {formatarDataHora(ultimoConcluido?.createdAt || null)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {ultimoConcluido ? formatarTamanho(ultimoConcluido.sizeBytes) : "Nenhum backup concluído ainda"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Agendamento</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {config?.backupEnabled
              ? `Todo dia às ${String(config.backupHour).padStart(2, "0")}:00`
              : "Desligado"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Horário de Brasília</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Guardados</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {backups.filter((b) => b.status === "SUCCESS").length} arquivos
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Retenção automática: {config?.backupRetentionCount ?? 14}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={gerarAgora}
          disabled={gerando}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base">
            {gerando ? "hourglass_top" : "backup"}
          </span>
          {gerando ? "Gerando backup…" : "Gerar backup agora"}
        </button>
        <button
          onClick={() => setAlvoRestauracao("upload")}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          Restaurar de um arquivo
        </button>
      </div>

      {/* Agendamento */}
      {config && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Backup automático</h4>

          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.backupEnabled}
              onChange={(e) => setConfig({ ...config, backupEnabled: e.target.checked })}
              className="size-4"
            />
            Gerar um backup todos os dias
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                Horário (Brasília)
              </label>
              <select
                value={config.backupHour}
                onChange={(e) => setConfig({ ...config, backupHour: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, hora) => (
                  <option key={hora} value={hora} className="dark:bg-slate-900">
                    {String(hora).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                Quantos backups automáticos manter
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={config.backupRetentionCount}
                onChange={(e) => setConfig({ ...config, backupRetentionCount: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.backupIncludeUploads}
              onChange={(e) => setConfig({ ...config, backupIncludeUploads: e.target.checked })}
              className="size-4"
            />
            Incluir os arquivos enviados (fotos, documentos, comprovantes)
          </label>

          <button
            onClick={salvarConfig}
            disabled={salvandoConfig}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60"
          >
            {salvandoConfig ? "Salvando…" : "Salvar agendamento"}
          </button>
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Histórico</h4>
        </div>

        {backups.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
            Nenhum backup foi gerado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Tamanho</th>
                  <th className="px-5 py-3">Situação</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td className="px-5 py-3 text-slate-900 dark:text-white">
                      {formatarDataHora(backup.createdAt)}
                      {backup.createdByName && (
                        <span className="block text-xs text-slate-400">por {backup.createdByName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {ROTULO_TIPO[backup.type] || backup.type}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {formatarTamanho(backup.sizeBytes)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          backup.status === "FAILED"
                            ? "font-bold text-red-600 dark:text-red-400"
                            : backup.status === "RUNNING"
                              ? "font-bold text-amber-600 dark:text-amber-400"
                              : "font-bold text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {ROTULO_STATUS[backup.status] || backup.status}
                      </span>
                      {backup.errorMessage && (
                        <span className="block max-w-xs text-xs text-red-500 break-words">
                          {backup.errorMessage}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {backup.status === "SUCCESS" && (
                          <>
                            <a
                              href={`/api/admin/backups/${backup.id}/download`}
                              className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                            >
                              Baixar
                            </a>
                            <button
                              onClick={() => setAlvoRestauracao(backup)}
                              className="px-2 py-1 rounded-md border border-red-300 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400"
                            >
                              Restaurar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => excluir(backup)}
                          className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de restauração */}
      {alvoRestauracao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-500 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600">warning</span>
              <div>
                <h4 className="text-lg font-black text-red-600">Restaurar backup</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Todos os dados atuais — alunos, matrículas, notas, presenças e financeiro — serão
                  substituídos pelo conteúdo do backup. O sistema fica indisponível por alguns segundos.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Antes de substituir, o sistema gera automaticamente um backup do estado atual, para o caso
              de você precisar voltar.
            </p>

            {alvoRestauracao === "upload" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Arquivo de backup (.tar.gz)
                </label>
                <input
                  type="file"
                  accept=".gz,application/gzip"
                  onChange={(e) => setArquivoEnviado(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-900 dark:text-white break-all">
                {alvoRestauracao.fileName}
                <span className="block text-xs font-normal text-slate-500">
                  {formatarDataHora(alvoRestauracao.createdAt)} · {formatarTamanho(alvoRestauracao.sizeBytes)}
                </span>
              </p>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                Digite {CONFIRMACAO} para confirmar
              </label>
              <input
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder={CONFIRMACAO}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={fecharModal}
                disabled={restaurando}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={restaurar}
                disabled={
                  restaurando
                  || confirmacao.trim() !== CONFIRMACAO
                  || (alvoRestauracao === "upload" && !arquivoEnviado)
                }
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {restaurando ? "Restaurando…" : "Restaurar agora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
