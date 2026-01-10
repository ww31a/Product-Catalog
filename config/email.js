import sgMail from "./email.config.js";
import { Verification_Email_Template } from "../utils/emailTemplate.js";

export const sendVerificationCode = async (email, verificationCode) => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME,
      },
      subject: "Verify Your Email",
      text: `Your verification code is ${verificationCode}`,
      html: Verification_Email_Template.replace(
        "{verificationCode}",
        verificationCode
      ),
    };

    await sgMail.send(msg);
    console.log("Verification email sent to:", email);

  } catch (err) {
    console.error(
      "SendGrid email error:",
      err.response?.body || err.message
    );
    throw err; // important so controller can handle fallback
  }
};
