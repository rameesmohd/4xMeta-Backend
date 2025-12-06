const { emailTemplate } = require("./emailTemplates");

const verification = (otp, userName) =>
  emailTemplate(`
  <div style="max-width:600px;margin:auto;background:#ffffff;padding:24px;border-radius:10px;">
    <h2 style="text-align:center;font-family:Arial,sans-serif;color:#000;font-weight:700;margin:0 0 12px;">
      Email Verification
    </h2>
    <p style="text-align:center;color:#555;font-size:14px;font-family:Arial;margin:0 0 16px;">
      Dear ${userName}, please use the verification code below:
    </p>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:14px 32px;background:#000;color:#fff;border-radius:8px;font-size:24px;font-weight:700;">
        ${otp}
      </div>
    </div>

    <p style="text-align:center;color:#555;font-size:13px;margin:0;">
      If you did not request this action, you may safely ignore this email.
    </p>
  </div>
`);


const withdrawalVerification = (otp, userName) =>
  emailTemplate(`
  <div style="max-width:600px;margin:auto;background:#ffffff;padding:24px;border-radius:10px;">
    <h2 style="text-align:center;font-family:Arial;color:#000;margin:0 0 12px;">Withdrawal Verification</h2>
    <p style="text-align:center;color:#555;font-size:14px;margin:0 0 16px;">
      Dear ${userName}, use the following OTP to confirm your withdrawal:
    </p>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:14px 32px;background:#000;color:#fff;border-radius:8px;font-size:24px;font-weight:700;">
        ${otp}
      </div>
    </div>

    <p style="text-align:center;color:#555;font-size:13px;margin:0;">
      If this wasn’t you, contact support immediately.
    </p>
  </div>
`);

  

const forgotMail = (otp, userName) =>
  emailTemplate(`
  <div style="max-width:600px;margin:auto;background:#ffffff;padding:24px;border-radius:10px;">
    <h2 style="text-align:center;font-family:Arial;color:#000;margin:0 0 12px;">Reset Password</h2>
    <p style="text-align:center;color:#555;font-size:14px;margin:0 0 16px;">
      Dear ${userName}, here is your password reset verification code:
    </p>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:14px 32px;background:#000;color:#fff;border-radius:8px;font-size:24px;font-weight:700;">
        ${otp}
      </div>
    </div>

    <p style="text-align:center;color:#555;font-size:13px;margin:0;">
      If you didn’t request this, ignore the message.
    </p>
  </div>
`);


const sendEmailToUser = ({ title, username, desOne, desTwo,desThree }) =>
    emailTemplate(`
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" width="600" style="padding: 10px;">
            <tr>
              <td style="padding: 10px; font-family: Arial, sans-serif; color: #333333;">
                <h3 style="text-align: center; margin-bottom: 24px;">${title}</h3>
                <p style="margin: 0 0 12px;">Dear ${username},</p>
                <p style="margin: 0 0 12px;">${desOne}</p>
                ${
                  desTwo
                    ? `<p style="margin: 0 0 12px;">${desTwo}</p>`
                    : ''
                }
                ${
                  desThree
                    ? `<p style="margin: 0 0 12px;">${desThree}</p>`
                    : ''
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `);
  
