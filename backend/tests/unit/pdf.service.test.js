const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const fk = require('fontkit');
const { generateInvoicePDF, __testables } = require('../../src/services/pdf.service');

// PDF generation + stream inflation is CPU-bound; under the full parallel
// suite these tests exceed jest's 5s default.
jest.setTimeout(30000);

const { pickFont, prepareRtl, rtlWordPositions } = __testables;
const FONT_DIR = path.join(__dirname, '..', '..', 'src', 'services', 'fonts');

/* Minimal but valid fixture — generateInvoicePDF defaults every optional field */
const baseInvoice = {
    month: 6,
    year: 2026,
    monthName: 'June 2026',
    status: 'paid',
    totalPayable: 2450,
    paidAmount: 2450,
    mealCount: 30,
    mealRate: 81.67,
    messCost: 2450,
    marketAmountSpent: 0,
};

const generate = (name) =>
    generateInvoicePDF({ ...baseInvoice }, { name, email: 'member@unitedmess.com', chargePerGuestMeal: 60 });

const raw = (buf) => buf.toString('latin1');
const hasFont = (buf, marker) => raw(buf).includes(marker);

describe('generateInvoicePDF — Unicode script fallback', () => {
    it('Latin-only names embed NO fallback fonts (existing output unchanged)', async () => {
        const buf = await generate('John Doe');
        expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        expect(hasFont(buf, 'HindSiliguri')).toBe(false);
        expect(hasFont(buf, 'Hind-Regular')).toBe(false);
        expect(hasFont(buf, 'IBMPlexSansArabic')).toBe(false);
    });

    it('embeds Hind Siliguri for a Bengali name', async () => {
        const buf = await generate('Sahabaj \u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6');
        expect(hasFont(buf, 'HindSiliguri')).toBe(true);
        // The rest of the document still draws with Inter
        expect(hasFont(buf, 'Inter')).toBe(true);
    });

    it('embeds Hind for a Devanagari name', async () => {
        const buf = await generate('\u0905\u0928\u0941\u092a\u092e \u0936\u0930\u094d\u092e\u093e');
        expect(hasFont(buf, 'Hind-Regular')).toBe(true);
        expect(hasFont(buf, 'HindSiliguri')).toBe(false);
    });

    it('embeds IBM Plex Sans Arabic for an Arabic name', async () => {
        const buf = await generate('\u0645\u062d\u0645\u062f \u0631\u0633\u0648\u0644');
        expect(hasFont(buf, 'IBMPlexSansArabic')).toBe(true);
    });

    it('majority-script rule: mixed Latin+Bengali uses the Bengali family', async () => {
        const buf = await generate('Sahabaj \u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6');
        expect(hasFont(buf, 'HindSiliguri')).toBe(true);
        expect(hasFont(buf, 'IBMPlexSansArabic')).toBe(false);
    });
});

describe('pickFont', () => {
    it('keeps the base font for Latin-only text', () => {
        expect(pickFont('John Doe', 'Inter')).toBe('Inter');
        expect(pickFont('john@doe.com', 'Inter')).toBe('Inter');
        expect(pickFont('', 'Inter')).toBe('Inter');
        expect(pickFont(null, 'Inter')).toBe('Inter');
    });

    it('maps every base weight onto the matching family weight', () => {
        const bn = '\u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6';
        expect(pickFont(bn, 'Inter')).toBe('Bengali-Regular');
        expect(pickFont(bn, 'Inter-Medium')).toBe('Bengali-Medium');
        expect(pickFont(bn, 'Inter-SemiBold')).toBe('Bengali-SemiBold');
        expect(pickFont(bn, 'Inter-Bold')).toBe('Bengali-Bold');
        expect(pickFont('\u0645\u062d\u0645\u062f', 'Inter-SemiBold')).toBe('Arabic-SemiBold');
        expect(pickFont('\u0905\u0928\u0941\u092a\u092e', 'Inter-Bold')).toBe('Devanagari-Bold');
        expect(pickFont(bn, 'JetBrains Mono')).toBe('Bengali-Regular');
    });
});

