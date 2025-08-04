import dotenv from 'dotenv';
dotenv.config();

import sendEmail from './utils/sendEmail.js';

sendEmail({
  to: 'brainybox9@gmail.com', // <-- use your real email here
  subject: 'Test Email',
  html: '<p>This is a test email from Nodemailer.</p>',
}).then(() => {
  console.log('Email sent!');
  process.exit(0);
}).catch(err => {
  console.error('Error sending email:', err);
  process.exit(1);
});