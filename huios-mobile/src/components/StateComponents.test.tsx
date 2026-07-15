import { render } from '@testing-library/react-native';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcon');
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('shared state components', () => {
  it('describes an empty result with an accessible icon and supporting text', () => {
    const { getByLabelText, getByText } = render(
      <EmptyState
        icon="event-busy"
        title="Nenhuma aula"
        message="Sua agenda está livre por enquanto."
      />,
    );

    expect(getByLabelText('Agenda vazia')).toBeTruthy();
    expect(getByText('Nenhuma aula')).toBeTruthy();
    expect(getByText('Sua agenda está livre por enquanto.')).toBeTruthy();
  });

  it('announces loading and renders the requested number of placeholders', () => {
    const { getByLabelText, getAllByTestId } = render(<LoadingSkeleton count={3} />);

    expect(getByLabelText('Carregando conteúdo')).toBeTruthy();
    expect(getAllByTestId('loading-skeleton-item')).toHaveLength(3);
  });
});