describe('prepareRtl — RTL word order for pdfkit', () => {
    it('reverses word order for RTL-first strings', () => {
        expect(prepareRtl('\u0645\u062d\u0645\u062f \u0631\u0633\u0648\u0644'))
            .toBe('\u0631\u0633\u0648\u0644 \u0645\u062d\u0645\u062f');
    });

    it('leaves single-token RTL strings untouched (glyph order already visual)', () => {
        expect(prepareRtl('\u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646'))
            .toBe('\u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646');
    });

    it('leaves LTR-first strings untouched (incl. Latin+Arabic and Latin+Bengali)', () => {
        expect(prepareRtl('Sahabaj \u0645\u062d\u0645\u062f')).toBe('Sahabaj \u0645\u062d\u0645\u062f');
        expect(prepareRtl('Sahabaj \u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6'))
            .toBe('Sahabaj \u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6');
        expect(prepareRtl('John Doe')).toBe('John Doe');
    });
});

describe('font coverage (decision: no silently missing glyphs)', () => {
    const cases = [
        ['HindSiliguri-Regular.ttf', [
            'Sahabaj \u0986\u09b9\u09be\u09ae\u09cd\u09ae\u09c7\u09a6',
            '\u09ae\u09cb\u09b9\u09be\u09ae\u09cd\u09ae\u09a6 \u0995\u09be\u09b8\u09c7\u09ae',
            '\u099f\u09be\u09df\u09c7\u09b6 \u0995\u09c1\u09ae\u09be\u09b0',
        ]],
        ['Hind-Regular.ttf', [
            '\u0905\u0928\u0941\u092a\u092e \u0936\u0930\u094d\u092e\u093e',
            '\u0930\u093e\u091c\u0947\u0935 \u0915\u0941\u092e\u093e\u0930',
        ]],
        ['IBMPlexSansArabic-Regular.ttf', [
            '\u0645\u062d\u0645\u062f \u0631\u0633\u0648\u0644',
            '\u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646 \u0646\u0627\u0631\u0633\u0631',
        ]],
    ];

    for (const [file, names] of cases) {
        it(`${file} covers every codepoint of its sample names (incl. Latin)`, () => {
            const font = fk.create(fs.readFileSync(path.join(FONT_DIR, file)));
            for (const name of names) {
                const missing = [...name]
                    .filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
                expect({ file, name, missing }).toEqual({ file, name, missing: [] });
            }
        });
    }
});

describe('Arabic RTL shaping (decision: correct right-to-left rendering)', () => {
    // pdfkit draws each word as fontkit lays it out — so fontkit's per-word
    // glyph order IS what lands on the page. For '\u0628\u0628\u0628' (3 behs) the visual
    // left-to-right sequence must be final → medial → initial form
    // (the logically LAST letter is drawn first/leftmost in RTL).
    it('fontkit returns Arabic words in visual (reversed) glyph order', () => {
        const plex = fk.create(fs.readFileSync(path.join(FONT_DIR, 'IBMPlexSansArabic-Regular.ttf')));
        expect(plex.layout('\u0628\u0628').glyphs.map((g) => g.name)).toEqual(['uniFE90', 'uniFE91']);
        expect(plex.layout('\u0628\u0628\u0628').glyphs.map((g) => g.name))
            .toEqual(['uniFE90', 'uniFE92', 'uniFE91']);
        expect(plex.layout('\u0645\u062d\u0645\u062f').direction).toBe('rtl');
    });

    it('applies Arabic joining (positional forms), not isolated glyphs', () => {
        const plex = fk.create(fs.readFileSync(path.join(FONT_DIR, 'IBMPlexSansArabic-Regular.ttf')));
        const names = plex.layout('\u0645\u062d\u0645\u062f').glyphs.map((g) => g.name);
        // positional-form names (FE9x–FExx) — never the base codepoint names
        expect(names.every((n) => /^uniFE[0-9A-F]{2}$/.test(n))).toBe(true);
    });

    it('applies Bengali reordering (pre-base matra) and conjunct ligatures', () => {
        const bn = fk.create(fs.readFileSync(path.join(FONT_DIR, 'HindSiliguri-Regular.ttf')));
        // 'কি' = ka + i-matra: the matra is PRE-base visually → must be laid out first
        expect(bn.layout('কি').glyphs.map((g) => g.name)).toEqual(['bnmI', 'bnKA']);
        // 'ম্ম' ma + hasant + ma must collapse to a conjunct ligature
        expect(bn.layout('ম্ম').glyphs.some((g) => g.name === 'bnM_MA')).toBe(true);
    });
});

