const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

// Create transport
const transport = nodemailer.createTransport(config.email?.smtp || {
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: 'test',
        pass: 'test',
    },
});

/**
 * Base email sender
 * @param {Object} options - Email options
 * @returns {Promise}
 */
const sendEmail = async ({ to, subject, text, html }) => {
    const msg = {
        from: config.email?.from || 'United Mess <noreply@unitedmess.com>',
        to,
        subject,
        text,
        html
    };

    try {
        await transport.sendMail(msg);
        logger.info(`Email sent to ${to} - Subject: ${subject}`);
        return true;
    } catch (error) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw error;
    }
};

/**
 * Generate base email template
 * @param {Object} options - Template options
 * @returns {Object} { html, text }
 */
const generateEmailTemplate = ({
    title,
    previewText,
    content,
    buttonText,
    buttonLink,
    footerText,
    showButton = true
}) => {
    const companyName = 'UnitedMess';
    const companyAddress = 'Chinar Park, Kolkata, India';
    const year = new Date().getFullYear();

    const text = `
${title}
${'='.repeat(title.length)}

${content.replace(/<[^>]*>?/gm, '')}

${buttonText ? `${buttonText}: ${buttonLink}` : ''}

${footerText || `Best regards,\n${companyName} Team`}

---
${companyName}
${companyAddress}
© ${year} ${companyName}. All rights reserved.
`;

    const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
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
    body{margin:0!important;padding:0!important;width:100%!important;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

    /* Accent line utility (some clients honor this; inline style used too for best support) */
    .gold-accent { height:2px; min-width:100%; background:#c9973a; background-image:linear-gradient(90deg,#c9973a 0%,#ffd27a 100%); line-height:0; }

    @media only screen and (max-width:640px){
      .wrap{width:100%!important;border-radius:20px!important}
      .eyebrow-table,.stamp-table{width:100%!important}
      .outer-pad{padding:16px 8px!important}
      .h-cell{padding:28px 22px 24px!important}
      .b-cell{padding:32px 22px!important}
      .f-cell{padding:24px 22px 28px!important}
      .title{font-size:21px!important;letter-spacing:-0.4px!important}
      .logo{font-size:20px!important}
      .btn-cta{display:block!important;width:100%!important;text-align:center!important;padding:16px 20px!important}
      .s-td{padding:0 4px!important}
      .s-btn{width:38px!important;height:38px!important;border-radius:10px!important}
      .s-btn img{margin:9px auto!important;width:16px!important;height:16px!important}
      .pill{display:none!important}
      .ornament-line{display:none!important}
    }
  </style>
</head>

<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  UNITEDMESS — LUXURY EMAIL TEMPLATE                         ║
  ║  (Responsive & client-friendly alignment fix)               ║
  ╚══════════════════════════════════════════════════════════════╝
-->

<body style="
  margin:0;padding:0;
  background-color:#060608;
  background-image:
    radial-gradient(ellipse 100% 70% at 15% 0%, rgba(255,210,120,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 88% 15%, rgba(180,140,255,0.08) 0%, transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 85%, rgba(100,180,255,0.05) 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 70% 50%, rgba(255,180,100,0.04) 0%, transparent 50%);
  font-family:'Instrument Sans',-apple-system,BlinkMacSystemFont,sans-serif;
">

  <!--
                      RESEND-STYLE SINGLE GOLD ACCENT LINE
                      ─────────────────────────────────────
                      One clean 2px gradient bar at the very
                      top — no double borders, no shimmer soup.
                      Pure editorial confidence.
  -->

  <!-- Gold accent bar (with MSO fallback) -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;">
    <tr>
      <td style="padding:0;margin:0;line-height:0;">
        <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:2px;">
            <v:fill color="#c9973a" />
          </v:rect>
        <![endif]-->
        <div class="gold-accent" style="height:2px;min-width:100%;background:#c9973a;background-image:linear-gradient(90deg,#c9973a 0%,#ffd27a 100%);line-height:0;font-size:0;">&nbsp;</div>
      </td>
    </tr>
  </table>

  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#060608;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText || title}&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;</div>

  <!-- ═══ OUTER WRAPPER ═══ -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" class="outer-pad" style="padding:52px 20px 48px;">

        <!-- ─── ABOVE-CARD EYEBROW (with responsive class) ─── -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="eyebrow-table" style="max-width:600px;width:100%;margin-bottom:14px;">
          <tr>
            <td align="left">
              <span style="
                font-family:'JetBrains Mono','Courier New',monospace;
                font-size:10px;font-weight:400;
                letter-spacing:0.18em;text-transform:uppercase;
                color:rgba(255,255,255,0.18);
              ">unitedmess · transactional</span>
            </td>
            <td align="right">
              <span style="
                font-family:'JetBrains Mono','Courier New',monospace;
                font-size:10px;font-weight:400;
                letter-spacing:0.12em;
                color:rgba(255,255,255,0.12);
              ">${year}</span>
            </td>
          </tr>
        </table>

        <!-- ═══════════════════════════════════════════
             MAIN CARD — all absolute decorative divs removed
             (they caused misalignment in Gmail/Outlook)
             ═══════════════════════════════════════════ -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
          class="wrap"
          style="
            max-width:600px;width:100%;
            border-radius:26px;
            overflow:hidden;
            background: linear-gradient(
              145deg,
              rgba(28,26,38,0.92) 0%,
              rgba(18,16,26,0.96) 40%,
              rgba(22,20,32,0.94) 100%
            );
            box-shadow:
              0 0 0 1px rgba(255,255,255,0.07),
              inset 0 1px 0 rgba(255,255,255,0.10),
              0 32px 80px rgba(0,0,0,0.75),
              0 8px 24px rgba(0,0,0,0.50),
              0 0 60px rgba(255,200,80,0.04),
              0 -4px 40px rgba(160,120,255,0.06);
            border:1px solid rgba(255,255,255,0.06);
          ">

          <!-- HEADER SECTION -->
          <tr>
            <td class="h-cell" style="
              padding:36px 44px 30px;
              background:
                linear-gradient(
                  135deg,
                  rgba(255,255,255,0.055) 0%,
                  rgba(255,220,140,0.03) 50%,
                  rgba(180,140,255,0.025) 100%
                );
              border-bottom:1px solid rgba(255,255,255,0.07);
              box-sizing:border-box;
            ">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="middle">

                    <!-- LOGO ROW -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:22px;">
                      <tr>
                        <td valign="middle" style="width:auto;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <!-- Glyph mark -->
                              <td valign="middle" style="padding-right:10px;">
                                <div style="
                                  width:34px;height:34px;
                                  border-radius:10px;
                                  background:linear-gradient(135deg,
                                    rgba(255,210,100,0.22) 0%,
                                    rgba(255,160,60,0.12) 50%,
                                    rgba(200,120,255,0.10) 100%);
                                  border:1px solid rgba(255,210,100,0.25);
                                  box-shadow:
                                    inset 0 1px 0 rgba(255,255,255,0.18),
                                    0 4px 12px rgba(0,0,0,0.35),
                                    0 0 16px rgba(255,200,80,0.08);
                                  display:table-cell;
                                  text-align:center;vertical-align:middle;
                                ">
                                  <span style="
                                    font-family:'Syne','Arial',sans-serif;
                                    font-size:13px;font-weight:800;
                                    color:rgba(255,220,120,0.90);
                                    letter-spacing:-0.5px;
                                    line-height:34px;
                                    display:block;
                                    text-shadow:0 0 12px rgba(255,200,80,0.40);
                                  ">UM</span>
                                </div>
                              </td>
                              <td valign="middle">
                                <h1 class="logo" style="
                                  margin:0;padding:0;
                                  font-family:'Syne','Arial',sans-serif;
                                  font-size:22px;font-weight:700;
                                  letter-spacing:-0.6px;
                                  color:rgba(255,255,255,0.92);
                                  line-height:1;
                                  text-shadow:0 1px 8px rgba(255,200,80,0.12);
                                ">unitedmess</h1>
                                <p style="
                                  margin:3px 0 0 0;padding:0;
                                  font-family:'JetBrains Mono','Courier New',monospace;
                                  font-size:9.5px;font-weight:400;
                                  letter-spacing:0.14em;text-transform:uppercase;
                                  color:rgba(255,200,100,0.50);
                                  line-height:1;
                                ">where food meets community</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" align="right">
                          <span class="pill" style="
                            display:inline-block;
                            padding:5px 12px;
                            background:rgba(255,200,80,0.08);
                            border:1px solid rgba(255,200,80,0.18);
                            border-radius:100px;
                            font-family:'JetBrains Mono','Courier New',monospace;
                            font-size:9.5px;font-weight:500;
                            letter-spacing:0.10em;text-transform:uppercase;
                            color:rgba(255,210,100,0.70);
                            box-shadow:0 0 16px rgba(255,200,80,0.06);
                          ">Verified Send</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Ornament separator -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="ornament-line">
                      <tr>
                        <td style="
                          height:1px;
                          background:linear-gradient(90deg,
                            rgba(255,200,80,0.25) 0%,
                            rgba(255,200,80,0.08) 30%,
                            rgba(180,140,255,0.06) 70%,
                            transparent 100%);
                        "></td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY SECTION -->
          <tr>
            <td class="b-cell" style="
              padding:44px 44px 40px;
              background:rgba(12,11,18,0.60);
              box-sizing:border-box;
            ">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>

                    <h2 class="title" style="
                      margin:0 0 22px 0;padding:0;
                      font-family:'Syne','Arial',sans-serif;
                      font-size:26px;font-weight:700;
                      color:rgba(255,255,255,0.94);
                      line-height:1.25;letter-spacing:-0.6px;
                      text-shadow:0 2px 16px rgba(0,0,0,0.40);
                    ">${title}</h2>

                    <div style="
                      font-family:'Instrument Sans',-apple-system,sans-serif;
                      font-size:15px;font-weight:400;
                      color:rgba(255,255,255,0.62);
                      line-height:1.80;
                      margin:0;
                    ">${content}</div>

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
                          <a href="${buttonLink}" class="btn-cta" style="
                            display:inline-block;
                            padding:16px 36px;
                            font-family:'Syne','Arial',sans-serif;
                            font-size:13.5px;font-weight:700;
                            color:rgba(255,255,255,0.95);
                            text-decoration:none;
                            letter-spacing:0.04em;
                            text-transform:uppercase;
                            border-radius:14px;
                            background:linear-gradient(
                              135deg,
                              rgba(200,155,50,0.75) 0%,
                              rgba(180,130,40,0.65) 40%,
                              rgba(160,110,200,0.45) 100%
                            );
                            box-shadow:
                              inset 0 1px 0 rgba(255,255,200,0.22),
                              inset 0 -1px 0 rgba(0,0,0,0.30),
                              0 0 0 1px rgba(200,160,60,0.25),
                              0 4px 24px rgba(200,150,40,0.20),
                              0 12px 40px rgba(0,0,0,0.45),
                              0 0 60px rgba(200,150,40,0.08);
                            border:none;
                            box-sizing:border-box;
                            text-shadow:0 1px 4px rgba(0,0,0,0.40);
                          ">${buttonText}</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="
                                padding:13px 18px;
                                background:rgba(255,255,255,0.028);
                                border:1px solid rgba(255,255,255,0.07);
                                border-radius:10px;
                                box-sizing:border-box;
                              ">
                                <p style="
                                  margin:0 0 5px 0;
                                  font-family:'JetBrains Mono','Courier New',monospace;
                                  font-size:9.5px;font-weight:400;
                                  letter-spacing:0.12em;text-transform:uppercase;
                                  color:rgba(255,255,255,0.22);
                                ">if button fails · copy link</p>
                                <a href="${buttonLink}" style="
                                  font-family:'JetBrains Mono','Courier New',monospace;
                                  font-size:11.5px;
                                  color:rgba(200,160,80,0.70);
                                  text-decoration:none;
                                  word-break:break-all;line-height:1.6;
                                ">${buttonLink}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${footerText ? `
                    <!-- Divider -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:36px 0 0 0;">
                      <tr>
                        <td style="
                          height:1px;
                          background:linear-gradient(90deg,
                            rgba(255,200,80,0.15) 0%,
                            rgba(255,255,255,0.07) 40%,
                            transparent 100%);
                        "></td>
                      </tr>
                    </table>

                    <!-- Note block -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:22px;">
                      <tr>
                        <td style="
                          padding:18px 20px;
                          background:linear-gradient(135deg,
                            rgba(255,200,80,0.05) 0%,
                            rgba(200,160,255,0.03) 100%);
                          border-radius:12px;
                          border:1px solid rgba(255,200,80,0.10);
                          border-left:2px solid rgba(255,200,80,0.45);
                          box-sizing:border-box;
                          box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);
                        ">
                          <p style="
                            margin:0 0 6px 0;
                            font-family:'JetBrains Mono','Courier New',monospace;
                            font-size:9px;font-weight:500;
                            letter-spacing:0.16em;text-transform:uppercase;
                            color:rgba(255,200,80,0.55);
                          ">note</p>
                          <p style="
                            margin:0;
                            font-family:'Instrument Sans',sans-serif;
                            font-size:13.5px;font-weight:400;
                            color:rgba(255,255,255,0.50);
                            line-height:1.70;
                            font-style:italic;
                          ">${footerText}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER SECTION -->
          <tr>
            <td class="f-cell" style="
              padding:28px 44px 36px;
              background:linear-gradient(
                160deg,
                rgba(255,255,255,0.03) 0%,
                rgba(255,220,120,0.02) 50%,
                rgba(160,120,255,0.02) 100%
              );
              border-top:1px solid rgba(255,255,255,0.06);
              box-sizing:border-box;
            ">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">

                <!-- Social icon row -->
                <tr>
                  <td align="center" style="padding-bottom:22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://github.com/alamgir009" class="s-btn" style="
                            display:inline-block;width:42px;height:42px;
                            background:linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03));
                            border:1px solid rgba(255,255,255,0.09);
                            border-radius:12px;
                            box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 4px 12px rgba(0,0,0,0.40);
                            text-decoration:none;box-sizing:border-box;
                          ">
                            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" width="16" height="16" alt="GitHub"
                              style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;filter:invert(1);">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://linkedin.com" class="s-btn" style="
                            display:inline-block;width:42px;height:42px;
                            background:linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03));
                            border:1px solid rgba(255,255,255,0.09);
                            border-radius:12px;
                            box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 4px 12px rgba(0,0,0,0.40);
                            text-decoration:none;box-sizing:border-box;
                          ">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="16" height="16" alt="LinkedIn"
                              style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;filter:invert(1);">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://twitter.com" class="s-btn" style="
                            display:inline-block;width:42px;height:42px;
                            background:linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03));
                            border:1px solid rgba(255,255,255,0.09);
                            border-radius:12px;
                            box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 4px 12px rgba(0,0,0,0.40);
                            text-decoration:none;box-sizing:border-box;
                          ">
                            <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="16" height="16" alt="Twitter"
                              style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;filter:invert(1);">
                          </a>
                        </td>
                        <td class="s-td" style="padding:0 5px;">
                          <a href="https://instagram.com" class="s-btn" style="
                            display:inline-block;width:42px;height:42px;
                            background:linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03));
                            border:1px solid rgba(255,255,255,0.09);
                            border-radius:12px;
                            box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 4px 12px rgba(0,0,0,0.40);
                            text-decoration:none;box-sizing:border-box;
                          ">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="16" height="16" alt="Instagram"
                              style="display:block;margin:13px auto;width:16px;height:16px;opacity:0.55;filter:invert(1);">
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Thin rule -->
                <tr>
                  <td style="padding-bottom:18px;">
                    <div style="
                      height:1px;
                      background:linear-gradient(90deg,
                        transparent 0%,
                        rgba(255,255,255,0.07) 20%,
                        rgba(255,200,80,0.10) 50%,
                        rgba(255,255,255,0.07) 80%,
                        transparent 100%);
                    "></div>
                  </td>
                </tr>

                <!-- Company + links -->
                <tr>
                  <td align="center">
                    <p style="
                      margin:0 0 5px 0;
                      font-family:'Syne','Arial',sans-serif;
                      font-size:13px;font-weight:600;
                      color:rgba(255,255,255,0.45);
                      letter-spacing:0.01em;
                    ">© ${year} ${companyName}</p>
                    <p style="
                      margin:0 0 16px 0;
                      font-family:'Instrument Sans',sans-serif;
                      font-size:11.5px;
                      color:rgba(255,255,255,0.22);
                      line-height:1.7;
                    ">${companyAddress}</p>
                    <p style="
                      margin:0;
                      font-family:'Instrument Sans',sans-serif;
                      font-size:11.5px;
                      color:rgba(255,255,255,0.22);
                      line-height:1.9;
                    ">
                      You received this as a member of ${companyName}.
                      <br>
                      <a href="#" style="
                        color:rgba(255,200,80,0.55);
                        text-decoration:none;font-weight:500;
                        border-bottom:1px solid rgba(255,200,80,0.20);
                      ">Preferences</a>
                      <span style="color:rgba(255,255,255,0.12);padding:0 7px;">·</span>
                      <a href="#" style="
                        color:rgba(255,200,80,0.55);
                        text-decoration:none;font-weight:500;
                        border-bottom:1px solid rgba(255,200,80,0.20);
                      ">Unsubscribe</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
        <!-- ═══ END MAIN CARD ═══ -->

        <!-- BELOW-CARD STAMP (with responsive class) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="stamp-table" style="max-width:600px;width:100%;margin-top:18px;">
          <tr>
            <td align="center">
              <p style="
                margin:0;
                font-family:'JetBrains Mono','Courier New',monospace;
                font-size:9.5px;
                letter-spacing:0.16em;
                color:rgba(255,255,255,0.08);
                text-transform:uppercase;
              ">crafted with care · unitedmess.app</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;


    return { html, text };
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @param {string} name - User name (optional)
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token, name = 'User') => {
    const verificationUrl = `${config.appUrl || 'http://localhost:8080'}/api/v1/auth/verify-email/${token}`;

    const { html, text } = generateEmailTemplate({
        title: 'Verify Your Email Address',
        previewText: `Welcome to United Mess! Please verify your email address.`,
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">Thank you for registering with United Mess! To complete your registration and start using our services, please verify your email address by clicking the button below.</p>
<p class="email-text">This verification link will expire in <strong>24 hours</strong>.</p>
`,
        buttonText: 'Verify Email Address',
        buttonLink: verificationUrl,
        footerText: 'If you did not create an account with United Mess, please ignore this email.'
    });

    return sendEmail({
        to,
        subject: 'Verify Your Email Address - United Mess',
        text,
        html
    });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @param {string} name - User name (optional)
 * @returns {Promise}
 */
const sendPasswordResetEmail = async (to, token, name = 'User') => {
    const resetUrl = `${config.appUrl || 'http://localhost:8080'}/api/v1/auth/reset-password/${token}`;

    const { html, text } = generateEmailTemplate({
        title: 'Reset Your Password',
        previewText: 'Reset your United Mess account password',
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">We received a request to reset your password for your United Mess account. If you made this request, please click the button below to choose a new password.</p>
<p class="email-text">This password reset link will expire in <strong>10 minutes</strong>.</p>
<p class="email-text" style="color: #e53e3e;"><strong>Note:</strong> If you didn't request a password reset, please ignore this email or contact our support team immediately.</p>
`,
        buttonText: 'Reset Password',
        buttonLink: resetUrl,
        footerText: 'For security reasons, this link is only valid for a limited time.'
    });

    return sendEmail({
        to,
        subject: 'Reset Your Password - United Mess',
        text,
        html
    });
};

