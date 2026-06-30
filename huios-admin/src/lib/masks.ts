// Máscaras e validações de telefone e CPF (pt-BR).
// Funções puras — usadas tanto pelo MaskedInput quanto por formulários controlados.

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Formata como (99) 99999-9999 (celular) ou (99) 9999-9999 (fixo). */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Formata como 00000-000 (CEP). */
export function maskCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/** Formata como 000.000.000-00. */
export function maskCpf(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Telefone válido: 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

/** Valida CPF pelos dígitos verificadores. */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // rejeita 000... 111... etc.

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === parseInt(cpf[10], 10);
}
