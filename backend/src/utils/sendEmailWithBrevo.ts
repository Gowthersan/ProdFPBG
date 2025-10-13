import axios from 'axios';

/**
 * Service d'envoi d'email via EmailJS
 *
 * Configuration requise dans .env :
 * - EMAILJS_PUBLIC_KEY : Clé publique EmailJS
 * - EMAILJS_SECRET_KEY : Clé secrète EmailJS
 * - SERVICE_ID : ID du service email
 * - TEMPLATE_ID : ID du template email
 */

/**
 * Envoie un code OTP par email via EmailJS
 */
export async function sendOTPEmail(to: string, otp: string, name?: string): Promise<void> {
  const serviceId = process.env.SERVICE_ID;
  const templateId = process.env.TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configuration EmailJS manquante dans les variables d\'environnement');
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      to_name: name || 'Utilisateur',
      from_name: 'FPBG Auth Team',
      app_name: 'FPBG Platform',
      otp_code: otp,
      year: new Date().getFullYear().toString(),
      support_link: 'https://fpbg.example.com/support'
    }
  };

  console.log('📧 Envoi OTP via EmailJS:', { to, otp, serviceId, templateId });
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ OTP envoyé à ${to} via EmailJS: ${otp}`);
    console.log('📬 Réponse EmailJS:', response.data);
  } catch (error: any) {
    console.error('❌ Erreur envoi email EmailJS:', error.response?.data || error.message);
    console.error('❌ Détails complets:', JSON.stringify(error.response?.data, null, 2));
    throw new Error("Impossible d'envoyer l'email de vérification");
  }
}

/**
 * Fonction générique pour envoyer des emails via EmailJS
 */
export async function sendEmailWithBrevo(to: string, subject: string, templateParams: Record<string, any>): Promise<void> {
  const serviceId = process.env.SERVICE_ID;
  const templateId = process.env.TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configuration EmailJS manquante dans les variables d\'environnement');
  }

  try {
    await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: to,
          subject: subject,
          ...templateParams
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Email envoyé à ${to} via EmailJS`);
  } catch (error: any) {
    console.error('❌ Erreur envoi email EmailJS:', error.response?.data || error.message);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
}

/**
 * Vérifier la configuration du service email EmailJS
 */
export async function verifyEmailConfig(): Promise<boolean> {
  const serviceId = process.env.SERVICE_ID;
  const templateId = process.env.TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.error('❌ Configuration EmailJS incomplète');
    return false;
  }

  console.log('✅ Configuration EmailJS valide');
  return true;
}
