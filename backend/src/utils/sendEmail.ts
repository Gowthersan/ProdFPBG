import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, html: string) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error('EMAIL_USER et EMAIL_PASS doivent être définis dans les variables d\'environnement');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  await transporter.sendMail({
    from: `"FPBG Authentification" <${emailUser}>`,
    to,
    subject,
    html
  });
}