const purchaseConfirmation = (userName) =>
  emailTemplate(`<table
                cellspacing="0"
                cellpadding="0"
                align="center"
                style="
                  border-collapse: collapse;
                  border-spacing: 0px;
                  table-layout: fixed !important;
                  width: 100%;
                "
              >
                <tbody>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0">
                      <table
                        cellspacing="0"
                        cellpadding="0"
                        bgcolor="#ffffff"
                        align="center"
                        style="
                          border-collapse: collapse;
                          border-spacing: 0px;
                          background-color: #ffffff;
                          width: 600px;
                        "
                      >
                        <tbody>
                          <tr>
                            <td
                              align="left"
                              style="
                                padding: 0;
                                margin: 0;
                                padding-top: 20px;
                                padding-left: 20px;
                                padding-right: 20px;
                              "
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                style="
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      align="center"
                                      valign="top"
                                      style="
                                        padding: 0;
                                        margin: 0;
                                        width: 560px;
                                      "
                                    >
                                      <table
                                        cellpadding="0"
                                        cellspacing="0"
                                        width="100%"
                                        role="presentation"
                                        style="
                                          border-collapse: collapse;
                                          border-spacing: 0px;
                                        "
                                      >
                                        <tbody>
                                          <tr>
                                            <td
                                              align="center"
                                              style="padding: 0; margin: 0"
                                            >
                                              <h2
                                                style="
                                                  margin: 0;
                                                  line-height: 26px;
                                                  font-family: roboto,
                                                    'helvetica neue', helvetica,
                                                    arial, sans-serif;
                                                  font-size: 22px;
                                                  font-style: normal;
                                                  font-weight: 500;
                                                  color: #000000;
                                                "
                                              >
                                                <strong
                                                  ><font
                                                    style="
                                                      vertical-align: inherit;
                                                    "
                                                    ><font
                                                      style="
                                                        vertical-align: inherit;
                                                      "
                                                      >Hi ${userName}</font
                                                    ></font
                                                  ></strong
                                                >
                                              </h2>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td
                                              align="left"
                                              style="
                                                padding: 0;
                                                margin: 0;
                                                padding-top: 15px;
                                              "
                                            >
                                              <p
                                                style="
                                                  margin: 0;
                                                  font-family: arial,
                                                    'helvetica neue', helvetica,
                                                    sans-serif;
                                                  line-height: 24px;
                                                  color: #333333;
                                                  font-size: 16px;
                                                "
                                              >
                                              Thank you for purchasing a challenge with Real Trade Capital. 
                                              We will begin processing your Real Trade challenge, 
                                              and you will receive your trading account details as soon as it's ready.  
                                              </p>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>`);
              
const purchaseConfirmationAdmin = (userName) =>
  emailTemplate(`       <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                style="
                  border-collapse: collapse;
                  border-spacing: 0px;
                  table-layout: fixed !important;
                  width: 100%;
                "
              >
                <tbody>
                  <tr>
                    <td align="center" style="padding: 0; margin: 0">
                      <table
                        cellspacing="0"
                        cellpadding="0"
                        bgcolor="#ffffff"
                        align="center"
                        style="
                          border-collapse: collapse;
                          border-spacing: 0px;
                          background-color: #ffffff;
                          width: 600px;
                        "
                      >
                        <tbody>
                          <tr>
                            <td
                              align="left"
                              style="
                                padding: 0;
                                margin: 0;
                                padding-top: 20px;
                                padding-left: 20px;
                                padding-right: 20px;
                              "
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                style="
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      align="center"
                                      valign="top"
                                      style="
                                        padding: 0;
                                        margin: 0;
                                        width: 560px;
                                      "
                                    >
                                      <table
                                        cellpadding="0"
                                        cellspacing="0"
                                        width="100%"
                                        role="presentation"
                                        style="
                                          border-collapse: collapse;
                                          border-spacing: 0px;
                                        "
                                      >
                                        <tbody>
                                          <tr>
                                            <td
                                              align="center"
                                              style="padding: 0; margin: 0"
                                            >
                                              <h2
                                                style="
                                                  margin: 0;
                                                  line-height: 26px;
                                                  font-family: roboto,
                                                    'helvetica neue', helvetica,
                                                    arial, sans-serif;
                                                  font-size: 22px;
                                                  font-style: normal;
                                                  font-weight: 500;
                                                  color: #000000;
                                                "
                                              >
                                                <strong
                                                  ><font
                                                    style="
                                                      vertical-align: inherit;
                                                    "
                                                    ><font
                                                      style="
                                                        vertical-align: inherit;
                                                      "
                                                      > Hi Admin,</font
                                                    ></font
                                                  ></strong
                                                >
                                              </h2>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td
                                              align="left"
                                              style="
                                                padding: 0;
                                                margin: 0;
                                                padding-top: 15px;
                                              "
                                            >
                                              <p
                                                style="
                                                  margin: 0;
                                                  font-family: arial,
                                                    'helvetica neue', helvetica,
                                                    sans-serif;
                                                  line-height: 24px;
                                                  color: #333333;
                                                  font-size: 16px;
                                                "
                                              >
                                           

                                              This is to notify you that a user (${userName}) has purchased a new challenge with Real Trade Capital. Please initiate the processing of the challenge and prepare the trading account details for the order.</p>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>`);

module.exports = {
  verification,
  forgotMail,
  purchaseConfirmation,
  purchaseConfirmationAdmin,
  withdrawalVerification,
  sendEmailToUser
};