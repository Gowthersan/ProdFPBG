# 🔐 GUIDE COMPLET DU SYSTÈME D'AUTHENTIFICATION FPBG

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Flux d'inscription](#flux-dinscription)
5. [Flux de connexion](#flux-de-connexion)
6. [API Endpoints](#api-endpoints)
7. [Tests avec Postman](#tests-avec-postman)
8. [Intégration Frontend Angular](#intégration-frontend-angular)
9. [Sécurité](#sécurité)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

Le système d'authentification FPBG est conçu avec les principes suivants :

- ✅ **Vérification obligatoire par OTP** : Aucun compte n'est créé sans validation email
- ✅ **Authentification sécurisée** : JWT avec cookies HTTP-only
- ✅ **Double entité** : Support des agents FPBG et des organisations
- ✅ **Login simplifié** : Email + mot de passe uniquement (pas de nom/prénom)
- ✅ **Email automatique** : Envoi d'OTP via Nodemailer (Gmail)

---

## 🏗️ Architecture

### Stack Technique

- **Backend** : Node.js + Express + TypeScript
- **Base de données** : PostgreSQL via Prisma ORM
- **Authentification** : JWT (jsonwebtoken) + bcryptjs
- **Email** : Nodemailer (Gmail)
- **Frontend** : Angular (à intégrer)

### Structure des fichiers

```
backend/
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts       # Gestion des requêtes HTTP
│   ├── services/
│   │   └── auth.service.ts          # Logique métier
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # Vérification JWT
│   │   └── error.middleware.ts      # Gestion des erreurs
│   ├── routes/
│   │   └── auth.routes.ts           # Définition des routes
│   ├── utils/
│   │   ├── mailer.service.ts        # Envoi d'emails
│   │   └── generateOtp.ts           # Génération OTP
│   └── config/
│       └── db.ts                    # Configuration Prisma
├── prisma/
│   └── schema.prisma                # Schéma de base de données
└── .env                             # Variables d'environnement
```

---

## ⚙️ Configuration

### 1. Variables d'environnement (.env)

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT Secret (changez cette valeur en production!)
JWT_SECRET="super_secret_key_change_me"

# Configuration Gmail
GMAIL_USER="votre.email@gmail.com"
GMAIL_APP_PASSWORD="votre_mot_de_passe_application"

# Configuration serveur
PORT=4000
NODE_ENV="development"
FRONT_URL="http://localhost:4200"
```

### 2. Générer un mot de passe d'application Gmail

1. Aller sur [Google Account Security](https://myaccount.google.com/security)
2. Activer la **validation en deux étapes**
3. Aller sur [App Passwords](https://myaccount.google.com/apppasswords)
4. Créer un nouveau mot de passe :
   - Sélectionner "Autre (nom personnalisé)"
   - Nommer : "FPBG Backend"
5. Copier le mot de passe (16 caractères) dans `.env` → `GMAIL_APP_PASSWORD`

### 3. Installer les dépendances

```bash
npm install
```

### 4. Démarrer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:4000`

---

## 📝 Flux d'inscription

L'inscription se fait en **2 étapes obligatoires** :

### Étape 1 : Envoi de l'OTP

1. L'utilisateur remplit le formulaire d'inscription
2. Le backend :
   - Vérifie que l'email n'existe pas déjà
   - Hash le mot de passe
   - Génère un OTP à 6 chiffres
   - Stocke temporairement les données (en mémoire)
   - Envoie l'OTP par email via Gmail
3. L'OTP expire après **5 minutes**

### Étape 2 : Vérification de l'OTP

1. L'utilisateur saisit le code OTP reçu par email
2. Le backend :
   - Vérifie que l'OTP est valide et non expiré
   - Crée définitivement le compte dans PostgreSQL
   - Génère un token JWT
   - Renvoie le token et les infos utilisateur

**⚠️ Important** : Le compte n'existe PAS dans la base tant que l'OTP n'est pas vérifié.

---

## 🔑 Flux de connexion

1. L'utilisateur saisit **email + mot de passe**
2. Le backend :
   - Cherche l'utilisateur dans `User` puis `Organisation`
   - Vérifie que le mot de passe est correct (bcrypt)
   - **Vérifie que le compte est vérifié** (`otp === null`)
   - Génère un token JWT valide 7 jours
   - Définit un cookie HTTP-only avec le token
3. L'utilisateur est authentifié et peut accéder aux routes protégées

**🚫 Blocage** : Si `otp !== null`, la connexion est refusée avec le message :
> "Votre compte n'est pas encore vérifié. Veuillez vérifier votre email."

---

## 🌐 API Endpoints

### Routes publiques (sans authentification)

#### 1. Inscription - Agent FPBG

```http
POST /api/auth/register/agent
Content-Type: application/json

{
  "email": "agent@fpbg.com",
  "username": "johndoe",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "numTel": "+221771234567",
  "userType": "agent"
}
```

**Réponse (200)** :
```json
{
  "message": "Un code de vérification a été envoyé à votre adresse email.",
  "email": "agent@fpbg.com"
}
```

---

#### 2. Inscription - Organisation

```http
POST /api/auth/register/organisation
Content-Type: application/json

{
  "email": "contact@ong-example.org",
  "password": "Password123!",
  "name": "ONG Environnement",
  "username": "ongenvironnement",
  "contact": "Directeur Général",
  "numTel": "+221771234567",
  "type": "ONG",
  "typeOrganisationId": "uuid-du-type-organisation"
}
```

**Réponse (200)** :
```json
{
  "message": "Un code de vérification a été envoyé à votre adresse email.",
  "email": "contact@ong-example.org"
}
```

---

#### 3. Vérification OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "agent@fpbg.com",
  "otp": "123456"
}
```

**Réponse (201)** :
```json
{
  "message": "Compte vérifié avec succès !",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "agent@fpbg.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "agent",
    "createdAt": "2025-01-13T10:00:00Z",
    "updatedAt": "2025-01-13T10:00:00Z"
  },
  "type": "user"
}
```

---

#### 4. Renvoyer un OTP

```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "agent@fpbg.com"
}
```

**Réponse (200)** :
```json
{
  "message": "Un nouveau code de vérification a été envoyé à votre adresse email.",
  "email": "agent@fpbg.com"
}
```

---

#### 5. Connexion

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "agent@fpbg.com",
  "password": "Password123!"
}
```

**Note** : `username` peut être un email ou un username.

**Réponse (200)** :
```json
{
  "message": "Connexion réussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "agent@fpbg.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "agent"
  },
  "type": "user"
}
```

**Erreur (403)** si compte non vérifié :
```json
{
  "error": "Votre compte n'est pas encore vérifié. Veuillez vérifier votre email."
}
```

---

### Routes protégées (authentification requise)

#### 6. Récupérer l'utilisateur connecté

```http
GET /api/auth/me
Authorization: Bearer <token>
Cookie: token=<token>
```

**Réponse (200)** :
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "agent@fpbg.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "agent"
  },
  "type": "user"
}
```

---

#### 7. Déconnexion

```http
POST /api/auth/logout
```

**Réponse (200)** :
```json
{
  "message": "Déconnexion réussie."
}
```

---

#### 8. Rafraîchir le token

```http
POST /api/auth/refresh-token
Authorization: Bearer <token>
```

**Réponse (200)** :
```json
{
  "message": "Token rafraîchi avec succès.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...},
  "type": "user"
}
```

---

## 🧪 Tests avec Postman

### Collection Postman

Créez une collection avec ces requêtes :

1. **Register Agent** → `POST /api/auth/register/agent`
2. **Register Organisation** → `POST /api/auth/register/organisation`
3. **Verify OTP** → `POST /api/auth/verify-otp`
4. **Resend OTP** → `POST /api/auth/resend-otp`
5. **Login** → `POST /api/auth/login`
6. **Get Me** → `GET /api/auth/me` (avec token)
7. **Logout** → `POST /api/auth/logout`
8. **Refresh Token** → `POST /api/auth/refresh-token`

### Exemple de test complet

1. **Inscription** :
   ```bash
   POST http://localhost:4000/api/auth/register/organisation
   Body: { "email": "test@example.com", "password": "Test123!", ... }
   ```

2. **Vérifier votre email Gmail** → Récupérer le code OTP (6 chiffres)

3. **Vérification OTP** :
   ```bash
   POST http://localhost:4000/api/auth/verify-otp
   Body: { "email": "test@example.com", "otp": "123456" }
   ```

4. **Connexion** :
   ```bash
   POST http://localhost:4000/api/auth/login
   Body: { "username": "test@example.com", "password": "Test123!" }
   ```

5. **Tester route protégée** :
   ```bash
   GET http://localhost:4000/api/auth/me
   Authorization: Bearer <token_reçu_au_login>
   ```

---

## 🎨 Intégration Frontend Angular

### Service d'authentification Angular

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:4000/api/auth';

  constructor(private http: HttpClient) {}

  // Inscription organisation
  registerOrganisation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/organisation`, data, {
      withCredentials: true
    });
  }

  // Vérification OTP
  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp }, {
      withCredentials: true
    });
  }

  // Renvoyer OTP
  resendOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-otp`, { email }, {
      withCredentials: true
    });
  }

  // Connexion
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }, {
      withCredentials: true
    });
  }

  // Récupérer utilisateur connecté
  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, {
      withCredentials: true
    });
  }

  // Déconnexion
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      withCredentials: true
    });
  }
}
```

