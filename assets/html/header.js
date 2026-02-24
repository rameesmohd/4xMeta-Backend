const header = (APP_NAME, LOGO_URL) => `
<table width="100%" cellspacing="0" cellpadding="0" role="presentation"
  style="border-collapse:collapse; width:100%;">
  <tr>
    <td align="center" style="padding:0;">
      <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
        style="max-width:600px; width:100%; border-collapse:collapse;">

        <tr>
          <td align="center" style="padding:26px 32px 22px;">

            ${LOGO_URL ? `
            <!-- ── Logo image (hosted URL) ── -->
            <a href="#" style="display:inline-block; text-decoration:none; border:0;"
              target="_blank">
              <img
                src="${LOGO_URL}"
                alt="${APP_NAME}"
                width="40"
                border="0"
                style="
                  display:block;
                  border:0;
                  outline:none;
                  text-decoration:none;
                  max-width:40px;
                  height:auto;
                  /* white bg fallback in case PNG has transparency issues in dark mode */
                "
              />
            </a>
            ` : `
            <!-- ── Text fallback when no logo URL ── -->
            <table cellspacing="0" cellpadding="0" role="presentation" style="border-collapse:collapse;">
              <tr>
                <td align="center" style="padding:8px 18px;border-radius:10px;
                  background:linear-gradient(135deg,#2563eb,#06b6d4);">
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;
                    font-weight:900;color:#ffffff;letter-spacing:1px;line-height:1;">
                    ${APP_NAME}
                  </p>
                </td>
              </tr>
            </table>
            `}

            <!-- Tagline — always shown -->
            <p style="margin:10px 0 0; font-family:Arial,sans-serif;
              font-size:11px; color:#475569; letter-spacing:1.8px;
              text-transform:uppercase; line-height:1;">
              Smart &bull; Secure &bull; Copy Trading
            </p>

          </td>
        </tr>

        <!-- Gradient accent line -->
        <tr>
          <td style="padding:0; height:3px;
            background:linear-gradient(90deg,#2563eb,#06b6d4,#2563eb);
            font-size:0; line-height:0;">&nbsp;</td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;

module.exports = header;