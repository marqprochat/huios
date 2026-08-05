/**
 * Utilitários de data/hora do HUIOS.
 *
 * O banco guarda dois tipos distintos de coluna DateTime, e eles NÃO podem
 * compartilhar helpers:
 *
 * 1. DATA CIVIL — um dia do calendário, sem significado de horário.
 *    Ex.: dueDate, birthDate, validFrom/validUntil, startDate/endDate.
 *    Gravadas como meia-noite ou meio-dia UTC. Devem ser lidas pelas partes
 *    UTC (toLocalDate / formatDateBR / toCivilDateInput). Lê-las em
 *    America/Sao_Paulo jogaria as de meia-noite UTC para o dia anterior.
 *
 * 2. INSTANTE — um momento no relógio.
 *    Ex.: Lesson.startTime/endTime, Event.*, Exam.*, checkInAt.
 *    Gravadas como o instante UTC de um relógio de Brasília. Devem ser lidas
 *    com timeZone: 'America/Sao_Paulo' explícito (família *BR* / *Instant*).
 *
 * Nunca dependa do fuso do processo Node: em produção ele roda em UTC.
 */

export const BR_TIME_ZONE = 'America/Sao_Paulo';

/* ────────────────────────── internos ────────────────────────── */

// 'sv-SE' emite "YYYY-MM-DD HH:mm:ss", o formato mais próximo de ISO disponível.
const brIsoFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: BR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** "2026-08-04T19:30:00" — o relógio de parede em Brasília para um dado instante. */
function brWallClock(date: Date): string {
  return brIsoFmt.format(date).replace(' ', 'T');
}

/**
 * Minutos que o relógio de Brasília está adiantado em relação ao UTC no
 * instante dado. Hoje sempre -180; era -120 no horário de verão (até 2019).
 * Consultado dinamicamente para não embutir a premissa de offset fixo.
 */
function brOffsetMinutes(instant: Date): number {
  return (new Date(brWallClock(instant) + 'Z').getTime() - instant.getTime()) / 60_000;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Detecta strings que já carregam fuso explícito: "…Z" ou "…+03:00" / "…-0300". */
const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/* ──────────────── ESCRITA: string do formulário → Date (UTC) ──────────────── */

/**
 * Interpreta uma string "solta" do formulário como horário de Brasília.
 *
 * Aceita "YYYY-MM-DD", "YYYY-MM-DDTHH:mm" e "YYYY-MM-DDTHH:mm:ss".
 * Datas sem horário são ancoradas ao meio-dia BRT — mesma convenção já gravada
 * no banco, que evita virada de dia em qualquer leitura.
 * Strings que já trazem fuso (Z / ±HH:MM) são repassadas intactas.
 */
export function parseBRLocal(local: string | null | undefined): Date | null {
  if (!local) return null;
  if (HAS_ZONE.test(local)) return toDate(local);

  const [datePart, timePartRaw] = local.split('T');
  const timePart = timePartRaw || '12:00:00'; // âncora meio-dia
  const hhmmss = timePart.length === 5 ? `${timePart}:00` : timePart;

  const asIfUTC = new Date(`${datePart}T${hhmmss}.000Z`);
  if (isNaN(asIfUTC.getTime())) return null;

  // Duas passadas: o offset precisa ser avaliado no instante *resultante*,
  // senão relógios de parede dentro de uma transição de DST caem 1h fora.
  let utc = new Date(asIfUTC.getTime() - brOffsetMinutes(asIfUTC) * 60_000);
  utc = new Date(asIfUTC.getTime() - brOffsetMinutes(utc) * 60_000);
  return utc;
}

/**
 * Combina os campos separados <input type="date"> + <input type="time">.
 * Sem data ou sem hora não existe instante: retorna null.
 */
export function parseBRDateAndTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date || !time) return null;
  return parseBRLocal(`${date}T${time}`);
}

/* ──────────────── LEITURA (INSTANTE) → valor de <input> ──────────────── */

/** "YYYY-MM-DD" para <input type="date">. */
export function toBRDateInput(date: string | Date | null | undefined): string {
  const d = toDate(date);
  return d ? brWallClock(d).slice(0, 10) : '';
}

/** "HH:mm" para <input type="time">. */
export function toBRTimeInput(date: string | Date | null | undefined): string {
  const d = toDate(date);
  return d ? brWallClock(d).slice(11, 16) : '';
}

/** "YYYY-MM-DDTHH:mm" para <input type="datetime-local">. */
export function toBRDateTimeInput(date: string | Date | null | undefined): string {
  const d = toDate(date);
  return d ? brWallClock(d).slice(0, 16) : '';
}

/* ──────────────── LEITURA (INSTANTE) → exibição ──────────────── */

/** Hora do evento em Brasília, "19:30". Use para startTime/endTime/checkInAt. */
export function formatInstantTimeBR(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return '--:--';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BR_TIME_ZONE,
  });
}

/** Dia civil do evento em Brasília, "04/08/2026". */
export function formatInstantDateBR(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return '--/--/----';
  return d.toLocaleDateString('pt-BR', { timeZone: BR_TIME_ZONE });
}

/** Data e hora do evento em Brasília, "04/08/2026 19:30". */
export function formatInstantBR(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return '--/--/---- --:--';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BR_TIME_ZONE,
  });
}

/* ──────────────── "hoje" e limites de consulta ──────────────── */

/**
 * Dia civil de hoje em Brasília, "YYYY-MM-DD".
 * Substitui new Date().toISOString().split('T')[0], que devolve o dia UTC.
 */
export function brToday(now: Date = new Date()): string {
  return toBRDateInput(now);
}

/** Instante UTC do início do dia civil BRT. */
export function startOfBRDay(civilDate: string): Date {
  return parseBRLocal(`${civilDate}T00:00:00`) as Date;
}

/** Instante UTC do início do dia civil BRT seguinte (limite exclusivo). */
export function endOfBRDay(civilDate: string): Date {
  const start = startOfBRDay(civilDate);
  // +36h garante cair no dia seguinte mesmo com transição de DST pelo caminho.
  const nextDay = toBRDateInput(new Date(start.getTime() + 36 * 3_600_000));
  return startOfBRDay(nextDay);
}

/* ──────────────── DATA CIVIL ──────────────── */

/**
 * Converte uma data (string ISO ou objeto Date) que vem do banco de dados (UTC)
 * para um objeto Date local que preserva o dia literal.
 * Útil para campos de data que não deveriam sofrer conversão de fuso horário.
 */
export function toLocalDate(date: string | Date): Date {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date();
  
  // Se for uma string ISO terminando em Z e sem horário (ex: 2026-04-08T00:00:00Z)
  // ou se quisermos apenas garantir que o "dia" seja mantido independente do fuso:
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Formata uma data para exibição em pt-BR (dia/mês/ano)
 * mantendo o dia literal sem shift de fuso horário.
 */
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return '--/--/----';
  const d = toLocalDate(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata o horário para exibição em pt-BR (HH:MM).
 *
 * @deprecated Não informa timeZone, portanto usa o fuso do processo — UTC em
 * produção. Use formatInstantTimeBR para horários reais (aulas, check-in).
 */
export function formatTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '--:--';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "YYYY-MM-DD" para <input type="date"> a partir de um campo de DATA CIVIL. */
export function toCivilDateInput(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Data civil digitada no formulário → meio-dia UTC.
 * Torna explícita a convenção que hoje depende do fuso do servidor.
 */
export function parseCivilDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(`${input}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}