/**
 * Send welcome email after successful email verification
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @returns {Promise}
 */
const sendWelcomeEmail = async (to, name) => {
    const dashboardUrl = `${config.appUrl || 'http://localhost:5173'}/dashboard`;

    const { html, text } = generateEmailTemplate({
        title: 'Email Verified Successfully!',
        previewText: `${name}, your email has been verified. Awaiting admin approval.`,
        content: `
<p class="email-text">Dear ${name},</p>
<p class="email-text">Congratulations! 🎉 Your email address has been successfully verified.</p>
<p class="email-text">Your registration with United Mess is now under review by our admin team. You will receive a notification once your account has been approved and activated.</p>
<div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">⏳ Next Steps:</p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">Please wait for admin approval from United Mess. This typically takes 24-48 hours.</p>
</div>
<p class="email-text">Once approved, you'll be able to:</p>
<ul style="color: #4a5568; padding-left: 20px; line-height: 1.8;">
    <li>Browse available meals in your area</li>
    <li>Connect with local markets and providers</li>
    <li>Manage your meal preferences and dietary requirements</li>
    <li>Track your orders and payment history</li>
</ul>
<p class="email-text">We appreciate your patience and look forward to welcoming you to the United Mess community!</p>
<p class="email-text">If you have any questions in the meantime, please don't hesitate to contact our support team.</p>
`,
        buttonText: 'Visit Dashboard',
        buttonLink: dashboardUrl,
        showButton: true
    });

    return sendEmail({
        to,
        subject: '✅ Email Verified Successfully - Awaiting Admin Approval',
        text,
        html
    });
};

