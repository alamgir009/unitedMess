import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GuestMealField from '@/shared/components/ui/GuestMealField/GuestMealField';

describe('GuestMealField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders State 0 with "Add guest meal" outlined button when value is 0', () => {
    render(<GuestMealField value={0} onChange={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Guest meals' })).toBeInTheDocument();
    expect(screen.getByText('Added to each selected meal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add guest meal/i })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('calls onChange with 1 when clicking "Add guest meal"', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={0} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Add guest meal/i }));
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('renders State > 0 stepper with 44x44 targets and numeric spinbutton when value > 0', () => {
    render(<GuestMealField value={3} onChange={vi.fn()} max={20} />);

    expect(screen.getByRole('button', { name: 'Decrease guest meals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase guest meals' })).toBeInTheDocument();

    const input = screen.getByRole('spinbutton', { name: 'Guest meals count' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('3');
    expect(input).toHaveAttribute('inputMode', 'numeric');
  });

  it('increments value on clicking Increase button', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={3} onChange={handleChange} max={20} />);

    fireEvent.click(screen.getByRole('button', { name: 'Increase guest meals' }));
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('decrements value on clicking Decrease button', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={3} onChange={handleChange} max={20} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease guest meals' }));
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('returns to 0 when decremented from 1', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={1} onChange={handleChange} max={20} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease guest meals' }));
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('supports direct numeric typing and keyboard arrows', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={2} onChange={handleChange} max={20} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5' } });
    expect(handleChange).toHaveBeenCalledWith(5);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith(6);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('accelerates count on long press (400ms delay then repeating)', () => {
    const handleChange = vi.fn();
    render(<GuestMealField value={2} onChange={handleChange} max={20} />);

    const incButton = screen.getByRole('button', { name: 'Increase guest meals' });
    fireEvent.pointerDown(incButton);

    expect(handleChange).not.toHaveBeenCalled();

    // Advance 400ms to trigger initial interval
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(handleChange).toHaveBeenCalledWith(3);

    // Advance another 80ms to trigger repeat
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(handleChange).toHaveBeenCalledWith(4);

    // Release pointerup should clear timers
    fireEvent.pointerUp(incButton);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(handleChange).toHaveBeenCalledTimes(2);
  });

  it('honors disabled state in both State 0 and State > 0', () => {
    const { rerender } = render(<GuestMealField value={0} disabled onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Add guest meal/i })).toBeDisabled();

    rerender(<GuestMealField value={3} disabled onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease guest meals' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase guest meals' })).toBeDisabled();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });
});
