/**
 * Conversão de data/hora "solta" (vinda de formulário/JSON, sem fuso) para o
 * instante UTC correspondente no horário de Brasília.
 *
 * Espelha src/lib/date-utils.ts do huios-admin: as duas aplicações escrevem nas
 * mesmas colunas (Lesson.date / startTime / endTime) e precisam usar exatamente
 * a mesma convenção. Nunca dependa do fuso do processo Node — ele roda em UTC.
 */

export const BR_TIME_ZONE = 'America/Sao_Paulo';

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

function brWallClock(date: Date): string {
  return brIsoFmt.format(date).replace(' ', 'T');
}

function brOffsetMinutes(instant: Date): number {
  return (new Date(brWallClock(instant) + 'Z').getTime() - instant.getTime()) / 60_000;
}

const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Interpreta a string como horário de Brasília.
 * Datas sem hora são ancoradas ao meio-dia BRT, igual ao huios-admin.
 * Strings que já trazem fuso são repassadas intactas.
 */
export function parseBRLocal(local: string | null | undefined): Date | null {
  if (!local) return null;
  if (HAS_ZONE.test(local)) {
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d;
  }

  const [datePart, timePartRaw] = local.split('T');
  const timePart = timePartRaw || '12:00:00';
  const hhmmss = timePart.length === 5 ? `${timePart}:00` : timePart;

  const asIfUTC = new Date(`${datePart}T${hhmmss}.000Z`);
  if (isNaN(asIfUTC.getTime())) return null;

  // Duas passadas: o offset é avaliado no instante resultante.
  let utc = new Date(asIfUTC.getTime() - brOffsetMinutes(asIfUTC) * 60_000);
  utc = new Date(asIfUTC.getTime() - brOffsetMinutes(utc) * 60_000);
  return utc;
}

/** Combina os campos separados de data e hora. Sem um dos dois, não há instante. */
export function parseBRDateAndTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date || !time) return null;
  // A hora pode chegar como "19:30" ou já como data/hora completa.
  return time.includes('T') ? parseBRLocal(time) : parseBRLocal(`${date}T${time}`);
}
