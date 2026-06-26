'use client';

import { useState } from 'react';
import { maskCpf, maskPhone, isValidCPF, isValidPhone } from '@/lib/masks';

type Mask = 'phone' | 'cpf';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'value' | 'onChange'> {
  mask: Mask;
  /** Valor inicial (uncontrolled, ideal para forms com server action). */
  defaultValue?: string;
}

const apply = (mask: Mask, v: string) => (mask === 'cpf' ? maskCpf(v) : maskPhone(v));

/**
 * Input com máscara de telefone/CPF e validação nativa (setCustomValidity),
 * funcionando em formulários que usam `action` (server actions) sem JS extra.
 */
export function MaskedInput({ mask, defaultValue = '', required, ...rest }: Props) {
  const [value, setValue] = useState(() => apply(mask, defaultValue));

  const validate = (el: HTMLInputElement, masked: string) => {
    if (!masked) {
      el.setCustomValidity(''); // vazio: o `required` nativo cuida da obrigatoriedade
      return;
    }
    if (mask === 'cpf' && !isValidCPF(masked)) {
      el.setCustomValidity('CPF inválido. Verifique os dígitos.');
    } else if (mask === 'phone' && !isValidPhone(masked)) {
      el.setCustomValidity('Telefone inválido. Use (99) 99999-9999.');
    } else {
      el.setCustomValidity('');
    }
  };

  return (
    <input
      {...rest}
      required={required}
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const masked = apply(mask, e.target.value);
        validate(e.target, masked);
        setValue(masked);
      }}
      onBlur={(e) => validate(e.target, value)}
    />
  );
}
