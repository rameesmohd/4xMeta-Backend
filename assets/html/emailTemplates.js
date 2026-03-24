const dotenv = require('dotenv');
dotenv.config();

const footer = require("./footer");
const header = require("./header");

const APP_NAME   = process.env.APP_NAME    || "-";
const SUPPORT_MAIL = process.env.SUPPORT_MAIL || "-";

/**
 * LOGO_URL — set in your .env:
 *   LOGO_URL=https://yourdomain.com/static/logo.png
 *
 * The image must be:
 *   • Publicly hosted on https (not localhost)
 *   • PNG or GIF with transparent background (recommended)
 *   • ~280×80px at 2× resolution (displayed at 140×40px)
 *
 * If LOGO_URL is empty, header falls back to a styled text badge.
 */

const LOGO_URL = process.env.LOGO_URL || "";

const emailTemplate = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;
  font-family:Arial,'Helvetica Neue',Helvetica,sans-serif; -webkit-text-size-adjust:100%;">

  <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
    style="border-collapse:collapse; background-color:#f1f5f9; width:100%;">
    <tr>
      <td align="center" style="padding:28px 16px 44px;">

        <!-- Email card -->
        <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
          style="max-width:600px; width:100%; border-collapse:collapse;
            border-radius:14px; overflow:hidden;
            box-shadow:0 4px 32px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="padding:0; font-size:0; line-height:0;">
              ${header(APP_NAME, LOGO_URL)}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0; background-color:#ffffff;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0;">
              ${footer(APP_NAME, SUPPORT_MAIL)}
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

module.exports = { emailTemplate };