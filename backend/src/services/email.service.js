const nodemailer = require('nodemailer');
const validator = require('validator');
const config = require('../config');
const logger = require('../utils/logger');

// ─── Constants ──────────────────────────────────────────────────────────────────
const BRAND_LOGO_URL = 'https://res.cloudinary.com/ddqeexln0/image/upload/v1781540452/resize_logo_hstkyp.png';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRYABLE_CODES = new Set(['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNRESET', 'EPIPE', 'EDNS']);
const FROM_ADDRESS = config.email?.from || 'United Mess <noreply@unitedmess.com>';

// ─── SMTP Transport Factory ────────────────────────────────────────────────────
const createTransport = () => {
    const smtp = config.email?.smtp;
    const hasAuth = smtp?.auth?.user && smtp?.auth?.pass;
    const port = parseInt(smtp?.port, 10);

    if (!smtp?.host) {
        logger.warn('[Email] No SMTP host configured — using dev fallback transport');
        return nodemailer.createTransport({
            host: 'smtp.mailtrap.io',
            port: 2525,
            auth: { user: 'test', pass: 'test' },
        });
    }

    return nodemailer.createTransport({
        host: smtp.host,
        port: port || 587,
        secure: port === 465,
        auth: hasAuth ? { user: smtp.auth.user, pass: smtp.auth.pass } : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        tls: {
            rejectUnauthorized: config.app?.env === 'production',
            minVersion: 'TLSv1.2',
        },
        greetingTimeout: 15 * 1000,
        socketTimeout: 30 * 1000,
    });
};

let transport = createTransport();

/**
 * Gracefully re-initialize the SMTP transport (used after sustained failures).
 */
const refreshTransport = () => {
    try { transport.close(); } catch (_) { /* noop */ }
    transport = createTransport();
    logger.info('[Email] Transport re-initialized');
};

// ─── Retry / delay helpers ─────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (err) => {
    if (!err) return false;
    if (RETRYABLE_CODES.has(err.code)) return true;
    const rc = err.responseCode;
    if (typeof rc === 'number') return rc >= 500 || rc === 421;
    return false;
};

// ─── Input guard ───────────────────────────────────────────────────────────────
const validateEmailInput = ({ to, subject }) => {
    const errors = [];
    if (!to || !validator.isEmail(String(to))) errors.push(`Invalid recipient: ${to}`);
    if (!subject || typeof subject !== 'string' || !subject.trim()) errors.push('Subject is required');
    if (errors.length) {
        const err = new Error(errors.join('; '));
        err.code = 'EMAIL_VALIDATION_ERROR';
        throw err;
    }
};

