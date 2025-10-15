# Système de Soumission de Projets FPBG

## Vue d'ensemble

Ce système permet aux organisations de soumettre un seul projet complet à travers un wizard en 9 étapes. Tous les projets soumis sont stockés dans la base de données PostgreSQL via Prisma.

## Architecture de la Base de Données

### Tables Principales

#### 1. **Projet** (Table centrale)
Stocke toutes les informations d'un projet soumis par une organisation.

**Champs principaux:**
- **Étape 1 - Proposition**
  - `title`: Titre du projet
  - `domains`: Array des domaines d'intervention
  - `location`: Lieu d'exécution
  - `targetGroup`: Groupe cible
  - `contextJustification`: Contexte & justification

- **Étape 2 - Objectifs**
  - `objectives`: Objectifs du projet
  - `expectedResults`: Résultats attendus
  - `durationMonths`: Durée en mois

- **Étape 3 - Activités**
  - `activitiesStartDate`: Date de début
  - `activitiesEndDate`: Date de fin
  - `activitiesSummary`: Résumé des activités
  - `activities`: JSON - Array des activités détaillées

- **Étape 4 - Risques**
  - `risks`: JSON - Array des risques et mesures d'atténuation

- **Étape 5 - Budget**
  - `usdRate`: Taux de change FCFA/USD
  - `budgetActivities`: JSON - Budget détaillé par activité
  - `indirectOverheads`: Frais indirects (max 10%)

- **Étape 6 - État & Financement**
  - `projectStage`: CONCEPTION | DEMARRAGE | AVANCE | PHASE_FINALE
  - `hasFunding`: Boolean - A déjà un financement?
  - `fundingDetails`: Détails du financement
  - `honorAccepted`: Engagement sur l'honneur accepté

- **Étape 7 - Durabilité**
  - `sustainability`: Durabilité du projet
  - `replicability`: Potentiel de réplication

- **Étape 8 - Annexes**
  - `lettreMotivation`, `statutsReglement`, `ficheCircuit`, etc.
  - `cv`: Array de chemins vers les CV

- **État du projet**
  - `status`: BROUILLON | SOUMIS | EN_REVUE | ACCEPTE | REFUSE
  - `submittedAt`: Date de soumission

#### 2. **Collaborateur**
Les collaborateurs travaillent sur un projet spécifique.

**Champs:**
- `projetId`: ID du projet (relation)
- `nom`, `prenom`: Nom complet
- `email`: Email du collaborateur
- `telephone`: Téléphone (optionnel)
- `role`: Rôle dans le projet (Coordinateur, Expert, etc.)

**Relation:** Un projet peut avoir plusieurs collaborateurs (One-to-Many via `projetId`)

#### 3. **Organisation**
Représente l'organisation qui soumet le projet.

**Relation avec Projet:** Une organisation peut soumettre **un seul projet** (One-to-One)

---

## API Endpoints

### 1. **Soumettre un Projet Complet**
```http
POST /api/aprojet-v1/submit
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Restauration des mangroves",
  "domains": ["Conservation marine", "Restauration écologique"],
  "location": "Estuaire du Komo",
  "targetGroup": "Communautés riveraines",
  "contextJustification": "Les mangroves...",

  "objectives": "Restaurer 50 ha de mangroves",
  "expectedResults": "Augmentation de 30% de la biodiversité",
  "durationMonths": 12,

  "activitiesStartDate": "2025-01-01",
  "activitiesEndDate": "2025-12-31",
  "activitiesSummary": "Cartographie, plantation, suivi",
  "activities": [
    {
      "title": "Cartographie",
      "start": "2025-01-01",
      "end": "2025-02-28",
      "summary": "Cartographie des zones dégradées",
      "subs": [
        {
          "label": "Acquisition d'images satellites",
          "summary": "Commander des images haute résolution"
        }
      ]
    }
  ],

  "risks": [
    {
      "description": "Crues exceptionnelles",
      "mitigation": "Fenêtre de travaux optimale"
    }
  ],

  "usdRate": 655,
  "budgetActivities": [
    {
      "activityIndex": 0,
      "lines": [
        {
          "label": "Main d'œuvre locale",
          "cfa": 5000000,
          "fpbgPct": 80,
          "cofinPct": 20
        }
      ]
    }
  ],
  "indirectOverheads": 500000,

  "projectStage": "DEMARRAGE",
  "hasFunding": false,
  "fundingDetails": "",
  "honorAccepted": true,

  "sustainability": "Comités locaux formés",
  "replicability": "Modèle applicable à 3 estuaires",

  "attachments": {
    "LETTRE_MOTIVATION": "path/to/lettre.pdf",
    "CV": ["path/to/cv1.pdf", "path/to/cv2.pdf"]
  },

  "collaborateurs": [
    {
      "nom": "Mbina",
      "prenom": "Jacques",
      "email": "jacques.mbina@example.com",
      "telephone": "+241 06 00 00 00",
      "role": "Coordinateur de projet"
    },
    {
      "nom": "Ngoma",
      "prenom": "Marie",
      "email": "marie.ngoma@example.com",
      "telephone": "+241 07 00 00 00",
      "role": "Experte en restauration écologique"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Projet soumis avec succès",
  "projet": {
    "id": "uuid",
    "title": "Restauration des mangroves",
    "status": "SOUMIS",
    "submittedAt": "2025-10-14T03:45:00.000Z",
    "organisation": { ... },
    "collaborateurs": [
      {
        "id": "uuid",
        "nom": "Mbina",
        "prenom": "Jacques",
        "email": "jacques.mbina@example.com",
        "role": "Coordinateur de projet"
      },
      ...
    ]
  }
}
```

