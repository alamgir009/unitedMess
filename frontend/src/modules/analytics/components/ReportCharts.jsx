import { memo, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { formatCount, formatMoney } from '../utils/format';

const axis = { fill: 'var(--text-secondary)', fontSize: 11 };
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const compactMoney = (value) => `₹${compact.format(value)}`;
const tooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)', fontSize: 13 };
const tooltipFormatter = (value, name, item) => name.includes('amount') ? formatMoney(item.payload.amount) : formatCount(value);

const ReportCharts = memo(function ReportCharts({ monthly, daily, month, report }) {
    const [metric, setMetric] = useState('amount');
    const comparison = useMemo(() => monthly.map((row) => ({ ...row, plottedAmount: Number(row.amount) })), [monthly]);
    const trend = useMemo(() => daily.map((row) => ({ ...row, day: row.date.slice(-2), plottedAmount: Number(row.amount) })), [daily]);
    const countLabel = report === 'market' ? 'Markets completed' : 'Total meals';
    return <div className="analytics-charts grid min-w-0 gap-4 xl:grid-cols-2" data-report={report}>
        <section className="analytics-panel min-w-0 p-4 sm:p-6" aria-labelledby="comparison-heading">
            <h2 id="comparison-heading" className="font-semibold">Monthly comparison</h2>
            <p className="analytics-secondary text-sm mt-1 mb-4">Amount on the left axis · count on the right</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs mb-3 analytics-secondary" aria-hidden="true">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[var(--analytics-chart-amount)]" />Total amount</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-2 border-[var(--analytics-chart-count)]" />{countLabel}</span>
            </div>
            <div className="h-64 min-w-0" role="group" aria-label="Grouped bar chart of three monthly amounts and counts. Exact values are in the monthly data table.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={80}>
                    <BarChart data={comparison} accessibilityLayer margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border-default)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} tickMargin={10} />
                        <YAxis yAxisId="amount" width={52} tick={axis} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
                        <YAxis yAxisId="count" orientation="right" width={30} tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)' }} formatter={tooltipFormatter} cursor={{ fill: 'var(--bg-muted)' }} />
                        <Bar yAxisId="amount" dataKey="plottedAmount" name="Total amount" fill="var(--analytics-chart-amount)" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                        <Bar yAxisId="count" dataKey="count" name={countLabel} fill="var(--bg-elevated)" stroke="var(--analytics-chart-count)" strokeWidth={2} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
        <section className="analytics-panel min-w-0 p-4 sm:p-6" aria-labelledby="trend-heading">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div><h2 id="trend-heading" className="font-semibold">Daily trend</h2><p className="analytics-secondary text-sm mt-1">{month.label} · Asia/Kolkata</p></div>
                <div className="analytics-segmented" role="group" aria-label="Daily trend measure">
                    {['amount', 'count'].map((key) => <button key={key} type="button" className="analytics-button" aria-pressed={metric === key} onClick={() => setMetric(key)}>{key === 'amount' ? 'Amount' : 'Count'}</button>)}
                </div>
            </div>
            <div className="h-64 min-w-0" role="group" aria-label={`Daily ${metric} line chart for ${month.label}. Exact values are available in daily data.`}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={80}>
                    <LineChart data={trend} accessibilityLayer margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border-default)" strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} minTickGap={18} tickMargin={10} />
                        <YAxis width={52} tick={axis} tickLine={false} axisLine={false} tickFormatter={metric === 'amount' ? compactMoney : formatCount} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)' }} formatter={tooltipFormatter} labelFormatter={(day) => `${month.label} ${day}`} />
                        <Line dataKey={metric === 'amount' ? 'plottedAmount' : 'count'} name={metric === 'amount' ? 'Total amount' : countLabel}
                            stroke={metric === 'amount' ? 'var(--analytics-trend-amount)' : 'var(--analytics-trend-count)'} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--bg-elevated)', strokeWidth: 2 }} isAnimationActive={false} type="linear" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    </div>;
});

export default ReportCharts;