### Composant d'inscription

```typescript
// registration.component.ts
export class RegistrationComponent {
  step = 1; // 1 = formulaire, 2 = OTP
  email = '';

  register() {
    this.authService.registerOrganisation(this.form.value).subscribe({
      next: (response) => {
        this.email = response.email;
        this.step = 2; // Passer à l'étape OTP
      },
      error: (error) => {
        console.error('Erreur inscription:', error);
      }
    });
  }

  verifyOtp(otp: string) {
    this.authService.verifyOtp(this.email, otp).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Erreur OTP:', error);
      }
    });
  }

  resendOtp() {
    this.authService.resendOtp(this.email).subscribe({
      next: () => {
        alert('Un nouveau code a été envoyé !');
      }
    });
  }
}
```

### Composant de connexion

```typescript
// login.component.ts
export class LoginComponent {
  loginForm = this.fb.group({
    username: ['', Validators.required], // Email ou username
    password: ['', Validators.required]
  });

  login() {
    const { username, password } = this.loginForm.value;
    this.authService.login(username!, password!).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        if (error.status === 403) {
          alert('Votre compte n\'est pas encore vérifié. Vérifiez votre email.');
        } else {
          alert('Identifiants incorrects.');
        }
      }
    });
  }
}
```

---

## 🔒 Sécurité

