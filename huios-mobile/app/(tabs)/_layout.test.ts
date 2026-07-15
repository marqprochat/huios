jest.mock('expo-router', () => ({ Tabs: Object.assign(() => null, { Screen: () => null }) }));

import { TAB_ROUTES } from './_layout';
import { MORE_DESTINATIONS } from './mais';

describe('configuração das abas', () => {
  it('mantém somente os quatro destinos principais na ordem aprovada', () => {
    expect(TAB_ROUTES).toEqual(['index', 'aulas', 'provas', 'mais']);
  });
});

describe('menu Mais', () => {
  it('expõe frequência, boletim e perfil como rotas secundárias', () => {
    expect(MORE_DESTINATIONS.map(({ label, route, icon }) => ({ label, route, icon }))).toEqual([
      { label: 'Frequência', route: '/frequencia', icon: 'fact-check' },
      { label: 'Boletim', route: '/boletim', icon: 'school' },
      { label: 'Perfil', route: '/perfil', icon: 'person' },
    ]);
  });
});