// ─── Core sender with retry ────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, text, html, attachments }) => {
    validateEmailInput({ to, subject });

    const msg = {
        from: FROM_ADDRESS,
        to,
        subject,
        text,
        html,
        attachments: attachments?.length ? attachments : undefined,
        headers: {
            'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            'List-Unsubscribe': '<mailto:unsubscribe@unitedmess.com?subject=unsubscribe>',
        },
    };

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const info = await transport.sendMail(msg);
            logger.info('[Email] Sent', { to, subject, messageId: info.messageId, attempt });
            return true;
        } catch (err) {
            lastError = err;
            logger.error('[Email] Send failed', {
                to, subject, attempt,
                errorCode: err.code,
                responseCode: err.responseCode,
                message: err.message,
            });

            if (!isRetryable(err) || attempt === MAX_RETRIES) break;

            const backoff = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
            logger.info('[Email] Retrying', { to, attempt, backoffMs: Math.round(backoff) });
            await delay(backoff);
            refreshTransport();
        }
    }

    const finalError = new Error(`Email send failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
    finalError.code = 'EMAIL_SEND_FAILED';
    finalError.to = to;
    finalError.subject = subject;
    finalError.originalError = lastError;
    throw finalError;
};

// ─── Template engine ────────────────────────────────────────────────────────────
const generateEmailTemplate = ({
    title,
    previewText,
    content,
    buttonText,
    buttonLink,
    footerText,
    showButton = true,
}) => {
    const companyName = 'UnitedMess';
    const companyAddress = 'Chinar Park, Kolkata, India';
    const year = new Date().getFullYear();

    const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '');

    const text = [
        `${title}`,
        `${'='.repeat(title.length)}`,
        '',
        `${stripHtml(content)}`,
        '',
        buttonText ? `${buttonText}: ${buttonLink}` : '',
        '',
        footerText || `Best regards,\n${companyName} Team`,
        '',
        `---`,
        `${companyName}`,
        `${companyAddress}`,
        `\u00A9 ${year} ${companyName}. All rights reserved.`,
    ].join('\n');

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    *{box-sizing:border-box}
    table{border-collapse:separate!important}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
    body{margin:0!important;padding:0!important;width:100%!important;background-color:#f4f4f7;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    .gold-accent{height:2px;min-width:100%;background:#c9973a;background-image:linear-gradient(90deg,#c9973a 0%,#ffd27a 100%);line-height:0}
    @media only screen and (max-width:640px){
      .wrap{width:100%!important;border-radius:12px!important}
      .outer-pad{padding:16px 0px!important}
      .h-cell{padding:24px 20px 20px!important}
      .b-cell{padding:24px 20px!important}
      .f-cell{padding:20px 20px 24px!important}
      .title{font-size:21px!important;letter-spacing:-0.4px!important}
      .logo{font-size:20px!important}
      .btn-cta{display:block!important;width:100%!important;text-align:center!important;padding:16px 20px!important}
      .s-td{padding:0 4px!important}
      .s-btn{width:40px!important;height:40px!important;border-radius:10px!important}
      .s-btn img{margin:12px auto!important;width:16px!important;height:16px!important}
      .pill{display:none!important}
      .ornament-line{display:none!important}
    }
    @media (prefers-color-scheme:dark){
      body{background-color:#0a0a12!important}
      .wrap{background:#141420!important;box-shadow:0 2px 16px rgba(0,0,0,0.40)!important;border-color:#2a2a3c!important}
      .h-cell{background:#1a1a2c!important;border-color:#2a2a3c!important}
      .b-cell{background:#141420!important}
      .f-cell{background:#1a1a2c!important;border-color:#2a2a3c!important}
      .dm-title{color:#f0f0f4!important}
      .dm-text{color:#b0b0bc!important}
      .dm-muted{color:#6a6a7a!important}
      .dm-logo-u{color:rgba(255,255,255,0.92)!important}
      .dm-logo-m{color:#e0b050!important}
      .dm-tagline{color:rgba(255,200,100,0.60)!important}
      .dm-pill{background:rgba(255,200,80,0.12)!important;border-color:rgba(255,200,80,0.25)!important;color:rgba(255,210,100,0.80)!important}
      .dm-ornament{background:linear-gradient(90deg,rgba(255,200,80,0.30) 0%,rgba(255,200,80,0.10) 30%,rgba(180,140,255,0.08) 70%,transparent 100%)!important}
      .dm-sbtn{background:#1e1e30!important;border-color:#2a2a3c!important;box-shadow:0 2px 8px rgba(0,0,0,0.30)!important}
      .dm-sbtn img{opacity:0.70!important;filter:none!important}
      .dm-copybox{background:#1a1a2c!important;border-color:#2a2a3c!important}
      .dm-copybox-label{color:rgba(255,255,255,0.30)!important}
      .dm-copybox-link{color:#c09040!important}
      .dm-divider{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 20%,rgba(255,200,80,0.12) 50%,rgba(255,255,255,0.08) 80%,transparent 100%)!important}
      .dm-footercopyright{color:rgba(255,255,255,0.50)!important}
      .dm-footeraddress{color:rgba(255,255,255,0.30)!important}
      .dm-footerlink{color:rgba(255,200,80,0.65)!important;border-color:rgba(255,200,80,0.25)!important}
      .dm-footerdot{color:rgba(255,255,255,0.18)!important}
      .dm-footnote-divider{background:linear-gradient(90deg,rgba(255,200,80,0.20) 0%,rgba(255,255,255,0.08) 40%,transparent 100%)!important}
      .dm-footnote-box{background:linear-gradient(135deg,rgba(255,200,80,0.07) 0%,rgba(200,160,255,0.04) 100%)!important;border-color:rgba(255,200,80,0.15)!important;border-left-color:rgba(255,200,80,0.55)!important}
      .dm-footnote-label{color:rgba(255,200,80,0.65)!important}
      .dm-footnote-text{color:rgba(255,255,255,0.55)!important}
      .dm-eyebrow{color:rgba(255,255,255,0.22)!important}
      .dm-stamp{color:rgba(255,255,255,0.10)!important}
      .dm-preheader{color:#0a0a12!important}
    }
  </style>
</head>

<body style="
  margin:0;padding:0;
  background-color:#f4f4f7;
  font-family:'Instrument Sans',-apple-system,BlinkMacSystemFont,sans-serif;
">

  <!-- Hidden preheader -->
  <div class="dm-preheader" style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText || title}</div>

  <!-- Outer wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" class="outer-pad" style="padding:36px 20px 40px;">

        <!-- Main card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
          class="wrap"
          style="
            max-width:600px;width:100%;
            border-radius:16px;
            overflow:hidden;
            background:#ffffff;
            box-shadow:0 2px 12px rgba(0,0,0,0.08);
            border:1px solid #e8e8ec;
          ">

          <!-- HEADER -->
          <tr>
            <td class="h-cell" style="padding:36px 44px 30px;background:#fafbfc;border-bottom:1px solid #e8e8ec;box-sizing:border-box;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:22px;">
                      <tr>
                        <td valign="middle" style="width:auto;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td valign="middle" style="padding-right:10px;">
                                <img src="${BRAND_LOGO_URL}"
                                     alt="UnitedMess"
                                     width="32" height="32"
                                     style="display:block;width:32px;height:32px;border-radius:8px;border:0;outline:none;"
                                />
                              </td>
                              <td valign="middle">
                                <h1 class="logo" style="margin:0;padding:0;font-family:'Syne','Arial',sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.6px;line-height:1;">
                                  <span class="dm-logo-u" style="color:#1a1a2e;">United</span>
                                  <span class="dm-logo-m" style="color:#c9973a;">Mess</span>
                                </h1>
                                <p class="dm-tagline" style="margin:3px 0 0 0;padding:0;font-family:'JetBrains Mono','Courier New',monospace;font-size:9.5px;font-weight:400;letter-spacing:0.14em;text-transform:uppercase;color:#b09050;line-height:1;">where food meets community</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" align="right">
                          <span class="pill dm-pill" style="display:inline-block;padding:5px 12px;background:rgba(201,151,58,0.08);border:1px solid rgba(201,151,58,0.18);border-radius:100px;font-family:'JetBrains Mono','Courier New',monospace;font-size:9.5px;font-weight:500;letter-spacing:0.10em;text-transform:uppercase;color:#a08030;">Verified Send</span>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="ornament-line">
                      <tr>
                        <td class="dm-ornament" style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0.25) 0%,rgba(201,151,58,0.08) 30%,rgba(180,140,255,0.06) 70%,transparent 100%);"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="b-cell" style="padding:44px 44px 40px;background:#ffffff;box-sizing:border-box;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>

                    <h2 class="title dm-title" style="margin:0 0 22px 0;padding:0;font-family:'Syne','Arial',sans-serif;font-size:26px;font-weight:700;color:#1a1a2e;line-height:1.25;letter-spacing:-0.6px;">${title}</h2>

                    <div class="dm-text" style="font-family:'Instrument Sans',-apple-system,sans-serif;font-size:15px;font-weight:400;color:#4a4a5a;line-height:1.80;margin:0;">${content}</div>

                    ${showButton && buttonText ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:38px;">
                      <tr>
                        <td>
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                            href="${buttonLink}"
                            style="height:52px;v-text-anchor:middle;width:220px;"
                            arcsize="20%" stroke="f" fillcolor="#c9973a">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:700;">${buttonText}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${buttonLink}" class="btn-cta" style="display:inline-block;padding:16px 36px;font-family:'Syne','Arial',sans-serif;font-size:13.5px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;border-radius:12px;background:#c9973a;background:linear-gradient(135deg,#c9973a 0%,#b08530 100%);box-shadow:0 2px 8px rgba(201,151,58,0.25);border:none;box-sizing:border-box;">${buttonText}</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td class="dm-copybox" style="padding:13px 18px;background:#f8f9fa;border:1px solid #e8e8ec;border-radius:10px;box-sizing:border-box;">
                                <p class="dm-copybox-label" style="margin:0 0 5px 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:9.5px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:#8a8a9a;">if button fails · copy link</p>
                                <a href="${buttonLink}" class="dm-copybox-link" style="font-family:'JetBrains Mono','Courier New',monospace;font-size:11.5px;color:#a08030;text-decoration:none;word-break:break-all;line-height:1.6;">${buttonLink}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${footerText ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:36px 0 0 0;">
                      <tr>
                        <td class="dm-footnote-divider" style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0.15) 0%,#e8e8ec 40%,transparent 100%);"></td>
                      </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:22px;">
                      <tr>
                        <td class="dm-footnote-box" style="padding:18px 20px;background:#f8f9fa;border-radius:12px;border:1px solid #e8e8ec;border-left:2px solid #c9973a;box-sizing:border-box;">
                          <p class="dm-footnote-label" style="margin:0 0 6px 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:9px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#a08030;">note</p>
                          <p class="dm-footnote-text" style="margin:0;font-family:'Instrument Sans',sans-serif;font-size:13.5px;font-weight:400;color:#6a6a7a;line-height:1.70;font-style:italic;">${footerText}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="f-cell" style="padding:28px 44px 36px;background:#f8f9fa;border-top:1px solid #e8e8ec;box-sizing:border-box;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">

                <tr>
                  <td align="center" style="padding-bottom:22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://github.com/alamgir009" class="s-btn dm-sbtn" style="display:inline-block;width:42px;height:42px;background:#f0f0f4;border:1px solid #e0e0e4;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-decoration:none;box-sizing:border-box;">
                            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" width="16" height="16" alt="GitHub" style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://linkedin.com" class="s-btn dm-sbtn" style="display:inline-block;width:42px;height:42px;background:#f0f0f4;border:1px solid #e0e0e4;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-decoration:none;box-sizing:border-box;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="16" height="16" alt="LinkedIn" style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://twitter.com" class="s-btn dm-sbtn" style="display:inline-block;width:42px;height:42px;background:#f0f0f4;border:1px solid #e0e0e4;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-decoration:none;box-sizing:border-box;">
                            <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="16" height="16" alt="Twitter" style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://instagram.com" class="s-btn dm-sbtn" style="display:inline-block;width:42px;height:42px;background:#f0f0f4;border:1px solid #e0e0e4;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-decoration:none;box-sizing:border-box;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="16" height="16" alt="Instagram" style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;">
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:18px;">
                    <div class="dm-divider" style="height:1px;background:linear-gradient(90deg,transparent 0%,#e0e0e4 20%,rgba(201,151,58,0.15) 50%,#e0e0e4 80%,transparent 100%);"></div>
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p class="dm-footercopyright" style="margin:0 0 5px 0;font-family:'Syne','Arial',sans-serif;font-size:13px;font-weight:600;color:#6a6a7a;letter-spacing:0.01em;">\u00A9 ${year} ${companyName}</p>
                    <p class="dm-footeraddress" style="margin:0 0 16px 0;font-family:'Instrument Sans',sans-serif;font-size:11.5px;color:#8a8a9a;line-height:1.7;">${companyAddress}</p>
                    <p style="margin:0;font-family:'Instrument Sans',sans-serif;font-size:11.5px;color:#8a8a9a;line-height:1.9;">
                      You received this as a member of ${companyName}.
                      <br>
                      <a href="#" class="dm-footerlink" style="color:#a08030;text-decoration:none;font-weight:500;border-bottom:1px solid rgba(201,151,58,0.30);">Preferences</a>
                      <span class="dm-footerdot" style="color:#c0c0c4;padding:0 7px;">\u00B7</span>
                      <a href="#" class="dm-footerlink" style="color:#a08030;text-decoration:none;font-weight:500;border-bottom:1px solid rgba(201,151,58,0.30);">Unsubscribe</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

    return { html: htmlTemplate, text };
};

// ─── Public email senders ───────────────────────────────────────────────────────

const sendVerificationEmail = async (to, token, name = 'User') => {
    const verificationUrl = `${config.app.frontendUrl}/auth/verify-email?token=${token}`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Verify Your Email Address',
        previewText: 'Welcome to United Mess! Please verify your email address.',
        content: `<p>Hello ${sanitizedName},</p>
<p>Thank you for registering with United Mess! To complete your registration and start using our services, please verify your email address by clicking the button below.</p>
<p>This verification link will expire in <strong>24 hours</strong>.</p>`,
        buttonText: 'Verify Email Address',
        buttonLink: verificationUrl,
        footerText: 'If you did not create an account with United Mess, please ignore this email.',
    });

    return sendEmail({ to, subject: 'Verify Your Email Address - United Mess', text, html });
};

const sendPasswordResetEmail = async (to, token, name = 'User') => {
    const resetUrl = `${config.app.frontendUrl}/reset-password/${token}`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Reset Your Password',
        previewText: 'Reset your United Mess account password',
        content: `<p>Hello ${sanitizedName},</p>
<p>We received a request to reset your password for your United Mess account. If you made this request, please click the button below to choose a new password.</p>
<p>This password reset link will expire in <strong>10 minutes</strong>.</p>
<p><strong style="color:#e53e3e;">Note:</strong> If you didn't request a password reset, please ignore this email or contact our support team immediately.</p>`,
        buttonText: 'Reset Password',
        buttonLink: resetUrl,
        footerText: 'For security reasons, this link is only valid for a limited time.',
    });

    return sendEmail({ to, subject: 'Reset Your Password - United Mess', text, html });
};