---

### 2. **Récupérer Mon Projet** (Utilisateur)
```http
GET /api/aprojet-v1/my-project
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Restauration des mangroves",
  "status": "SOUMIS",
  "domains": ["Conservation marine"],
  "objectives": "...",
  "activities": [...],
  "collaborateurs": [...]
}
```

---

### 3. **Lister Tous les Projets** (Admin)
```http
GET /api/aprojet-v1/all
Authorization: Bearer <admin-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Restauration des mangroves",
    "status": "SOUMIS",
    "organisation": {
      "name": "ONG Rivière Claire",
      "email": "contact@riviereclaire.org"
    },
    "collaborateurs": [...],
    "submittedAt": "2025-10-14T03:45:00.000Z"
  },
  ...
]
```

---

### 4. **Récupérer un Projet Spécifique** (Admin)
```http
GET /api/aprojet-v1/:id
Authorization: Bearer <admin-token>
```

---

## Règles Métier

### ✅ Contraintes
1. **Un utilisateur = Un projet** : Une organisation ne peut soumettre qu'un seul projet
2. **Statuts possibles** :
   - `BROUILLON` : Sauvegarde en cours
   - `SOUMIS` : Projet soumis et en attente de revue
   - `EN_REVUE` : En cours d'évaluation par l'admin
   - `ACCEPTE` : Projet accepté
   - `REFUSE` : Projet refusé

3. **Collaborateurs** : Plusieurs collaborateurs peuvent être associés à un projet via `projetId`

4. **Frais indirects** : Maximum 10% du budget total

---

## Workflow de Soumission

```
┌─────────────────┐
│  Frontend       │
│  (Wizard)       │
│                 │
│  9 Étapes       │
└────────┬────────┘
         │
         │ Données complètes
         │ collectées
         ▼
┌─────────────────┐
│  POST /submit   │
│                 │
│  Validation     │
│  + Sauvegarde   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Base de        │
│  Données        │
│                 │
│  Table: Projet  │
│  Table:         │
│  Collaborateur  │
└─────────────────┘
```

---

## Utilisation Frontend

### Service Angular pour soumettre un projet

```typescript
// frontend/src/app/services/projet.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProjetService {
  private apiUrl = 'http://localhost:4000/api/aprojet-v1';

  constructor(private http: HttpClient) {}

  submitProject(projectData: any) {
    return this.http.post(`${this.apiUrl}/submit`, projectData);
  }

  getMyProject() {
    return this.http.get(`${this.apiUrl}/my-project`);
  }
}
```

### Exemple d'utilisation dans le Wizard

```typescript
// submission-wizard.ts
export class SubmissionWizard {
  submit() {
    const projectData = {
      // Étape 1
      title: this.stepProp.get('title')?.value,
      domains: this.stepProp.get('domains')?.value,
      location: this.stepProp.get('location')?.value,
      targetGroup: this.stepProp.get('targetGroup')?.value,
      contextJustification: this.stepProp.get('contextJustification')?.value,

      // Étape 2
      objectives: this.obj.get('objectives')?.value,
      expectedResults: this.obj.get('expectedResults')?.value,
      durationMonths: this.obj.get('durationMonths')?.value,

      // Étape 3
      activitiesStartDate: this.activitiesHeader.get('startDate')?.value,
      activitiesEndDate: this.activitiesHeader.get('endDate')?.value,
      activitiesSummary: this.activitiesHeader.get('summary')?.value,
      activities: this.activities.value,

      // Étape 4
      risks: this.risks.value,

      // Étape 5
      usdRate: this.form.get('usdRate')?.value,
      budgetActivities: this.extractBudgetData(),
      indirectOverheads: this.form.get('indirectOverheads')?.value,

      // Étape 6
      projectStage: this.projectState.get('stage')?.value,
      hasFunding: this.projectState.get('hasFunding')?.value,
      fundingDetails: this.projectState.get('fundingDetails')?.value,
      honorAccepted: this.projectState.get('honorAccepted')?.value,

      // Étape 7
      sustainability: this.sustainability.get('text')?.value,
      replicability: this.sustainability.get('replicability')?.value,

      // Étape 8
      attachments: this.extractAttachments(),

      // Collaborateurs (si tu as un FormArray pour ça)
      collaborateurs: this.collaborateurs?.value || []
    };

    this.projetService.submitProject(projectData).subscribe({
      next: (response) => {
        console.log('✅ Projet soumis:', response);
        alert('Votre projet a été soumis avec succès!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ Erreur:', error);
        alert('Erreur lors de la soumission du projet');
      }
    });
  }

  extractBudgetData() {
    // Parcourir toutes les activités et extraire les lignes de budget
    return this.activities.controls.map((activityGroup, index) => ({
      activityIndex: index,
      lines: activityGroup.get('budget.lines')?.value || []
    }));
  }

  extractAttachments() {
    return {
      LETTRE_MOTIVATION: this.attachments.get('lettreMotivation')?.value,
      STATUTS_REGLEMENT: this.attachments.get('statutsReglement')?.value,
      // ... autres fichiers
    };
  }
}
```

