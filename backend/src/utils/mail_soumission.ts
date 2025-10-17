// sendMail.js
import nodemailer from 'nodemailer';
import { acknowledgmentTemplate } from './templates/acknowledgmentTemplate';
import { internalNotificationTemplate } from './templates/internalNotificationTemplate';

export const sendMailSoumissionnaireAdmin = async (to: string, name: string, subject: string, message: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // ou ton service SMTP
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Premier mail → au client
  const clientMail = {
    from: `"Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `Accusé de réception - ${subject}`,
    html: acknowledgmentTemplate(name, subject, message)
  };

  // Second mail → à ton équipe interne
  const internalMail = {
    from: `"Support" <${process.env.SMTP_USER}>`,
    to: 'morelmintsa@gmail.com', // ou une variable d’env
    subject: `Nouvelle demande de ${name}`,
    html: internalNotificationTemplate(name, subject, message)
  };

  // Envoi simultané
  await Promise.all([transporter.sendMail(clientMail), transporter.sendMail(internalMail)]);

  console.log('✅ Accusé envoyé au client et notification à l’équipe.');
};
