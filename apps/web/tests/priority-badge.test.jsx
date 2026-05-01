import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '@/components/priority-badge';

describe('<PriorityBadge />', () => {
  test('renders the priority label', () => {
    render(<PriorityBadge p="HIGH" />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  test('applies a different class per priority', () => {
    const { rerender, container } = render(<PriorityBadge p="LOW" />);
    const low = container.firstChild.className;
    rerender(<PriorityBadge p="URGENT" />);
    const urgent = container.firstChild.className;
    expect(low).not.toBe(urgent);
  });
});
