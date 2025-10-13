# 📧 Configuration de l'envoi d'emails (OTP)

## 🎯 Problème actuel

Les emails OTP ne sont pas envoyés car les identifiants Gmail dans le fichier `.env` sont des placeholders.

**Erreur actuelle** :
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

---

## ✅ Solution : Configurer un compte Gmail

### Étape 1 : Créer un mot de passe d'application Gmail

1. **Allez sur votre compte Google** : https://myaccount.google.com/
2. **Activez la validation en 2 étapes** (si ce n'est pas déjà fait)
   - Sécurité → Validation en deux étapes → Activer
3. **Créez un mot de passe d'application**
   - Sécurité → Validation en deux étapes → Mots de passe d'application
   - Choisissez "Autre (nom personnalisé)"
   - Nommez-le "FPBG Backend"
   - Copiez le mot de passe généré (16 caractères)

### Étape 2 : Modifier le fichier `.env`

Ouvrez `backend/.env` et modifiez ces lignes :

```env
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASS="xxxx xxxx xxxx xxxx"  # Le mot de passe d'application (16 caractères)
```

**Exemple** :
```env
EMAIL_USER="fpbg.noreply@gmail.com"
EMAIL_PASS="abcd efgh ijkl mnop"
```

### Étape 3 : Redémarrer le backend

Le backend redémarrera automatiquement avec `tsx watch` et utilisera les nouveaux identifiants.

---

## 🚀 Alternative : Service d'email professionnel

Si vous préférez utiliser un autre service d'email :

### Brevo (ex-Sendinblue) - GRATUIT jusqu'à 300 emails/jour

1. Créez un compte sur https://www.brevo.com/
2. Allez dans "SMTP & API" → "SMTP"
3. Copiez les identifiants

**Modifier `backend/src/utils/sendEmail.ts`** :
```typescript
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

**Modifier `backend/.env`** :
```env
EMAIL_USER="votre-email-brevo@exemple.com"
EMAIL_PASS="votre-cle-api-brevo"
```

### Mailtrap - Pour les tests en développement

Idéal pour tester sans envoyer de vrais emails.

1. Créez un compte sur https://mailtrap.io/
2. Créez une inbox
3. Copiez les identifiants SMTP

**Modifier `backend/src/utils/sendEmail.ts`** :
```typescript
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

**Modifier `backend/.env`** :
```env
EMAIL_USER="votre-username-mailtrap"
EMAIL_PASS="votre-password-mailtrap"
```

---

## 🧪 Tester l'envoi d'email

Une fois configuré, inscrivez-vous depuis le frontend :

1. Allez sur `http://localhost:VOTRE_PORT/register`
2. Remplissez le formulaire avec **votre vraie adresse email**
3. Soumettez
4. ✅ Vous devriez recevoir un email avec le code OTP à 6 chiffres

**Vérifiez les logs du backend** :
- Si l'email est envoyé : pas d'erreur dans la console
- Si erreur : le message d'erreur s'affichera dans la console

---

## 🔐 Sécurité

⚠️ **IMPORTANT** :
- Ne commitez JAMAIS le fichier `.env` dans Git
- Le fichier `.gitignore` doit contenir `.env`
- Utilisez des mots de passe d'application Gmail (pas votre mot de passe principal)
- En production, utilisez des variables d'environnement sécurisées

---

## 🐛 Dépannage

### Erreur "Invalid login"
- Vérifiez que vous utilisez un mot de passe d'application Gmail (pas votre mot de passe normal)
- Vérifiez que la validation en 2 étapes est activée

### Erreur "ECONNREFUSED"
- Vérifiez votre connexion internet
- Vérifiez que le port 587 n'est pas bloqué par un firewall

### L'email n'arrive pas
- Vérifiez le dossier spam
- Vérifiez que l'adresse email est correcte
- Vérifiez les logs du backend pour voir si l'email a été envoyé

### Logs du backend
Les logs montreront :
```
✅ Email envoyé à: user@exemple.com
```
Ou en cas d'erreur :
```
❌ Erreur lors de l'envoi de l'email: [détails de l'erreur]
```

---

## 📝 Configuration recommandée pour la production

Pour la production, utilisez un service d'email professionnel comme :
- **SendGrid** (100 emails/jour gratuits)
- **Brevo** (300 emails/jour gratuits)
- **Amazon SES** (très bon marché)
- **Mailgun** (fiable et scalable)

**Avantages** :
- Meilleure délivrabilité
- Statistiques d'envoi
- Gestion des bounces
- Templates d'emails
- Pas de limite Gmail

---

## ✅ Checklist

- [ ] Compte Gmail créé ou existant
- [ ] Validation en 2 étapes activée
- [ ] Mot de passe d'application créé
- [ ] Fichier `.env` mis à jour avec les vrais identifiants
- [ ] Backend redémarré
- [ ] Test d'inscription effectué
- [ ] Email OTP reçu

Une fois tout cela fait, les emails OTP seront envoyés automatiquement à chaque inscription ! 🎉
