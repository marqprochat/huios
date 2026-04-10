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
 * Formata o horário para exibição em pt-BR (HH:MM)
 */
export function formatTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '--:--';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