### Points de sécurité implémentés

- ✅ **Hashage des mots de passe** : bcrypt avec salt de 12 rounds
- ✅ **JWT sécurisés** : Signature avec secret fort, expiration 7 jours
- ✅ **HTTP-only cookies** : Protection contre XSS
- ✅ **Validation OTP** : Code 6 chiffres, expiration 5 minutes
- ✅ **Vérification email obligatoire** : Aucun compte sans OTP validé
- ✅ **Pas de données sensibles** : Mot de passe jamais renvoyé dans les réponses
- ✅ **CORS configuré** : Seulement les origines autorisées

### Recommandations production

- 🔴 Changer `JWT_SECRET` en production (au moins 32 caractères aléatoires)
- 🔴 Utiliser Redis pour stocker les OTP (pas en mémoire)
- 🔴 Activer HTTPS (pas HTTP)
- 🔴 Configurer `secure: true` pour les cookies en production
- 🔴 Ajouter rate limiting (ex: express-rate-limit)
- 🔴 Logger les tentatives de connexion échouées
- 🔴 Implémenter 2FA pour les admins

---

## 🛠️ Troubleshooting

### Problème : Email non reçu

**Causes possibles** :
- Mot de passe d'application Gmail incorrect
- Validation en deux étapes non activée sur Gmail
- Email dans les spams

