import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/ui/Modal/Modal';
import Button from '@/shared/components/ui/Button/Button';
import { emailReport, getReportJob, previewRecipients, retryReportJob } from '../services/analyticsReport.service';
import '../styles/analytics-report.css';

const errorMessage = (error) => error.response?.data?.message || error.message || 'Could not complete the request. Please retry.';

export default function ReportEmailModal({ params, isOpen, onClose }) {
    const [preview, setPreview] = useState(null);
    const [copies, setCopies] = useState([]);
    const [job, setJob] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [pollRetry, setPollRetry] = useState(0);
    const key = useRef(crypto.randomUUID());
    const submitting = useRef(false);
    const request = useRef(null);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; request.current?.abort(); };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        setError('');
        previewRecipients(params, controller.signal).then((data) => {
            if (controller.signal.aborted) return;
            setPreview(data);
            setCopies(data.recipients.filter((entry) => entry.recipientId.startsWith('admin:')).map((entry) => entry.email));
        }).catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure)); });
        return () => controller.abort();
    }, [params, reload]);
    const jobId = job?.jobId;
    const complete = job?.state === 'complete';
    const interrupted = job?.state === 'interrupted';
    const terminal = complete || interrupted;
    useEffect(() => {
        if (!jobId || terminal || !isOpen) return;
        let timer;
        const controller = new AbortController();
        const poll = async () => {
            try {
                const next = await getReportJob(jobId, controller.signal);
                if (controller.signal.aborted) return;
                setError('');
                setJob(next);
                if (!['complete', 'interrupted'].includes(next.state)) timer = setTimeout(poll, 1500);
            } catch (failure) { if (!controller.signal.aborted) setError(errorMessage(failure)); }
        };
        timer = setTimeout(poll, 500);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [jobId, terminal, isOpen, pollRetry]);

    const submit = async (retry = false) => {
        if (submitting.current) return;
        submitting.current = true;
        setBusy(true);
        setError('');
        const controller = new AbortController();
        request.current = controller;
        try {
            const next = retry ? await retryReportJob(job.jobId, controller.signal) : await emailReport(params, copies, key.current, controller.signal);
            if (!mounted.current) return;
            setJob(next);
            setPollRetry((value) => value + 1);
        } catch (failure) {
            if (!controller.signal.aborted && mounted.current) { setError(errorMessage(failure)); toast.error(errorMessage(failure)); }
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    const members = preview?.recipients.filter((entry) => entry.recipientId.startsWith('member:')) || [];
    const recipients = [...members, ...(preview?.admins || []).filter((admin) => copies.includes(admin.email) && !(params.memberId && members.some((member) => member.email === admin.email))).map((admin) => ({ ...admin, recipientId: `copy:${admin.email}`, status: 'pending' }))];
    const skipped = recipients.filter((entry) => entry.status === 'skipped');
    const deliverable = recipients.length - skipped.length;
    const sent = job?.recipients.filter((entry) => entry.status === 'sent').length || 0;
    const failed = job?.recipients.filter((entry) => entry.status === 'failed').length || 0;
    const jobSkipped = job?.recipients.filter((entry) => entry.status === 'skipped').length || 0;
    const processed = job ? sent + failed + jobSkipped : 0;
    return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title="Email analytics PDF" description={`${params.type === 'both' ? 'Market + Meal' : params.type === 'meal' ? 'Meal' : 'Market'} report · last three months · Asia/Kolkata`} size="lg" isLoading={busy} footer={<div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>{job ? 'Close' : 'Cancel'}</Button>
        {!job && <Button onClick={() => void submit()} isLoading={busy} disabled={busy || !preview || deliverable === 0 || (!params.memberId && !copies.length)}>Send {deliverable} PDF{deliverable === 1 ? '' : 's'}</Button>}
        {job && complete && failed > 0 && <Button onClick={() => void submit(true)} isLoading={busy} disabled={busy}>Retry {failed} failed</Button>}
    </div>}>
        <div className="space-y-4 text-sm text-[var(--text-primary)]">
            {!preview && !error && <p role="status">Loading recipients…</p>}
            {error && <div role="alert" className="space-y-2"><p>{error}</p><Button variant="secondary" size="sm" disabled={busy} onClick={() => job ? setPollRetry((value) => value + 1) : preview ? void submit() : setReload((value) => value + 1)}>Retry {job ? 'status' : preview ? 'send' : 'recipients'}</Button></div>}
            {preview && !job && <>
                <p>{params.memberId ? 'The member receives only their own report. Selected administrators receive a separate copy.' : 'Each member receives only their own report. The combined All Members PDF goes only to the selected administrators.'}</p>
                {!!preview.admins.length && <fieldset disabled={busy} className="space-y-2"><legend className="font-semibold mb-2">{params.memberId ? 'Administrator copies (optional)' : 'Combined report recipients'}</legend>
                    {preview.admins.map((admin) => <label key={admin.email} className="flex items-start gap-3 min-h-[44px] py-2"><input type="checkbox" className="mt-1 accent-[var(--brand)]" checked={copies.includes(admin.email)} onChange={(event) => { key.current = crypto.randomUUID(); setCopies((current) => event.target.checked ? [...current, admin.email] : current.filter((email) => email !== admin.email)); }} /><span className="min-w-0 break-words">{admin.name}<span className="block text-xs text-[var(--text-secondary)] break-all">{admin.email}</span></span></label>)}
                </fieldset>}
                {!params.memberId && !copies.length && <p className="text-[var(--danger-text)]">Select an administrator to receive the combined report.</p>}
                <p role="status" aria-live="polite">{deliverable} recipient{deliverable === 1 ? '' : 's'} · {skipped.length} skipped (no valid email)</p>
                <ul aria-label="Report recipients" className="max-h-56 overflow-y-auto divide-y divide-[var(--border-default)]">
                    {recipients.map((entry) => <li key={entry.recipientId} className="py-3 min-w-0"><span className="font-medium break-words">{entry.name}</span><span className="block text-xs text-[var(--text-secondary)] break-all">{entry.status === 'skipped' ? 'Skipped — no valid email' : entry.email}{entry.recipientId.startsWith('copy:') ? params.memberId ? ' · Member report copy' : ' · All Members PDF' : ' · Own PDF only'}</span></li>)}
                </ul>
            </>}
            {job && <>
                <p role="status" aria-live="polite">{interrupted ? 'Delivery interrupted. Some results could not be confirmed; check delivery before sending again.' : complete ? 'Delivery complete.' : `Sending reports: ${processed} of ${job.recipients.length} processed.`} {sent} sent · {failed} failed · {jobSkipped} skipped</p>
                <progress className="analytics-report-progress" aria-label="Report email progress" max={Math.max(1, job.recipients.length)} value={processed} />
                <ul aria-label="Delivery results" className="max-h-56 overflow-y-auto divide-y divide-[var(--border-default)]">{job.recipients.map((entry) => <li key={entry.recipientId} className="py-3 flex justify-between gap-3"><span className="break-words min-w-0">{entry.name}</span><span className="shrink-0">{entry.status === 'pending' ? interrupted ? 'Unconfirmed' : 'Queued' : entry.status === 'sent' ? 'Sent' : entry.status === 'failed' ? 'Failed' : 'Skipped'}</span></li>)}</ul>
            </>}
        </div>
    </Modal>;
}
