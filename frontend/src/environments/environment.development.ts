import packageInfo from '../../package.json';
export const environDev = {
   appVersion: packageInfo.version,
    production: false,
    urlServer: 'http://localhost:4000',
    // Configuration EmailJS pour l'envoi des emails OTP
    emailjs: {
      publicKey: 'mDj8HNdOflD04Bg_G',
      serviceId: 'service_h5w5dnj',
      templateId: 'template_ic0aszk'
    }
};