---

## Dashboard Admin

### Lister tous les projets soumis

```typescript
// admin-dashboard.component.ts
export class AdminDashboard implements OnInit {
  projets: any[] = [];

  ngOnInit() {
    this.projetService.getAllProjects().subscribe(projets => {
      this.projets = projets.filter(p => p.status === 'SOUMIS');
    });
  }

  updateStatus(projetId: string, newStatus: string) {
    this.http.patch(`/api/aprojet-v1/${projetId}/status`, { status: newStatus })
      .subscribe(() => {
        alert('Statut mis à jour');
        this.ngOnInit(); // Recharger la liste
      });
  }
}
```

---

## Migration de la Base de Données

Les migrations Prisma ont créé les tables suivantes:

```sql
-- Table Projet (avec toutes les colonnes)
CREATE TABLE "Projet" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT,
  "title" TEXT,
  "domains" TEXT[],
  "location" TEXT,
  "targetGroup" TEXT,
  "contextJustification" TEXT,
  "objectives" TEXT,
  "expectedResults" TEXT,
  "durationMonths" INTEGER,
  "activitiesStartDate" TIMESTAMP,
  "activitiesEndDate" TIMESTAMP,
  "activitiesSummary" TEXT,
  "activities" JSONB,
  "risks" JSONB,
  "usdRate" INTEGER DEFAULT 655,
  "budgetActivities" JSONB,
  "indirectOverheads" INTEGER DEFAULT 0,
  "projectStage" TEXT,
  "hasFunding" BOOLEAN DEFAULT false,
  "fundingDetails" TEXT,
  "honorAccepted" BOOLEAN DEFAULT false,
  "sustainability" TEXT,
  "replicability" TEXT,
  "lettreMotivation" TEXT,
  "statutsReglement" TEXT,
  "ficheCircuit" TEXT,
  "cote" TEXT,
  "agrement" TEXT,
  "cv" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "budgetDetaille" TEXT,
  "chronogramme" TEXT,
  "cartographie" TEXT,
  "lettreSoutien" TEXT,
  "status" TEXT DEFAULT 'BROUILLON',
  "submittedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Table Collaborateur
CREATE TABLE "Collaborateur" (
  "id" TEXT PRIMARY KEY,
  "projetId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "prenom" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telephone" TEXT,
  "role" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
```

---

## Tests

### Test de soumission avec curl

```bash
curl -X POST http://localhost:4000/api/aprojet-v1/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Project",
    "domains": ["Conservation"],
    "location": "Libreville",
    "targetGroup": "Communities",
    "contextJustification": "Test context",
    "objectives": "Test objectives",
    "expectedResults": "Test results",
    "durationMonths": 12,
    "projectStage": "CONCEPTION",
    "honorAccepted": true,
    "collaborateurs": [
      {
        "nom": "Test",
        "prenom": "User",
        "email": "test@example.com",
        "role": "Coordinateur"
      }
    ]
  }'
```

---

## Notes Importantes

1. **Authentification requise** : Toutes les routes de soumission nécessitent un token JWT valide
2. **Validation** : Le backend valide que l'organisation existe avant de créer/mettre à jour un projet
3. **Un seul projet par organisation** : Si un projet existe déjà, il sera mis à jour au lieu d'en créer un nouveau
4. **Collaborateurs** : Liés au projet via `projetId`, pas à l'utilisateur
5. **Fichiers** : Les chemins des fichiers doivent être stockés après upload (à implémenter séparément)

---

## Prochaines Étapes

1. ✅ Schéma Prisma créé et migré
2. ✅ Services backend implémentés
3. ✅ Routes API créées
4. ⏳ Implémenter l'upload de fichiers
5. ⏳ Créer le service Angular frontend
6. ⏳ Connecter le wizard au backend
7. ⏳ Créer le dashboard admin pour visualiser les projets
