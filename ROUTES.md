# 📍 Routes de l'application FPBG

## 🌐 Routes Frontend (http://localhost:4200)

### Routes Publiques

| Route | Description | Composant |
|-------|-------------|-----------|
| `/` | Page d'accueil (Landing page) | Home |
| `/login` | Connexion utilisateur/organisation | Login |
| `/register` | Inscription organisation | Registration |
| `/otp` | Vérification code OTP | Otp |
| `/page404` | Page non trouvée | Page404 |
| `/appelaprojet` | Détail d'un appel à projet | Appelaprojet |
| `/liste-appels` | Liste des appels à projets | ListeAppels |

### Routes User (Organisation)

| Route | Description | Composant |
|-------|-------------|-----------|
| `/dashboard` | Tableau de bord organisation | Dashboard |
| `/submission-wizard` | Formulaire de soumission projet | SubmissionWizard |
| `/form/recap/:id` | Récapitulatif d'un projet | SubmissionRecap |
| `/user/recap/:id` | Récapitulatif projet (user) | SubmissionRecap |

### Routes Admin

| Route | Description | Composant |
|-------|-------------|-----------|
| `/admin` | Connexion admin | Login (admin) |
| `/admin/dashboard` | Tableau de bord admin | Dashboard (admin) |
| `/admin/recap/:id` | Récapitulatif projet (admin) | SubmissionRecap |

---

## 🔌 Routes API Backend (http://localhost:4000)

### Authentification (`/api`)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/registeragentfpbg` | Inscription agent FPBG | Non |
| POST | `/api/registerOrganisation` | Inscription organisation | Non |
| POST | `/api/login` | Connexion | Non |
| GET | `/api/otpverifcation/:otp` | Vérification OTP | Non |
| GET | `/api/authenticate` | Vérifier authentification | Oui |
| GET | `/api/disconnected` | Déconnexion | Non |
| POST | `/api/refresh-token` | Rafraîchir token | Oui |

### Appels à Projets (`/api/aap`)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/aap` | Liste des AAPs | Non |
| GET | `/api/aap/:id` | Détail AAP par ID | Non |
| GET | `/api/aap/code/:code` | Détail AAP par code | Non |
| POST | `/api/aap` | Créer un AAP | Admin |
| PUT | `/api/aap/:id` | Modifier un AAP | Admin |
| PATCH | `/api/aap/:id/toggle` | Activer/Désactiver AAP | Admin |
| DELETE | `/api/aap/:id` | Supprimer un AAP | Admin |
| GET | `/api/aap/types/organisations` | Types d'organisations | Non |
| POST | `/api/aap/types/organisations` | Créer type organisation | Admin |

### Projets (`/api/aprojet-v1`)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/aprojet-v1/createProjet` | Créer un projet | Org |
| GET | `/api/aprojet-v1` | Liste paginée projets | Admin |
| GET | `/api/aprojet-v1/all` | Tous les projets | Admin |
| GET | `/api/aprojet-v1/:id` | Détail projet par ID | Auth |
| GET | `/api/aprojet-v1/user` | Projet de l'utilisateur connecté | Org |
| PUT | `/api/aprojet-v1/:id` | Modifier projet | Org/Admin |
| PATCH | `/api/aprojet-v1/:id` | Modification partielle | Org/Admin |
| DELETE | `/api/aprojet-v1/:id` | Supprimer projet | Org/Admin |

### Organisations (`/api/organisations`)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/organisations/organismeconnected` | Organisation connectée | Org |
| GET | `/api/organisations` | Toutes les organisations | Admin |
| GET | `/api/organisations/:id` | Détail organisation | Admin |
| PUT | `/api/organisations/:id` | Modifier organisation | Org/Admin |
| DELETE | `/api/organisations/:id` | Supprimer organisation | Admin |

### Health Check

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/health` | Vérifier le serveur | Non |

---

## 🔐 Types d'authentification

- **Non** : Accessible sans authentification
- **Auth** : Nécessite un token JWT valide
- **Org** : Réservé aux organisations connectées
- **Admin** : Réservé aux administrateurs FPBG

---

## 📝 Exemples d'utilisation

### Frontend

```typescript
// Inscription
window.location.href = '/register';

// Connexion
window.location.href = '/login';

// Soumettre un projet
window.location.href = '/submission-wizard';

// Voir les appels à projets
window.location.href = '/liste-appels';
```

### API (cURL)

```bash
# Inscription
curl -X POST http://localhost:4000/api/registerOrganisation \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Mon Org"}'

# Connexion
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@test.com","password":"Test1234"}' \
  -c cookies.txt

# Créer un projet
curl -X POST http://localhost:4000/api/aprojet-v1/createProjet \
  -b cookies.txt \
  -F "title=Mon Projet" \
  -F "objP=Objectif"

# Voir tous les AAPs
curl http://localhost:4000/api/aap
```

---

## 🎯 Routes pour vos tests

**Inscription** : http://localhost:4200/register
**Connexion** : http://localhost:4200/login
**Dashboard Org** : http://localhost:4200/dashboard
**Soumettre Projet** : http://localhost:4200/submission-wizard
**Liste AAPs** : http://localhost:4200/liste-appels
**Admin Dashboard** : http://localhost:4200/admin/dashboard

**Prisma Studio** : http://localhost:5555
**Backend Health** : http://localhost:4000/health
