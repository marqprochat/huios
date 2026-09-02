import { spawn } from 'node:child_process'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export interface ProcessRunner {
  run(command: string, args: string[], options?: { env?: Record<string, string>; cwd?: string }): Promise<RunResult>
}

/**
 * Executor real. Usa spawn sem shell: nenhum argumento passa por interpretação,
 * então nome de arquivo e caminhos não podem virar injeção de comando.
 */
export const systemProcessRunner: ProcessRunner = {
  run(command, args, options) {
    return new Promise<RunResult>((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        cwd: options?.cwd,
        env: { ...process.env, ...(options?.env || {}) },
      })

      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (chunk) => { stdout += String(chunk) })
      child.stderr?.on('data', (chunk) => { stderr += String(chunk) })

      child.on('error', (error) => {
        // Comando ausente na imagem (ex.: pg_dump não instalado) cai aqui.
        reject(error)
      })
      child.on('close', (code) => {
        resolve({ code: code ?? -1, stdout, stderr })
      })
    })
  },
}

export interface PostgresConnection {
  host: string
  port: string
  user: string
  password: string
  database: string
}

export class MissingDatabaseUrlError extends Error {
  readonly code = 'MISSING_DATABASE_URL'

  constructor(message = 'DATABASE_URL não está configurada.') {
    super(message)
    this.name = 'MissingDatabaseUrlError'
  }
}

/**
 * Quebra a DATABASE_URL nos campos que o pg_dump/pg_restore recebem por variável
 * de ambiente. A senha nunca vai para a linha de comando (ficaria visível no
 * `ps` de quem tiver shell no container).
 */
export function parseDatabaseUrl(url: string | undefined = process.env.DATABASE_URL): PostgresConnection {
  if (!url) throw new MissingDatabaseUrlError()

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new MissingDatabaseUrlError('DATABASE_URL tem formato inválido.')
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!database) throw new MissingDatabaseUrlError('DATABASE_URL não indica o nome do banco.')

  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    database,
  }
}

export function pgEnv(connection: PostgresConnection): Record<string, string> {
  return {
    PGHOST: connection.host,
    PGPORT: connection.port,
    PGUSER: connection.user,
    PGPASSWORD: connection.password,
    PGDATABASE: connection.database,
  }
}