/**
 * Send account approved email
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @returns {Promise}
 */
const sendAccountApprovedEmail = async (to, name) => {
    const loginUrl = `${config.appUrl || 'http://localhost:5173'}/login`;

    const { html, text } = generateEmailTemplate({
        title: 'Account Approved!',
        previewText: 'Your United Mess account has been approved.',
        content: `
<p class="email-text">Congratulations ${name}! 🎉</p>
<p class="email-text">We're excited to inform you that your United Mess account has been <strong>approved</strong> by our team.</p>
<p class="email-text">You now have full access to all features and can start using United Mess to:</p>
<ul style="color: #4a5568; padding-left: 20px;">
    <li>Order meals from local providers</li>
    <li>Connect with food markets</li>
    <li>Manage your profile and preferences</li>
    <li>Track your subscription and payments</li>
</ul>
<p class="email-text">We're excited to have you on board!</p>
`,
        buttonText: 'Login to Your Account',
        buttonLink: loginUrl
    });

    return sendEmail({
        to,
        subject: 'Your Account Has Been Approved - United Mess',
        text,
        html
    });
};

/**
 * Send account denied email
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @param {string} reason - Reason for denial
 * @returns {Promise}
 */
const sendAccountDeniedEmail = async (to, name, reason = 'Your application did not meet our current requirements.') => {
    const supportUrl = `${config.appUrl || 'https://unitedmess.com'}/support`;

    const { html, text } = generateEmailTemplate({
        title: 'Account Update',
        previewText: 'Update regarding your United Mess account application.',
        content: `
<p class="email-text">Dear ${name},</p>
<p class="email-text">Thank you for your interest in joining United Mess. We appreciate the time you took to complete your application.</p>
<p class="email-text">After careful review by our admin team, we regret to inform you that we are unable to approve your account application at this time.</p>
<div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">📋 Reason for Denial:</p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">${reason}</p>
</div>
<p class="email-text">If you believe this decision was made in error or would like to provide additional information for reconsideration, please don't hesitate to contact our support team.</p>
<p class="email-text">We appreciate your understanding and hope to have the opportunity to serve you in the future.</p>
`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'For any questions or concerns, please reach out to our support team.'
    });

    return sendEmail({
        to,
        subject: '❌ Account Update - United Mess',
        text,
        html
    });
};

