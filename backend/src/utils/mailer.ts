import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration ESM pour __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ====================================
 * CONFIGURATION NODEMAILER AVEC SMTP
 * ====================================
 * Service d'envoi d'emails via serveur SMTP dédié
 * Configuration depuis les variables d'environnement (.env)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.singcloud.ga',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL/TLS pour port 465
  auth: {
    user: process.env.SMTP_USER || 'no-reply-fpbg@singcloud.ga',
    pass: process.env.SMTP_PASS || ''
  },
  tls: {
    rejectUnauthorized: false, // Accepter les certificats auto-signés
    minVersion: 'TLSv1.2'
  },
  authMethod: 'LOGIN', // Méthode d'authentification
  debug: false, // Mets true si tu veux voir les logs SMTP détaillés
  logger: false
});

/**
 * Fonction utilitaire pour charger le template HTML
 * @returns Le contenu HTML du template
 */
function loadEmailTemplate(): string {
  const templatePath = path.join(__dirname, '../../templates/email-otp.html');

  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error('❌ Erreur lors du chargement du template:', error);
    // Template de secours si le fichier n'existe pas
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Code de vérification OTP</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f3f6f4; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border-top: 5px solid #16a34a;">
            <div style="background-color: #16a34a; color: #ffffff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px;">CODE D'AUTHENTIFICATION</h1>
            </div>
            <div style="padding: 30px; color: #333333;">
              <p>Bonjour <strong>{{ to_name }}</strong>,</p>
              <p>Merci de vous être inscrit sur <strong>{{ app_name }}</strong> 🌿<br>
              Pour finaliser votre inscription et activer votre compte, veuillez saisir le code OTP ci-dessous :</p>
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; color: #15803d; font-weight: bold;">
                {{ otp_code }}
              </div>
              <p>Ce code expirera dans <strong>5 minutes</strong>.<br>
              Si vous n'avez pas demandé ce code, vous pouvez ignorer cet e-mail.</p>
              <p>Bien cordialement,<br><strong>L'équipe {{ from_name }}</strong></p>
            </div>
            <div style="background-color: #f9fafb; color: #6b7280; font-size: 13px; text-align: center; padding: 15px 20px; border-top: 1px solid #e5e7eb;">
              <p>© {{ year }} {{ app_name }} — Tous droits réservés</p>
              <p>Besoin d'aide ? <a href="{{ support_link }}" style="color: #16a34a; text-decoration: none;">Contactez le support</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

/**
 * Remplace les variables du template par les valeurs fournies
 * @param template Template HTML
 * @param variables Variables à remplacer
 * @returns Template HTML avec les variables remplacées
 */
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * ====================================
 * ENVOI D'EMAIL OTP
 * ====================================
 * Envoie un email avec un code OTP en utilisant le template HTML
 * En mode développement (NODE_ENV !== 'production'), affiche l'OTP dans les logs
 *
 * @param to Email du destinataire
 * @param otpCode Code OTP à envoyer
 * @param userName Nom de l'utilisateur
 */
export async function sendOTPEmail(to: string, otpCode: string, userName: string = 'Utilisateur'): Promise<void> {
  // Toujours afficher l'OTP dans les logs
  console.log('\n' + '═'.repeat(60));
  console.log("📧 ENVOI D'EMAIL OTP");
  console.log('═'.repeat(60));
  console.log(`📧 Destinataire : ${to}`);
  console.log(`👤 Nom          : ${userName}`);
  console.log(`🔐 CODE OTP     : ${otpCode}`);
  console.log('⏰ Expiration   : 5 minutes');
  console.log('═'.repeat(60) + '\n');

  // MODE DÉVELOPPEMENT : Ne pas essayer d'envoyer l'email si credentials invalides
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    console.log('🔧 MODE DÉVELOPPEMENT - Email non envoyé (voir code OTP ci-dessus)');
    console.log('💡 Pour envoyer de vrais emails, configurez NODE_ENV=production et vérifiez les credentials SMTP\n');
    return; // Ne pas essayer d'envoyer
  }

  // MODE PRODUCTION : Envoyer l'email via SMTP
  try {
    console.log(`📧 Tentative d'envoi d'email OTP à ${to}...`);

    // Charger le template
    const templateHTML = loadEmailTemplate();
    console.log('✅ Template HTML chargé');

    // Remplacer les variables
    const htmlContent = replaceTemplateVariables(templateHTML, {
      to_name: userName,
      app_name: 'FPBG Platform',
      otp_code: otpCode,
      from_name: 'FPBG Auth Team',
      year: new Date().getFullYear().toString(),
      support_link: 'https://fpbg.example.com/support'
    });
    console.log('✅ Variables du template remplacées');

    // Envoyer l'email
    console.log("📨 Envoi de l'email via SMTP...");
    const info = await transporter.sendMail({
      from: '"FPBG Support" <no-reply-fpbg@singcloud.ga>',
      to,
      subject: 'Code de vérification FPBG',
      html: htmlContent
    });

    console.log('✅ Email OTP envoyé avec succès :', info.messageId);
  } catch (error: any) {
    console.error("❌ Erreur détaillée d'envoi d'email OTP :");
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    console.error('   Erreur complète:', error);
    throw new Error("Impossible d'envoyer l'email de vérification");
  }
}

/**
 * ====================================
 * ENVOI D'EMAIL GÉNÉRIQUE
 * ====================================
 * Fonction générique pour envoyer n'importe quel email
 *
 * @param to Email du destinataire
 * @param subject Sujet de l'email
 * @param htmlContent Contenu HTML de l'email
 */
export async function sendMail(to: string, subject: string, htmlContent: string): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: '"FPBG Support" <no-reply-fpbg@singcloud.ga>',
      to,
      subject,
      html: htmlContent
    });

    console.log('✅ Email envoyé :', info.messageId);
  } catch (error) {
    console.error("❌ Erreur d'envoi d'email :", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
}

/**
 * ====================================
 * VÉRIFICATION DE LA CONFIGURATION
 * ====================================
 * Vérifie que le service email est correctement configuré
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    console.log('🔍 Vérification de la configuration SMTP...');

    await transporter.verify();
    console.log('✅ Configuration Nodemailer valide - Connexion SMTP réussie');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur de configuration Nodemailer:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    return false;
  }
}
