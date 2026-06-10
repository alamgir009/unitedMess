'use strict';

/**
 * pdf.service.js
 *
 * Server-side PDF invoice generator using pdfkit.
 * Mirrors PrintInvoice.jsx layout as closely as possible:
 *   - Header (brand, invoice meta, user info)
 *   - Stat Cards (Market Total, Total Meals, Your Payable)
 *   - Sections: Your Usage, Monthly Charges, Calculations, Previous Balance (conditional)
 *   - Total Box + Status Badge
 *   - Payment Block (if paid / partially paid)
 *   - Footer disclaimer
 *
 * Returns a Promise<Buffer> (binary PDF) suitable for nodemailer attachments.
 */

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Indian-locale number formatter — uses Intl for consistent cross-platform output */
const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);

/** Colour palette — matches PrintInvoice.jsx inline styles */
const C = {
    indigo:       '#4f46e5',
    indigoBg:     '#eef2ff',
    indigoBorder: '#c7d2fe',
    indigoText:   '#4338ca',
    gray900:      '#0f172a',
    gray700:      '#374151',
    gray500:      '#6b7280',
    gray400:      '#9ca3af',
    gray300:      '#d1d5db',
    gray200:      '#e2e8f0',
    gray100:      '#f1f5f9',
    gray50:       '#f8fafc',
    white:        '#ffffff',
    green:        '#16a34a',
    greenBg:      '#f0fdf4',
    greenBorder:  '#86efac',
    greenBadgeBg: '#d1fae5',
    greenBadgeTx: '#065f46',
    amber:        '#92400e',
    amberBg:      '#fffbeb',
    amberBorder:  '#fde68a',
    amberBadgeBg: '#fef3c7',
    amberBadgeTx: '#92400e',
    blue:         '#1e3a5f',
    blueBg:       '#eff6ff',
    blueTx:       '#3b82f6',
    purple:       '#c4b5fd',
};

/** Font paths */
const FONT_DIR = path.join(__dirname, 'fonts');
const FONTS = {
    regular:  path.join(FONT_DIR, 'NotoSans-Regular.ttf'),
    semibold: path.join(FONT_DIR, 'NotoSans-SemiBold.ttf'),
};