/**
 * Send password change notification
 * @param {string} to - Recipient email
 * @param {string} name - User name (optional)
 * @returns {Promise}
 */
const sendPasswordChangeNotification = async (to, name = 'User') => {
    const supportUrl = `${config.appUrl || 'https://unitedmess.com'}/support`;
    const loginUrl = `${config.appUrl || 'https://unitedmess.com'}/login`;

    const { html, text } = generateEmailTemplate({
        title: 'Password Changed Successfully',
        previewText: 'Your United Mess password has been changed.',
        content: `
<p class="email-text">Dear ${name},</p>
<p class="email-text">This email confirms that your United Mess account password was successfully changed on ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}.</p>
<div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">✅ Change Confirmed</p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">If you made this change, no further action is required. You can now use your new password to access your account.</p>
</div>
<div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">🔒 Security Alert</p>
    <p style="margin: 8px 0 0 0; color: #c53030;"><strong>If you did NOT make this change, your account may be compromised.</strong></p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">Please contact our support team immediately to secure your account and reset your password.</p>
</div>
<p class="email-text">For your security, we recommend regularly updating your password and never sharing it with anyone.</p>
`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'This is an automated security notification from United Mess.'
    });

    return sendEmail({
        to,
        subject: '🔐 Password Changed - Security Notification',
        text,
        html
    });
};

