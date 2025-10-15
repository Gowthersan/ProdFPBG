# 🌊 FPBG - Fonds de Préservation de la Biodiversité au Gabon

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Angular](https://img.shields.io/badge/Angular-20.3-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Plateforme web de gestion des appels à projets pour la conservation marine et littorale au Gabon. Ce système permet aux organisations locales de soumettre leurs projets, de suivre leur progression et d'accéder aux ressources de financement pour la préservation de la biodiversité.

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Développement](#-développement)
- [Structure du projet](#-structure-du-projet)
- [API & Backend](#-api--backend)
- [Déploiement](#-déploiement)
- [Tests](#-tests)
- [Contribution](#-contribution)
- [Licence](#-licence)

## 🎯 Vue d'ensemble

Le FPBG (Fonds de Préservation de la Biodiversité au Gabon) est une organisation internationale à but non lucratif dédiée à la conservation marine et littorale. Cette plateforme digitale facilite :

- **Gestion des appels à projets** : Publication et suivi des appels à projets de conservation
- **Soumission de projets** : Interface intuitive pour soumettre des propositions de projets
- **Évaluation et suivi** : Workflow complet d'évaluation et de validation des projets
- **Communication** : Support WhatsApp chatbot et formulaires de contact
- **Reporting** : Tableaux de bord pour les administrateurs et porteurs de projets

### 🎨 Captures d'écran

La plateforme propose un design moderne avec :

- Page d'accueil attractive avec hero section
- Processus de soumission en 4 étapes
- Section partenaires (FPBG & Obligations Bleues)
- Promotion de l'application mobile (en développement)
- FAQ avec support WhatsApp
- Tableaux de bord administrateurs et utilisateurs

## ✨ Fonctionnalités

### 🌐 Espace Public

- **Page d'accueil** : Présentation du programme, statistiques, appels actifs
- **Liste des appels à projets** : Consultation des opportunités de financement
- **Détails des appels** : Critères d'éligibilité, montants, dates limites
- **FAQ & Support** : Chatbot WhatsApp pour réponses instantanées
- **Promotion app mobile** : Présentation des fonctionnalités de l'application mobile à venir

### 👤 Espace Utilisateur

- **Authentification sécurisée** : Inscription, connexion, OTP par email
- **Dashboard personnalisé** : Vue d'ensemble des projets soumis
- **Formulaire de soumission** : Wizard multi-étapes pour soumettre un projet
  - Étape 1 : Informations de l'organisation
  - Étape 2 : Description du projet
  - Étape 3 : Budget et calendrier
  - Étape 4 : Documents justificatifs
- **Suivi de projets** : Statut en temps réel (brouillon, soumis, en évaluation, approuvé, rejeté)
- **Notifications** : Alertes sur les changements de statut
- **Profil** : Gestion des informations personnelles

### 🔐 Espace Administrateur

- **Dashboard admin** : Statistiques globales, projets en attente
- **Gestion des appels** : Création, modification, publication d'appels à projets
- **Évaluation de projets** : Système de notation et commentaires
- **Gestion des utilisateurs** : CRUD complet, activation/désactivation de comptes
- **Exports & Rapports** : Génération de rapports CSV/PDF
- **Modération** : Validation des soumissions

## 🏗️ Architecture

### Frontend (Angular)

```
┌─────────────────────────────────────────┐
│           Angular Frontend              │
│  ┌──────────────────────────────────┐   │
│  │  Components                       │   │
│  │  - User (Dashboard, Forms)        │   │
│  │  - Admin (Dashboard, Recap)       │   │
│  │  - Public (Home, Liste appels)    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Services                         │   │
│  │  - AuthService                    │   │
│  │  - ProjetService                  │   │
│  │  - OrganismeService               │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Guards & Interceptors            │   │
│  │  - AuthGuard, AdminGuard          │   │
│  │  - Cookie Interceptor             │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
           ↕️ HTTP REST API
┌─────────────────────────────────────────┐
│        Backend TypeScript API           │
│  (En cours de développement)            │
└─────────────────────────────────────────┘
```

### Architecture des composants

- **Composants publics** : Accessibles sans authentification
- **Composants utilisateur** : Protégés par `AuthGuard`
- **Composants admin** : Protégés par `AdminGuard`
- **Services partagés** : Communication avec l'API backend
- **Models** : DTOs TypeScript pour le typage fort

## 🛠️ Technologies

### Frontend

| Technologie          | Version | Usage                       |
| -------------------- | ------- | --------------------------- |
| **Angular**          | 20.3    | Framework principal         |
| **TypeScript**       | 5.9     | Langage de développement    |
| **Tailwind CSS**     | 3.4     | Framework CSS utility-first |
| **Angular Material** | 20.2    | Composants UI               |
| **RxJS**             | 7.8     | Gestion de la réactivité    |
| **SweetAlert2**      | 11.24   | Notifications et modales    |
| **Angular CDK**      | 20.2    | Utilities Angular           |

### Backend (En développement)

| Technologie               | Usage prévu               |
| ------------------------- | ------------------------- |
| **Node.js + TypeScript**  | Runtime & langage backend |
| **Express**               | Framework web             |
| **PostgreSQL / MongoDB**  | Base de données           |
| **Prisma / TypeORM**      | ORM                       |
| **JWT**                   | Authentification          |
| **Nodemailer**            | Envoi d'emails (OTP)      |
| **WhatsApp Business API** | Chatbot support           |

### DevOps & Outils

- **Git** : Contrôle de version
- **NPM** : Gestionnaire de paquets
- **Angular CLI** : Outils de développement
- **Prettier** : Formatage du code
- **Karma & Jasmine** : Tests unitaires

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** : v18.x ou supérieur
- **NPM** : v9.x ou supérieur
- **Angular CLI** : v20.x
- **Git** : Dernière version

Vérifiez vos versions :

```bash
node --version
npm --version
ng version
git --version
```

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/votre-org/fpbg.git
cd fpbg/front-fpbg
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Créez un fichier `src/environments/environment.development.ts` :

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  whatsappNumber: '+241XXXXXXXXX',
  enableDebugMode: true,
};
```

Pour la production, créez `src/environments/environment.ts` :

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.fpbg.org/api',
  whatsappNumber: '+241XXXXXXXXX',
  enableDebugMode: false,
};
```

## ⚙️ Configuration

### Tailwind CSS

Le projet utilise Tailwind CSS. Configuration dans `tailwind.config.js` :

```javascript
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'fpbg-green': '#16a34a',
        'fpbg-blue': '#0284c7',
      },
    },
  },
  plugins: [],
};
```

### Angular Material

Configuration du thème dans `src/styles.scss` :

```scss
@use '@angular/material' as mat;
@include mat.core();

$fpbg-primary: mat.define-palette(mat.$green-palette);
$fpbg-accent: mat.define-palette(mat.$blue-palette);
$fpbg-theme: mat.define-light-theme(
  (
    color: (
      primary: $fpbg-primary,
      accent: $fpbg-accent,
    ),
  )
);

@include mat.all-component-themes($fpbg-theme);
```

## 💻 Développement

### Démarrer le serveur de développement

```bash
npm start
# ou
ng serve
```

L'application sera accessible sur `http://localhost:4200/`

### Mode watch (recompilation automatique)

```bash
npm run watch
```

### Générer un nouveau composant

```bash
ng generate component components/nom-composant
# ou raccourci
ng g c components/nom-composant
```

### Générer un service

```bash
ng generate service services/nom-service
# ou raccourci
ng g s services/nom-service
```

### Commandes utiles

```bash
# Générer un module
ng g module modules/nom-module

# Générer un guard
ng g guard guards/nom-guard

# Générer un interceptor
ng g interceptor interceptors/nom-interceptor

# Générer un pipe
ng g pipe pipes/nom-pipe

# Générer une directive
ng g directive directives/nom-directive
```

## 📁 Structure du projet

```
front-fpbg/
├── src/
│   ├── app/
│   │   ├── admin/                    # Modules administrateur
│   │   │   ├── dashboard/            # Dashboard admin
│   │   │   ├── login/                # Connexion admin
│   │   │   └── recap/                # Récapitulatif projets
│   │   ├── user/                     # Modules utilisateur
│   │   │   ├── api/                  # Services API utilisateur
│   │   │   ├── core/                 # Services core (auth, guards)
│   │   │   ├── dashboard/            # Dashboard utilisateur
│   │   │   ├── form/                 # Formulaires de soumission
│   │   │   │   ├── soumission/  # Wizard multi-étapes
│   │   │   │   └── recap/            # Récap avant soumission
│   │   │   ├── home/                 # Page d'accueil
│   │   │   ├── login/                # Connexion
│   │   │   ├── registration/         # Inscription
│   │   │   ├── otp/                  # Validation OTP
│   │   │   └── ui/                   # Composants UI
│   │   ├── services/                 # Services partagés
│   │   │   ├── auth/                 # Service d'authentification
│   │   │   ├── organisme/            # Service organismes
│   │   │   └── interceptors/         # HTTP interceptors
│   │   ├── model/                    # Modèles TypeScript (DTOs)
│   │   │   ├── fpbgusersdto.ts
│   │   │   ├── organisationdto.ts
│   │   │   ├── projetFormdto.ts
│   │   │   └── loginvm.ts
│   │   ├── core/                     # Core modules (guards globaux)
│   │   ├── liste-appels/             # Liste des appels publics
│   │   ├── appelaprojet/             # Détails d'un appel
│   │   ├── page404/                  # Page 404
│   │   ├── app.routes.ts             # Configuration des routes
│   │   ├── app.config.ts             # Configuration Angular
│   │   └── app.ts                    # Composant principal
│   ├── assets/                       # Ressources statiques
│   │   ├── logo.png                  # Logo FPBG
│   │   ├── hero.png                  # Image hero
│   │   ├── obligations-bleues-logo.png
│   │   └── whatsapp.png              # Logo WhatsApp
│   ├── environments/                 # Variables d'environnement
│   ├── styles.scss                   # Styles globaux
│   └── index.html                    # Point d'entrée HTML
├── angular.json                      # Configuration Angular
├── package.json                      # Dépendances NPM
├── tailwind.config.js                # Configuration Tailwind
├── tsconfig.json                     # Configuration TypeScript
└── README.md                         # Ce fichier
```

### Détail des modules clés

#### 🏠 Module Home (`user/home/`)

- Page d'accueil publique
- Hero section avec appel à l'action
- Statistiques (200M budget, 1ère édition 2025, 4 étapes)
- Processus de soumission en 4 étapes
- Section partenaires (FPBG & Obligations Bleues)
- Promotion application mobile
- FAQ avec support WhatsApp chatbot
- Formulaire de contact

#### 📝 Module Form (`user/form/`)

- **Submission Wizard** : Formulaire multi-étapes
  - Étape 1 : Informations organisation
  - Étape 2 : Description projet
  - Étape 3 : Budget et planning
  - Étape 4 : Documents justificatifs
- **Recap** : Récapitulatif avant validation
- Sauvegarde automatique (brouillon)
- Validation progressive

#### 🔐 Module Auth (`user/core/`)

- **AuthService** : Gestion de l'authentification
- **AuthGuard** : Protection des routes utilisateur
- **UserAuthGuard** : Protection spécifique utilisateurs
- **RedirectIfLoggedInGuard** : Redirection si déjà connecté
- Gestion des tokens JWT
- Système OTP par email

#### 🛡️ Module Admin (`admin/`)

- **Dashboard** : Vue d'ensemble administrative
- **Recap** : Liste et évaluation des projets
- Gestion des appels à projets
- Statistiques et exports

## 🔌 API & Backend

### Architecture API (En développement)

Le backend TypeScript sera structuré comme suit :

```typescript
// Structure prévue du backend
backend/
├── src/
│   ├── controllers/          // Contrôleurs API
│   │   ├── auth.controller.ts
│   │   ├── projet.controller.ts
│   │   └── organisme.controller.ts
│   ├── services/             // Logique métier
│   │   ├── auth.service.ts
│   │   ├── projet.service.ts
│   │   ├── email.service.ts
│   │   └── whatsapp.service.ts
│   ├── models/               // Modèles de données
│   │   ├── user.model.ts
│   │   ├── projet.model.ts
│   │   └── organisme.model.ts
│   ├── middleware/           // Middlewares
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/               // Définition des routes
│   │   ├── auth.routes.ts
│   │   ├── projet.routes.ts
│   │   └── admin.routes.ts
│   ├── config/               // Configuration
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   └── app.ts                // Point d'entrée
├── package.json
└── tsconfig.json
```

### Endpoints API prévus

#### Authentification

```typescript
POST / api / auth / register; // Inscription utilisateur
POST / api / auth / login; // Connexion
POST / api / auth / verify - otp; // Validation OTP
POST / api / auth / refresh - token; // Rafraîchir token
POST / api / auth / logout; // Déconnexion
GET / api / auth / profile; // Profil utilisateur
```

#### Projets

```typescript
GET    /api/projets              // Liste projets (filtrés par user)
POST   /api/projets              // Créer un projet
GET    /api/projets/:id          // Détails projet
PUT    /api/projets/:id          // Modifier projet
DELETE /api/projets/:id          // Supprimer projet (brouillon)
POST   /api/projets/:id/submit   // Soumettre projet
GET    /api/projets/:id/status   // Statut projet
```

#### Appels à projets

```typescript
GET    /api/appels               // Liste appels publics
GET    /api/appels/:id           // Détails appel
POST   /api/admin/appels         // Créer appel (admin)
PUT    /api/admin/appels/:id     // Modifier appel (admin)
DELETE /api/admin/appels/:id     // Supprimer appel (admin)
```

#### Administration

```typescript
GET    /api/admin/dashboard      // Statistiques admin
GET    /api/admin/projets        // Tous les projets
PUT    /api/admin/projets/:id    // Évaluer projet
GET    /api/admin/users          // Liste utilisateurs
PUT    /api/admin/users/:id      // Gérer utilisateur
```

### Modèles de données TypeScript

#### User Model

```typescript
interface FpbgUsersDto {
  id?: number;
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  organisation?: OrganisationDto;
}
```

#### Organisation Model

```typescript
interface OrganisationDto {
  id?: number;
  nom: string;
  type: TypeOrganisation;
  sigle?: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb?: string;
  description?: string;
  dateCreation?: Date;
  numeroRegistre?: string;
  userId?: number;
}

enum TypeOrganisation {
  ONG = 'ONG',
  ASSOCIATION = 'ASSOCIATION',
  COOPERATIVE = 'COOPERATIVE',
  ENTREPRISE = 'ENTREPRISE',
  INSTITUTION_PUBLIQUE = 'INSTITUTION_PUBLIQUE',
}
```

#### Projet Model

```typescript
interface ProjetFormDto {
  id?: number;
  titre: string;
  description: string;
  objectifs: string;
  zone_intervention: string;
  duree_mois: number;
  budget_total: number;
  montant_demande: number;
  date_debut_prevue: Date;
  beneficiaires_directs: number;
  beneficiaires_indirects: number;
  impact_environnemental: string;
  statut: StatutProjet;
  appelProjetId: number;
  organisationId: number;
  documents?: Document[];
  createdAt?: Date;
  updatedAt?: Date;
}

enum StatutProjet {
  BROUILLON = 'BROUILLON',
  SOUMIS = 'SOUMIS',
  EN_EVALUATION = 'EN_EVALUATION',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
}
```

### Connexion Frontend-Backend

Le frontend communique avec le backend via HTTP :

```typescript
// services/aprojetv1.ts
@Injectable({
  providedIn: 'root',
})
export class AprojetV1Service {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer tous les projets de l'utilisateur
  getMyProjets(): Observable<ProjetFormDto[]> {
    return this.http.get<ProjetFormDto[]>(`${this.apiUrl}/projets`);
  }

  // Créer un nouveau projet
  createProjet(projet: ProjetFormDto): Observable<ProjetFormDto> {
    return this.http.post<ProjetFormDto>(`${this.apiUrl}/projets`, projet);
  }

  // Soumettre un projet
  submitProjet(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/projets/${id}/submit`, {});
  }
}
```

### Sécurité

- **JWT Authentication** : Tokens stockés dans cookies httpOnly
- **CORS** : Configuration stricte des origines autorisées
- **Rate Limiting** : Protection contre les abus
- **Validation** : Validation des inputs côté backend
- **Sanitization** : Nettoyage des données utilisateur
- **HTTPS** : Encryption en production

## 🌐 Déploiement

### Build de production

```bash
npm run build
# ou
ng build --configuration production
```

Les fichiers de build seront générés dans `dist/front-fpbg/browser/`

### Déploiement sur différentes plateformes

#### Vercel

```bash
npm install -g vercel
vercel
```

#### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist/front-fpbg/browser
```

#### AWS S3 + CloudFront

```bash
# Build
ng build --configuration production

# Upload vers S3
aws s3 sync dist/front-fpbg/browser/ s3://your-bucket-name

# Invalider CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### Docker

Créez un `Dockerfile` :

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/front-fpbg/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build et run :

```bash
docker build -t fpbg-frontend .
docker run -p 80:80 fpbg-frontend
```

### Variables d'environnement en production

Assurez-vous de configurer :

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.fpbg.org/api',
  whatsappNumber: '+241XXXXXXXXX',
  enableDebugMode: false,
  googleAnalyticsId: 'UA-XXXXXXXXX-X',
};
```

## 🧪 Tests

### Tests unitaires

```bash
npm test
# ou
ng test
```

### Tests avec couverture

```bash
ng test --code-couvertureGeographique
```

Rapport de couverture généré dans `couvertureGeographique/`

### Tests E2E

```bash
npm run e2e
```

### Exemple de test unitaire

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', (done) => {
    service.login('user@example.com', 'password').subscribe((response) => {
      expect(response.token).toBeDefined();
      done();
    });
  });
});
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

