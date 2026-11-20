const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const { fixture } = require('../fixtures/analyticsReport.fixture');
const { generateAnalyticsPDF, buildView, filename } = require('../../src/services/analyticsReportPdf.service');
const { reportResources } = require('../../src/services/pdf.service');
const { formatMoney, sumMoney } = require('../../src/utils/helpers/analyticsReport.helper.cjs');
jest.setTimeout(30000);

test('PDF displays the dashboard snapshot amounts exactly, including values beyond safe floating-point precision', async () => {
    const report = fixture('000000000000000000000001');
    report.market.monthly[0].amount = '9007199254740993.21';
    report.market.monthly[1].amount = '0.10';
    report.market.monthly[2].amount = '0.20';
    const seen = jest.spyOn(PDFDocument.prototype, 'text');
    const pdf = await generateAnalyticsPDF(report);
    expect(buildView(report).market.amount).toBe('9007199254740993.51');
    for (const row of report.market.monthly) expect(seen.mock.calls.some(([value]) => value === formatMoney(row.amount))).toBe(true);
    expect(seen.mock.calls.some(([value]) => value === formatMoney(sumMoney(report.market.monthly)))).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeLessThan(300000);
    seen.mockRestore();
});

test('empty months, long member names, 55 members and repeated page headers render without NaN or split rows', async () => {
    const seen = jest.spyOn(PDFDocument.prototype, 'text');
    const empty = await generateAnalyticsPDF(fixture(undefined, 0, true));
    expect(empty.length).toBeLessThan(300000);
    expect(seen.mock.calls.some(([value]) => value === 'No activity in this period')).toBe(true);
    seen.mockClear();
    const report = fixture(undefined, 55);
    const pdf = await generateAnalyticsPDF(report);
    const headers = seen.mock.calls.filter(([value]) => value === 'Amount spent\nINR');
    const pages = [...pdf.toString('latin1').matchAll(/\/Type \/Page\b/g)].length;
    expect(pages).toBeGreaterThan(3);
    expect(headers.length).toBeGreaterThan(2);
    expect(seen.mock.calls.some(([value]) => /NaN|undefined/.test(value))).toBe(false);
    seen.mockRestore();
});

test('embedded fonts cover rupees and the supported Unicode scripts; filenames are safe', () => {
    for (const [key, text] of [['regular', '₹123.00'], ['bnRegular', 'অনুপম'], ['dvRegular', 'शर्मा'], ['arRegular', 'محمد']]) {
        const font = fontkit.create(reportResources.fonts[key]);
        expect([...text].every((ch) => font.hasGlyphForCodePoint(ch.codePointAt(0)))).toBe(true);
    }
    expect(filename(fixture())).toBe('analytics-both-all-2026-11.pdf');
});
