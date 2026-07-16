import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const mockInsets = { top: 0, right: 0, bottom: 21, left: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Tabs = ({ children, screenOptions }: { children: ReactNode; screenOptions: unknown }) => (
    <View testID="tabs" {...{ screenOptions }}>{children}</View>
  );
  Tabs.Screen = ({ name, options }: { name: string; options: unknown }) => (
    <View testID="tab-screen" {...{ name, options }} />
  );
  return { Tabs };
});

import TabsLayout, { TAB_ROUTES, unstable_settings } from '../../app/(tabs)/_layout';

describe('barra de abas', () => {
  it('renderiza exatamente quatro telas com names, labels e ícones aprovados', () => {
    const screen = render(<TabsLayout />);
    const tabs = screen.getAllByTestId('tab-screen');

    expect(TAB_ROUTES).toEqual(['index', 'aulas', 'provas', 'mais']);
    expect(tabs.map((tab) => tab.props.name)).toEqual(TAB_ROUTES);
    expect(tabs.map((tab) => tab.props.options.title)).toEqual(['Início', 'Aulas', 'Provas', 'Mais']);

    const icons = tabs.map((tab, index) => ({ ...tab.props.options.tabBarIcon({ color: '#135bec', focused: false }), key: index }));
    const iconScreen = render(<>{icons}</>);
    ['home', 'event', 'assignment', 'more-horiz'].forEach((icon) => {
      expect(iconScreen.getByTestId(`icon-${icon}`)).toBeTruthy();
    });
  });

  it('usa Mais como rota inicial ao reconstruir as tabs para um deep link', () => {
    expect(unstable_settings).toEqual({ initialRouteName: 'mais' });
  });

  it('calcula a barra com o inset inferior real da safe area', () => {
    const screen = render(<TabsLayout />);
    const style = screen.getByTestId('tabs').props.screenOptions.tabBarStyle;

    expect(style.paddingBottom).toBe(21);
    expect(style.height).toBe(77);
  });
});