/**
 * Send password reset confirmation
 * @param {string} to - Recipient email
 * @param {string} name - User name (optional)
 * @returns {Promise}
 */
const sendPasswordResetConfirmation = async (to, name = 'User') => {
    const loginUrl = `${config.appUrl || 'https://unitedmess.com'}/login`;
    const supportUrl = `${config.appUrl || 'https://unitedmess.com'}/support`;

    const { html, text } = generateEmailTemplate({
        title: 'Password Reset Successful',
        previewText: 'Your password has been successfully reset.',
        content: `
<p class="email-text">Dear ${name},</p>
<p class="email-text">Great news! Your United Mess account password has been successfully reset. ✨</p>
<p class="email-text">You can now use your new password to securely log in to your account and access all features.</p>
<div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">💡 Security Best Practices:</p>
    <ul style="color: #4a5568; padding-left: 20px; margin: 8px 0 0 0; line-height: 1.8;">
        <li>Use a unique, strong password for your United Mess account</li>
        <li>Enable two-factor authentication if available</li>
        <li>Update your password every 3-6 months</li>
        <li>Never share your password with anyone, including support staff</li>
        <li>Avoid using the same password across multiple platforms</li>
    </ul>
</div>
<p class="email-text">Your account security is our top priority. If you have any questions or concerns, our support team is here to help.</p>
`,
        showButton: true,
        buttonText: 'Log In to Your Account',
        buttonLink: loginUrl,
        footerText: 'If you did not reset your password, please contact our support team immediately.'
    });

    return sendEmail({
        to,
        subject: '✅ Password Reset Confirmation - United Mess',
        text,
        html
    });
};

