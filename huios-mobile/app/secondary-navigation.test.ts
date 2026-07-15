import { ROOT_NAVIGATION_SETTINGS, returnFromSecondaryScreen } from './secondary-navigation';

describe('navegação das telas secundárias', () => {
  it('ancora deep links no grupo de abas', () => {
    expect(ROOT_NAVIGATION_SETTINGS).toEqual({ anchor: '(tabs)' });
  });

  it('volta pelo histórico quando ele existe', () => {
    const router = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
    returnFromSecondaryScreen(router);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('retorna para Mais quando um deep link não possui histórico', () => {
    const router = { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() };
    returnFromSecondaryScreen(router);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/mais');
  });
});
