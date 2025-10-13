# 🚀 Guide de déploiement FPBG Backend

Ce guide vous accompagne pas à pas pour déployer le backend FPBG en production.

## 📋 Prérequis

- Serveur avec Node.js >= 18.x
- PostgreSQL >= 14.x (local ou cloud comme Neon, Supabase, Railway)
- Nom de domaine (optionnel mais recommandé)
- Certificat SSL (Let's Encrypt recommandé)

---

## 🔧 Options de déploiement

### Option 1: Déploiement sur VPS (DigitalOcean, AWS EC2, etc.)

#### Étape 1: Préparer le serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Installer PM2 (gestionnaire de processus)
sudo npm install -g pm2
```

#### Étape 2: Configurer PostgreSQL

```bash
# Créer un utilisateur et une base de données
sudo -u postgres psql

CREATE DATABASE fpbg_db;
CREATE USER fpbg_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE fpbg_db TO fpbg_user;
\q
```

#### Étape 3: Cloner et configurer le projet

```bash
# Cloner le dépôt
git clone <votre-repo-url> /var/www/fpbg-backend
cd /var/www/fpbg-backend/backend

# Installer les dépendances
npm install --production

# Créer le fichier .env
nano .env
```

**Contenu du .env :**
```env
DATABASE_URL="postgresql://fpbg_user:votre_mot_de_passe_securise@localhost:5432/fpbg_db?schema=public"
JWT_SECRET="generer_un_secret_ultra_securise_ici"
EMAIL_USER="votre-email-production@gmail.com"
EMAIL_PASS="mot_de_passe_app_gmail"
FRONT_URL="https://votre-domaine-frontend.com"
PORT=4000
NODE_ENV="production"
```

#### Étape 4: Générer le secret JWT

```bash
# Générer un secret aléatoire
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiez le résultat dans `JWT_SECRET`.

#### Étape 5: Appliquer les migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

#### Étape 6: Builder le projet

```bash
npm run build
```

#### Étape 7: Démarrer avec PM2

```bash
# Démarrer l'application
pm2 start dist/server.js --name fpbg-backend

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
```

#### Étape 8: Configurer Nginx (reverse proxy)

```bash
sudo apt install -y nginx

# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/fpbg-backend
```

**Contenu du fichier :**
```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/fpbg-backend /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

#### Étape 9: Configurer SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d api.votre-domaine.com

# Renouvellement automatique (ajouté automatiquement par Certbot)
```

---

### Option 2: Déploiement sur Heroku

#### Étape 1: Installer Heroku CLI

```bash
npm install -g heroku
heroku login
```

#### Étape 2: Créer une application Heroku

```bash
cd backend
heroku create fpbg-backend
```

#### Étape 3: Ajouter PostgreSQL

```bash
heroku addons:create heroku-postgresql:mini
```

#### Étape 4: Configurer les variables d'environnement

```bash
heroku config:set JWT_SECRET="votre_secret"
heroku config:set EMAIL_USER="votre-email@gmail.com"
heroku config:set EMAIL_PASS="mot_de_passe_app"
heroku config:set FRONT_URL="https://votre-frontend.com"
heroku config:set NODE_ENV="production"
```

#### Étape 5: Créer un Procfile

```bash
echo "web: npm start" > Procfile
```

#### Étape 6: Déployer

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### Étape 7: Appliquer les migrations

```bash
heroku run npx prisma migrate deploy
```

---

### Option 3: Déploiement sur Railway

#### Étape 1: Créer un compte Railway

Allez sur [railway.app](https://railway.app) et créez un compte.

#### Étape 2: Créer un nouveau projet

1. Cliquez sur "New Project"
2. Sélectionnez "Deploy from GitHub repo"
3. Choisissez votre dépôt

#### Étape 3: Ajouter PostgreSQL

1. Cliquez sur "New" → "Database" → "Add PostgreSQL"
2. Railway génère automatiquement le `DATABASE_URL`

#### Étape 4: Configurer les variables d'environnement

Dans les paramètres du projet, ajoutez :
```
JWT_SECRET=votre_secret
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=mot_de_passe_app
FRONT_URL=https://votre-frontend.com
NODE_ENV=production
```

#### Étape 5: Déployer

Railway déploie automatiquement à chaque push sur GitHub.

---

### Option 4: Déploiement sur Render

#### Étape 1: Créer un compte Render

Allez sur [render.com](https://render.com) et créez un compte.

#### Étape 2: Créer un nouveau Web Service

1. Cliquez sur "New +" → "Web Service"
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Name:** fpbg-backend
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

#### Étape 3: Ajouter PostgreSQL

1. Cliquez sur "New +" → "PostgreSQL"
2. Créez la base de données
3. Copiez le `DATABASE_URL`

#### Étape 4: Configurer les variables d'environnement

Dans les paramètres du service, ajoutez les variables.

---

## 🗄️ Options de base de données cloud

### Neon (Recommandé)

1. Créez un compte sur [neon.tech](https://neon.tech)
2. Créez un nouveau projet
3. Copiez la `DATABASE_URL`
4. Support Postgres complet, gratuit jusqu'à 0.5 GB

### Supabase

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Copiez la `DATABASE_URL` depuis les settings

### Railway

1. Ajoutez PostgreSQL depuis le dashboard Railway
2. La `DATABASE_URL` est générée automatiquement

---

## 🔒 Checklist de sécurité

- [ ] `JWT_SECRET` unique et sécurisé (min 32 caractères)
- [ ] `NODE_ENV=production`
- [ ] Mot de passe de base de données sécurisé
- [ ] SSL/HTTPS activé
- [ ] CORS configuré pour n'autoriser que votre frontend
- [ ] Rate limiting activé (optionnel, voir section suivante)
- [ ] Logs de production configurés
- [ ] Backup de la base de données programmé

---

## 🛡️ Rate Limiting (optionnel mais recommandé)

Pour éviter les abus, ajoutez un rate limiter :

```bash
npm install express-rate-limit
```

**Fichier : `src/server.ts`**

```typescript
import rateLimit from 'express-rate-limit';

// Limiter les requêtes API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});

app.use('/api/', limiter);
```

---

## 📊 Monitoring

### Option 1: PM2 Monitoring (VPS)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Voir les logs
pm2 logs fpbg-backend
```

### Option 2: Heroku Logs

```bash
heroku logs --tail
```

### Option 3: Sentry (recommandé pour tous)

1. Créez un compte sur [sentry.io](https://sentry.io)
2. Installez le SDK :
```bash
npm install @sentry/node
```

3. Configurez dans `src/server.ts` :
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Middleware Sentry (après les routes)
app.use(Sentry.Handlers.errorHandler());
```

---

## 🔄 Mise à jour de l'application

### Sur VPS

```bash
cd /var/www/fpbg-backend/backend
git pull origin main
npm install --production
npm run build
pm2 restart fpbg-backend
```

### Sur Heroku

```bash
git push heroku main
```

### Sur Railway/Render

Push sur GitHub, le déploiement est automatique.

---

## 🧪 Tests en production

```bash
# Health check
curl https://api.votre-domaine.com/health

# Test d'inscription
curl -X POST https://api.votre-domaine.com/api/registeragentfpbg \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'
```

---

## 📞 Support

En cas de problème, consultez les logs :

**VPS :**
```bash
pm2 logs fpbg-backend --lines 100
```

**Heroku :**
```bash
heroku logs --tail
```

**Railway/Render :**
Consultez les logs dans le dashboard web.

---

## 🎉 C'est terminé !

Votre backend FPBG est maintenant déployé en production et prêt à être utilisé par votre frontend Angular.

N'oubliez pas de mettre à jour la variable `urlServer` dans votre frontend :

```typescript
export const environment = {
  production: true,
  urlServer: 'https://api.votre-domaine.com'
};
```
