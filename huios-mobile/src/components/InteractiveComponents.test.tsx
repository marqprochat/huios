import { fireEvent, render } from '@testing-library/react-native';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcon');
import { MenuRow } from './MenuRow';
import { MetricCard } from './MetricCard';
import type { MetricCardProps } from './MetricCard';

// @ts-expect-error non-neutral states must include a visible semantic label
const invalidMetricProps: MetricCardProps = { icon: 'warning', label: 'Faltas', value: '8', status: 'danger' };
void invalidMetricProps;

describe('shared interactive components', () => {
  it('makes the complete menu row an accessible touch target', () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = render(
      <MenuRow
        icon="person"
        label="Perfil"
        description="Veja seus dados pessoais"
        onPress={onPress}
      />,
    );

    expect(getByText('Veja seus dados pessoais')).toBeTruthy();
    const button = getByRole('button', { name: 'Perfil. Veja seus dados pessoais' });
    expect(button.props.className).toContain('min-h-11');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses text as well as color to communicate a metric status', () => {
    const { getByText } = render(
      <MetricCard
        icon="event-available"
        label="Frequência geral"
        value="92%"
        status="positive"
        statusLabel="Dentro da meta"
      />,
    );

    expect(getByText('Frequência geral')).toBeTruthy();
    expect(getByText('92%')).toBeTruthy();
    expect(getByText('Dentro da meta')).toBeTruthy();
  });

  it('allows a neutral metric without a status label', () => {
    const { queryByText, getByText } = render(
      <MetricCard icon="event" label="Próximas provas" value="2" status="neutral" />,
    );

    expect(getByText('Próximas provas')).toBeTruthy();
    expect(queryByText('Dentro da meta')).toBeNull();
  });
});
