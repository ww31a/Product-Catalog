import transporter from "./email.config.js";
import { Verification_Email_Template } from "../utils/emailTemplate.js";

export const sendVerificationCode = async (email,verificationCode) => {

    try {
        const response = await transporter.sendMail({
            from: '"Team Product Catalog" <waqasanwar1308@gmail.com>', // sender address
            to: email, // list of recipients
            subject: "Verify Your Email", // subject line
            text: "Verify Your Email", // plain text body
            html: Verification_Email_Template.replace("{verificationCode}",verificationCode), // HTML body
        });
        console.log("Message sent: %s", response.messageId);
    } catch (err) {
        console.error("Error while sending mail", err);
    }
}
