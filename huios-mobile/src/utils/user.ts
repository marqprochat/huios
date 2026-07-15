import type { User } from '@/types';

export const getDisplayName = (user: User | null): string =>
  user?.student?.name?.trim() || user?.name?.trim() || 'Aluno';

export const getInitials = (user: User | null): string =>
  getDisplayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
