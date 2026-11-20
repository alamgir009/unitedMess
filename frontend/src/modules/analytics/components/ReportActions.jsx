import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/shared/components/ui/Button/Button';
import { downloadReport, reportParams } from '../services/analyticsReport.service';

const EmailReportModal = lazy(() => import('./ReportEmailModal'));

export default memo(function ReportActions({ report, memberId, enabled }) {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState(null);
    const [emailOpen, setEmailOpen] = useState(false);
    const request = useRef(null);
    const opener = useRef(null);
    const failureToast = useRef(null);
    const urls = useRef(new Map());
    const alive = useRef(true);
    const current = useRef({ report, memberId, enabled });
    current.current = { report, memberId, enabled };
    useEffect(() => {
        alive.current = true;
        const activeUrls = urls.current;
        return () => {
            alive.current = false;
            request.current?.abort();
            if (failureToast.current) toast.dismiss(failureToast.current);
            for (const [url, timer] of activeUrls) { clearTimeout(timer); URL.revokeObjectURL(url); }
            activeUrls.clear();
        };
    }, []);
    useEffect(() => {
        request.current?.abort();
        if (failureToast.current) toast.dismiss(failureToast.current);
        request.current = null;
        setPending(false);
        setEmail(null);
        setEmailOpen(false);
        setMessage('');
    }, [report, memberId, enabled]);

    const download = async (type = report) => {
        if (request.current || !current.current.enabled || current.current.report !== report || current.current.memberId !== memberId || !alive.current) return;
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        setMessage('Preparing PDF…');
        try {
            const { blob, filename } = await downloadReport(reportParams(type, memberId), controller.signal);
            if (controller.signal.aborted) return;
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            urls.current.set(url, setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 30000));
            setMessage('PDF downloaded.');
        } catch (error) {
            if (!controller.signal.aborted) {
                setMessage('Download failed. Retry from the notification.');
                failureToast.current = toast.error((notification) => <span className="flex flex-wrap items-center gap-3"><span>{error.response?.data?.message || error.message || 'Could not download PDF.'}</span><Button size="sm" variant="secondary" onClick={() => { toast.dismiss(notification.id); void download(type); }}>Retry</Button></span>, { duration: 10000 });
            }
        } finally {
            if (request.current === controller) { request.current = null; if (alive.current) setPending(false); }
        }
    };
    const openEmail = (type = report) => {
        const next = reportParams(type, memberId);
        setEmail((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
        setEmailOpen(true);
    };
    if (!enabled) return null;
    const item = 'flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm data-[focus]:bg-[var(--bg-subtle)] data-[focus]:text-[var(--text-primary)]';
    return <div className="min-w-0">
        <div className="inline-flex items-stretch" role="group" aria-label="Report">
            <Button variant="secondary" className="min-h-[44px] rounded-r-none min-w-[112px]" aria-label="Download PDF" title="Download PDF for the current member filter and three-month range" isLoading={pending} disabled={pending} onClick={() => void download()}><Download size={16} aria-hidden="true" />Report</Button>
            <Menu><MenuButton ref={opener} as={Button} variant="secondary" disabled={pending} className="min-h-[44px] rounded-l-none px-3" aria-label="Report actions"><ChevronDown size={16} aria-hidden="true" /></MenuButton>
                <MenuItems anchor={{ to: 'bottom end', padding: 'var(--space-3)' }} className="analytics-month-options focus:outline-none" style={{ width: 'min(20rem, calc(100vw - var(--space-6)))' }}>
                    <MenuItem><button className={item} onClick={() => void download()}><Download size={16} aria-hidden="true" />Download PDF</button></MenuItem>
                    <MenuItem><button className={item} onClick={() => openEmail()}><Mail size={16} aria-hidden="true" />Email PDF</button></MenuItem>
                    <MenuItem><button className={item} onClick={() => void download('both')}><Download size={16} aria-hidden="true" />Download Market + Meal PDF</button></MenuItem>
                    <MenuItem><button className={item} onClick={() => openEmail('both')}><Mail size={16} aria-hidden="true" />Email Market + Meal PDF</button></MenuItem>
                </MenuItems>
            </Menu>
        </div>
        <p role="status" aria-live="polite" className="sr-only">{message}</p>
        {email && <Suspense fallback={<span role="status" className="sr-only">Loading email confirmation…</span>}><EmailReportModal key={JSON.stringify(email)} params={email} isOpen={emailOpen} onClose={() => { setEmailOpen(false); opener.current?.focus(); }} /></Suspense>}
    </div>;
});