const sendWelcomeEmail = async (to, name) => {
    const dashboardUrl = `${config.app.frontendUrl}/dashboard`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Email Verified Successfully!',
        previewText: `${sanitizedName}, your email has been verified. Awaiting admin approval.`,
        content: `<p>Dear ${sanitizedName},</p>
<p>Congratulations! Your email address has been successfully verified.</p>
<p>Your registration with United Mess is now under review by our admin team. You will receive a notification once your account has been approved and activated.</p>
<p>If you have any questions in the meantime, please don't hesitate to contact our support team.</p>`,
        buttonText: 'Visit Dashboard',
        buttonLink: dashboardUrl,
        showButton: true,
    });

    return sendEmail({ to, subject: 'Email Verified Successfully - Awaiting Admin Approval', text, html });
};

const sendAccountApprovedEmail = async (to, name) => {
    const loginUrl = `${config.app.frontendUrl}/login`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Account Approved!',
        previewText: 'Your United Mess account has been approved.',
        content: `<p>Congratulations ${sanitizedName}!</p>
<p>We're excited to inform you that your United Mess account has been <strong>approved</strong> by our team.</p>
<p>You now have full access to all features. We're excited to have you on board!</p>`,
        buttonText: 'Login to Your Account',
        buttonLink: loginUrl,
    });

    return sendEmail({ to, subject: 'Your Account Has Been Approved - United Mess', text, html });
};

