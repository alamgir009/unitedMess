const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const { reportResources: resources } = require('./pdf.service');
const { formatMoney, formatCount, cents, decimal, sumMoney, share } = require('../utils/helpers/analyticsReport.helper.cjs');
const AppError = require('../utils/errors/AppError');
const { colors: C } = resources;
const M = 40;
const W = 515.28;
const BOTTOM = 724;
const families = { Inter: ['regular', 'semibold'], Bengali: ['bnRegular', 'bnSemiBold'], Devanagari: ['dvRegular', 'dvSemiBold'], Arabic: ['arRegular', 'arSemiBold'] };
const coverage = new Map();
const scriptRuns = (text) => String(text).match(/[\u0980-\u09FF]+|[\u0900-\u097F]+|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFBFF\uFE70-\uFEFF]+|[^\u0980-\u09FF\u0900-\u097F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFBFF\uFE70-\uFEFF]+/g) || [''];

function checkedFont(text, bold = false) {
    const font = resources.pickFont(text, bold ? 'Inter-SemiBold' : 'Inter');
    const key = families[font.split('-')[0]]?.[bold ? 1 : 0] || 'regular';
    if (!coverage.has(key)) coverage.set(key, fontkit.create(resources.fonts[key]));
    if ([...String(text)].some((ch) => !/\s/u.test(ch) && !coverage.get(key).hasGlyphForCodePoint(ch.codePointAt(0)))) throw new AppError('A report name contains characters unsupported by the installed PDF fonts.', 422);
    return font;
}
function validateReport(bundle) {
    for (const name of [bundle.name, ...bundle.people.map((person) => person.name)]) {
        for (const run of scriptRuns(name)) { checkedFont(run); checkedFont(run, true); }
    }
}

const total = (report) => ({ amount: sumMoney(report.monthly), count: report.monthly.reduce((sum, row) => sum + row.count, 0) });
function buildView(bundle) {
    const market = total(bundle.market);
    const meal = total(bundle.meal);
    const focus = bundle.type === 'meal' ? bundle.meal : bundle.market;
    const focusTotal = bundle.type === 'meal' ? meal.amount : market.amount;
    const monthly = bundle.market.monthly.map((row, index) => ({
        label: row.label, markets: row.count, spent: row.amount,
        meals: bundle.meal.monthly[index].count, cost: bundle.meal.monthly[index].amount,
        share: share(focus.monthly[index].amount, focusTotal),
        empty: row.count === 0 && bundle.meal.monthly[index].count === 0,
    }));
    const members = bundle.people.map((person) => {
        const id = String(person._id);
        const markets = bundle.market.members.filter((row) => row.memberId === id);
        const meals = bundle.meal.members.filter((row) => row.memberId === id);
        const spent = sumMoney(markets);
        return { name: person.name, markets: markets.reduce((sum, row) => sum + row.count, 0), spent, meals: meals.reduce((sum, row) => sum + row.count, 0), cost: sumMoney(meals), share: share(bundle.type === 'meal' ? sumMoney(meals) : spent, focusTotal) };
    }).sort((a, b) => cents(a.spent) === cents(b.spent) ? a.name.localeCompare(b.name) : cents(a.spent) > cents(b.spent) ? -1 : 1);
    return { market, meal, monthly, members, focus, focusTotal };
}

function filename(bundle) {
    return `analytics-${bundle.type}-${bundle.memberId ? bundle.memberId : 'all'}-${bundle.market.asOf.slice(0, 7)}.pdf`;
}

