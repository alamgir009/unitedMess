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

const html = `
<!DOCTYPE html>
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
        /* Client-specific Styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

        /* Reset */
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, 'Helvetica Neue', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            /*background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);*/
            background-attachment: fixed;
        }

        /* Box-sizing fix */
        * {
            box-sizing: border-box;
            -webkit-box-sizing: border-box;
            -moz-box-sizing: border-box;
        }

        table { 
            border-collapse: separate !important;
            box-sizing: border-box;
        }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

        /* Responsive */
        @media only screen and (max-width: 640px) {
            .email-container { 
                width: 100% !important; 
                overflow: hidden;
                box-sizing: border-box;
            }
            .header-cell, .body-cell, .footer-cell { 
                padding-left: 20px !important; 
                padding-right: 20px !important;
                box-sizing: border-box;
            }
            .logo-text { font-size: 26px !important; }
            .email-title { font-size: 20px !important; }
            .button { 
                display: block !important; 
                width: auto !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                text-align: center !important;
            }
            .social-button {
                width: 40px !important;
                height: 40px !important;
                box-sizing: border-box !important;
            }
            .social-button img {
                margin: 10px auto !important;
            }
            
            .social-td {
                padding: 0 4px !important;
            }
        }

        /* Glass effect fallbacks for email clients */
        .glass-header {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.18) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
        }

        .glass-footer {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.18) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #bfbfbf 100%); background-attachment: fixed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <!-- Preheader -->
    <div style="display: none; font-size: 1px; color: #f9fafb; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
        ${previewText || title}
    </div>

    <!-- Email Wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f1f5f9 0%, #764ba2 100%); background-attachment: fixed;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Email Container - 600px max width -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background: rgba(255, 255, 255, 0.08); border-radius: 24px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); border: 1px solid rgba(255, 255, 255, 0.18); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);">
                    
                    <!-- HEADER - Glass Effect -->
                    <tr>
                        <td class="header-cell glass-header" style="padding: 32px 40px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%); border-radius: 24px 24px 0 0; border-bottom: 1px solid rgba(255, 255, 255, 0.18); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <h1 class="logo-text" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; color: #1f2937; line-height: 1.2; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);">
                                            UNITEDMESS
                                        </h1>
                                        <p style="margin: 8px 0 0 0; padding: 0; font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #4b5563; line-height: 1.5; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">
                                            Where Food Meets Community
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td class="body-cell" style="padding: 40px 40px; background: rgba(255, 255, 255, 0.95); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <!-- Title -->
                                        <h2 class="email-title" style="margin: 0 0 16px 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3; letter-spacing: -0.5px;">
                                            ${title}
                                        </h2>
                                        
                                        <!-- Content -->
                                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 400; color: #4b5563; line-height: 1.7; margin: 0;">
                                            ${content}
                                        </div>

                                        ${showButton && buttonText ? `
                                        <!-- Button Section -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
                                            <tr>
                                                <td align="center">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonLink}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#3b82f6">
                                                        <w:anchorlock/>
                                                        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">${buttonText}</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="${buttonLink}" class="button" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); box-sizing: border-box; max-width: 100%;">
                                                        ${buttonText}
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-top: 16px;">
                                                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                                        Button not working? Copy this link:<br>
                                                        <a href="${buttonLink}" style="color: #3b82f6; text-decoration: none; font-size: 11px; word-break: break-all;">${buttonLink}</a>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}

                                        ${footerText ? `
                                        <!-- Divider -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                                            <tr>
                                                <td style="border-top: 1px solid rgba(0, 0, 0, 0.1);"></td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Footer Note -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="background: rgba(139, 92, 246, 0.1); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-left: 4px solid rgba(139, 92, 246, 0.8); padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2); box-sizing: border-box;">
                                                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #5b21b6; line-height: 1.6; font-style: italic;">
                                                        ${footerText}
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

                    <!-- FOOTER - Glass Effect -->
                    <tr>
                        <td class="footer-cell glass-footer" style="padding: 32px 40px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%); border-radius: 0 0 24px 24px; border-top: 1px solid rgba(255, 255, 255, 0.18); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-sizing: border-box;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Connect Title -->
                                        <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 600; color: #374151; letter-spacing: 0.5px; text-transform: uppercase; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">
                                            Connect With Us
                                        </p>
                                        
                                        <!-- Social Links - Glass Effect Buttons -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 24px;">
                                            <tr>
                                                <td class="social-td" style="padding: 0 6px;">
                                                    <a href="https://github.com/alamgir009" class="social-button" style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" width="20" height="20" alt="GitHub" style="display: block; margin: 12px auto; width: 20px; height: 20px; filter: brightness(0.8);">
                                                    </a>
                                                </td>
                                                <td class="social-td" style="padding: 0 6px;">
                                                    <a href="https://linkedin.com" class="social-button" style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="20" height="20" alt="LinkedIn" style="display: block; margin: 12px auto; width: 20px; height: 20px; filter: brightness(0.8);">
                                                    </a>
                                                </td>
                                                <td class="social-td" style="padding: 0 6px;">
                                                    <a href="https://twitter.com" class="social-button" style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="20" height="20" alt="Twitter" style="display: block; margin: 12px auto; width: 20px; height: 20px; filter: brightness(0.8);">
                                                    </a>
                                                </td>
                                                <td class="social-td" style="padding: 0 6px;">
                                                    <a href="https://instagram.com" class="social-button" style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="20" height="20" alt="Instagram" style="display: block; margin: 12px auto; width: 20px; height: 20px; filter: brightness(0.8);">
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Divider -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                            <tr>
                                                <td style="border-top: 1px solid rgba(0, 0, 0, 0.1);"></td>
                                            </tr>
                                        </table>

                                        <!-- Company Info -->
                                        <p style="margin: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #4b5563; line-height: 1.6; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">
                                            <strong style="color: #374151;">© ${year} ${companyName}</strong><br>
                                            ${companyAddress}
                                        </p>

                                        <!-- Footer Links -->

                                        <!-- Unsubscribe -->
                                        <p style="margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #6b7280; line-height: 1.6; text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);">
                                            You're receiving this because you're a member of ${companyName}.<br>
                                            <a href="#" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Update preferences</a> or 
                                            <a href="#" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Unsubscribe</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End Email Container -->

            </td>
        </tr>
    </table>
    <!-- End Email Wrapper -->

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
 * Send welcome email
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @returns {Promise}
 */
const sendWelcomeEmail = async (to, name) => {
    const dashboardUrl = `${config.appUrl || 'http://localhost:5173'}/dashboard`;

    const { html, text } = generateEmailTemplate({
        title: 'Welcome to United Mess!',
        previewText: `Welcome ${name}! Get started with United Mess.`,
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">Welcome to United Mess! We're thrilled to have you join our community of food lovers and providers.</p>
<p class="email-text">Your account is now active and ready to use. Here's what you can do:</p>
<ul style="color: #4a5568; padding-left: 20px;">
    <li>Browse available meals in your area</li>
    <li>Connect with local markets</li>
    <li>Manage your meal preferences</li>
    <li>Track your orders and payments</li>
</ul>
<p class="email-text">Get started by exploring your dashboard!</p>
`,
        buttonText: 'Go to Dashboard',
        buttonLink: dashboardUrl,
        showButton: true
    });

    return sendEmail({
        to,
        subject: 'Welcome to United Mess! 🎉',
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
    const { html, text } = generateEmailTemplate({
        title: 'Account Application Update',
        previewText: 'Update regarding your United Mess account application.',
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">Thank you for your interest in United Mess. After reviewing your application, we regret to inform you that we cannot approve your account at this time.</p>
<div class="email-text-highlight">
    <p style="margin: 0; color: #2d3748;"><strong>Reason:</strong> ${reason}</p>
</div>
<p class="email-text">If you believe this is a mistake or would like to provide additional information, please contact our support team.</p>
<p class="email-text">We appreciate your understanding and hope to serve you in the future.</p>
`,
        showButton: false,
        footerText: 'For any questions or concerns, please contact our support team.'
    });

    return sendEmail({
        to,
        subject: 'Account Application Update - United Mess',
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

    const { html, text } = generateEmailTemplate({
        title: 'Password Changed Successfully',
        previewText: 'Your United Mess password has been changed.',
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">This is a confirmation that your United Mess account password was recently changed.</p>
<p class="email-text">If you made this change, no further action is required.</p>
<p class="email-text" style="color: #e53e3e;"><strong>Security Alert:</strong> If you did NOT change your password, please contact our support team immediately to secure your account.</p>
`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'This is an automated security notification from United Mess.'
    });

    return sendEmail({
        to,
        subject: 'Password Changed - Security Notification',
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
    const { html, text } = generateEmailTemplate({
        title: 'Password Reset Successful',
        previewText: 'Your password has been successfully reset.',
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">Your United Mess account password has been successfully reset.</p>
<p class="email-text">You can now use your new password to log in to your account.</p>
<p class="email-text" style="color: #38a169;"><strong>Security Tip:</strong> For your account's security, we recommend:</p>
<ul style="color: #4a5568; padding-left: 20px;">
    <li>Using a unique password for United Mess</li>
    <li>Enabling two-factor authentication if available</li>
    <li>Regularly updating your password</li>
    <li>Never sharing your password with anyone</li>
</ul>
`,
        showButton: false,
        footerText: 'If you did not reset your password, please contact our support team immediately.'
    });

    return sendEmail({
        to,
        subject: 'Password Reset Confirmation - United Mess',
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
    const unlockUrl = `${config.appUrl || 'https://unitedmess.com'}/auth/unlock-account`;
    const supportUrl = `${config.appUrl || 'https://unitedmess.com'}/support`;

    const { html, text } = generateEmailTemplate({
        title: 'Account Locked - Security Alert',
        previewText: 'Your account has been locked due to multiple failed login attempts.',
        content: `
<p class="email-text">Hello ${name},</p>
<p class="email-text">We've detected multiple unsuccessful login attempts on your United Mess account.</p>
<p class="email-text">To protect your account, it has been temporarily <strong>locked</strong> for 2 hours.</p>
<div class="email-text-highlight">
    <p style="margin: 0; color: #2d3748;">
        <strong>What happened?</strong><br>
        Too many incorrect password attempts were made on your account.
    </p>
</div>
<p class="email-text">If this was you, you can:</p>
<ol style="color: #4a5568; padding-left: 20px;">
    <li>Wait 2 hours for the lock to expire automatically</li>
    <li>Use the "Forgot Password" feature to reset your password</li>
    <li>Contact our support team for immediate assistance</li>
</ol>
`,
        showButton: true,
        buttonText: 'Contact Support',
        buttonLink: supportUrl,
        footerText: 'This is an automated security measure to protect your account.'
    });

    return sendEmail({
        to,
        subject: '⚠️ Account Locked - Security Alert',
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
    sendAccountLockedEmail
};