const sendAccountDeniedEmail = async (to, name, reason = 'Your application did not meet our current requirements.') => {
    const supportUrl = `${config.app.frontendUrl}/support`;
    const sanitizedName = validator.escape(String(name));
    const sanitizedReason = validator.escape(String(reason));

    const { html, text } = generateEmailTemplate({
        title: 'Account Update',
        previewText: 'Update regarding your United Mess account application.',
        content: `<p>Dear ${sanitizedName},</p>
<p>Thank you for your interest in joining United Mess. We appreciate the time you took to complete your application.</p>
<p>After careful review by our admin team, we regret to inform you that we are unable to approve your account at this time.</p>
<p><strong>Reason:</strong> ${sanitizedReason}</p>
<p>If you believe this decision was made in error, please contact our support team.</p>`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'For any questions or concerns, please reach out to our support team.',
    });

    return sendEmail({ to, subject: 'Account Update - United Mess', text, html });
};

const sendPasswordChangeNotification = async (to, name = 'User') => {
    const supportUrl = `${config.app.frontendUrl}/support`;
    const sanitizedName = validator.escape(String(name));
    const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

    const { html, text } = generateEmailTemplate({
        title: 'Password Changed Successfully',
        previewText: 'Your United Mess password has been changed.',
        content: `<p>Dear ${sanitizedName},</p>
<p>This email confirms that your United Mess account password was successfully changed on ${now}.</p>
<p><strong>If you did NOT make this change, your account may be compromised.</strong> Please contact our support team immediately.</p>`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'This is an automated security notification from United Mess.',
    });

    return sendEmail({ to, subject: 'Password Changed - Security Notification', text, html });
};