**Solution** :
1. Vérifier `.env` → `GMAIL_USER` et `GMAIL_APP_PASSWORD`
2. Refaire la procédure de génération du mot de passe d'application
3. Vérifier les logs backend : `OTP pour email@example.com: 123456`

---

### Problème : "Token invalide ou expiré"

**Causes** :
- Token JWT expiré (> 7 jours)
- `JWT_SECRET` différent entre démarrage du serveur
- Cookie non envoyé (manque `withCredentials: true`)

**Solution** :
1. Se reconnecter pour obtenir un nouveau token
2. Vérifier que `withCredentials: true` est présent dans toutes les requêtes HTTP Angular
3. Utiliser `/api/auth/refresh-token` pour rafraîchir le token

---

### Problème : "Compte non vérifié"

**Message** : "Votre compte n'est pas encore vérifié."

**Cause** : L'OTP n'a pas été validé après l'inscription

**Solution** :
1. Demander un nouveau code via `/api/auth/resend-otp`
2. Vérifier l'email et saisir le code OTP dans `/api/auth/verify-otp`

---

### Problème : "Email ou username déjà utilisé"

**Cause** : Un compte existe déjà avec cet email/username

**Solution** :
1. Utiliser un autre email
2. Si c'est votre compte, utilisez `/api/auth/login` pour vous connecter
3. Si vous avez oublié votre mot de passe, implémenter la route de reset (à faire)

---

## 📊 Diagrammes de flux

### Flux d'inscription

```
┌────────────┐     POST /register    ┌────────────┐
│            │ ──────────────────────>│            │
│  Frontend  │                        │  Backend   │
│            │<───────────────────────│            │
└────────────┘   Response: {email}   └────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │  Nodemailer  │
                                     │  Send OTP    │
                                     └──────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │ Gmail → User │
                                     └──────────────┘

┌────────────┐   POST /verify-otp   ┌────────────┐
│            │ ──────────────────────>│            │
│  Frontend  │                        │  Backend   │
│            │<───────────────────────│            │
└────────────┘  Response: {token}    └────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │ Create user  │
                                     │ in Postgres  │
                                     └──────────────┘
```

### Flux de connexion

```
┌────────────┐     POST /login      ┌────────────┐
│            │ ──────────────────────>│            │
│  Frontend  │                        │  Backend   │
│            │                        │            │
│            │                        │ 1. Find user
│            │                        │ 2. Verify password
│            │                        │ 3. Check OTP is null
│            │                        │ 4. Generate JWT
│            │<───────────────────────│            │
└────────────┘  Response: {token}    └────────────┘
```

---

## 🎯 Checklist de déploiement

Avant de mettre en production :

- [ ] Variables d'environnement configurées
- [ ] `JWT_SECRET` changé (32+ caractères aléatoires)
- [ ] Compte Gmail configuré avec mot de passe d'application
- [ ] Base de données PostgreSQL accessible
- [ ] Migrations Prisma exécutées (`npx prisma migrate deploy`)
- [ ] CORS configuré avec les bonnes origines
- [ ] HTTPS activé
- [ ] Cookies en mode `secure: true`
- [ ] Rate limiting activé
- [ ] Logs de production configurés
- [ ] Tests end-to-end passés

---

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation JWT](https://jwt.io/introduction)
- [Nodemailer avec Gmail](https://nodemailer.com/usage/using-gmail/)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- [Express.js](https://expressjs.com/)

---

## 💬 Support

Pour toute question ou problème :
1. Vérifier cette documentation
2. Consulter les logs backend
3. Tester avec Postman avant d'intégrer au frontend

---

**🚀 Le système est maintenant prêt à l'emploi !**