/**
 * Send account locked email
 * @param {string} to - Recipient email
 * @param {string} name - User name (optional)
 * @returns {Promise}
 */
const sendAccountLockedEmail = async (to, name = 'User') => {
    const resetPasswordUrl = `${config.appUrl || 'https://unitedmess.com'}/auth/forgot-password`;
    const supportUrl = `${config.appUrl || 'https://unitedmess.com'}/support`;

    const { html, text } = generateEmailTemplate({
        title: 'Account Locked - Security Alert',
        previewText: 'Your account has been locked due to multiple failed login attempts.',
        content: `
<p class="email-text">Dear ${name},</p>
<p class="email-text">We've detected multiple unsuccessful login attempts on your United Mess account within a short period.</p>
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">🔒 Account Status: Temporarily Locked</p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">To protect your account security, we have temporarily locked your account for <strong>2 hours</strong>.</p>
</div>
<div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">❓ What Happened?</p>
    <p style="margin: 8px 0 0 0; color: #4a5568;">Multiple incorrect password attempts were detected on your account, triggering our automatic security lockout system.</p>
</div>
<p class="email-text"><strong>What You Can Do:</strong></p>
<ol style="color: #4a5568; padding-left: 20px; line-height: 1.8;">
    <li><strong>Wait:</strong> Your account will automatically unlock after 2 hours from the time of the last failed attempt</li>
    <li><strong>Reset Password:</strong> Use the "Forgot Password" feature to reset your password immediately</li>
    <li><strong>Contact Support:</strong> Reach out to our support team for immediate assistance if you suspect unauthorized access</li>
</ol>
<div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; color: #2d3748; font-weight: 600;">⚠️ Didn't Try to Log In?</p>
    <p style="margin: 8px 0 0 0; color: #c53030;">If you did not attempt to access your account, please contact our support team immediately. Your account may require additional security measures.</p>
</div>
`,
        showButton: true,
        buttonText: 'Reset Password',
        buttonLink: resetPasswordUrl,
        footerText: 'This is an automated security measure to protect your account from unauthorized access.'
    });

    return sendEmail({
        to,
        subject: '⚠️ Account Locked - Security Alert | United Mess',
        text,
        html
    });
};