const sendPasswordResetConfirmation = async (to, name = 'User') => {
    const loginUrl = `${config.app.frontendUrl}/login`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Password Reset Successful',
        previewText: 'Your password has been successfully reset.',
        content: `<p>Dear ${sanitizedName},</p>
<p>Great news! Your United Mess account password has been successfully reset.</p>
<p>You can now use your new password to securely log in to your account.</p>`,
        showButton: true,
        buttonText: 'Log In to Your Account',
        buttonLink: loginUrl,
        footerText: 'If you did not reset your password, please contact our support team immediately.',
    });

    return sendEmail({ to, subject: 'Password Reset Confirmation - United Mess', text, html });
};

const sendAccountLockedEmail = async (to, name = 'User') => {
    const resetPasswordUrl = `${config.app.frontendUrl}/forgot-password`;
    const supportUrl = `${config.app.frontendUrl}/support`;
    const sanitizedName = validator.escape(String(name));

    const { html, text } = generateEmailTemplate({
        title: 'Account Locked - Security Alert',
        previewText: 'Your account has been locked due to multiple failed login attempts.',
        content: `<p>Dear ${sanitizedName},</p>
<p>We've detected multiple unsuccessful login attempts on your United Mess account within a short period.</p>
<p>To protect your account, we have temporarily locked it for <strong>2 hours</strong>.</p>
<p><strong>What You Can Do:</strong></p>
<ol>
  <li>Your account will automatically unlock after 2 hours</li>
  <li><strong>Reset Password</strong> — use the forgot password feature to regain access immediately</li>
  <li><strong>Contact Support</strong> — if you suspect unauthorized access</li>
</ol>`,
        showButton: true,
        buttonText: 'Reset Password',
        buttonLink: resetPasswordUrl,
        footerText: 'This is an automated security measure to protect your account from unauthorized access.',
    });

    return sendEmail({ to, subject: 'Account Locked - Security Alert | United Mess', text, html });
};