function draw(doc, bundle) {
    for (const [family, keys] of Object.entries(families)) {
        doc.registerFont(family === 'Inter' ? 'Inter' : `${family}-Regular`, resources.fonts[keys[0]]);
        doc.registerFont(family === 'Inter' ? 'Inter-SemiBold' : `${family}-SemiBold`, resources.fonts[keys[1]]);
    }
    const view = buildView(bundle);
    const logo = resources.logo ? doc.openImage(resources.logo) : null;
    const title = `${bundle.type === 'both' ? 'Market + Meal' : bundle.type === 'meal' ? 'Meal' : 'Market'} analytics`;
    const period = `${bundle.market.monthly[0].month}-01 to ${bundle.market.asOf}`;
    const setFont = (text, bold = false, size = 10) => {
        doc.font(checkedFont(text, bold)).fontSize(size);
    };
    const text = (value, x, y, width, { size = 10, bold = false, color = C.textPrimary, align = 'left', ...options } = {}) => {
        const valueText = String(value);
        const runs = scriptRuns(resources.prepareRtl(valueText));
        runs.forEach((run, index) => {
            setFont(run, bold, size);
            doc.fillColor(color);
            const settings = { width, align, features: ['tnum'], ...options, continued: index < runs.length - 1 };
            if (index === 0) doc.text(run, x, y, settings);
            else doc.text(run, settings);
        });
    };
    let y;
    const header = () => {
        if (logo) doc.image(logo, M, 36, { fit: [24, 24] });
        text('United Mess', M + 32, 40, 200, { bold: true });
        text(title, M, 72, W, { size: 20, bold: true });
        text(bundle.name, M, 100, W, { bold: true });
        const periodY = Math.max(132, doc.y + 8);
        text(`3 months: ${period} | ${bundle.market.timezone}`, M, periodY, W, { size: 8, color: C.textSecondary });
        y = periodY + 24;
    };
    const page = () => { doc.addPage(); header(); };
    const ensure = (height) => { if (y + height > BOTTOM) page(); };
    const heading = (label, needed = 44) => {
        ensure(needed);
        text(label, M, y, W, { size: 14, bold: true });
        y += 28;
    };
    header();
    const kpis = [
        ['Total spent', formatMoney(view.market.amount), `${formatCount(view.market.count)} markets completed`],
        ['Total meals', formatCount(view.meal.count), 'Includes own and guest meals'],
        ['Meal cost', formatMoney(view.meal.amount), 'Estimated at the dashboard rates'],
    ];
    kpis.forEach(([label, value, note], index) => {
        const x = M + index * ((W + 8) / 3);
        const width = (W - 16) / 3;
        doc.roundedRect(x, y, width, 84, 4).fill(C.bgSubtle);
        text(label, x + 12, y + 12, width - 24, { size: 8, color: C.textSecondary });
        text(value, x + 12, y + 28, width - 24, { bold: true });
        text(note, x + 12, y + 52, width - 24, { size: 8, color: C.textSecondary });
    });
    y += 92;
    const delta = view.focus.monthly[2].delta;
    const noun = bundle.type === 'meal' ? 'Meal cost' : 'Spending';
    const insight = delta === null ? `${noun}: no non-zero previous month to compare.` : Number(delta) === 0 ? `${noun} is unchanged vs last month (month to date).` : `${noun} ${Number(delta) < 0 ? 'fell' : 'rose'} ${String(delta).replace(/^-/, '')}% vs last month (month to date).`;
    text(insight, M, y, W, { size: 10 });
    y += 20;

    const rowValues = (row) => [row.label || row.name, formatCount(row.markets), formatMoney(row.spent), formatCount(row.meals), formatMoney(row.cost), row.share];
    const table = (rows, label, firstColumn) => {
        // Narrow numeric columns retain their full width; names wrap as a complete row.
        const widths = [155, 52, 92, 48, 100, W - 447];
        const tableHeader = () => {
            doc.rect(M, y, W, 36).fill(C.bgSubtle);
            let x = M;
            [firstColumn, 'Markets\ncompleted', 'Amount spent\nINR', 'Meals', 'Meal cost\nINR', 'Share %'].forEach((labelText, i) => {
                text(labelText, x + 4, y + 6, widths[i] - 8, { size: 8, bold: true, align: i ? 'right' : 'left' });
                x += widths[i];
            });
            y += 36;
        };
        const rowHeight = (row) => {
            const heights = rowValues(row).map((value, index) => {
                setFont(scriptRuns(value)[0], Boolean(row.total));
                return doc.heightOfString(resources.prepareRtl(value), { width: widths[index] - 8 });
            });
            return Math.max(36, Math.ceil(Math.max(...heights) / 4) * 4 + 16, row.empty ? 48 : 0);
        };
        heading(label, 64 + rowHeight(rows[0]));
        tableHeader();
        for (const [index, row] of rows.entries()) {
            const values = rowValues(row);
            const height = rowHeight(row);
            const keepWithTotal = index === rows.length - 2 && rows.at(-1).total ? rowHeight(rows.at(-1)) : 0;
            if (y + height + keepWithTotal > BOTTOM) { page(); heading(`${label} (continued)`, 64 + height); tableHeader(); }
            if (row.total) doc.rect(M, y, W, height).fill(C.bgSubtle);
            let x = M;
            values.forEach((value, i) => {
                text(value, x + 4, y + 8, widths[i] - 8, { bold: Boolean(row.total), align: i ? 'right' : 'left' });
                x += widths[i];
            });
            if (row.empty) text('No activity in this period', M + 4, y + height - 16, widths[0] - 8, { size: 8, color: C.textSecondary });
            doc.moveTo(M, y + height).lineTo(M + W, y + height).lineWidth(0.5).strokeColor(C.borderDefault).stroke();
            y += height;
        }
        y += 16;
    };
    const grand = { label: 'Total', markets: view.market.count, spent: view.market.amount, meals: view.meal.count, cost: view.meal.amount, share: share(view.focusTotal, view.focusTotal), total: true };
    table([...view.monthly, grand], 'Monthly activity', 'Month');
    const series = bundle.type === 'both' ? [bundle.market, bundle.meal] : [view.focus];
    const seriesColors = [C.brand, C.refundText];
    const legend = (chartSeries) => {
        chartSeries.forEach((report, index) => {
            const x = M + index * 180;
            doc.rect(x, y + 2, 8, 8).fill(seriesColors[index]);
            if (index) doc.moveTo(x, y + 6).lineTo(x + 8, y + 6).strokeColor(C.white).stroke();
            text(report.counts ? `${report.report === 'market' ? 'Markets completed' : 'Meals'} (striped; count)` : `${report.report === 'market' ? 'Market spending' : 'Meal cost'} (${index ? 'striped / dashed' : 'solid'})`, x + 14, y, 164, { size: 8 });
        });
        y += 24;
    };
    const chart = (daily) => {
        ensure(daily ? 252 : 224);
        heading(daily ? 'Daily spending trend' : 'Monthly comparison');
        const chartSeries = !daily && series.length === 1 ? [...series, { ...view.focus, counts: true }] : series;
        legend(chartSeries);
        if (daily) y += 24;
        const left = M + 72;
        const right = M + W - 52;
        const top = y + 8;
        const bottom = y + 112;
        const rows = chartSeries.map((report) => daily ? report.daily.filter((row) => row.date <= report.asOf) : report.monthly);
        const values = rows.flatMap((entries, index) => chartSeries[index].counts ? [] : entries.map((row) => Number(row.amount)));
        const max = Math.max(1, ...values);
        const min = Math.min(0, ...values);
        const yAt = (value) => bottom - (value - min) / (max - min) * (bottom - top);
        const zero = yAt(0);
        const countMax = Math.max(1, ...view.focus.monthly.map((row) => row.count));
        const countAt = (value) => bottom - value / countMax * (bottom - top);
        [min, (max + min) / 2, max].forEach((value) => {
            const lineY = yAt(value);
            doc.moveTo(left, lineY).lineTo(right, lineY).lineWidth(0.5).strokeColor(C.borderDefault).stroke();
            text(formatMoney(String(value.toFixed(2))), M, lineY - 4, 64, { size: 8, align: 'right', color: C.textSecondary });
        });
        text('INR', M, top - 16, 64, { size: 8, color: C.textSecondary, align: 'right' });
        if (chartSeries.some((report) => report.counts)) {
            text('Count', right + 8, top - 16, 44, { size: 8, color: C.textSecondary });
            [0, Math.ceil(countMax / 2), countMax].forEach((value) => text(formatCount(value), right + 8, countAt(value) - 4, 44, { size: 8, color: C.textSecondary }));
        }
        rows.forEach((entries, seriesIndex) => {
            if (daily) {
                const xAt = (index) => left + index / Math.max(1, entries.length - 1) * (right - left);
                doc.save().strokeColor(seriesColors[seriesIndex]).lineWidth(1.5);
                if (seriesIndex) doc.dash(4, { space: 3 });
                entries.forEach((row, index) => index ? doc.lineTo(xAt(index), yAt(Number(row.amount))) : doc.moveTo(xAt(index), yAt(Number(row.amount))));
                doc.stroke().restore();
                const peaks = entries.map((row, index) => ({ ...row, index })).sort((a, b) => Number(b.amount) - Number(a.amount));
                const peak = peaks[0];
                if (peak) {
                    const x = xAt(peak.index);
                    const pointY = yAt(Number(peak.amount));
                    if (seriesIndex) doc.rect(x - 2, pointY - 2, 4, 4).fill(seriesColors[seriesIndex]);
                    else doc.circle(x, pointY, 2).fill(seriesColors[seriesIndex]);
                    text(`${seriesIndex ? 'Meal' : bundle.type === 'meal' ? 'Meal' : 'Market'} ${formatMoney(peak.amount)}`, Math.min(right - 96, Math.max(left, x - 48)), top - 20 - seriesIndex * 12, 96, { size: 8 });
                }
            } else {
                const group = (right - left) / 3;
                const barW = Math.min(28, group / (chartSeries.length + 2));
                entries.forEach((row, index) => {
                    const counts = chartSeries[seriesIndex].counts;
                    const x = left + group * (index + 0.5) + (seriesIndex - chartSeries.length / 2) * (barW + 4);
                    const valueY = counts ? countAt(row.count) : yAt(Number(row.amount));
                    const baseline = counts ? bottom : zero;
                    const height = Math.max(0.5, Math.abs(baseline - valueY));
                    const barY = Math.min(baseline, valueY);
                    doc.rect(x, barY, barW, height).fill(seriesColors[seriesIndex]);
                    if (seriesIndex) {
                        doc.save().rect(x, barY, barW, height).clip();
                        for (let lineY = barY + 4; lineY < barY + height; lineY += 6) doc.moveTo(x, lineY).lineTo(x + barW, lineY).lineWidth(0.5).strokeColor(C.white).stroke();
                        doc.restore();
                    }
                    text(counts ? formatCount(row.count) : formatMoney(row.amount), x - 22, valueY - 12 - seriesIndex * 12, barW + 44, { size: 8, align: 'center' });
                });
            }
        });
        const labels = daily ? [rows[0][0]?.date, rows[0][Math.floor(rows[0].length / 2)]?.date, rows[0].at(-1)?.date] : bundle.market.monthly.map((row) => row.label);
        labels.forEach((label, index) => text(label || '', (daily ? left + index * (right - left) / 2 : left + (index + 0.5) * (right - left) / 3) - 36, bottom + 12, 72, { size: 8, align: 'center', color: C.textSecondary }));
        text(daily ? `Date (${bundle.market.timezone}); labels mark each series' daily peak` : 'Month; amounts are rounded to 2 decimals', M + 72, bottom + 32, W - 72, { size: 8, color: C.textSecondary });
        y = bottom + 60;
    };
    chart(false);
    chart(true);
    if (!bundle.memberId) {
        const top = view.members.slice(0, 3).map((row, index) => `${index + 1}. ${row.name} (${formatMoney(row.spent)})`).join('; ');
        const low = view.members.at(-1);
        const highlight = view.members.length ? `Top spenders: ${top}. Lowest spender: ${low.name} (${formatMoney(low.spent)}).` : 'No activity in this period';
        setFont(scriptRuns(highlight)[0]);
        const h = doc.heightOfString(highlight, { width: W });
        heading('Member highlights', h + 52);
        text(highlight, M, y, W);
        y += h + 24;
        if (view.members.length) table([...view.members, { ...grand, label: 'Grand total' }], 'Members ranked by market spending', 'Member');
    }
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index++) {
        doc.switchToPage(index);
        text(`Generated ${resources.istFull(new Date(bundle.generatedAt))}`, M + 200, 40, W - 200, { size: 8, align: 'right', color: C.textSecondary });
        text(`Page ${index + 1} of ${range.count}`, M + W - 80, 52, 80, { size: 8, align: 'right', color: C.textSecondary });
        doc.moveTo(M, 744).lineTo(M + W, 744).strokeColor(C.borderDefault).lineWidth(0.5).stroke();
        text('How to read this report', M, 752, W, { size: 8, bold: true });
        text('Only completed (logged) markets are counted. Amount spent is the total of those purchases; all amounts are INR (₹).', M, 768, W, { size: 8, color: C.textSecondary });
        text(`Meals include guests; meal cost uses the dashboard estimate. Share is each row's ${bundle.type === 'meal' ? 'meal cost' : 'market spending'} as a percentage of the total.`, M, 780, W, { size: 8, color: C.textSecondary });
        text(`Data as of ${bundle.market.asOf} (${bundle.market.timezone}). Generated ${resources.istFull(new Date(bundle.generatedAt))}.`, M, 800, W - 60, { size: 8, color: C.textSecondary });
        text(`Page ${index + 1} of ${range.count}`, M + W - 60, 800, 60, { size: 8, align: 'right', color: C.textSecondary });
    }
}

function streamAnalyticsPDF(bundle) {
    validateReport(bundle);
    const doc = new PDFDocument({ size: 'A4', margins: { top: M, left: M, right: M, bottom: 28 }, bufferPages: true, compress: true, info: { Title: 'United Mess Analytics Report', Author: 'United Mess' } });
    process.nextTick(() => {
        try { draw(doc, bundle); doc.end(); }
        catch (error) { doc.destroy(error); }
    });
    return doc;
}
async function generateAnalyticsPDF(bundle) {
    const chunks = [];
    for await (const chunk of streamAnalyticsPDF(bundle)) chunks.push(chunk);
    return Buffer.concat(chunks);
}
module.exports = { streamAnalyticsPDF, generateAnalyticsPDF, buildView, filename, validateReport };
