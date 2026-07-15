import { fireEvent, render } from '@testing-library/react-native';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcon');
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('exposes a retry action on errors', () => {
    const retry = jest.fn();
    const { getByRole, getByText } = render(
      <ErrorState message="Falha ao carregar" onRetry={retry} />,
    );

    expect(getByText('Falha ao carregar')).toBeTruthy();
    const button = getByRole('button', { name: 'Tentar novamente' });
    expect(button.props.className).toContain('min-h-11');
    fireEvent.press(button);

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