/** Page geometry */
const PAGE_W    = 680;
const MARGIN    = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Minimum bottom margin before triggering a new page */
const PAGE_BOTTOM_SAFE = 60;

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
 * @param {Object} invoiceData  Result from invoiceService.getInvoice(), annotated
 *                              by emailAllInvoices with:
 *                                _messGrandTotalMarket {number}
 *                                _messGrandTotalMeal   {number}
 *                                _transactionId?       {string}
 *                                _paymentMethod?       {string}
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
            const displayDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            // Stable invoice number — derived from persistent fields, not Date.now()
            const invoiceNo = `UM-${invoiceData.year}${String(invoiceData.month).padStart(2, '0')}-${
                String(invoiceData._id || invoiceData.userId || 'GEN').slice(-6).toUpperCase()
            }`;

            const finalPayable  = invoiceData.totalPayable  ?? 0;
            const isRefund      = finalPayable < 0;
            const displayAmt    = Math.abs(finalPayable);

            const isPaid          = invoiceData.status === 'paid';
            const isPartiallyPaid = invoiceData.status === 'partially_paid';
            const statusLabel     = isPaid
                ? 'Paid'
                : isPartiallyPaid
                    ? 'Partial'
                    : isRefund
                        ? 'Refund Due'
                        : 'Due';

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
            const prevBalance   = invoiceData.previousBalance   ?? 0;

            /* Mess-wide stats */
            const grandTotalMarket = invoiceData._messGrandTotalMarket ?? 0;
            const grandTotalMeal   = invoiceData._messGrandTotalMeal   ?? 0;

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

            /* ── Register custom fonts (with existence guard) ── */
            if (!fs.existsSync(FONTS.regular)) {
                return reject(new Error(`Font not found: ${FONTS.regular}`));
            }
            if (!fs.existsSync(FONTS.semibold)) {
                return reject(new Error(`Font not found: ${FONTS.semibold}`));
            }
            doc.registerFont('NotoSans',          FONTS.regular);
            doc.registerFont('NotoSans-SemiBold', FONTS.semibold);

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

            const hRule = (ty, color = C.gray200, thick = 0.5) => {
                doc.save()
                   .strokeColor(color).lineWidth(thick)
                   .moveTo(MARGIN, ty).lineTo(PAGE_W - MARGIN, ty)
                   .stroke()
                   .restore();
            };

            const fillRect = (rx, ry, rw, rh, color) => {
                doc.save().fillColor(color).rect(rx, ry, rw, rh).fill().restore();
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
            const headerStartY     = y;   // anchor for right-side meta alignment

            // Configure brand font first so metrics are accurate
            doc.font('Helvetica-Bold').fontSize(BRAND_FONT_SIZE);
            const textHeight = doc.currentLineHeight();

            // Logo (optional)
            const logoPath = path.join(FONT_DIR, 'brand-logo.png');
            let brandTextX = MARGIN;
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, MARGIN, headerStartY, {
                    fit:    [LOGO_SIZE, LOGO_SIZE],
                    align:  'left',
                    valign: 'center',
                });
                brandTextX = MARGIN + LOGO_SIZE + LOGO_TEXT_GAP;
            }

            // Vertically centre brand name against logo
            const brandTextY = headerStartY + (LOGO_SIZE - textHeight) / 2;

            doc.fillColor(C.gray900);
            doc.text('United', brandTextX, brandTextY);
            const unitedWidth = doc.widthOfString('United');

            doc.fillColor(C.indigo);
            doc.text('Mess', brandTextX + unitedWidth + 2, brandTextY);

            // Sub-lines below brand name
            const subLineStartY = brandTextY + textHeight + 4;
            doc.fontSize(10).font('NotoSans').fillColor(C.gray500);
            doc.text('Mess Management Platform', brandTextX, subLineStartY);

            doc.fontSize(10).font('NotoSans').fillColor(C.gray700);
            doc.text(user.name  || '—', brandTextX, subLineStartY + 14);
            doc.text(user.email || '',  brandTextX, subLineStartY + 28);

            // Invoice meta — right-aligned, pinned to headerStartY
            const metaX = PAGE_W - MARGIN - 160;
            doc.fontSize(9).font('NotoSans').fillColor(C.gray400);
            doc.text('INVOICE', metaX, headerStartY, { width: 160, align: 'right' });

            doc.fontSize(10).font('NotoSans').fillColor(C.indigo);
            doc.text(invoiceNo, metaX, headerStartY + 14, { width: 160, align: 'right' });

            doc.fontSize(11).font('NotoSans-SemiBold').fillColor(C.gray700);
            doc.text(monthName, metaX, headerStartY + 30, { width: 160, align: 'right' });

            doc.fontSize(10).font('NotoSans').fillColor(C.gray700);
            doc.text(displayDate, metaX, headerStartY + 44, { width: 160, align: 'right' });

            // Advance cursor below the full header block, then draw the rule
            y = headerStartY + Math.max(LOGO_SIZE, textHeight) + 56;
            hRule(y, C.indigo, 2);
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
            fillStrokeRect(MARGIN, cardY, cardW, cardH, C.gray50, C.gray200);
            doc.fontSize(8).font('NotoSans-SemiBold').fillColor(C.gray500);
            doc.text('MARKET TOTAL (ALL)', MARGIN + 10, cardY + 8);
            doc.fontSize(18).font('NotoSans-SemiBold').fillColor(C.gray900);
            doc.text(`\u20B9${fmt(grandTotalMarket)}`, MARGIN + 10, cardY + 22);

            // Card 2 — Total Meals
            const card2X = MARGIN + cardW + cardGap;
            fillStrokeRect(card2X, cardY, cardW, cardH, C.gray50, C.gray200);
            doc.fontSize(8).font('NotoSans-SemiBold').fillColor(C.gray500);
            doc.text('TOTAL MEALS (ALL)', card2X + 10, cardY + 8);
            doc.fontSize(18).font('NotoSans-SemiBold').fillColor(C.gray900);
            doc.text(`${fmt(grandTotalMeal)}`, card2X + 10, cardY + 22);

            // Card 3 — Your Payable
            const card3X = MARGIN + (cardW + cardGap) * 2;
            fillStrokeRect(card3X, cardY, cardW, cardH, C.indigoBg, C.indigoBorder);
            doc.fontSize(8).font('NotoSans-SemiBold').fillColor(C.gray500);
            doc.text(isRefund ? 'REFUND DUE' : 'YOUR PAYABLE', card3X + 10, cardY + 8);
            doc.fontSize(18).font('NotoSans-SemiBold').fillColor(C.indigo);
            doc.text(`\u20B9${fmt(displayAmt)}`, card3X + 10, cardY + 22);

            y = cardY + cardH + 20;

            /* ──────────────────────────────────────────────────
               SECTION & ROW HELPERS
               ────────────────────────────────────────────────── */

            const sectionLabel = (label) => {
                ensureSpace(30);
                doc.fontSize(9).font('NotoSans-SemiBold').fillColor(C.gray400);
                doc.text(label.toUpperCase(), MARGIN, y);
                hRule(y + 14, C.gray200, 0.5);
                y += 20;
            };

            const dataRow = (label, value, subLabel = null, accent = false) => {
                const rowH = subLabel ? 34 : 24;
                ensureSpace(rowH + 2);
                hRule(y + rowH - 1, C.gray100, 0.4);

                doc.fontSize(11).font('NotoSans').fillColor(C.gray700);
                doc.text(label, MARGIN, y + 4, { width: CONTENT_W * 0.6 });

                if (subLabel) {
                    doc.fontSize(9).font('NotoSans').fillColor(C.gray400);
                    doc.text(subLabel, MARGIN, y + 18);
                }

                doc.fontSize(11).font('NotoSans-SemiBold').fillColor(accent ? C.indigo : C.gray900);
                doc.text(value, MARGIN, y + 4, { width: CONTENT_W, align: 'right' });

                y += rowH;
            };

            /* ──────────────────────────────────────────────────
               YOUR USAGE
               ────────────────────────────────────────────────── */

            sectionLabel('Your Usage');
            dataRow('Your Meals',        `${fmt(uMeal)} meals`);
            dataRow('Your Market Spend', `\u20B9${fmt(uMarket)}`, 'What you spent');
            y += 6;

            /* ──────────────────────────────────────────────────
               MONTHLY CHARGES
               ────────────────────────────────────────────────── */

            sectionLabel('Monthly Charges');
            dataRow('Water Bill',     `\u20B9${fmt(waterBill)}`);
            dataRow('Cooking Charge', `\u20B9${fmt(cookCharge)}`);
            if (guestMeal > 0) {
                dataRow('Guest Meals', `\u20B9${fmt(guestAmt)}`, `${guestMeal} meal(s) × \u20B9${fmt(guestRate)}`);
            }
            y += 6;

            /* ──────────────────────────────────────────────────
               CALCULATIONS
               ────────────────────────────────────────────────── */

            sectionLabel('Calculations');
            dataRow('Cost of Your Meals',   `\u20B9${fmt(costOfMeals)}`,   'Proportional share',    true);
            dataRow('Adjusted Meal Charge', `\u20B9${fmt(adjMealCharge)}`, 'After guest deduction', true);
            if (platformFee !== 0) {
                dataRow('Platform Fee', `\u20B9${fmt(platformFee)}`);
            }
            y += 6;

            /* ──────────────────────────────────────────────────
               PREVIOUS BALANCE  (conditional — was missing in original)
               ────────────────────────────────────────────────── */

            if (prevBalance !== 0) {
                sectionLabel('Previous Balance');
                dataRow(
                    prevBalance > 0 ? 'Outstanding Balance' : 'Credit Balance',
                    `\u20B9${fmt(Math.abs(prevBalance))}`,
                    prevBalance > 0 ? 'Carried forward from last month' : 'Credit from last month',
                    prevBalance > 0   // accent only for debit
                );
                y += 6;
            }

            y += 10;

            /* ──────────────────────────────────────────────────
               TOTAL BOX
               ────────────────────────────────────────────────── */

            const totalBoxH = 64;
            ensureSpace(totalBoxH + 20);

            const totalBg = isPaid          ? C.greenBg
                          : isPartiallyPaid ? C.amberBg
                          : isRefund        ? C.greenBg
                          :                   C.indigoBg;
            const totalBd = isPaid          ? C.greenBorder
                          : isPartiallyPaid ? C.amberBorder
                          : isRefund        ? C.greenBorder
                          :                   C.indigoBorder;

            fillStrokeRect(MARGIN, y, CONTENT_W, totalBoxH, totalBg, totalBd, 1, 10);

            doc.fontSize(9).font('NotoSans').fillColor(C.gray500);
            doc.text(isRefund ? 'REFUND AMOUNT' : 'TOTAL PAYABLE', MARGIN + 16, y + 10);

            const amtColor = isRefund ? C.green : C.indigo;
            doc.fontSize(28).font('NotoSans-SemiBold').fillColor(amtColor);
            doc.text(`\u20B9${fmt(displayAmt)}`, MARGIN + 16, y + 24);

            // Status badge
            const badgeBg = isPaid          ? C.greenBadgeBg
                          : isPartiallyPaid ? C.amberBadgeBg
                          : isRefund        ? C.greenBadgeBg
                          :                   '#e0e7ff';
            const badgeTx = isPaid          ? C.greenBadgeTx
                          : isPartiallyPaid ? C.amberBadgeTx
                          : isRefund        ? C.greenBadgeTx
                          :                   C.indigoText;
            const badgeW = 72, badgeH = 24;
            const badgeX = PAGE_W - MARGIN - badgeW - 12;
            const badgeY = y + 20;
            fillRect(badgeX, badgeY, badgeW, badgeH, badgeBg);
            doc.fontSize(10).font('NotoSans-SemiBold').fillColor(badgeTx);
            doc.text(statusLabel, badgeX, badgeY + 6, { width: badgeW, align: 'center' });

            y += totalBoxH + 12;

            /* ──────────────────────────────────────────────────
               PAYMENT BLOCK  (paid or partially paid)
               ────────────────────────────────────────────────── */

            if (isPaid || isPartiallyPaid) {
                const hasUtr = invoiceData._paymentMethod === 'upi_manual' && invoiceData._transactionId;
                const pbH    = hasUtr ? 80 : isPartiallyPaid ? 68 : 50;
                ensureSpace(pbH + 20);

                fillStrokeRect(MARGIN, y, CONTENT_W, pbH, C.gray50, C.gray200, 1, 8);

                // Status label
                doc.fontSize(9).font('NotoSans').fillColor(C.gray500);
                doc.text('PAYMENT STATUS', MARGIN + 12, y + 10);

                doc.fontSize(11).font('NotoSans-SemiBold').fillColor(C.gray900);
                doc.text(isPaid ? 'Payment Successful' : 'Partially Paid', MARGIN + 12, y + 22);

                // Payment method
                if (invoiceData._paymentMethod) {
                    const mLabel = invoiceData._paymentMethod === 'upi_manual'
                        ? 'Manual UPI'
                        : invoiceData._paymentMethod === 'razorpay'
                            ? 'Online (Razorpay)'
                            : invoiceData._paymentMethod;
                    doc.fontSize(9).font('NotoSans').fillColor(C.gray500);
                    doc.text(mLabel, MARGIN + 12, y + 36);
                }

                // Partially paid: show amount paid vs remaining
                if (isPartiallyPaid) {
                    doc.fontSize(9).font('NotoSans').fillColor(C.gray500);
                    doc.text(`Paid: \u20B9${fmt(paidAmount)}`, MARGIN + 12, y + 48);
                    doc.text(`Remaining: \u20B9${fmt(displayAmt - paidAmount)}`, MARGIN + 120, y + 48);
                }

                // Badge — "SETTLED" only for fully paid, "PARTIAL" for partial
                const pbBadgeBg = isPaid ? C.greenBadgeBg : C.amberBadgeBg;
                const pbBadgeTx = isPaid ? C.greenBadgeTx : C.amberBadgeTx;
                const pbBadgeLb = isPaid ? 'SETTLED' : 'PARTIAL';
                fillRect(PAGE_W - MARGIN - 72, y + 16, 62, 20, pbBadgeBg);
                doc.fontSize(9).font('NotoSans-SemiBold').fillColor(pbBadgeTx);
                doc.text(pbBadgeLb, PAGE_W - MARGIN - 72, y + 22, { width: 62, align: 'center' });

                // UTR block
                if (hasUtr) {
                    fillRect(MARGIN + 8, y + pbH - 28, CONTENT_W - 16, 20, C.blueBg);
                    doc.fontSize(9).font('NotoSans-SemiBold').fillColor(C.blueTx);
                    doc.text('UTR', MARGIN + 16, y + pbH - 22);
                    doc.fontSize(10).font('NotoSans').fillColor(C.blue);
                    doc.text(invoiceData._transactionId, MARGIN + 42, y + pbH - 22, {
                        width: CONTENT_W - 58,
                        ellipsis: true,
                    });
                }

                y += pbH + 14;
            }

            /* ──────────────────────────────────────────────────
               FOOTER
               ────────────────────────────────────────────────── */

            ensureSpace(50);
            y += 10;
            hRule(y, C.gray200, 0.5);
            y += 10;

            doc.fontSize(9).font('NotoSans').fillColor(C.gray400);
            doc.text(
                `System-generated invoice for ${monthName}. For disputes, contact your mess admin.`,
                MARGIN, y, { width: CONTENT_W, align: 'center' }
            );
            y += 14;

            doc.fontSize(9).font('NotoSans').fillColor(C.purple);
            doc.text(
                `Powered by United Mess · ${invoiceNo}`,
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