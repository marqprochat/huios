import { getDisplayName, getInitials } from './user';

describe('user display helpers', () => {
  it('prefers the student name and falls back to the basic user name', () => {
    expect(getDisplayName({
      id: '1',
      email: 'a@b.com',
      role: 'ALUNO',
      name: 'Nome Básico',
      student: { id: 's', name: 'Nome Completo' },
    })).toBe('Nome Completo');
    expect(getDisplayName({
      id: '1',
      email: 'a@b.com',
      role: 'ALUNO',
      name: 'Nome Básico',
    })).toBe('Nome Básico');
    expect(getDisplayName(null)).toBe('Aluno');
  });

  it('trims names and derives at most two uppercase initials', () => {
    expect(getInitials({
      id: '1',
      email: 'a@b.com',
      role: 'ALUNO',
      name: '  maria das dores  ',
    })).toBe('MD');
    expect(getInitials(null)).toBe('A');
  });
});
