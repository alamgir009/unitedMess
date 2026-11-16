import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render as renderComponent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AnalyticsGuard from '@/modules/analytics/components/AnalyticsGuard';
import MemberFilter from '@/modules/analytics/components/MemberFilter';
import analyticsUi, { ALL_MEMBERS } from '@/modules/analytics/store/analytics.slice';
import { analyticsApi } from '@/modules/analytics/store/analytics.api';
import { analyticsMiddleware } from '@/modules/analytics/store/analytics.middleware';
import AnalyticsPage from '@/modules/analytics/pages/AnalyticsPage';
import { getMembers, getReport } from '@/modules/analytics/services/analytics.service';
import { formatMoney } from '@/modules/analytics/utils/format';
import PercentChange from '@/modules/analytics/components/PercentChange';

vi.mock('@/modules/analytics/services/analytics.service', () => ({ getMembers: vi.fn(), getReport: vi.fn() }));
vi.mock('@/shared/components/layout/MainLayout/MainLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('@/modules/analytics/components/ReportCharts', () => ({ default: () => <div>Report charts</div> }));

beforeEach(() => { vi.clearAllMocks(); getMembers.mockResolvedValue([]); });
const stores = [];
const render = (component) => {
    const store = configureStore({
        reducer: { auth: () => ({ user: { _id: 'admin', role: 'admin', isActive: true, userStatus: 'approved' } }), analyticsUi, [analyticsApi.reducerPath]: analyticsApi.reducer },
        middleware: (defaults) => defaults().concat(analyticsMiddleware, analyticsApi.middleware),
    });
    stores.push(store);
    return renderComponent(component, { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
};
afterEach(() => { cleanup(); stores.splice(0).forEach((store) => store.dispatch(analyticsApi.util.resetApiState())); });

describe('Analytics', () => {
    it('blocks a non-admin client route and preserves exact currency strings', () => {
        const store = configureStore({ reducer: { auth: () => ({ user: { role: 'user', userStatus: 'approved' }, sessionRestoring: false }) } });
        render(<Provider store={store}><MemoryRouter><AnalyticsGuard><div>Private analytics</div></AnalyticsGuard></MemoryRouter></Provider>);
        expect(screen.getByRole('heading', { name: '403 — Access denied' })).toBeInTheDocument();
        expect(screen.queryByText('Private analytics')).not.toBeInTheDocument();
        expect(formatMoney('9007199254740993.21')).toBe('₹9,00,71,99,25,47,40,993.21');
        expect(formatMoney('-0.10')).toBe('-₹0.10');
    });

    it('debounces member search for 300ms and supports keyboard selection and clear', async () => {
        const user = userEvent.setup();
        const alice = { _id: 'alice', name: 'Alice', email: 'alice@example.com' };
        getMembers.mockResolvedValue([alice]);
        const onChange = vi.fn();
        const view = render(<MemberFilter value={ALL_MEMBERS} onChange={onChange} />);
        expect(getMembers).not.toHaveBeenCalled();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await waitFor(() => expect(getMembers).toHaveBeenCalledWith('', expect.any(AbortSignal)));
        await user.clear(input);
        await user.type(input, 'alice@');
        expect(getMembers).not.toHaveBeenCalledWith('alice@', expect.anything());
        await waitFor(() => expect(getMembers).toHaveBeenCalledWith('alice@', expect.any(AbortSignal)));
        await user.keyboard('{ArrowDown}{End}{Enter}');
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(alice));
        const requests = getMembers.mock.calls.length;
        await user.keyboard('{ArrowDown}');
        await screen.findByRole('option', { name: /Alice/ });
        expect(getMembers).toHaveBeenCalledTimes(requests);
        await user.keyboard('{Escape}');
        view.rerender(<MemberFilter value={alice} onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Clear member filter' }));
        expect(onChange).toHaveBeenLastCalledWith(ALL_MEMBERS);
    });

    it('aborts stale report requests on tab changes and exposes retry after errors', async () => {
        const user = userEvent.setup();
        getReport.mockImplementation(() => new Promise(() => {}));
        const view = render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
        await waitFor(() => expect(getReport).toHaveBeenCalledTimes(1));
        const marketSignal = getReport.mock.calls[0][2];
        getReport.mockRejectedValueOnce(new Error('offline'));
        await user.click(screen.getByRole('button', { name: 'Meal', exact: true }));
        expect(marketSignal.aborted).toBe(true);
        await screen.findByRole('heading', { name: 'Report unavailable' });
        await user.click(screen.getByRole('button', { name: 'Retry report' }));
        expect(getReport).toHaveBeenCalledTimes(3);
        const lastSignal = getReport.mock.calls[2][2];
        view.unmount();
        expect(lastSignal.aborted).toBe(false);
    });

    it('keeps multiple same-name members and their exact amounts in the same daily row; month dropdown supports keyboard selection', async () => {
        const user = userEvent.setup();
        const monthly = ['2026-09', '2026-10', '2026-11'].map((month, index) => ({ month, label: ['Sep 2026', 'Oct 2026', 'Nov 2026'][index], count: 2, amount: '30.00', average: '15.00', delta: index ? '0' : null }));
        getReport.mockResolvedValue({ asOf: '2026-11-16', monthly, members: [], daily: [
            { date: '2026-11-01', count: 2, amount: '30.00', members: [
                { memberId: 'alice-1', name: 'Alice', email: 'alice-one@example.com', count: 1, amount: '10.00' },
                { memberId: 'alice-2', name: 'Alice', email: 'alice-two@example.com', count: 1, amount: '20.00' },
            ] },
            { date: '2026-11-02', count: 0, amount: '0.00', members: [] },
        ] });
        render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
        await screen.findByText('Daily data · Nov 2026');
        await user.click(screen.getByText('Daily data · Nov 2026'));
        const table = screen.getByRole('table', { name: 'Exact daily values for the trend chart' });
        expect(within(table).getByRole('columnheader', { name: 'Members', exact: true })).toBeInTheDocument();
        const row = within(table).getByRole('rowheader', { name: '2026-11-01' }).closest('tr');
        expect(within(row).getAllByText('Alice')).toHaveLength(2);
        expect(within(row).getByText('alice-one@example.com')).toBeInTheDocument();
        expect(within(row).getByText('alice-two@example.com')).toBeInTheDocument();
        for (const amount of ['₹10.00', '₹20.00', '₹30.00']) expect(within(row).getByText(amount)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Month', exact: true }));
        await screen.findByRole('option', { name: /October 2026/ });
        await user.keyboard('{ArrowDown}{Enter}');
        await screen.findByRole('heading', { name: 'October 2026', exact: true });
    });

    it('marks positive MoM red, zero and negative MoM green, and unavailable comparisons neutral', () => {
        const { container } = render(<div><PercentChange value="12.5" /><PercentChange value="0" /><PercentChange value="-4.2" /><PercentChange value={null} /></div>);
        expect(screen.getByLabelText('Increase of 12.5 percent versus previous month')).toHaveAttribute('data-direction', 'increase');
        expect(screen.getByLabelText('No change versus previous month')).toHaveAttribute('data-direction', 'unchanged');
        expect(screen.getByLabelText('Decrease of 4.2 percent versus previous month')).toHaveAttribute('data-direction', 'decrease');
        expect(screen.getByLabelText('No previous amount to compare')).not.toHaveAttribute('data-direction');
        expect(container.querySelectorAll('.analytics-delta')).toHaveLength(3);
    });
});
