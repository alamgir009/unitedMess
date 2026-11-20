import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import ReportActions from '@/modules/analytics/components/ReportActions';
import ReportEmailModal from '@/modules/analytics/components/ReportEmailModal';
import { downloadReport, previewRecipients, emailReport, getReportJob, retryReportJob } from '@/modules/analytics/services/analyticsReport.service';

vi.mock('@/modules/analytics/services/analyticsReport.service', () => ({
    reportParams: (type, memberId) => ({ type, months: 3, ...(memberId && { memberId }) }),
    downloadReport: vi.fn(), previewRecipients: vi.fn(), emailReport: vi.fn(), getReportJob: vi.fn(), retryReportJob: vi.fn(),
}));
const params = { type: 'both', months: 3 };
const recipients = [
    { recipientId: 'member:alice', name: 'Alice', email: 'alice@example.com', status: 'pending' },
    { recipientId: 'member:bob', name: 'Bob', email: null, status: 'skipped' },
    { recipientId: 'admin:admin', name: 'Admin', email: 'admin@example.com', status: 'pending', combined: true },
];
const initial = { jobId: 'job', state: 'running', recipients: recipients.map(({ recipientId, name, status }) => ({ recipientId, name, status })) };

beforeEach(() => {
    vi.clearAllMocks();
    previewRecipients.mockResolvedValue({ recipients, admins: [{ name: 'Admin', email: 'admin@example.com' }] });
    emailReport.mockResolvedValue(initial);
    getReportJob.mockResolvedValue({ ...initial, state: 'complete', recipients: initial.recipients.map((entry) => ({ ...entry, status: entry.status === 'skipped' ? 'skipped' : 'sent' })) });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('admin guard, current filters, download locking, and object URL cleanup', async () => {
    const view = render(<ReportActions report="meal" memberId="alice" enabled={false} />);
    expect(screen.queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument();
    view.rerender(<ReportActions report="meal" memberId="alice" enabled />);
    let finish;
    downloadReport.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const button = screen.getByRole('button', { name: 'Download PDF' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(downloadReport).toHaveBeenCalledTimes(1);
    expect(downloadReport).toHaveBeenCalledWith({ type: 'meal', memberId: 'alice', months: 3 }, expect.any(AbortSignal));
    await act(async () => finish({ blob: new Blob(['PDF']), filename: 'analytics-meal-alice-2026-11.pdf' }));
    expect(await screen.findByText('PDF downloaded.')).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
});

test('filter changes abort stale downloads and cancelled downloads do not show errors', async () => {
    downloadReport.mockImplementation((_, signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))));
    const view = render(<ReportActions report="market" enabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    const signal = downloadReport.mock.calls[0][1];
    view.rerender(<ReportActions report="meal" memberId="alice" enabled />);
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(screen.queryByText(/Download failed/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
});

test('download error toast offers a working retry', async () => {
    downloadReport.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ blob: new Blob(['PDF']), filename: 'report.pdf' });
    const user = userEvent.setup();
    render(<><ReportActions report="market" enabled /><Toaster /></>);
    await user.click(screen.getByRole('button', { name: 'Download PDF' }));
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('PDF downloaded.')).toBeInTheDocument();
    expect(downloadReport).toHaveBeenCalledTimes(2);
});

test('email confirmation lists skipped recipients, locks duplicate sends, and shows delivery progress', async () => {
    const user = userEvent.setup();
    render(<ReportEmailModal params={params} isOpen onClose={() => {}} />);
    expect(await screen.findByText('Skipped — no valid email · Own PDF only')).toBeInTheDocument();
    expect(screen.getByText('2 recipients · 1 skipped (no valid email)')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Send 2 PDFs' });
    await user.click(send);
    expect(emailReport).toHaveBeenCalledTimes(1);
    expect(emailReport).toHaveBeenCalledWith(params, ['admin@example.com'], expect.any(String), expect.any(AbortSignal));
    expect(await screen.findByText(/Sending reports/)).toBeInTheDocument();
    expect(await screen.findByText(/Delivery complete/)).toHaveTextContent('2 sent · 0 failed · 1 skipped');
});

test('an ambiguous send failure retries with the same idempotency key', async () => {
    emailReport.mockRejectedValueOnce(new Error('Connection lost'));
    const user = userEvent.setup();
    render(<ReportEmailModal params={params} isOpen onClose={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Send 2 PDFs' }));
    await user.click(await screen.findByRole('button', { name: 'Retry send' }));
    expect(emailReport).toHaveBeenCalledTimes(2);
    expect(emailReport.mock.calls[0][2]).toBe(emailReport.mock.calls[1][2]);
});

test('failed deliveries use the job retry endpoint and never start another bulk request', async () => {
    getReportJob.mockResolvedValueOnce({ ...initial, state: 'complete', recipients: initial.recipients.map((entry) => ({ ...entry, status: entry.name === 'Alice' ? 'failed' : entry.name === 'Bob' ? 'skipped' : 'sent' })) });
    retryReportJob.mockResolvedValue(initial);
    const user = userEvent.setup();
    render(<ReportEmailModal params={params} isOpen onClose={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Send 2 PDFs' }));
    await user.click(await screen.findByRole('button', { name: 'Retry 1 failed' }));
    expect(retryReportJob).toHaveBeenCalledWith('job', expect.any(AbortSignal));
    expect(emailReport).toHaveBeenCalledTimes(1);
});

test('interrupted deliveries show unconfirmed recipients and stop automatic retries', async () => {
    emailReport.mockResolvedValue({ ...initial, state: 'interrupted' });
    const user = userEvent.setup();
    render(<ReportEmailModal params={params} isOpen onClose={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Send 2 PDFs' }));
    expect(await screen.findByText(/Delivery interrupted/)).toBeInTheDocument();
    expect(screen.getAllByText('Unconfirmed')).toHaveLength(2);
    expect(getReportJob).not.toHaveBeenCalled();
    expect(retryReportJob).not.toHaveBeenCalled();
});

test('closing the retained email dialog restores keyboard focus to the report menu', async () => {
    const user = userEvent.setup();
    render(<ReportActions report="market" enabled />);
    const menu = screen.getByRole('button', { name: 'Report actions' });
    await user.click(menu);
    await user.click(await screen.findByRole('menuitem', { name: 'Email PDF', exact: true }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(menu).toHaveFocus());
});
