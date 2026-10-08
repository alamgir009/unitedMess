'use strict';

/**
 * pdf.service.js
 *
 * Server-side PDF invoice generator using pdfkit.
 *   - Header (issuer block, BILLED TO, labelled billing period + issued-on in IST)
 *   - Stat Cards (Market Total, Total Meals, Your Payable — neutral)
 *   - LEDGER (charges → subtotal → less market spend → rounding = totalPayable)
 *   - Total Box (neutral) + status chip (glyph + label + token pair)
 *   - PAYMENT DETAILS / REFUND DETAILS key-value blocks (data-driven)
 *   - Footer disclaimer + generated-in-IST stamp
 *
 * Every money line reconciles to invoice.totalPayable. All display text meets
 * WCAG AA (≥4.5:1) at ≥9pt. Returns Promise<Buffer> for nodemailer attachments.
 */

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Indian-locale formatters — Intl for consistent cross-platform output.
 *  fmt  → counts (meals, meal totals); fmt2 → money, always two decimals. */
const fmt  = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmt2 = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

/* ── Display tokens ─────────────────────────────────────────────────────────
   The PDF cannot read CSS variables; these literals mirror the app's design
   tokens 1:1 (source: frontend/src/styles/themes/light.css). Muted text uses
   --text-secondary (7.29:1 on white) because --text-tertiary (4.17:1) and
   --text-muted fail WCAG AA at invoice sizes. */
const C = {
    // themes/light.css:37-38
    textPrimary:   '#121212',   // --text-primary
    textSecondary: '#505762',   // --text-secondary
    // themes/light.css:25,31,32
    bgSubtle:      '#f6f7f8',   // --bg-subtle
    borderDefault: '#dddfe4',   // --border-default
    borderMuted:   '#e6e7eb',   // --border-muted
    white:         '#ffffff',
    // themes/light.css:6 (brand)
    brand:         '#2463eb',   // --brand
    // themes/light.css:47-49 (success)
    successBg:     '#f1fdf5',
    successBorder: '#bbf7d0',
    successText:   '#157f3c',
    // themes/light.css:52-54 (warning)
    warningBg:     '#fffbeb',
    warningBorder: '#fde68b',
    warningText:   '#ae5f04',   // --warning-text lightness 37→35 for AA (see themes/light.css:54)
    // --refund family (new token, mirrors frontend/src/styles/themes/light.css)
    refundBg:      '#f6f1fe',
    refundBorder:  '#e0d0fb',
    refundText:    '#5c2aa2',
};

/* Status chip — glyph + token pair per audited invoice status
   (Invoice.model.js:85-86 via pdf.service status derivation). Colour never
   carries meaning alone: every chip has a glyph AND a label. */
const CHIPS = {
    pending:  { glyph: '!',      label: 'DUE',        bg: C.warningBg, fg: C.warningText, bd: C.warningBorder },
    partial:  { glyph: '\u2026', label: 'PARTIAL',    bg: C.warningBg, fg: C.warningText, bd: C.warningBorder },
    success:  { glyph: '\u2713', label: 'PAID',       bg: C.successBg, fg: C.successText, bd: C.successBorder },
    refund:   { glyph: '\u21A9', label: 'REFUND DUE', bg: C.refundBg,  fg: C.refundText,  bd: C.refundBorder },
    refunded: { glyph: '\u21BA', label: 'REFUNDED',   bg: C.refundBg,  fg: C.refundText,  bd: C.refundBorder },
};

/* ── IST display helpers ───────────────────────────────────────────────────
   Timestamps are stored in UTC (Mongoose timestamps); display is pinned to
   Asia/Kolkata explicitly — never server-local (pattern: email.service.js:644). */
const IST_TZ    = 'Asia/Kolkata';
const istDate   = (d) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST_TZ }).format(d);
const istTime   = (d) => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST_TZ }).format(d).toUpperCase();
const istFull   = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? `${istDate(d)}, ${istTime(d)} IST` : null);

/** Human labels for Payment.paymentMethod — kept in sync with
 *  email.service.js:15-20 (PAYMENT_METHOD_LABELS). */
const METHOD_LABELS = {
    razorpay:  'Online (Razorpay)',
    online:    'Online Transfer',
    upi_manual:'UPI (Manual)',
    cash:      'Cash',
};