const sendPaymentStatusEmail = async (to, name, payment, status) => {
    const isSuccess = status === 'completed';
    const isRefund = status === 'refunded';
    const title = isRefund ? 'Payment Refunded' : isSuccess ? 'Payment Successful' : 'Payment Failed';
    const previewText = isRefund
        ? `Your refund for ${payment.month} has been processed`
        : isSuccess
            ? `Your payment for ${payment.month} was successful`
            : 'Your payment could not be processed';

    const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(Math.abs(payment.amount));

    const typeLabel = payment.type === 'gas_bill' ? 'Gas Bill'
        : payment.type === 'mess_bill' ? 'Mess Bill'
        : 'Other Payment';

    const paymentDate = payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
        : 'N/A';

    const content = `
<p>Hello ${validator.escape(String(name))},</p>
<p>${isRefund
    ? `Your refund for <strong>${validator.escape(String(payment.month))}</strong> has been processed.`
    : isSuccess ? `Your payment for <strong>${validator.escape(String(payment.month))}</strong> has been successfully processed.` : 'We were unable to process your payment.'}</p>
<table style="border-collapse:collapse;width:100%;margin:20px 0;font-family:Arial,sans-serif;">
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Billing Period:</strong></td><td style="padding:10px;border:1px solid #ddd;">${validator.escape(String(payment.month))}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Amount:</strong></td><td style="padding:10px;border:1px solid #ddd;">${isRefund ? '-' : ''}${formattedAmount}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Payment Type:</strong></td><td style="padding:10px;border:1px solid #ddd;">${typeLabel}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Date:</strong></td><td style="padding:10px;border:1px solid #ddd;">${paymentDate}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Transaction ID:</strong></td><td style="padding:10px;border:1px solid #ddd;word-break:break-all;">${validator.escape(String(payment.transactionId || 'N/A'))}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Payment Method:</strong></td><td style="padding:10px;border:1px solid #ddd;">${payment.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : payment.paymentMethod === 'online' ? 'Online Transfer' : 'Cash'}</td></tr>
</table>
<p>Thank you for using United Mess.</p>`;

    const { html, text } = generateEmailTemplate({
        title,
        previewText,
        content,
        showButton: false,
        footerText: isRefund
            ? 'This refund has been processed by your mess admin. Please contact them if you have questions.'
            : isSuccess
                ? 'We appreciate your business. Keep this email for your records.'
                : 'If you have any questions, please contact support.',
    });

    const subject = isRefund
        ? `Refund Processed — ${typeLabel} for ${payment.month}`
        : isSuccess
            ? `Payment Confirmed — ${typeLabel} for ${payment.month}`
            : `Payment Failed — ${typeLabel} for ${payment.month}`;

    return sendEmail({ to, subject, text, html });
};

