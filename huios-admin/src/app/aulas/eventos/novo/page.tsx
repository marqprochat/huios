import { redirect } from 'next/navigation';

export default function LegacyNovoEventoPage() {
  redirect('/eventos/novo');
}