/** Mask a UPI VPA for display — ali@okaxis → ali•••@okaxis */
const maskVpa = (vpa) => {
    const [local, host] = String(vpa).split('@');
    if (!host) return String(vpa);
    return `${local.slice(0, Math.min(3, local.length))}\u2022\u2022\u2022@${host}`;
};

/** Font paths — loaded once into memory at startup (Inter + JetBrains Mono, OFL) */
const FONT_DIR = path.join(__dirname, 'fonts');
const FONTS = {
    regular:  path.join(FONT_DIR, 'Inter_400Regular.ttf'),
    medium:   path.join(FONT_DIR, 'Inter_500Medium.ttf'),
    semibold: path.join(FONT_DIR, 'Inter_600SemiBold.ttf'),
    bold:     path.join(FONT_DIR, 'Inter_700Bold.ttf'),
    mono:     path.join(FONT_DIR, 'JetBrainsMono-Regular.ttf'),   // UTR / txn / reference ids
};

/** Cache font buffers at module load — avoids disk I/O on every PDF generation */
const FONT_BUFFERS = {
    regular:  fs.readFileSync(FONTS.regular),
    medium:   fs.readFileSync(FONTS.medium),
    semibold: fs.readFileSync(FONTS.semibold),
    bold:     fs.readFileSync(FONTS.bold),
    mono:     fs.readFileSync(FONTS.mono),
};

/** Cache brand logo buffer at module load */
const LOGO_PATH = path.join(FONT_DIR, 'brand-logo.png');
const LOGO_BUFFER = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;

/** Page geometry */
const PAGE_W    = 680;
const MARGIN    = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Minimum bottom margin before triggering a new page */
const PAGE_BOTTOM_SAFE = 48;

/** Footer block height (rule + two centred lines) — reserved as part of the
 *  bottom cluster so it can never be orphaned onto a page of its own. */
const FOOTER_H = 42;

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDATION
───────────────────────────────────────────────────────────────────────────── */

/**
 * Validate required inputs early so the generator fails fast with a
 * descriptive error rather than silently emitting a corrupt PDF.
 *
 * @param {object} invoiceData
 * @param {object} user
 */
