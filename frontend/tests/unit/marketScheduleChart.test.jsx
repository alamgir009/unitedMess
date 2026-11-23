import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import MarketScheduleChart from '@/modules/market/components/MarketScheduleChart/MarketScheduleChart';

it('keeps the schedule toggle and Today actions independent', () => {
    const schedule = [{ _id: 'today', date: new Date(), user: { name: 'Asha Kumar' } }];
    const onToggle = vi.fn();
    const { container, rerender } = render(
        <MarketScheduleChart schedule={schedule} isCollapsed={false} onToggle={onToggle} />,
    );
    const toggle = screen.getByRole('button', { name: 'Market Schedule' });
    const today = screen.getByRole('button', { name: 'Today' });
    const todayCard = screen.getByText('Asha').closest('div');
    todayCard.scrollIntoView = vi.fn();

    expect(container.querySelector('button button')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(today);
    expect(todayCard.scrollIntoView).toHaveBeenCalledWith(
        { behavior: 'smooth', inline: 'center', block: 'nearest' },
    );
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<MarketScheduleChart schedule={schedule} isCollapsed onToggle={onToggle} />);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
});
