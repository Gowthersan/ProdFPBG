import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailjsService {

  constructor() {
    // Initialiser EmailJS avec la clé publique
    emailjs.init(environment.emailjs.publicKey);
  }

  /**
   * Envoie un code OTP par email via EmailJS
   * @param toEmail Email du destinataire
   * @param toName Nom du destinataire
   * @param otpCode Code OTP à envoyer
   * @returns Promise<void>
   */
  async sendOtpEmail(toEmail: string, toName: string, otpCode: string): Promise<void> {
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      from_name: 'FPBG Auth Team',
      app_name: 'FPBG Platform',
      otp_code: otpCode,
      year: new Date().getFullYear().toString(),
      support_link: 'https://fpbg.example.com/support'
    };

    console.log('📧 Envoi OTP via EmailJS:', { toEmail, otpCode });

    try {
      const response = await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templateId,
        templateParams
      );

      console.log('✅ OTP envoyé avec succès:', response);
    } catch (error: any) {
      console.error('❌ Erreur envoi OTP:', error);
      throw new Error('Impossible d\'envoyer l\'email de vérification');
    }
  }
}
