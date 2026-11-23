import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import EventCalendar from '@/modules/events/components/EventCalendar/EventCalendar';
import '@/modules/events/components/EventCalendar/CalendarDayEdit';
import events from '@/modules/events/store/events.slice';
import eventService from '@/modules/events/services/event.service';
import marketService from '@/modules/market/services/market.service';
import mealService from '@/modules/meal/services/meal.service';
import paymentService from '@/modules/payment/services/payment.service';

vi.mock('@/modules/events/services/event.service', () => ({
  default: { getMarkets: vi.fn(), getMeals: vi.fn(), getPayments: vi.fn() },
}));
vi.mock('@/modules/market/services/market.service', () => ({
  default: { createMarket: vi.fn(), updateMarket: vi.fn(), deleteMarket: vi.fn() },
}));
vi.mock('@/modules/meal/services/meal.service', () => ({
  default: { updateMeal: vi.fn(), deleteMeal: vi.fn() },
}));
vi.mock('@/modules/payment/services/payment.service', () => ({
  default: { updatePayment: vi.fn(), deletePayment: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/services/api/client/apiClient', () => ({
  default: { get: vi.fn(async () => ({ data: {} })) },
}));
vi.mock('@/modules/events/components/EventCalendar/MarketScheduleModal', () => ({ default: () => null }));
vi.mock('@/modules/events/store/marketSchedule.slice', () => ({
  fetchMonthSchedule: () => ({ type: 'schedule/fetch' }),
  fetchAvailableDates: () => ({ type: 'schedule/dates' }),
  removeMarketScheduledDate: () => ({ type: 'schedule/remove' }),
}));
vi.mock('@/modules/events/components/EventCalendar/CalendarGrid', () => ({
  default: ({ onCellClick, onNextMonth }) => (
    <>
      <button onClick={() => onCellClick('2026-11-22')}>Open test day</button>
      <button onClick={onNextMonth}>Next test month</button>
    </>
  ),
}));

const ownUser = { _id: 'owner', name: 'Member One', role: 'user' };
const market = {
  _id: 'market-1', user: ownUser, date: '2026-11-22', amount: 510, items: 'Rice and potatoes',
};
const closedPayment = {
  _id: 'paid', user: ownUser, paymentDate: '2026-11-22', status: 'completed', amount: 500,
};
const draftPayment = { ...closedPayment, _id: 'new', status: 'pending', paymentMethod: 'cash' };
const adminUser = { _id: 'admin', name: 'Admin', role: 'admin' };

const Navigation = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('?view=payments')}>Switch test tab</button>;
};