### 1. Fork le projet

```bash
git clone https://github.com/votre-username/fpbg.git
cd fpbg
```

### 2. Créer une branche

```bash
git checkout -b feature/ma-nouvelle-fonctionnalite
```

### 3. Faire vos modifications

Assurez-vous de suivre les conventions de code :

- Utilisez Prettier pour le formatage
- Respectez les guidelines Angular
- Ajoutez des tests unitaires
- Commentez le code complexe

### 4. Commit

```bash
git add .
git commit -m "feat: ajout de la fonctionnalité X"
```

Convention de commit (Conventional Commits) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Tâches de maintenance

### 5. Push et Pull Request

```bash
git push origin feature/ma-nouvelle-fonctionnalite
```

Ouvrez ensuite une Pull Request sur GitHub.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

```
MIT License

Copyright (c) 2025 FPBG - Fonds de Préservation de la Biodiversité au Gabon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## 📞 Support & Contact

- **Email** : contact@fpbg.org
- **Téléphone** : (+241) 76 53 34 62
- **WhatsApp** : +241 XX XX XX XX (Chatbot)
- **Adresse** : Baie des Rois, Immeuble FGIS, 2ème étage, Libreville, Gabon
- **Site web** : https://fpbg.org
- **Réseaux sociaux** :
  - Facebook : [FPBG Gabon](https://www.facebook.com/profile.php?id=61572016092621)
  - Twitter : [@FPBG_Gabon](https://x.com/FPBG_Gabon)
  - LinkedIn : [FPBG](https://www.linkedin.com/company/106050434/)

## 🔮 Roadmap

### Version 1.0 (Actuelle)

- ✅ Page d'accueil complète
- ✅ Authentification utilisateur
- ✅ Formulaire de soumission multi-étapes
- ✅ Dashboard utilisateur
- ✅ Dashboard administrateur
- ✅ Support WhatsApp chatbot

### Version 1.1 (À venir)

- 🔄 Application mobile iOS/Android
- 🔄 Mode hors ligne pour l'app mobile
- 🔄 Notifications push
- 🔄 Exports PDF des projets

### Version 2.0 (Futur)

- 📅 Système de notation et d'évaluation avancé
- 📅 Intégration paiements en ligne
- 📅 Module de reporting avancé
- 📅 API publique pour partenaires
- 📅 Multi-langue (FR/EN)

## 🙏 Remerciements

Merci à toutes les organisations et personnes qui contribuent à la conservation de la biodiversité au Gabon :

- **FPBG** - Pour le financement et le support
- **Obligations Bleues** - Partenaire stratégique
- **Communauté open-source** - Pour les outils et frameworks
- **Contributeurs** - Pour leur travail et dévouement

---

**Développé avec ❤️ pour la conservation de la biodiversité au Gabon** 🇬🇦

_Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur GitHub ou à nous contacter directement._
