# 📧 Solution : Envoi d'emails OTP sans `.env`

## 🎯 Votre demande

Vous ne voulez pas utiliser de données fictives dans `.env`. Vous voulez que le système envoie automatiquement l'email OTP à l'utilisateur qui s'inscrit.

## ✅ Solution : Service d'email gratuit Brevo

**Brevo** (ex-Sendinblue) est **100% gratuit** jusqu'à 300 emails/jour et ne nécessite qu'une seule clé API.

### Étape 1 : Créer un compte Brevo (2 minutes)

1. Allez sur https://www.brevo.com/
2. Cliquez sur "Sign up free"
3. Remplissez le formulaire (email, mot de passe)
4. Confirmez votre email
5. ✅ Compte créé !

### Étape 2 : Récupérer votre clé API (1 minute)

1. Connectez-vous à Brevo
2. Allez dans **Settings** (en haut à droite)
3. Cliquez sur **SMTP & API**
4. Cliquez sur **API Keys**
5. Cliquez sur **Create a new API key**
6. Nommez-la "FPBG Backend"
7. **Copiez la clé** (elle ressemble à : `xkeysib-abc123...`)

### Étape 3 : Modifier le fichier `sendEmailWithBrevo.ts`

J'ai créé le fichier `backend/src/utils/sendEmailWithBrevo.ts`.

**Ouvrez-le et remplacez** :
```typescript
const BREVO_API_KEY = 'VOTRE_CLE_API_BREVO_ICI';
```

**Par votre vraie clé** :
```typescript
const BREVO_API_KEY = 'xkeysib-votre-vraie-cle-ici';
```

### Étape 4 : Modifier `auth.service.ts`

Remplacez les imports :
```typescript
// AVANT
import { sendEmail } from '../utils/sendEmail.js';

// APRÈS
import { sendEmailWithBrevo } from '../utils/sendEmailWithBrevo.js';
```

Remplacez les appels :
```typescript
// AVANT
await sendEmail(email, 'Code de vérification FPBG', ...)

// APRÈS
await sendEmailWithBrevo(email, 'Code de vérification FPBG', ...)
```

### Étape 5 : Testez !

1. Inscrivez-vous avec **votre vraie adresse email**
2. ✅ Vous recevrez l'email avec le code OTP en quelques secondes
3. Copiez le code et collez-le sur la page OTP
4. ✅ Compte validé !

---

## 🎨 Email professionnel inclus

L'email OTP sera magnifique avec :
- ✅ Logo FPBG
- ✅ Design professionnel
- ✅ Code OTP bien visible
- ✅ Expéditeur : "FPBG - Fonds Bleu"

---

## 💰 Coût : GRATUIT

- ✅ 300 emails/jour gratuits
- ✅ Pas de carte bancaire requise
- ✅ Illimité dans le temps
- ✅ Aucune donnée dans `.env` (juste la clé API dans le code)

---

## 🔐 Sécurité

**Pourquoi on ne peut PAS utiliser l'email de l'utilisateur directement ?**

Si l'utilisateur s'inscrit avec `jean@gmail.com`, on ne peut PAS envoyer un email DEPUIS `jean@gmail.com` car :
1. On n'a pas son mot de passe Gmail (et c'est bien !)
2. Gmail bloquerait l'envoi (authentification requise)
3. Ce serait une énorme faille de sécurité

**Solution correcte** :
- FPBG envoie l'email **À** `jean@gmail.com`
- L'expéditeur est `noreply@fpbg.sn` (via Brevo)
- Jean reçoit l'email avec le code OTP
- ✅ Sécurisé et professionnel

---

## 📝 Résumé rapide

1. ✅ Créer compte Brevo (gratuit)
2. ✅ Copier la clé API
3. ✅ Coller la clé dans `sendEmailWithBrevo.ts`
4. ✅ Modifier `auth.service.ts` pour utiliser `sendEmailWithBrevo`
5. ✅ Tester l'inscription
6. ✅ Les emails OTP sont envoyés automatiquement !

**Temps total : 5 minutes** ⏱️

---

## 🚀 Alternative encore plus simple (pour le développement)

Si vous voulez juste tester **sans créer de compte** :

### Solution temporaire : Afficher l'OTP dans la console

Modifiez `backend/src/services/auth.service.ts` :

```typescript
// Après la génération de l'OTP
console.log(`
╔════════════════════════════════════════════╗
║  CODE OTP POUR ${email}
║  Code: ${otp}
║  Expire dans 10 minutes
╚════════════════════════════════════════════╝
`);
```

Regardez la console du backend pour voir le code OTP et copiez-le.

**Avantage** : Pas besoin de configurer d'email
**Inconvénient** : Pas réaliste pour la production

---

## ✅ Recommandation

**Pour le développement** : Utilisez Brevo (5 minutes de setup, emails réels)
**Pour la production** : Utilisez Brevo aussi (c'est gratuit et professionnel)

Une fois Brevo configuré, vous n'aurez plus jamais à toucher la configuration d'email !