/**
 * Send payment status email (success/failure)
 * @param {string} to - user email
 * @param {string} name - user name
 * @param {Object} payment - payment document (plain object)
 * @param {string} status - 'completed' or 'failed'
 * @returns {Promise}
 */
const sendPaymentStatusEmail = async (to, name, payment, status) => {
    const isSuccess = status === 'completed';
    const title = isSuccess ? 'Payment Successful' : 'Payment Failed';
    const previewText = isSuccess ? 'Your payment was successful' : 'Your payment could not be processed';

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(payment.amount);

    const content = `
        <p>Hello ${name},</p>
        <p>${isSuccess ? 'Your payment has been successfully processed.' : 'We were unable to process your payment.'}</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-family: Arial, sans-serif;">
            <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formattedAmount}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Type:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${payment.type === 'mess_bill' ? 'Mess Bill' : 'Gas Bill'}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Transaction ID:</strong></td><td style="padding: 10px; border: 1px solid #ddd; word-break: break-all;">${payment.transactionId || 'N/A'}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Method:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${payment.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash'}</td></tr>
        </table>
        <p>Thank you for using United Mess.</p>
    `;

    const { html, text } = generateEmailTemplate({
        title,
        previewText,
        content,
        showButton: false,
        footerText: isSuccess ? 'We appreciate your business.' : 'If you have any questions, please contact support.'
    });

    return sendEmail({
        to,
        subject: `${title} - United Mess`,
        text,
        html
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
    sendPaymentStatusEmail
};