describe('rtlWordPositions — right-aligned RTL word placement', () => {
    const measure = (s) => s.length * 5;   // deterministic 5pt/char incl. space

    it('places prepareRtl() words left-to-right, flush to the box right edge', () => {
        const segs = rtlWordPositions('رسول محمد', measure, 74, 362);
        const total = 20 + 5 + 20;          // رسول (4 chars) + space + محمد (4 chars)
        expect(segs.map((s) => s.word)).toEqual(['رسول', 'محمد']);
        expect(segs.map((s) => s.x)).toEqual([74 + 362 - total, 74 + 362 - total + 25]);
        expect(segs[1].x + 20).toBe(74 + 362);   // right edge lands on the box edge
    });

    it('anchors a single word flush right', () => {
        const [seg] = rtlWordPositions('محمد', measure, 74, 362);
        expect(seg.x + 20).toBe(74 + 362);
    });

    it('overflows to the left when the line exceeds the box (never past the right edge)', () => {
        const segs = rtlWordPositions('ااااا ااااا', measure, 74, 30);
        expect(segs[0].x).toBe(74 + 30 - 55);
        expect(segs[1].x + 25).toBe(74 + 30);
    });

    it('returns [] for empty input', () => {
        expect(rtlWordPositions('', measure, 74, 362)).toEqual([]);
        expect(rtlWordPositions(null, measure, 74, 362)).toEqual([]);
        expect(rtlWordPositions('   ', measure, 74, 362)).toEqual([]);
    });
});

describe('RTL line placement in generated PDFs (right-align only where RTL)', () => {
    /* Text-showing runs for the BILLED TO name row — pdfkit content streams
       are Flate-compressed; inflate and read the `Tm` x-origins. Band 729..744
       catches name (≈735) + meta "Issued on" (743) while excluding email
       (724), the BILLED TO label (750) and the Billing-period row (760). */
    const nameRowXs = async (name) => {
        const buf = await generate(name);
        const raw = buf.toString('latin1');
        const xs = [];
        const rx = /stream\r?\n/g;
        let m;
        while ((m = rx.exec(raw))) {
            const start = m.index + m[0].length;
            const end = raw.indexOf('endstream', start);
            if (end < 0) continue;
            let inf = null;
            try { inf = zlib.inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1'); }
            catch (_) { /* not a Flate stream (e.g. font program) */ }
            if (inf && inf.includes('BT')) {
                for (const t of inf.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)) {
                    const y = +t[2];
                    if (y > 729 && y < 744.5) xs.push(+t[1]);
                }
            }
            rx.lastIndex = end;
        }
        return xs;
    };

    it('right-aligns a pure-Arabic name inside the left column (edge = metaX - 14 = 436)', async () => {
        const xs = await nameRowXs('محمد رسول');
        const words = xs.filter((x) => x >= 300 && x <= 450);
        expect(words.length).toBe(2);        // two positioned words, not one run
        expect(xs).not.toContain(74);        // no name left-anchored at the label
        expect(Math.max(...words)).toBeLessThan(450);   // never enters the meta column
    });

    it('keeps Latin / Bengali / Devanagari names left-aligned at x = 74', async () => {
        for (const n of ['John Doe', 'Sahabaj আহাম্মেদ', 'अनुपम शर्मा']) {
            const xs = await nameRowXs(n);
            expect(xs).toContain(74);
            expect(xs.filter((x) => x >= 300 && x <= 450)).toEqual([]);
        }
    });

    it('right-aligns an RTL-first mixed name without disturbing the meta column', async () => {
        const xs = await nameRowXs('عبدالرحمن Rahman');
        // pdfkit may emit a joined Arabic word as several adjacent runs — the
        // placement is right-anchored as a whole, never left at the label.
        const nameRuns = xs.filter((x) => x >= 300 && x <= 450);
        expect(nameRuns.length).toBeGreaterThanOrEqual(2);
        expect(xs).not.toContain(74);
        expect(xs.some((x) => x > 455)).toBe(true);   // meta row still drawn in this band
    });
});