const sendInvoiceEmail = async (to, name, monthName, pdfBuffer, fileName = 'invoice.pdf') => {
    const sanitizedName = validator.escape(String(name));
    const sanitizedMonth = validator.escape(String(monthName));

    const content = `<p>Dear ${sanitizedName},</p>
<p>Your mess bill invoice for <strong>${sanitizedMonth}</strong> is attached to this email.</p>
<p>You can find a detailed breakdown of all charges in the attached PDF.</p>
<p>If you have any questions, please contact your mess admin.</p>`;

    const { html, text } = generateEmailTemplate({
        title: `Your Mess Bill — ${sanitizedMonth}`,
        previewText: `Invoice for ${sanitizedMonth} from United Mess is ready`,
        content,
        showButton: false,
        footerText: 'This is a system-generated invoice. Please keep it for your records.',
    });

    const safeFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    return sendEmail({
        to,
        subject: `Your Mess Bill Invoice — ${sanitizedMonth} | United Mess`,
        text,
        html,
        attachments: [{ filename: safeFilename, content: pdfBuffer, contentType: 'application/pdf' }],
    });
};

const sendInvoiceSummaryEmail = async (to, name, invoice) => {
    const sanitizedName = validator.escape(String(name));
    const monthName = invoice.monthName || `${invoice.month}/${invoice.year}`;
    const totalPayable = (invoice.totalPayable ?? 0).toLocaleString('en-IN');
    const paidAmount = (invoice.paidAmount ?? 0).toLocaleString('en-IN');
    const statusLabel = invoice.status === 'paid' ? 'Paid'
        : invoice.status === 'partially_paid' ? 'Partially Paid'
        : 'Unpaid';

    const content = `<p>Dear ${sanitizedName},</p>
<p>Your mess bill summary for <strong>${validator.escape(String(monthName))}</strong> is ready.</p>
<table style="border-collapse:collapse;width:100%;margin:20px 0;font-family:Arial,sans-serif;">
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Billing Period:</strong></td><td style="padding:10px;border:1px solid #ddd;">${validator.escape(String(monthName))}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Total Payable:</strong></td><td style="padding:10px;border:1px solid #ddd;">\u20B9${totalPayable}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Amount Paid:</strong></td><td style="padding:10px;border:1px solid #ddd;">\u20B9${paidAmount}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Status:</strong></td><td style="padding:10px;border:1px solid #ddd;">${validator.escape(statusLabel)}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Meals:</strong></td><td style="padding:10px;border:1px solid #ddd;">${invoice.mealCount ?? 0}</td></tr>
  <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Market Spend:</strong></td><td style="padding:10px;border:1px solid #ddd;">\u20B9${(invoice.marketAmountSpent ?? 0).toLocaleString('en-IN')}</td></tr>
</table>
<p>If you have any questions regarding your bill, please contact your mess admin.</p>`;

    const { html, text } = generateEmailTemplate({
        title: `Mess Bill — ${validator.escape(String(monthName))}`,
        previewText: `Your invoice for ${monthName} from United Mess`,
        content,
        showButton: false,
        footerText: 'This is a system-generated invoice summary. Please keep it for your records.',
    });

    return sendEmail({
        to,
        subject: `Your Mess Bill Summary — ${monthName} | United Mess`,
        text,
        html,
    });
};

/**
 * Send market duty confirmation email with .ics calendar invite.
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Array<{date: Date|string}>} dates - Selected duty dates
 * @param {Buffer} [icsBuffer] - Optional .ics file buffer to attach
 */