const renderCalendar = (user = ownUser, view = 'markets') => {
  const store = configureStore({
    reducer: {
      events,
      auth: (state = { user }) => state,
      marketSchedule: (state = { monthSchedule: {} }) => state,
    },
    preloadedState: { events: { currentMonth: '2026-11-05T00:00:00.000Z' } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/?view=${view}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navigation />
        <EventCalendar />
      </MemoryRouter>
    </Provider>,
  );
};

const expectEditActionsInFooter = () => {
  const dialog = screen.getByRole('dialog');
  const footer = dialog.querySelector('[data-modal-footer]');
  const form = dialog.querySelector('[data-modal-body] form');
  const save = screen.getByRole('button', { name: 'Save Updates' });
  const cancel = screen.getByRole('button', { name: 'Cancel edit' });
  expect(footer).toContainElement(save);
  expect(footer).toContainElement(cancel);
  expect(form).toBeInTheDocument();
  expect(save.form).toBe(form);
  return save;
};

const openMarketEdit = async () => {
  fireEvent.click(screen.getByText('Open test day'));
  const row = await screen.findByRole('button', { name: 'Edit market entry for Member One' });
  expect(screen.queryByRole('button', { name: 'Edit market entry for Member Two' })).toBeNull();
  expect(screen.getByText(/^Select an editable row/)).toBeVisible();
  fireEvent.click(row);
  expect(screen.queryByText(/^Select an editable row/)).not.toBeInTheDocument();
  await screen.findByLabelText('Items purchased');
  return expectEditActionsInFooter();
};

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const openManageEntries = async () => {
  fireEvent.click(screen.getByText('Open test day'));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage entries' }));
  await screen.findByRole('button', { name: 'This day' });
};

const startDelete = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  return screen.getByRole('button', { name: 'Confirm delete' });
};

describe('calendar day edits', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    eventService.getMarkets.mockResolvedValue({
      data: { markets: [market, { ...market, _id: 'other', user: { _id: 'other', name: 'Member Two' } }] },
    });
    eventService.getPayments.mockResolvedValue({ data: { results: [closedPayment, draftPayment] } });
    eventService.getMeals.mockResolvedValue({ data: { meals: [] } });
  });

  it('validates items, keeps the editor on network failure and closes once after a single refresh', async () => {
    renderCalendar();
    const save = await openMarketEdit();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveFocus();
    const items = screen.getByLabelText('Items purchased');
    expect(items).toHaveValue(market.items);

    for (const invalid of ['', '    ', 'a 1b!c']) {
      fireEvent.change(items, { target: { value: invalid } });
      fireEvent.click(save);
      expect(screen.getByRole('alert')).toHaveTextContent('at least 4 letters');
    }
    expect(marketService.updateMarket).not.toHaveBeenCalled();
    fireEvent.change(items, { target: { value: '  কলমখ  ' } });
    marketService.updateMarket.mockRejectedValueOnce(new Error('Connection lost'));
    fireEvent.click(save);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Connection lost'));
    expect(save).toBeEnabled();
    expect(items).toHaveValue('  কলমখ  ');

    const write = deferred();
    const refresh = deferred();
    marketService.updateMarket.mockReturnValueOnce(write.promise);
    eventService.getMarkets.mockReturnValueOnce(refresh.promise);
    act(() => {
      fireEvent.submit(save.form);
      fireEvent.submit(save.form);
    });
    expect(save).toBeDisabled();
    const pendingDialog = screen.getByRole('dialog');
    expect(pendingDialog).toHaveFocus();
    expect(pendingDialog).toHaveAttribute('aria-busy', 'true');
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(pendingDialog).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(marketService.updateMarket).toHaveBeenCalledTimes(2);
    expect(marketService.updateMarket).toHaveBeenLastCalledWith('market-1', expect.objectContaining({ items: 'কলমখ' }));
    await act(() => write.resolve({ data: market }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(() => refresh.resolve({ data: { markets: [{ ...market, items: 'কলমখ' }] } }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(eventService.getMarkets).toHaveBeenCalledTimes(2);

    await openMarketEdit();
    expect(screen.getByLabelText('Items purchased')).toHaveValue('কলমখ');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
    expect(screen.getByRole('button', { name: 'Edit market entry for Member One' })).toHaveFocus();
    expect(screen.getByText(/^Select an editable row/)).toBeVisible();
  });

  it.each(['Switch test tab', 'Next test month'])('ignores the old save after %s', async (navigationLabel) => {
    renderCalendar();
    const save = await openMarketEdit();
    const write = deferred();
    marketService.updateMarket.mockReturnValueOnce(write.promise);
    fireEvent.click(save);
    fireEvent.click(screen.getByText(navigationLabel));
    fireEvent.click(screen.getByText('Open test day'));
    const reopened = screen.getByRole('dialog');
    await act(() => write.resolve({ data: market }));
    expect(reopened).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save Updates' })).toBeNull();
  });

  it('reopens with the confirmed amount when refresh fails and sends only the next edit', async () => {
    renderCalendar();
    const save = await openMarketEdit();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '810.25' } });
    const saved = { ...market, amount: 810.25 };
    marketService.updateMarket.mockResolvedValueOnce({ data: saved });
    eventService.getMarkets.mockRejectedValueOnce(new Error('Calendar refresh unavailable'));
    fireEvent.click(save);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const saveAgain = await openMarketEdit();
    expect(screen.getByLabelText('Amount')).toHaveValue('810.25');
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Only this changed' } });
    marketService.updateMarket.mockResolvedValueOnce({ data: { ...saved, description: 'Only this changed' } });
    fireEvent.click(saveAgain);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(marketService.updateMarket).toHaveBeenLastCalledWith('market-1', { description: 'Only this changed' });
  });

  it('validates market items on Add and closes after a valid submission', async () => {
    eventService.getMarkets.mockResolvedValue({ data: { markets: [] } });
    marketService.createMarket.mockResolvedValue({ data: market });
    renderCalendar();
    fireEvent.click(screen.getByText('Open test day'));
    fireEvent.click(screen.getByRole('button', { name: 'Add market entry' }));
    const items = await screen.findByLabelText('Items purchased');
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: 510 } });
    fireEvent.change(items, { target: { value: 'a 1b!c' } });
    fireEvent.blur(items);
    expect(screen.getByRole('alert')).toHaveTextContent('at least 4 letters');
    expect(screen.getByRole('button', { name: /Save .* entry/ })).toBeDisabled();
    expect(marketService.createMarket).not.toHaveBeenCalled();
    fireEvent.change(items, { target: { value: '  কলমখ  ' } });
    fireEvent.submit(items.form);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(marketService.createMarket).toHaveBeenCalledOnce();
    expect(marketService.createMarket).toHaveBeenCalledWith(expect.objectContaining({ items: 'কলমখ', amount: 510 }));
  });

  it('shows an edit control only for an eligible payment owned by the member', async () => {
    renderCalendar(ownUser, 'payments');
    fireEvent.click(screen.getByText('Open test day'));
    const row = await screen.findByRole('button', { name: 'Edit payment entry for Member One' });
    expect(screen.getByText('Paid', { selector: 'span' }).closest('button')).toBeNull();
    expect(screen.getByText(/^Select an editable row/)).toBeVisible();
    fireEvent.click(row);
    expect(await screen.findByRole('textbox', { name: 'Amount' })).toHaveValue('500');
    expect(screen.queryByText(/^Select an editable row/)).not.toBeInTheDocument();
    expectEditActionsInFooter();
    expect(screen.queryByLabelText('Status')).toBeNull();
  });

  it('omits edit guidance when all of a member’s payments are locked', async () => {
    eventService.getPayments.mockResolvedValue({ data: { results: [closedPayment] } });
    renderCalendar(ownUser, 'payments');
    fireEvent.click(screen.getByText('Open test day'));
    expect(await screen.findByText('Paid', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText(/^Select an editable row/)).not.toBeInTheDocument();
  });

  it('prefills another member’s meal for admins and handles Escape', async () => {
    eventService.getMeals.mockResolvedValue({
      data: {
        meals: [{
          _id: 'meal-1', date: market.date, user: ownUser, type: 'night', guestCount: 2,
          isGuestMeal: true, remarks: 'Serving after eight',
        }],
      },
    });
    renderCalendar({ _id: 'admin', name: 'Admin', role: 'admin' }, 'meals');
    fireEvent.click(screen.getByText('Open test day'));
    const row = await screen.findByRole('button', { name: 'Edit meal entry for Member One' });
    expect(screen.getByText(/^Select an editable row/)).toBeVisible();
    fireEvent.click(row);
    const mealType = await screen.findByRole('button', { name: 'Night Evening only' });
    expect(screen.queryByText(/^Select an editable row/)).not.toBeInTheDocument();
    expectEditActionsInFooter();
    expect(mealType).toHaveFocus();
    expect(mealType).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Remarks')).toHaveValue('Serving after eight');
    expect(screen.getByRole('spinbutton', { name: 'Guest meals count' })).toHaveValue('2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lets a member bulk edit their markets across days and validates the shared fields', async () => {
    const second = { ...market, _id: 'market-2', date: '2026-11-23', items: 'Fresh tomatoes' };
    const other = { ...market, _id: 'other', user: { _id: 'other', name: 'Member Two' } };
    const records = [{ ...market }, second, other];
    eventService.getMarkets.mockResolvedValue({ data: { markets: records } });
    marketService.updateMarket.mockImplementation(async (id, fields) => {
      const entry = records.find((record) => record._id === id);
      Object.assign(entry, fields);
      return { data: entry };
    });
    renderCalendar();
    await openManageEntries();
    expect(screen.getAllByRole('button', { name: /^Select market/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled();
    const thisMonth = screen.getByRole('button', { name: 'This month' });
    fireEvent.click(thisMonth);
    expect(screen.getAllByRole('button', { name: /^Select market/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Select market entry for Member Two/ })).toBeNull();

    fireEvent.click(screen.getByText('Select all'));
    const selected = screen.getByRole('checkbox', { name: 'Deselect all entries' });
    expect(selected).toBeChecked();
    fireEvent.click(thisMonth);
    expect(selected).toBeChecked();
    expect(thisMonth).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Edit selected' }));
    const items = await screen.findByLabelText('Items purchased');
    const save = expectEditActionsInFooter();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveFocus();
    fireEvent.change(items, { target: { value: 'a 1b!c' } });
    fireEvent.click(save);
    expect(screen.getByRole('alert')).toHaveTextContent('at least 4 letters');
    expect(marketService.updateMarket).not.toHaveBeenCalled();
    fireEvent.change(items, { target: { value: '  কলমখ  ' } });
    fireEvent.click(save);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 entries updated'));
    expect(marketService.updateMarket.mock.calls).toEqual([
      ['market-1', { items: 'কলমখ' }], ['market-2', { items: 'কলমখ' }],
    ]);
    expect(eventService.getMarkets).toHaveBeenCalledTimes(2);
    expect(records[2].items).toBe('Rice and potatoes');
  });

  it('opens the existing prefilled editor for a single selected market', async () => {
    renderCalendar();
    await openManageEntries();
    fireEvent.click(screen.getByRole('button', { name: /^Select market entry for Member One/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit selected' }));
    expect(await screen.findByLabelText('Items purchased')).toHaveValue(market.items);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
    expect(await screen.findByRole('button', { name: /^Select market entry for Member One/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('confirms admin meal deletion and retries only failed entries', async () => {
    let meals = [
      { _id: 'meal-1', date: market.date, user: ownUser, type: 'both' },
      { _id: 'meal-2', date: market.date, user: { _id: 'other', name: 'Member Two' }, type: 'day' },
    ];
    const first = deferred();
    let failSecond = true;
    eventService.getMeals.mockImplementation(async () => ({ data: { meals } }));
    mealService.deleteMeal.mockImplementation(async (id) => {
      if (id === 'meal-1') await first.promise;
      if (id === 'meal-2' && failSecond) throw new Error('Connection lost');
      meals = meals.filter((meal) => meal._id !== id);
    });
    renderCalendar(adminUser, 'meals');
    await openManageEntries();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all entries' }));
    startDelete();
    expect(screen.getByRole('alertdialog', { name: 'Delete 2 entries?' })).toHaveAccessibleDescription(/permanently deletes/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mealService.deleteMeal).not.toHaveBeenCalled();
    const confirm = startDelete();
    act(() => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    expect(confirm).toBeDisabled();
    expect(mealService.deleteMeal.mock.calls).toEqual([['meal-1'], ['meal-2']]);
    await act(() => first.resolve());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('1 of 2 entries deleted. Connection lost'));
    expect(screen.getAllByRole('button', { name: /^Select meal/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Select meal entry for Member Two/ })).toHaveAttribute('aria-pressed', 'true');
    failSecond = false;
    fireEvent.click(startDelete());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 entry deleted'));
    expect(mealService.deleteMeal.mock.calls).toEqual([['meal-1'], ['meal-2'], ['meal-2']]);
    expect(eventService.getMeals).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('deletes an owned cash draft and prevents selecting settled or unrelated payments as a member', async () => {
    const otherDraft = { ...draftPayment, _id: 'other', user: { _id: 'other', name: 'Member Two' } };
    const awaiting = { ...draftPayment, _id: 'awaiting', status: 'pending_verification', paymentMethod: 'upi_manual' };
    eventService.getPayments.mockResolvedValue({ data: { results: [closedPayment, draftPayment, otherDraft, awaiting] } });
    paymentService.deletePayment.mockImplementation(async () => {
      eventService.getPayments.mockResolvedValue({ data: { results: [closedPayment, otherDraft, awaiting] } });
    });
    renderCalendar(ownUser, 'payments');
    await openManageEntries();
    const [draft, gateway] = screen.getAllByRole('button', { name: /^Select payment entry for Member One/ });
    expect(screen.getAllByRole('button', { name: /^Select payment/ })).toHaveLength(2);
    fireEvent.click(gateway);
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled();
    fireEvent.click(gateway);
    fireEvent.click(draft);
    fireEvent.click(startDelete());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 entry deleted'));
    expect(paymentService.deletePayment.mock.calls).toEqual([['new']]);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    await openManageEntries();
    expect(screen.getAllByRole('button', { name: /^Select payment/ })).toHaveLength(1);
  });

  it('keeps the confirmation locked through refresh, then closes and clears selection', async () => {
    renderCalendar();
    await openManageEntries();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all entries' }));
    const refresh = deferred();
    eventService.getMarkets.mockReturnValueOnce(refresh.promise);
    marketService.deleteMarket.mockResolvedValueOnce(undefined);
    fireEvent.click(startDelete());
    await waitFor(() => expect(eventService.getMarkets).toHaveBeenCalledTimes(2));
    const confirmation = screen.getByRole('alertdialog', { name: 'Delete 1 entry?' });
    expect(confirmation).toHaveAttribute('aria-busy', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirmation).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    await act(() => refresh.resolve({ data: { markets: [] } }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('1 entry deleted');
    fireEvent.click(screen.getByText('Open test day'));
    expect(screen.queryByRole('button', { name: 'Delete selected' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage entries' })).toBeNull();
  });

  it('reconciles a missing entry on retry after the original delete response was lost', async () => {
    renderCalendar();
    await openManageEntries();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all entries' }));
    const confirm = startDelete();
    marketService.deleteMarket.mockRejectedValueOnce(new Error('Connection lost'));
    fireEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(toast.error).toHaveBeenCalledWith('0 of 1 entries deleted. Connection lost');
    expect(screen.getByRole('alertdialog')).toBeVisible();

    marketService.deleteMarket.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Market entry not found' } },
    });
    eventService.getMarkets.mockResolvedValueOnce({ data: { markets: [] } });
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(marketService.deleteMarket).toHaveBeenCalledTimes(2);
    expect(eventService.getMarkets).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('1 entry deleted');
  });

  it.each(['still present', 'refresh failed'])('keeps a 404 confirmation open when the entry is %s', async (scenario) => {
    renderCalendar();
    await openManageEntries();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all entries' }));
    const confirm = startDelete();
    if (scenario === 'refresh failed') eventService.getMarkets.mockRejectedValueOnce(new Error('Refresh unavailable'));
    marketService.deleteMarket.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Market entry not found' } },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(toast.error).toHaveBeenCalledWith('0 of 1 entries deleted. Market entry not found');
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeVisible();
  });

  it('ignores a completed delete after the user switches tabs', async () => {
    renderCalendar();
    await openManageEntries();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all entries' }));
    const deletion = deferred();
    marketService.deleteMarket.mockReturnValueOnce(deletion.promise);
    fireEvent.click(startDelete());
    fireEvent.click(screen.getByText('Switch test tab'));
    fireEvent.click(screen.getByText('Open test day'));
    const payments = await screen.findByRole('dialog', { name: /Payments/ });

    await act(() => deletion.resolve());
    expect(payments).toBeVisible();
    expect(toast.success).not.toHaveBeenCalled();
    expect(eventService.getMarkets).toHaveBeenCalledTimes(1);
  });
});
