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
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* ----- CLIENT-SPECIFIC RESETS ----- */
        body,
        table,
        td,
        a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        table,
        td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }

        /* ----- GLOBAL RESET & FONTS ----- */
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'SF Pro Text', Roboto, 'Helvetica Neue', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-attachment: fixed;
        }

        * {
            box-sizing: border-box;
            -webkit-box-sizing: border-box;
            -moz-box-sizing: border-box;
        }

        table {
            border-collapse: separate !important;
        }

        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
        }

        /* ----- NOTHING OS DOT MATRIX INFLUENCE (MONOSPACE FOR SPECIFIC ELEMENTS) ----- */
        .dot-matrix {
            font-family: 'Courier New', 'SF Mono', 'Menlo', 'Consolas', monospace !important;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: 500;
        }

        .glyph-icon-bg {
            background: rgba(20, 20, 30, 0.15);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        /* subtle dot pattern for nothing OS background effect (used in footer) */
        .dot-pattern-bg {
            background-image: radial-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px);
            background-size: 8px 8px;
        }

        /* ----- RESPONSIVE ----- */
        @media only screen and (max-width: 640px) {
            .email-container {
                width: 100% !important;
                overflow: hidden;
            }

            .main-padding {
                padding: 12px 6px !important;
            }

            .header-cell,
            .body-cell,
            .footer-cell {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }

            .logo-text {
                font-size: 28px !important;
            }

            .email-title {
                font-size: 22px !important;
            }

            .button {
                display: block !important;
                width: auto !important;
                max-width: 100% !important;
                text-align: center !important;
            }

            .social-button {
                width: 42px !important;
                height: 42px !important;
            }

            .social-td {
                padding: 0 4px !important;
            }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background: radial-gradient(circle at 10% 30%, #fad0e6 0%, #b5e0ff 70%, #c2e5ff 100%); background-attachment: fixed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'SF Pro Text', Roboto, 'Helvetica Neue', Arial, sans-serif;">

    <!-- PREHEADER -->
    <div style="display: none; font-size: 1px; color: #f9fafb; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
        ${previewText || title} — experience the fusion of liquid glass and dot matrix.
    </div>

    <!-- MAIN WRAPPER -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: transparent;">
        <tr>
            <td align="center" class="main-padding" style="padding: 40px 20px;">
                <!-- CARD CONTAINER – LIQUID GLASS CORE -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background: rgba(255, 255, 255, 0.15); border-radius: 36px; box-shadow: 0 25px 50px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.4); backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.45);">

                    <!-- ===== HEADER – ORIGIN OS 6 VIBRANCY + NOTHING DOT ACCENT ===== -->
                    <tr>
                        <td class="header-cell" style="padding: 36px 40px 30px; background: linear-gradient(145deg, rgba(255,255,255,0.5) 0%, rgba(255,255,240,0.3) 100%); border-radius: 36px 36px 0 0; border-bottom: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- LOGO with dot matrix style -->
                                        <h1 class="logo-text dot-matrix" style="margin: 0; padding: 0; font-size: 34px; font-weight: 600; letter-spacing: 4px; color: #1f2937; text-shadow: 2px 2px 4px rgba(255,255,255,0.6), 0 0 0 rgba(0,0,0,0.1); background: linear-gradient(145deg, #1e1e2f, #2a2a40); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.1;">
                                            UNITEDMESS
                                        </h1>
                                        <!-- dot matrix tagline + glyph-style separator -->
                                        <p style="margin: 8px 0 0 0; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 2px; color: #2e3742; font-weight: 400; text-transform: uppercase; opacity: 0.8;">
                                            <span style="display: inline-block; width: 6px; height: 6px; background: #2e3742; border-radius: 1px; margin: 0 6px 2px 0;"></span>
                                            WHERE FOOD MEETS COMMUNITY
                                            <span style="display: inline-block; width: 6px; height: 6px; background: #2e3742; border-radius: 1px; margin: 0 0 2px 6px;"></span>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ===== BODY – OXYGEN OS CLEAN + LIQUID GLASS LAYERS ===== -->
                    <tr>
                        <td class="body-cell" style="padding: 40px 40px; background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <!-- Title with subtle dot matrix echo -->
                                        <h2 class="email-title" style="margin: 0 0 18px 0; font-family: -apple-system, 'Inter', sans-serif; font-size: 26px; font-weight: 600; color: #111827; letter-spacing: -0.3px; border-left: 4px solid #3b82f6; padding-left: 16px;">
                                            ${title}
                                        </h2>

                                        <!-- Content – clean Oxygen OS readability -->
                                        <div style="font-family: -apple-system, 'Inter', sans-serif; font-size: 16px; font-weight: 400; color: #1f2937; line-height: 1.7; margin: 0; text-shadow: 0 1px 2px rgba(255,255,255,0.3);">
                                            ${content}
                                        </div>

                                        <!-- BUTTON – origin os 6 gradient + liquid glass depth -->
                                        ${showButton && buttonText ? `
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 36px;">
                                            <tr>
                                                <td align="center">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonLink}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="20%" stroke="f" fillcolor="#b05eff">
                                                        <w:anchorlock/>
                                                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">${buttonText}</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="${buttonLink}" class="button" style="display: inline-block; padding: 16px 36px; background: linear-gradient(125deg, #ff7eb3 0%, #b05eff 70%, #3b82f6 100%); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #ffffff; font-family: -apple-system, 'Inter', sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 40px; box-shadow: 0 20px 30px -10px rgba(59,130,246,0.4), 0 4px 8px rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5); letter-spacing: 0.3px;">
                                                        ${buttonText}
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-top: 18px;">
                                                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #2d3a4a; letter-spacing: 0.2px;">
                                                        ⚡ direct link: <a href="${buttonLink}" style="color: #1f2937; text-decoration: underline; text-decoration-style: dotted;">${buttonLink}</a>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}

                                        <!-- FOOTER NOTE – nothing os dotted style -->
                                        ${footerText ? `
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 36px 0 0;">
                                            <tr>
                                                <td style="background: rgba(255,255,255,0.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-left: 4px solid #b05eff; padding: 18px 22px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 14px; color: #1f2b3a; line-height: 1.6; font-weight: 500;">
                                                        <span style="font-size: 100%; margin-right: 8px;">⏣</span> ${footerText}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ===== FOOTER – NOTHING OS GLYPH + LIQUID GLASS & DOT MATRIX ===== -->
                    <tr>
                        <td class="footer-cell" style="padding: 30px 40px 36px; background: linear-gradient(145deg, rgba(255,255,255,0.5) 0%, rgba(230,245,255,0.4) 100%); border-radius: 0 0 36px 36px; border-top: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- dot matrix decorative line (nothing style) -->
                                        <!--<div style="width: 80px; height: 2px; background: repeating-linear-gradient(90deg, #2c3e4e 0px, #2c3e4e 4px, transparent 4px, transparent 8px); margin: 0 auto 20px;"></div>-->

                                        <!-- CONNECT TITLE with dot matrix -->
                                        <p class="dot-matrix" style="margin: 0 0 18px 0; font-size: 13px; font-weight: 600; color: #1f2a36; letter-spacing: 2px; text-transform: uppercase;">
                                            <span style="background: #1f2a36; width: 5px; height: 5px; display: inline-block; border-radius: 0; margin-right: 8px;"></span>
                                            connect with us
                                            <span style="background: #1f2a36; width: 5px; height: 5px; display: inline-block; border-radius: 0; margin-left: 8px;"></span>
                                        </p>

                                        <!-- SOCIAL ICONS – perfectly centered -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 28px;">
                                            <tr>

                                                <!-- GitHub -->
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" width="48" height="48" cellspacing="0" cellpadding="0" border="0" style="width:48px;height:48px;background:rgba(20,20,30,0.1);border-radius:16px;border:1px solid rgba(255,255,255,0.35);box-shadow:0 6px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3);">
                                                        <tr>
                                                            <td align="center" valign="middle">
                                                                <a href="https://github.com/alamgir009" style="display:block;">
                                                                    <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" width="22" height="22" alt="GitHub" style="display:block; filter:brightness(0.2) contrast(120%); opacity:0.8;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>

                                                <!-- LinkedIn -->
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" width="48" height="48" cellspacing="0" cellpadding="0" border="0" style="width:48px;height:48px;background:rgba(20,20,30,0.1);border-radius:16px;border:1px solid rgba(255,255,255,0.35);box-shadow:0 6px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3);">
                                                        <tr>
                                                            <td align="center" valign="middle">
                                                                <a href="https://linkedin.com" style="display:block;">
                                                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="22" height="22" alt="LinkedIn" style="display:block; filter:brightness(0.2) contrast(120%); opacity:0.8;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>

                                                <!-- Twitter -->
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" width="48" height="48" cellspacing="0" cellpadding="0" border="0" style="width:48px;height:48px;background:rgba(20,20,30,0.1);border-radius:16px;border:1px solid rgba(255,255,255,0.35);box-shadow:0 6px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3);">
                                                        <tr>
                                                            <td align="center" valign="middle">
                                                                <a href="https://twitter.com" style="display:block;">
                                                                    <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="22" height="22" alt="Twitter" style="display:block; filter:brightness(0.2) contrast(120%); opacity:0.8;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>

                                                <!-- Instagram -->
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" width="48" height="48" cellspacing="0" cellpadding="0" border="0" style="width:48px;height:48px;background:rgba(20,20,30,0.1);border-radius:16px;border:1px solid rgba(255,255,255,0.35);box-shadow:0 6px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3);">
                                                        <tr>
                                                            <td align="center" valign="middle">
                                                                <a href="https://instagram.com" style="display:block;">
                                                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="22" height="22" alt="Instagram" style="display:block; filter:brightness(0.2) contrast(120%); opacity:0.8;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>

                                            </tr>
                                        </table>

                                        <!-- DIVIDER with dot pattern -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 18px 0 20px;">
                                            <tr>
                                                <td style="border-top: 1px dashed rgba(0,0,0,0.15);"></td>
                                            </tr>
                                        </table>

                                        <!-- COMPANY INFO with dot matrix subtlety -->
                                        <p style="margin: 8px 0; font-family: 'Courier New', monospace; font-size: 13px; color: #1e2b3a; line-height: 1.7; font-weight: 400;">
                                            <strong style="font-weight: 600; background: rgba(255,255,255,0.3); padding: 2px 6px;">© ${year} ${companyName}</strong><br>
                                            <span style="opacity: 0.8;">${companyAddress}</span>
                                        </p>

                                        <!-- UNSUBSCRIBE / PREFERENCES – oxygen style clean -->
                                        <p style="margin: 16px 0 0; font-family: -apple-system, 'Inter', sans-serif; font-size: 13px; color: #2d3f4f; opacity: 0.9;">
                                            You're a member of ${companyName}.<br>
                                            <a href="#" style="color: #1f2937; text-decoration: underline; text-decoration-style: dotted; font-weight: 500;">preferences</a>
                                            <span style="margin: 0 6px;">|</span>
                                            <a href="#" style="color: #1f2937; text-decoration: underline; text-decoration-style: dotted; font-weight: 500;">unsubscribe</a>
                                        </p>
                                        <!-- tiny dot matrix glyph -->
                                        <div style="margin-top: 20px; font-size: 10px; color: #3a4a5a; letter-spacing: 3px;">⏣ ⏣ ⏣</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!-- end liquid glass card -->
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