const sendMarketScheduleConfirmationEmail = async (to, name, dates, icsBuffer) => {
    const sanitizedName = validator.escape(String(name));

    const dateRows = dates
        .map((d) => {
            const dt = new Date(d.date);
            const formatted = dt.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Kolkata',
            });
            return `<tr><td style="padding:12px 14px;border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.90);font-family:'Instrument Sans',Arial,sans-serif;font-size:14px;">${validator.escape(formatted)}</td></tr>`;
        })
        .join('');

    const content = `
<p style="color:rgba(255,255,255,0.62);">Dear ${sanitizedName},</p>
<p style="color:rgba(255,255,255,0.62);">Your market duty has been successfully scheduled. Here are the confirmed dates:</p>
<table style="border-collapse:collapse;width:100%;margin:20px 0;">
  <tr><td style="padding:12px 14px;background:rgba(255,200,80,0.10);border:1px solid rgba(255,200,80,0.20);border-radius:6px 6px 0 0;color:rgba(255,200,80,0.85);font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Scheduled Date</td></tr>
  ${dateRows}
</table>
<p style="color:rgba(255,255,255,0.62);">A calendar invite is attached to this email. Click it to add these dates to your calendar (Google Calendar, Apple Calendar, Outlook, or any calendar app).</p>
<p style="color:rgba(255,255,255,0.62);"><strong style="color:rgba(255,255,255,0.80);">Market hours:</strong> 9:00 AM – 6:00 PM IST</p>
<p style="color:rgba(255,255,255,0.62);">If you need to reschedule, please update your selection from the Events section in the app before the scheduled date.</p>`;

    const { html, text } = generateEmailTemplate({
        title: 'Market Duty Scheduled',
        previewText: `Your market duty dates for ${dates.length > 1 ? dates.length + ' days' : '1 day'} have been confirmed`,
        content,
        showButton: false,
        footerText: 'If you did not schedule this, please contact your mess admin immediately.',
    });

    const attachments = [];
    if (icsBuffer && Buffer.isBuffer(icsBuffer)) {
        attachments.push({
            filename: 'market-duty.ics',
            content: icsBuffer,
            contentType: 'text/calendar; method=PUBLISH',
        });
    }

    return sendEmail({
        to,
        subject: `Market Duty Confirmed — ${dates.length} date${dates.length !== 1 ? 's' : ''} | United Mess`,
        text,
        html,
        attachments,
    });
};

/**
 * Send admin notification email when a member selects market dates.
 * @param {string} to - Admin email
 * @param {string} adminName - Admin name
 * @param {string} memberName - Member who selected dates
 * @param {Array<{date: Date|string}>} dates - Selected dates
 */
const sendMarketScheduleAdminNotificationEmail = async (to, adminName, memberName, dates) => {
    const sanitizedAdmin = validator.escape(String(adminName));
    const sanitizedMember = validator.escape(String(memberName));

    const dateList = dates
        .map((d) => {
            const dt = new Date(d.date);
            const formatted = dt.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Kolkata',
            });
            return `<li style="padding:4px 0;">${validator.escape(formatted)}</li>`;
        })
        .join('');

    const content = `
<p>Dear ${sanitizedAdmin},</p>
<p><strong>${sanitizedMember}</strong> has selected the following market duty dates:</p>
<ul style="list-style:disc;padding-left:20px;margin:16px 0;">${dateList}</ul>
<p>You can review all scheduled dates in the Events section of the admin panel.</p>`;

    const { html, text } = generateEmailTemplate({
        title: 'New Market Date Selection',
        previewText: `${sanitizedMember} selected ${dates.length} market date${dates.length !== 1 ? 's' : ''}`,
        content,
        showButton: false,
        footerText: 'This is an automated notification from United Mess.',
    });

    return sendEmail({
        to,
        subject: `Market Selection by ${sanitizedMember} — United Mess`,
        text,
        html,
    });
};

module.exports = {
    transport,
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendAccountApprovedEmail,
    sendAccountDeniedEmail,
    sendPasswordChangeNotification,
    sendPasswordResetConfirmation,
    sendAccountLockedEmail,
    sendPaymentStatusEmail,
    sendInvoiceEmail,
    sendInvoiceSummaryEmail,
    sendMarketScheduleConfirmationEmail,
    sendMarketScheduleAdminNotificationEmail,
};
