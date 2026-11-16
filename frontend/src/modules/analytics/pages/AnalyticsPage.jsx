import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, RefreshCw, ShoppingBag, Utensils } from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import Button from '@/shared/components/ui/Button/Button';
import MemberFilter, { ALL_MEMBERS } from '../components/MemberFilter';
import MonthFilter from '../components/MonthFilter';
import PercentChange from '../components/PercentChange';
import { getReport } from '../services/analytics.service';
import { formatCount, formatMoney } from '../utils/format';
import '../styles/analytics.css';

const ReportCharts = lazy(() => import('../components/ReportCharts'));
const monthLabel = (key) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));

function Skeleton() {
    return <div role="status" aria-label="Loading analytics" className="space-y-4">
        <span className="sr-only">Loading analytics…</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((key) => <div key={key} className="h-32 analytics-panel bg-muted motion-safe:animate-pulse" />)}</div>
        <div className="h-80 analytics-panel bg-muted motion-safe:animate-pulse" />
    </div>;
}

const Metric = memo(function Metric({ label, value, note }) {
    return <div className="analytics-panel p-4 sm:p-5 min-w-0">
        <dt className="text-sm analytics-secondary">{label}</dt>
        <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums break-words">{value}</dd>
        <p className="mt-2 text-xs analytics-secondary">{note}</p>
    </div>;
});

