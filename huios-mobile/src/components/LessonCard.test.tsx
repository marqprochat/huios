import { render } from '@testing-library/react-native';
import type { Lesson } from '@/types';
import { LessonCard } from './LessonCard';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('LessonCard', () => {
  it('lets long lesson names wrap without truncating them', () => {
    const lesson: Lesson = {
      id: 'lesson-1',
      title: 'Fundamentos avançados de desenvolvimento de aplicações para dispositivos móveis',
      date: '2026-07-15T12:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
    };

    const { getByText } = render(<LessonCard lesson={lesson} />);

    expect(getByText(lesson.title).props.numberOfLines).toBeUndefined();
  });

  it('formats the lesson civil date in America/Sao_Paulo', () => {
    const dateSpy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('15/07/2026');
    render(<LessonCard lesson={{
      id: 'lesson-timezone', title: 'Aula noturna', startTime: '2026-07-16T01:30:00.000Z', endTime: null,
      date: '2026-07-16T01:30:00.000Z',
    }} />);

    expect(dateSpy).toHaveBeenCalledWith('pt-BR', { timeZone: 'America/Sao_Paulo' });
    dateSpy.mockRestore();
  });
});