function validateInputs(invoiceData, user) {
    if (!invoiceData || typeof invoiceData !== 'object') {
        throw new TypeError('generateInvoicePDF: invoiceData must be a non-null object');
    }
    if (!user || typeof user !== 'object') {
        throw new TypeError('generateInvoicePDF: user must be a non-null object');
    }
    if (invoiceData.month == null || invoiceData.year == null) {
        throw new RangeError('generateInvoicePDF: invoiceData must contain month and year');
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */

/**
 * Generate a per-member invoice PDF.
 *
 * @param {Object} invoiceData  Result from invoiceService.getInvoice(), annotated:
 *                                _messGrandTotalMarket {number}
 *                                _messGrandTotalMeal   {number}
 *                                _paymentMethod?       {string}  Payment.paymentMethod
 *                                _transactionId?       {string}
 *                                _utr?                 {string}  raw member-submitted bank UTR
 *                                _paymentDate?         {Date}    payment.paymentDate (UTC)
 *                                _payeeVpa?            {string}  payee UPI VPA (masked on render)
 *                                _recordedByName?      {string}  createdBy.name of the payment
 *                                _verifiedByName?      {string}  verifiedBy.name of the payment
 *                                _refundAmount?        {number}  refund payout amount
 *                                _refundAt?            {Date}    refund payout date (UTC)
 *                                _refundReference?     {string}  txn id or payment _id
 * @param {Object} user         Plain user document { name, email, chargePerGuestMeal, … }
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = (invoiceData, user) => {
    return new Promise((resolve, reject) => {

        /* ── Early validation ── */
        try {
            validateInputs(invoiceData, user);
        } catch (err) {
            return reject(err);
        }

        let doc; // declared here so the error handler can call doc.end() if needed

        try {
            /* ── Build display values ── */
            const monthName    = invoiceData.monthName || `Month ${invoiceData.month}/${invoiceData.year}`;
            const issuedAt     = istFull(new Date());   // IST, not server-local

            // Stable invoice number — derived from persistent fields, not Date.now()
            const invoiceNo = `UM-${invoiceData.year}${String(invoiceData.month).padStart(2, '0')}-${
                String(invoiceData._id || invoiceData.userId || 'GEN').slice(-6).toUpperCase()
            }`;

            const finalPayable  = invoiceData.totalPayable  ?? 0;
            const isRefund      = finalPayable < 0;
            const displayAmt    = Math.abs(finalPayable);
            // Payout record attached by _buildInvoiceForPdf — totalPayable
            // stays negative after the refund is paid out, so the sign alone
            // cannot distinguish "Refund Due" from "Refunded".
            const refundSettled = !!invoiceData.refundSettled;

            const isPaid          = invoiceData.status === 'paid';
            const isPartiallyPaid = invoiceData.status === 'partially_paid';
            /* Chip key — precedence: settled money > partial > refund sign >
               unpaid. Mirrors the audited status → tone mapping; the glyph+
               label in CHIPS make the meaning independent of colour. */
            const chipKey = isPaid             ? 'success'
                          : isPartiallyPaid    ? 'partial'
                          : isRefund           ? (refundSettled ? 'refunded' : 'refund')
                          :                     'pending';
            const chip = CHIPS[chipKey];

            /* User stats */
            const uMeal         = invoiceData.mealCount         ?? 0;
            const uMarket       = invoiceData.marketAmountSpent  ?? 0;
            const waterBill     = invoiceData.fixedCosts?.waterBill     ?? 0;
            const cookCharge    = invoiceData.fixedCosts?.cookingCharge ?? 0;
            const platformFee   = invoiceData.fixedCosts?.platformFee   ?? 0;
            const guestMeal     = invoiceData.guestMealCount    ?? 0;
            const guestRate     = user.chargePerGuestMeal       ?? 60;
            const guestAmt      = invoiceData.guestMealRevenue  ?? 0;
            const costOfMeals   = invoiceData.messCost          ?? 0;
            const adjMealCharge = invoiceData.mealRate          ?? 0;
            const paidAmount    = invoiceData.paidAmount        ?? 0;

            /* Mess-wide stats */
            const grandTotalMarket = invoiceData._messGrandTotalMarket ?? 0;
            const grandTotalMeal   = invoiceData._messGrandTotalMeal   ?? 0;
            const grandTotalGuest  = invoiceData._messGrandTotalGuest ?? 0;

            /* Meal-rate breakdown formula — mirrors frontend buildMealRateFormula */
            const ownMealsAll = grandTotalMeal - grandTotalGuest;
            const effGuestRate = guestMeal > 0 && guestAmt > 0
                ? Number((guestAmt / guestMeal).toFixed(2))
                : guestRate;
            const mealRateFormula = adjMealCharge > 0 && grandTotalMarket > 0 && ownMealsAll > 0
                ? (grandTotalGuest > 0 && effGuestRate > 0
                    ? `(${fmt2(grandTotalMarket)} \u2212 ${fmt(grandTotalGuest)}\u00d7${fmt2(effGuestRate)}) \u00f7 ${fmt(ownMealsAll)}`
                    : `${fmt2(grandTotalMarket)} \u00f7 ${fmt(ownMealsAll)}`)
                : null;

            /* ── Create PDF document ── */
            doc = new PDFDocument({
                size:          [PAGE_W, 841],   // A4-ish height; overflow handled by addPage()
                margins:       { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
                autoFirstPage: true,
                compress:      true,
                info: {
                    Title:   `Invoice ${invoiceNo}`,
                    Subject: `Mess Bill - ${monthName}`,
                    Author:  'United Mess',
                    Creator: 'United Mess Invoice System',
                },
            });

            /* ── Register custom fonts from cached buffers (no disk I/O) ── */
            doc.registerFont('Inter',          FONT_BUFFERS.regular);
            doc.registerFont('Inter-Medium',   FONT_BUFFERS.medium);
            doc.registerFont('Inter-SemiBold', FONT_BUFFERS.semibold);
            doc.registerFont('Inter-Bold',     FONT_BUFFERS.bold);
            doc.registerFont('JetBrains Mono', FONT_BUFFERS.mono);

            /* ── Buffer collection ── */
            const chunks = [];
            doc.on('data',  (chunk) => chunks.push(chunk));
            doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            /* ── Y-cursor ── */
            let y = MARGIN;

            /* ── Page-overflow guard ── */
            const ensureSpace = (needed) => {
                if (y + needed > doc.page.height - PAGE_BOTTOM_SAFE) {
                    doc.addPage();
                    y = MARGIN;
                }
            };

            /* ──────────────────────────────────────────────────
               DRAWING PRIMITIVES
               ────────────────────────────────────────────────── */

            const hRule = (ty, color = C.borderDefault, thick = 0.5) => {
                doc.save()
                   .strokeColor(color).lineWidth(thick)
                   .moveTo(MARGIN, ty).lineTo(PAGE_W - MARGIN, ty)
                   .stroke()
                   .restore();
            };

            /**
             * Draws a rounded rectangle with fill + stroke in a single pass.
             * Using fillAndStroke() avoids the double-path artifact of calling
             * fill() then stroke() separately.
             */
            const fillStrokeRect = (rx, ry, rw, rh, fillColor, strokeColor, thick = 1, radius = 8) => {
                doc.save()
                   .fillColor(fillColor)
                   .strokeColor(strokeColor)
                   .lineWidth(thick)
                   .roundedRect(rx, ry, rw, rh, radius)
                   .fillAndStroke()
                   .restore();
            };

            /* ──────────────────────────────────────────────────
               HEADER
               ────────────────────────────────────────────────── */

            const LOGO_SIZE        = 26;
            const BRAND_FONT_SIZE  = 18;
            const LOGO_TEXT_GAP    = 8;
            const headerStartY     = y;   // anchor for both header columns

            // Configure brand font first so metrics are accurate
            doc.font('Inter-Bold').fontSize(BRAND_FONT_SIZE);
            const textHeight = doc.currentLineHeight();

            // ── Issuer block (left): logo + wordmark + platform line ──
            let brandTextX = MARGIN;
            if (LOGO_BUFFER) {
                doc.image(LOGO_BUFFER, MARGIN, headerStartY, {
                    fit:    [LOGO_SIZE, LOGO_SIZE],
                    align:  'left',
                    valign: 'center',
                });
                brandTextX = MARGIN + LOGO_SIZE + LOGO_TEXT_GAP;
            }

            // Vertically centre brand name against logo
            const brandTextY = headerStartY + (LOGO_SIZE - textHeight) / 2;

            doc.fillColor(C.textPrimary);
            doc.text('United', brandTextX, brandTextY);
            const unitedWidth = doc.widthOfString('United');

            doc.fillColor(C.brand);
            doc.text('Mess', brandTextX + unitedWidth + 2, brandTextY);

            const subLineStartY = brandTextY + textHeight + 3;
            doc.fontSize(9).font('Inter').fillColor(C.textSecondary);
            doc.text('Mess Management Platform', brandTextX, subLineStartY);

            // ── Billed-to block (left), separated from the issuer ──
            doc.font('Inter-SemiBold').fontSize(9).fillColor(C.textSecondary);
            doc.text('BILLED TO', brandTextX, subLineStartY + 15);
            doc.font('Inter').fontSize(10).fillColor(C.textPrimary);
            doc.text(user.name || '\u2014', brandTextX, subLineStartY + 28);
            doc.fontSize(9).fillColor(C.textSecondary);
            doc.text(user.email || '', brandTextX, subLineStartY + 41);

            // ── Invoice meta (right): labelled billing period + issued-on (IST) ──
            const metaX   = PAGE_W - MARGIN - 190;
            const metaW   = 190;
            // value hugs the right edge; label sits to its left on the same line
            const metaPair = (label, value, dy, vf, vs, vc) => {
                doc.font(vf).fontSize(vs);                 // measure at the VALUE's real size
                const vw = doc.widthOfString(value);
                doc.fillColor(vc);
                doc.text(value, metaX, headerStartY + dy, { width: metaW, align: 'right' });
                doc.font('Inter').fontSize(9).fillColor(C.textSecondary);
                doc.text(label, metaX, headerStartY + dy + 1, { width: Math.max(metaW - vw - 10, 40), align: 'right', ellipsis: true });
            };

            doc.font('Inter').fontSize(9).fillColor(C.textSecondary);
            doc.text('INVOICE', metaX, headerStartY, { width: metaW, align: 'right' });
            doc.font('Inter-SemiBold').fontSize(10).fillColor(C.brand);
            doc.text(invoiceNo, metaX, headerStartY + 13, { width: metaW, align: 'right' });
            metaPair('Billing period', monthName,            31, 'Inter-SemiBold', 10, C.textPrimary);
            metaPair('Issued on',      issuedAt || '\u2014',  48, 'Inter',          10, C.textPrimary);

            // Advance cursor below the deepest of the two columns, then draw the rule
            const leftBottom  = subLineStartY + 41 + 11;
            const rightBottom = headerStartY + 48 + 12;
            y = Math.max(leftBottom, rightBottom) + 8;
            hRule(y, C.brand, 2);
            y += 12;

            /* ──────────────────────────────────────────────────
               STAT CARDS
               ────────────────────────────────────────────────── */

            ensureSpace(76);
            const cardGap = 10;
            const cardW   = (CONTENT_W - cardGap * 2) / 3;
            const cardH   = 56;
            const cardY   = y;

            // Card 1 — Market Total
            fillStrokeRect(MARGIN, cardY, cardW, cardH, C.bgSubtle, C.borderDefault);
            doc.fontSize(9).font('Inter-SemiBold').fillColor(C.textSecondary);
            doc.text('MARKET TOTAL (ALL)', MARGIN + 10, cardY + 8);
            doc.fontSize(18).font('Inter-SemiBold').fillColor(C.textPrimary);
            doc.text(`\u20B9${fmt2(grandTotalMarket)}`, MARGIN + 10, cardY + 22);

            // Card 2 — Total Meals
            const card2X = MARGIN + cardW + cardGap;
            fillStrokeRect(card2X, cardY, cardW, cardH, C.bgSubtle, C.borderDefault);
            doc.fontSize(9).font('Inter-SemiBold').fillColor(C.textSecondary);
            doc.text('TOTAL MEALS (ALL)', card2X + 10, cardY + 8);
            doc.fontSize(18).font('Inter-SemiBold').fillColor(C.textPrimary);
            doc.text(`${fmt(grandTotalMeal)}`, card2X + 10, cardY + 22);
            if (grandTotalGuest > 0) {
                const totalOwn = grandTotalMeal - grandTotalGuest;
                doc.fontSize(9).font('Inter').fillColor(C.textSecondary);
                doc.text(`${fmt(totalOwn)} + ${fmt(grandTotalGuest)} Guest`, card2X + 10, cardY + 42);
            }

            // Card 3 — Your Payable (neutral; sign carried by the figure itself)
            const card3X = MARGIN + (cardW + cardGap) * 2;
            fillStrokeRect(card3X, cardY, cardW, cardH, C.bgSubtle, C.borderDefault);
            doc.fontSize(9).font('Inter-SemiBold').fillColor(C.textSecondary);
            doc.text(isRefund ? (refundSettled ? 'REFUNDED' : 'REFUND DUE') : 'YOUR PAYABLE', card3X + 10, cardY + 8);
            doc.fontSize(18).font('Inter-SemiBold').fillColor(C.textPrimary);
            doc.text(`${isRefund ? '\u2212' : ''}\u20B9${fmt2(displayAmt)}`, card3X + 10, cardY + 22);

            y = cardY + cardH + 16;

            /* ──────────────────────────────────────────────────
               SECTION & ROW HELPERS
               ────────────────────────────────────────────────── */

            const sectionLabel = (label) => {
                ensureSpace(30);
                doc.fontSize(9).font('Inter-SemiBold').fillColor(C.textSecondary);
                doc.text(label.toUpperCase(), MARGIN, y);
                hRule(y + 14, C.borderDefault, 0.5);
                y += 16;
            };

            const dataRow = (label, value, subLabel = null, bold = false) => {
                const subs = subLabel == null ? [] : (Array.isArray(subLabel) ? subLabel : [subLabel]);
                const rowH = subs.length > 1 ? 46 : subs.length === 1 ? 34 : 22;
                ensureSpace(rowH + 2);
                hRule(y + rowH - 1, C.borderMuted, 0.4);

                doc.fontSize(11).font(bold ? 'Inter-SemiBold' : 'Inter').fillColor(C.textSecondary);
                doc.text(label, MARGIN, y + 4, { width: CONTENT_W * 0.6 });

                subs.forEach((line, i) => {
                    doc.fontSize(9).font(i === 0 ? 'Inter' : 'Inter-Medium').fillColor(C.textSecondary);
                    doc.text(line, MARGIN, y + 18 + i * 13);
                });

                doc.fontSize(11).font(bold ? 'Inter-Bold' : 'Inter-SemiBold').fillColor(C.textPrimary);
                doc.text(value, MARGIN, y + 4, { width: CONTENT_W, align: 'right' });

                y += rowH;
            };

            /* ──────────────────────────────────────────────────
               LEDGER — every line reconciles to totalPayable
               (invoice.service.js:236: mess + cooking + water +
                platform + guest − market)
               ────────────────────────────────────────────────── */

            const r2    = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
            const money = (n) => { const v = r2(n); return (v < 0 ? '\u2212\u20B9' : '\u20B9') + fmt2(Math.abs(v)); };

            sectionLabel('Ledger');

            // Meals — stored messCost (= mealCount × mealRate, invoice.service.js:240)
            dataRow('Meals', money(costOfMeals), [
                `${fmt(uMeal)} meals \u00d7 \u20B9${fmt2(adjMealCharge)}`,
                ...(mealRateFormula ? [mealRateFormula] : []),
            ]);

            dataRow('Water Bill',     money(waterBill));
            dataRow('Cooking Charge', money(cookCharge));
            if (guestMeal > 0) {
                dataRow('Guest Meals', money(guestAmt), `${guestMeal} meals \u00d7 \u20B9${fmt2(guestRate)}`);
            }
            if (platformFee !== 0) {
                dataRow('Platform Fee', money(platformFee));
            }

            // Subtotal = Σ charges as displayed (invoice.service.js:236 term order)
            const dispSum = r2(r2(costOfMeals) + r2(waterBill) + r2(cookCharge)
                + (guestMeal > 0 ? r2(guestAmt) : 0) + r2(platformFee));
            dataRow('Subtotal', money(dispSum), null, true);

            dataRow('Less: Market spend you paid', money(-uMarket),
                uMarket > 0 ? 'Credit — spend you settled directly' : 'No direct market spend recorded');

            // Rounding off — residual of the service's Math.round(x*100)/100
            // (invoice.service.js:252-253), computed from DISPLAYED values so the
            // printed rows + rounding reconcile to the printed total exactly.
            const rounding = r2(finalPayable - (dispSum - r2(uMarket)));
            dataRow('Rounding off', money(rounding));

            // Total / Paid / Balance due are shown once, in the Total box below.
            y += 6;

            /* ──────────────────────────────────────────────────
               BOTTOM CLUSTER — rows are built from real data first so
               the whole cluster (total box + blocks + footer) can be
               reserved as ONE atomic unit before anything is painted.
               ────────────────────────────────────────────────── */

            const blockRows = (rows) => (rows.length ? 26 + (rows.length - 1) * 16 + 11 + 8 : 0);

            /* PAYMENT DETAILS — shown only when a completed payment was
               annotated; every value comes from the Payment record (never
               user-supplied text), masked where needed. */
            const payRows = [];
            if (invoiceData._paymentMethod) {
                payRows.push(['Paid at', istFull(invoiceData._paymentDate) || '\u2014']);
                payRows.push(['Method',  METHOD_LABELS[invoiceData._paymentMethod] || invoiceData._paymentMethod]);
                const ref = invoiceData._utr || invoiceData._transactionId;
                if (ref) payRows.push([invoiceData._utr ? 'UTR' : 'Transaction ID', ref, true]);
                if (invoiceData._payeeVpa) payRows.push(['Payee', maskVpa(invoiceData._payeeVpa)]);
                payRows.push(invoiceData._verifiedByName
                    ? ['Verified by', invoiceData._verifiedByName]
                    : ['Recorded by', invoiceData._recordedByName || 'admin']);
            }

            /* REFUND DETAILS — shown when the refund payout is recorded. */
            const refRows = [];
            if (refundSettled) {
                refRows.push(['Refund amount', money(invoiceData._refundAmount ?? displayAmt)]);
                refRows.push(['Refunded on',   istFull(invoiceData._refundAt) || '\u2014']);
                refRows.push(['Reference',     invoiceData._refundReference || '\u2014', true]);
            }

            const pbH = blockRows(payRows);
            const rbH = blockRows(refRows);

            const totalBoxH = 68;
            ensureSpace(totalBoxH + 12 + (pbH ? pbH + 12 : 0) + (rbH ? rbH + 12 : 0) + FOOTER_H);

            /* ── Total box — neutral container; status colour lives only in
                  the chip. Total, Paid and Balance due appear here once. ── */
            fillStrokeRect(MARGIN, y, CONTENT_W, totalBoxH, C.bgSubtle, C.borderDefault, 1, 10);

            doc.fontSize(9).font('Inter-SemiBold').fillColor(C.textSecondary);
            doc.text(isRefund ? 'TOTAL (CREDIT)' : 'TOTAL PAYABLE', MARGIN + 16, y + 10);

            doc.fontSize(28).font('Inter-SemiBold').fillColor(C.textPrimary);
            doc.text(`${isRefund ? '\u2212' : ''}\u20B9${fmt2(displayAmt)}`, MARGIN + 16, y + 24);

            // Status chip — glyph + label + token pair (fg/bg AA-verified)
            const chipText = `${chip.glyph}  ${chip.label}`;
            doc.font('Inter-SemiBold').fontSize(9);
            const chipW = doc.widthOfString(chipText) + 0.8 * chipText.length + 22;
            const chipX = PAGE_W - MARGIN - 16 - chipW;
            fillStrokeRect(chipX, y + 10, chipW, 20, chip.bg, chip.bd, 1, 10);
            doc.fillColor(chip.fg);
            doc.text(chipText, chipX, y + 15, { width: chipW, align: 'center', characterSpacing: 0.8 });

            // Paid / Balance due — right column under the chip
            const kvRow = (label, value, dy) => {
                doc.font('Inter').fontSize(9).fillColor(C.textSecondary);
                doc.text(label, MARGIN + CONTENT_W - 216, y + dy, { width: 108 });
                doc.font('Inter-SemiBold').fontSize(9).fillColor(C.textPrimary);
                doc.text(value, MARGIN + CONTENT_W - 108, y + dy, { width: 92, align: 'right' });
            };
            kvRow('Paid',        money(paidAmount), 40);
            kvRow('Balance due', isRefund ? '\u2014' : money(Math.max(0, finalPayable - paidAmount)), 56);

            y += totalBoxH + 12;

            /* ── Key-value blocks (payment / refund) ── */
            const drawKeyedBlock = (title, rows, blockH) => {
                if (!rows.length) return;
                fillStrokeRect(MARGIN, y, CONTENT_W, blockH, C.bgSubtle, C.borderDefault, 1, 8);
                doc.font('Inter-SemiBold').fontSize(9).fillColor(C.textSecondary);
                doc.text(title, MARGIN + 12, y + 10);
                rows.forEach((r, i) => {
                    const ry = y + 26 + i * 16;
                    doc.font('Inter').fontSize(9).fillColor(C.textSecondary);
                    doc.text(r[0], MARGIN + 12, ry);
                    doc.font(r[2] ? 'JetBrains Mono' : 'Inter').fontSize(9).fillColor(C.textPrimary);
                    doc.text(r[1], MARGIN + 130, ry, { width: CONTENT_W - 142 });
                });
                y += blockH + 12;
            };
            drawKeyedBlock('PAYMENT DETAILS', payRows, pbH);
            drawKeyedBlock('REFUND DETAILS',  refRows, rbH);

            /* ──────────────────────────────────────────────────
               FOOTER
               ────────────────────────────────────────────────── */

            ensureSpace(FOOTER_H);
            y += 8;
            hRule(y, C.borderDefault, 0.5);
            y += 8;

            doc.fontSize(9).font('Inter').fillColor(C.textSecondary);
            doc.text(
                `System-generated invoice for ${monthName}. For disputes, contact your mess admin.`,
                MARGIN, y, { width: CONTENT_W, align: 'center' }
            );
            y += 14;

            doc.fontSize(9).font('Inter-Medium').fillColor(C.textSecondary);
            doc.text(
                `United Mess \u00b7 ${invoiceNo} \u00b7 Generated ${issuedAt}`,
                MARGIN, y, { width: CONTENT_W, align: 'center' }
            );

            doc.end();

        } catch (err) {
            // Ensure the stream is terminated before rejecting
            try { doc && doc.end(); } catch (_) { /* ignore secondary error */ }
            reject(err);
        }
    });
};

module.exports = { generateInvoicePDF };