export default function AnalyticsPage() {
    const [report, setReport] = useState('market');
    const [member, setMember] = useState(ALL_MEMBERS);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [state, setState] = useState({ loading: true, data: null, error: '' });
    const [retry, setRetry] = useState(0);
    const changeMember = useCallback((value) => setMember(value), []);
    useEffect(() => {
        const controller = new AbortController();
        setState({ loading: true, data: null, error: '' });
        getReport(report, member._id, controller.signal).then((data) => {
            if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
        }).catch((error) => {
            if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.response?.data?.message || 'Analytics could not be loaded. Please retry.', status: error.response?.status });
        });
        return () => controller.abort();
    }, [report, member._id, retry]);
    const { data, loading, error } = state;
    const month = data?.monthly.find((row) => row.month === selectedMonth) || data?.monthly[2];
    const daily = useMemo(() => data?.daily.filter((row) => row.date.startsWith(month?.month) && row.date <= data.asOf) || [], [data, month?.month]);
    const members = useMemo(() => data?.members.filter((row) => row.month === month?.month) || [], [data, month?.month]);
    const isMarket = report === 'market';
    const countLabel = isMarket ? 'Markets completed' : 'Total meals';
    return <MainLayout><div className="analytics mx-auto w-full max-w-[1600px] min-w-0 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div><Link to="/dashboard" className="analytics-back inline-flex items-center gap-2 text-sm analytics-secondary mb-3"><ArrowLeft size={15} aria-hidden="true" />Dashboard</Link>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Analytics</h1>
                <p className="mt-2 text-sm analytics-secondary">Market spending and meals, across the last three months.</p>
            </div>
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setRetry((n) => n + 1)} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Refresh reports</Button>
        </header>
        <section className="analytics-panel p-4 sm:p-5 flex flex-col xl:flex-row xl:items-end gap-5 xl:justify-between" aria-label="Analytics filters">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 min-w-0">
                <div><span className="block text-sm font-medium mb-2">Report</span><div className="analytics-segmented" role="group" aria-label="Report type">
                    {['market', 'meal'].map((key) => <button key={key} type="button" className="analytics-button gap-2" aria-pressed={report === key} onClick={() => setReport(key)}>{key === 'market' ? <ShoppingBag size={16} aria-hidden="true" /> : <Utensils size={16} aria-hidden="true" />}{key === 'market' ? 'Market' : 'Meal'}</button>)}
                </div></div>
                <MemberFilter value={member} onChange={changeMember} />
            </div>
            {data && <MonthFilter months={data.monthly} value={month.month} currentMonth={data.asOf.slice(0, 7)} onChange={setSelectedMonth} />}
        </section>
        {loading ? <Skeleton /> : error ? <section role="alert" className="analytics-panel p-6 space-y-4">
            <h2 className="font-semibold">{state.status === 403 ? '403 — Access denied' : 'Report unavailable'}</h2><p className="text-sm analytics-secondary">{error}</p>
            <div className="flex flex-wrap gap-3"><button type="button" className="analytics-button" onClick={() => setRetry((n) => n + 1)}>Retry report</button>
                {member._id && <button type="button" className="analytics-button" onClick={() => setMember(ALL_MEMBERS)}>Clear member filter</button>}</div>
        </section> : data && <>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">{monthLabel(month.month)}</h2><p className="text-xs analytics-secondary">{member.name} · through {data.asOf} · IST</p></div>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label={isMarket ? 'Market spending' : 'Estimated meal amount'} value={formatMoney(month.amount)} note={isMarket ? 'Logged purchases only' : 'Own meals + guest meals'} />
                <Metric label={countLabel} value={formatCount(month.count)} note={isMarket ? 'One logged purchase per member per day' : 'Includes guest meals'} />
                <Metric label={isMarket ? 'Average per market' : 'Average per meal'} value={formatMoney(month.average)} note="Amount divided by count" />
                <Metric label="Amount vs previous month" value={<PercentChange value={month.delta} />} note={month === data.monthly[0] ? 'Earlier month outside report window' : month.delta === null ? 'No non-zero previous amount to compare' : month.month === data.asOf.slice(0, 7) ? 'Month to date vs previous full month' : 'Compared with previous full month'} />
            </dl>
            {!isMarket && <p className="text-sm analytics-secondary">Meal amounts are daily estimates rounded to paise: own meals at the monthly mess rate, plus each member’s guest charge. Rates use all mess activity, as billing does. Fixed fees and invoice adjustments are excluded.</p>}
            {month.count === 0 && <section className="analytics-panel p-6" role="status"><h2 className="font-semibold">No {isMarket ? 'completed markets' : 'meals'} in this month</h2><p className="mt-2 text-sm analytics-secondary">Choose another month or member to explore their activity.</p></section>}
            <Suspense fallback={<div className="h-80 analytics-panel bg-muted motion-safe:animate-pulse" role="status" aria-label="Loading charts" />}>
                <ReportCharts monthly={data.monthly} daily={daily} month={month} report={report} />
            </Suspense>
            <section className="analytics-panel p-4 sm:p-6"><h2 className="font-semibold mb-4">Monthly data</h2>
                <div className="overflow-x-auto"><table className="analytics-table"><caption className="sr-only">Exact three-month totals for {member.name}</caption>
                    <thead><tr><th scope="col">Month</th><th scope="col">{countLabel}</th><th scope="col">Amount</th><th scope="col">Average</th><th scope="col">MoM</th></tr></thead>
                    <tbody>{data.monthly.map((row) => <tr key={row.month}><th scope="row">{row.label}</th><td>{formatCount(row.count)}</td><td>{formatMoney(row.amount)}</td><td>{formatMoney(row.average)}</td><td><PercentChange value={row.delta} /></td></tr>)}</tbody>
                </table></div>
            </section>
            <section className="analytics-panel p-4 sm:p-6"><h2 className="font-semibold mb-1">Members · {month.label}</h2><p className="text-sm analytics-secondary mb-4">Active, approved members with activity in this month.</p>
                {members.length ? <div className="max-h-96 overflow-auto"><table className="analytics-table"><caption className="sr-only">Per-member {report} totals for {month.label}</caption>
                    <thead><tr><th scope="col">Member</th><th scope="col">{countLabel}</th><th scope="col">Amount</th></tr></thead>
                    <tbody>{members.map((row) => <tr key={row.memberId}><th scope="row"><span className="block">{row.name}</span><span className="block text-xs font-normal analytics-secondary">{row.email}</span></th><td>{formatCount(row.count)}</td><td>{formatMoney(row.amount)}</td></tr>)}</tbody>
                </table></div> : <p className="text-sm analytics-secondary">No member activity to show.</p>}
            </section>
            <details className="analytics-panel p-4 sm:p-6"><summary className="analytics-disclosure"><span>Daily data · {month.label}</span><ChevronDown size={17} aria-hidden="true" /></summary>
                <div className="overflow-auto max-h-80 mt-4"><table className="analytics-table"><caption className="sr-only">Exact daily values for the trend chart</caption>
                    <thead><tr><th scope="col">Date (IST)</th><th scope="col" className="analytics-members-cell">Members</th><th scope="col">{countLabel}</th><th scope="col">Amount</th></tr></thead>
                    <tbody>{daily.map((row) => <tr key={row.date}><th scope="row">{row.date}</th><td className="analytics-members-cell">
                        {row.members?.length ? <ul className="analytics-daily-members" aria-label={`Members active on ${row.date}`}>
                            {row.members.map((entry) => <li key={entry.memberId}>
                                <span className="min-w-0"><span className="block font-medium break-words">{entry.name}</span><span className="block text-xs analytics-secondary break-all">{entry.email}</span></span>
                                <span className="shrink-0 text-right"><span className="block font-medium tabular-nums">{formatMoney(entry.amount)}</span><span className="block text-xs analytics-secondary">{formatCount(entry.count)} {isMarket ? 'market' : 'meal'}{entry.count === 1 ? '' : 's'}</span></span>
                            </li>)}
                        </ul> : <span className="analytics-secondary" aria-label="No member activity">—</span>}
                    </td><td>{formatCount(row.count)}</td><td>{formatMoney(row.amount)}</td></tr>)}</tbody>
                </table></div>
            </details>
        </>}
    </div></MainLayout>;
}
