const footer = (APP_NAME, SUPPORT_MAIL) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="border-collapse:collapse; background-color:#f8fafc; width:100%;">
  <tr>
    <td align="center" style="padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:600px; border-collapse:collapse;">

        <!-- Top border accent -->
        <tr>
          <td style="padding:0; height:1px; background:#e2e8f0;
            font-size:0; line-height:0;">&nbsp;</td>
        </tr>

        <!-- Footer content -->
        <tr>
          <td align="center" style="padding:24px 24px 28px;">

            <!-- App name -->
            <p style="margin:0 0 8px; font-family:Arial,sans-serif;
              font-size:13px; font-weight:700; color:#334155;
              letter-spacing:0.3px;">
              ${APP_NAME}
            </p>

            <!-- Divider dots -->
            <p style="margin:0 0 12px; font-family:Arial,sans-serif;
              font-size:11px; color:#cbd5e1; letter-spacing:2px;">
              &bull; &bull; &bull;
            </p>

            <!-- Support line -->
            <p style="margin:0 0 6px; font-family:Arial,sans-serif;
              font-size:12px; color:#64748b; line-height:1.6;">
              This is an automated message &mdash; please do not reply directly.
            </p>
            <p style="margin:0 0 16px; font-family:Arial,sans-serif;
              font-size:12px; color:#64748b; line-height:1.6;">
              Need help? Contact us at
              <a href="mailto:${SUPPORT_MAIL}"
                style="color:#2563eb; text-decoration:none; font-weight:600;">
                ${SUPPORT_MAIL}
              </a>
            </p>

            <!-- Legal -->
            <p style="margin:0; font-family:Arial,sans-serif;
              font-size:11px; color:#94a3b8; line-height:1.5;">
              &copy; 2025 <strong>${APP_NAME}</strong>. All rights reserved.<br/>
              Copy trading involves risk. Past performance is not indicative of future results.
            </p>

          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;

module.exports = footer;