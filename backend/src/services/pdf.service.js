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
 * Returns a Buffer (binary PDF) suitable for nodemailer attachments.
 */

'use strict';

const PDFDocument = require('pdfkit');

/* ── Indian locale number formatter (mirrors frontend fmt()) ── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/* ── Colour palette (matches PrintInvoice.jsx inline styles) ── */
const C = {
    indigo:       '#4f46e5',
    indigoBg:     '#eef2ff',
    indigoBorder: '#c7d2fe',
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
    amber:        '#92400e',
    amberBg:      '#fffbeb',
    amberBorder:  '#fde68a',
    blue:         '#1e3a5f',
    blueBg:       '#eff6ff',
    monoFont:     'Courier',
};

/* ── Page geometry ── */
const PAGE_W     = 680;   // matches PrintInvoice.jsx wrap width
const MARGIN     = 40;
const CONTENT_W  = PAGE_W - MARGIN * 2;

/**
 * Generate a per-member invoice PDF.
 *
 * @param {Object} invoiceData  — result from invoiceService.getInvoice()
 *                                + annotated by emailAllInvoices with messStats
 * @param {Object} user         — plain user document { name, email, chargePerGuestMeal, ... }
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = (invoiceData, user) => {
    return new Promise((resolve, reject) => {
        try {
            /* ─── Build display values (same logic as PrintInvoice.jsx / MessBillInvoice.jsx) ─── */
            const monthName    = invoiceData.monthName || `Month ${invoiceData.month}/${invoiceData.year}`;
            const displayDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const invoiceNo    = `UM-${invoiceData.year}${String(invoiceData.month).padStart(2, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
            const finalPayable = invoiceData.totalPayable ?? 0;
            const isRefund     = finalPayable < 0;
            const displayAmt   = Math.abs(finalPayable);

            const isPaid         = invoiceData.status === 'paid';
            const isPartiallyPaid = invoiceData.status === 'partially_paid';
            const statusLabel    = isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : isRefund ? 'Refund Due' : 'Due';

            /* User stats from invoice */
            const uMeal        = invoiceData.mealCount        ?? 0;
            const uMarket      = invoiceData.marketAmountSpent ?? 0;
            const waterBill    = invoiceData.fixedCosts?.waterBill    ?? 0;
            const cookCharge   = invoiceData.fixedCosts?.cookingCharge ?? 0;
            const platformFee  = invoiceData.fixedCosts?.platformFee  ?? 0;
            const guestMeal    = invoiceData.guestMealCount   ?? 0;
            const guestRate    = user?.chargePerGuestMeal     ?? 60;
            const guestAmt     = invoiceData.guestMealRevenue ?? 0;
            const costOfMeals  = invoiceData.messCost         ?? 0;
            const adjMealCharge= invoiceData.messCost         ?? 0;
            const paidAmount   = invoiceData.paidAmount       ?? 0;

            /* Mess-wide stats (attached by emailAllInvoices before calling pdf service) */
            const grandTotalMarket = invoiceData._messGrandTotalMarket ?? 0;
            const grandTotalMeal   = invoiceData._messGrandTotalMeal   ?? 0;

            /* ─── Create PDF document ─── */
            const doc = new PDFDocument({
                size:    [PAGE_W, 900],   // height grows dynamically with .addPage() if needed
                margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
                autoFirstPage: true,
                compress: true,
                info: {
                    Title:   `Invoice ${invoiceNo}`,
                    Subject: `Mess Bill - ${monthName}`,
                    Author:  'United Mess',
                    Creator: 'United Mess Invoice System',
                },
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end',  ()    => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            let y = MARGIN; // current Y cursor

            /* ────────────────────────────────────────────────────
               HELPER DRAWING FUNCTIONS
               ──────────────────────────────────────────────────── */

            const moveTo = (newY) => { y = newY; };

            const text = (str, x, ty, opts = {}) => {
                doc.text(str, x, ty, opts);
            };

            /* Horizontal rule */
            const hRule = (ty, color = C.gray200, thick = 0.5) => {
                doc.save()
                   .strokeColor(color).lineWidth(thick)
                   .moveTo(MARGIN, ty).lineTo(PAGE_W - MARGIN, ty)
                   .stroke()
                   .restore();
            };

            /* Filled rectangle */
            const fillRect = (rx, ry, rw, rh, color) => {
                doc.save().fillColor(color).rect(rx, ry, rw, rh).fill().restore();
            };

            /* Rounded rectangle (stroke) */
            const strokeRect = (rx, ry, rw, rh, color, thick = 1, radius = 8) => {
                doc.save().strokeColor(color).lineWidth(thick).roundedRect(rx, ry, rw, rh, radius).stroke().restore();
            };

            /* Rounded rectangle (fill + stroke) */
            const fillStrokeRect = (rx, ry, rw, rh, fillColor, strokeColor, thick = 1, radius = 8) => {
                doc.save()
                   .fillColor(fillColor).roundedRect(rx, ry, rw, rh, radius).fill()
                   .strokeColor(strokeColor).lineWidth(thick).roundedRect(rx, ry, rw, rh, radius).stroke()
                   .restore();
            };

            /* ────────────────────────────────────────────────────
               HEADER  (mirrors PrintInvoice.jsx <header> block)
               ──────────────────────────────────────────────────── */

            // Brand name
            doc.fontSize(22).font('Helvetica-Bold').fillColor(C.gray900);
            text('United', MARGIN, y);
            const unitedW = doc.widthOfString('United');
            doc.fillColor(C.indigo);
            text('Mess', MARGIN + unitedW + 2, y);

            // Sub-line
            doc.fontSize(10).font('Helvetica').fillColor(C.gray500);
            text('Mess Management Platform', MARGIN, y + 28);
            text(user?.name  || '—', MARGIN, y + 42);
            text(user?.email || '',  MARGIN, y + 54);

            // Invoice meta block (right-aligned)
            doc.fontSize(9).fillColor(C.gray400);
            const metaX = PAGE_W - MARGIN - 160;
            text('INVOICE', metaX, y, { width: 160, align: 'right' });

            doc.fontSize(10).font(C.monoFont).fillColor(C.indigo);
            text(invoiceNo, metaX, y + 14, { width: 160, align: 'right' });

            doc.fontSize(11).font('Helvetica-Bold').fillColor(C.gray700);
            text(monthName, metaX, y + 30, { width: 160, align: 'right' });

            doc.fontSize(10).font('Helvetica').fillColor(C.gray700);
            text(displayDate, metaX, y + 44, { width: 160, align: 'right' });

            moveTo(y + 78);
            hRule(y, C.indigo, 2);
            moveTo(y + 8);

            /* ────────────────────────────────────────────────────
               STAT CARDS ROW  (mirrors statRow in PrintInvoice.jsx)
               ──────────────────────────────────────────────────── */

            const cardGap  = 10;
            const cardW    = (CONTENT_W - cardGap * 2) / 3;
            const cardH    = 56;
            const cardY    = y;

            // Card 1 — Market Total
            fillStrokeRect(MARGIN, cardY, cardW, cardH, C.gray50, C.gray200);
            doc.fontSize(8).font('Helvetica').fillColor(C.gray500);
            text('MARKET TOTAL (ALL)', MARGIN + 10, cardY + 8);
            doc.fontSize(18).font('Helvetica-Bold').fillColor(C.gray900);
            text(`\u20B9${fmt(grandTotalMarket)}`, MARGIN + 10, cardY + 22);

            // Card 2 — Total Meals
            const card2X = MARGIN + cardW + cardGap;
            fillStrokeRect(card2X, cardY, cardW, cardH, C.gray50, C.gray200);
            doc.fontSize(8).font('Helvetica').fillColor(C.gray500);
            text('TOTAL MEALS (ALL)', card2X + 10, cardY + 8);
            doc.fontSize(18).font('Helvetica-Bold').fillColor(C.gray900);
            text(`${fmt(grandTotalMeal)}`, card2X + 10, cardY + 22);

            // Card 3 — Your Payable (accent)
            const card3X = MARGIN + (cardW + cardGap) * 2;
            fillStrokeRect(card3X, cardY, cardW, cardH, C.indigoBg, C.indigoBorder);
            doc.fontSize(8).font('Helvetica').fillColor(C.gray500);
            text(isRefund ? 'REFUND DUE' : 'YOUR PAYABLE', card3X + 10, cardY + 8);
            doc.fontSize(18).font('Helvetica-Bold').fillColor(C.indigo);
            text(`\u20B9${fmt(displayAmt)}`, card3X + 10, cardY + 22);

            moveTo(cardY + cardH + 20);

            /* ────────────────────────────────────────────────────
               SECTION HELPER  (label + rule, matching sectionLabel style)
               ──────────────────────────────────────────────────── */
            const sectionLabel = (label) => {
                doc.fontSize(9).font('Helvetica-Bold').fillColor(C.gray400);
                text(label.toUpperCase(), MARGIN, y);
                hRule(y + 14, C.gray200, 0.5);
                moveTo(y + 20);
            };

            /* ────────────────────────────────────────────────────
               ROW HELPER  (label + value, matching <row> style)
               ──────────────────────────────────────────────────── */
            const dataRow = (label, value, subLabel = null, accent = false) => {
                const rowH = subLabel ? 34 : 24;
                hRule(y + rowH - 1, C.gray100, 0.4);

                doc.fontSize(11).font('Helvetica').fillColor(C.gray700);
                text(label, MARGIN, y + 4);

                if (subLabel) {
                    doc.fontSize(9).fillColor(C.gray400);
                    text(subLabel, MARGIN, y + 18);
                }

                doc.fontSize(11).font('Helvetica-Bold').fillColor(accent ? C.indigo : C.gray900);
                text(value, MARGIN, y + 4, { width: CONTENT_W, align: 'right' });

                moveTo(y + rowH);
            };

            /* ── YOUR USAGE ── */
            sectionLabel('Your Usage');
            dataRow('Your Meals',        `${fmt(uMeal)} meals`);
            dataRow('Your Market Spend', `\u20B9${fmt(uMarket)}`, 'What you spent');

            moveTo(y + 6);

            /* ── MONTHLY CHARGES ── */
            sectionLabel('Monthly Charges');
            dataRow('Water Bill',     `\u20B9${fmt(waterBill)}`);
            dataRow('Cooking Charge', `\u20B9${fmt(cookCharge)}`);
            if (guestMeal > 0) {
                dataRow('Guest Meals', `\u20B9${fmt(guestAmt)}`, `${guestMeal} meal(s) × \u20B9${fmt(guestRate)}`);
            }

            moveTo(y + 6);

            /* ── CALCULATIONS ── */
            sectionLabel('Calculations');
            dataRow('Cost of Your Meals',    `\u20B9${fmt(costOfMeals)}`,   'Proportional share',    true);
            dataRow('Adjusted Meal Charge',  `\u20B9${fmt(adjMealCharge)}`, 'After guest deduction', true);
            dataRow('Platform Fee',          `\u20B9${fmt(platformFee)}`);

            moveTo(y + 16);

            /* ────────────────────────────────────────────────────
               TOTAL BOX  (mirrors totalBox in PrintInvoice.jsx)
               ──────────────────────────────────────────────────── */
            const totalBoxH = 64;
            const totalBg   = isPaid ? C.greenBg : isPartiallyPaid ? C.amberBg : isRefund ? C.greenBg : C.indigoBg;
            const totalBd   = isPaid ? C.greenBorder : isPartiallyPaid ? C.amberBorder : isRefund ? C.greenBorder : C.indigoBorder;

            fillStrokeRect(MARGIN, y, CONTENT_W, totalBoxH, totalBg, totalBd, 1, 10);

            // Label
            doc.fontSize(9).font('Helvetica').fillColor(C.gray500);
            text(isRefund ? 'REFUND AMOUNT' : 'TOTAL PAYABLE', MARGIN + 16, y + 10);

            // Amount
            const amtColor = isRefund ? C.green : C.indigo;
            doc.fontSize(28).font('Helvetica-Bold').fillColor(amtColor);
            text(`\u20B9${fmt(displayAmt)}`, MARGIN + 16, y + 24);

            // Status badge (right side)
            const badgeBg   = isPaid ? '#d1fae5' : isPartiallyPaid ? '#fef3c7' : isRefund ? '#dcfce7' : '#e0e7ff';
            const badgeText = isPaid ? '#065f46' : isPartiallyPaid ? '#92400e' : isRefund ? '#15803d' : '#4338ca';
            const badgeW = 70, badgeH = 24, badgeX = PAGE_W - MARGIN - badgeW - 12, badgeY = y + 20;
            fillRect(badgeX, badgeY, badgeW, badgeH, badgeBg);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(badgeText);
            text(statusLabel, badgeX, badgeY + 6, { width: badgeW, align: 'center' });

            moveTo(y + totalBoxH + 12);

            /* ────────────────────────────────────────────────────
               PAYMENT BLOCK  (mirrors paymentBlock in PrintInvoice.jsx)
               Only shown when paid or partially paid
               ──────────────────────────────────────────────────── */
            if (isPaid || isPartiallyPaid) {
                const pbH = invoiceData._transactionId ? 72 : 50;
                fillStrokeRect(MARGIN, y, CONTENT_W, pbH, C.gray50, C.gray200, 1, 8);

                // Status row
                doc.fontSize(9).font('Helvetica').fillColor(C.gray500);
                text('PAYMENT STATUS', MARGIN + 12, y + 10);
                doc.fontSize(11).font('Helvetica-Bold').fillColor(C.gray900);
                const payLabel = isPaid ? 'Payment Successful' : 'Partially Paid';
                text(payLabel, MARGIN + 12, y + 22);

                if (invoiceData._paymentMethod) {
                    const mLabel = invoiceData._paymentMethod === 'upi_manual'
                        ? 'Manual UPI'
                        : invoiceData._paymentMethod === 'razorpay'
                            ? 'Online (Razorpay)'
                            : invoiceData._paymentMethod;
                    doc.fontSize(9).font('Helvetica').fillColor(C.gray500);
                    text(mLabel, MARGIN + 12, y + 36);
                }

                // SETTLED badge
                fillRect(PAGE_W - MARGIN - 70, y + 16, 60, 20, '#d1fae5');
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#065f46');
                text('SETTLED', PAGE_W - MARGIN - 70, y + 22, { width: 60, align: 'center' });

                // UTR block (if UPI manual)
                if (invoiceData._paymentMethod === 'upi_manual' && invoiceData._transactionId) {
                    fillRect(MARGIN + 8, y + pbH - 26, CONTENT_W - 16, 20, C.blueBg);
                    doc.fontSize(9).font('Helvetica-Bold').fillColor('#3b82f6');
                    text('UTR', MARGIN + 16, y + pbH - 20);
                    doc.fontSize(10).font(C.monoFont).fillColor(C.blue);
                    text(invoiceData._transactionId, MARGIN + 42, y + pbH - 20);
                }

                moveTo(y + pbH + 14);
            }

            /* ────────────────────────────────────────────────────
               FOOTER  (mirrors PrintInvoice.jsx footer)
               ──────────────────────────────────────────────────── */
            moveTo(y + 10);
            hRule(y, C.gray200, 0.5);
            moveTo(y + 10);

            doc.fontSize(9).font('Helvetica').fillColor(C.gray400);
            text(
                `System-generated invoice for ${monthName}. For disputes, contact your mess admin.`,
                MARGIN, y, { width: CONTENT_W, align: 'center' }
            );
            moveTo(y + 14);

            doc.fontSize(9).font('Helvetica').fillColor('#c4b5fd');
            text(
                `Powered by United Mess · ${invoiceNo}`,
                MARGIN, y, { width: CONTENT_W, align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateInvoicePDF };
