import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
import emailTemplate from './emailTemplate.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: `"Padime" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: emailTemplate({ subject, content: html || `<div>${text?.replace(/\n/g, '<br/>')}</div>` })
  };

  return transporter.sendMail(mailOptions);
}

export default sendEmail;