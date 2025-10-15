# Test API REST - Création de Projet

## 📋 Informations de base

**Endpoint** : `POST http://localhost:4000/api/aprojet-v1/submit`
**Authentification** : Bearer Token (JWT)
**Content-Type** : `application/json`

---

## 🔐 Étape 1 : Obtenir un token d'authentification

### 1.1 Se connecter avec un utilisateur

```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "username": "votre_nom_de_contact",
  "password": "votre_mot_de_passe"
}
```

**Réponse** :
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "org-id-123",
    "email": "contact@organisation.com",
    "username": "Jean Dupont"
  }
}
```

**Important** : Copiez le `token` pour l'utiliser dans la requête suivante.

---

## 🚀 Étape 2 : Créer un projet

### 2.1 Requête cURL

```bash
curl -X POST http://localhost:4000/api/aprojet-v1/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d @projet-exemple.json
```

### 2.2 JSON complet (exemple minimal requis)

Créez un fichier `projet-exemple.json` :

```json
{
  "title": "Restauration des mangroves du delta de l'Ogooué",
  "domains": [
    "Conservation marine",
    "Restauration des écosystèmes",
    "Sensibilisation environnementale"
  ],
  "location": "Delta de l'Ogooué, Province de l'Ogooué-Maritime, Gabon. Zone côtière abritant plus de 2000 hectares de mangroves dégradées.",
  "targetGroup": "Communautés de pêcheurs locales (environ 500 familles), écoles primaires (12 établissements), associations environnementales locales.",
  "contextJustification": "Les mangroves du delta de l'Ogooué subissent une dégradation accélérée due à l'urbanisation croissante et aux pratiques de pêche non durables. Ces écosystèmes jouent un rôle crucial dans la protection côtière, la biodiversité marine et les moyens de subsistance des communautés locales. Ce projet vise à restaurer 50 hectares de mangroves tout en renforçant les capacités des communautés à gérer durablement ces ressources.",

  "objectives": "1) Restaurer 50 hectares de mangroves dégradées. 2) Former 200 membres de communautés locales aux pratiques de gestion durable. 3) Sensibiliser 1500 écoliers à l'importance des écosystèmes côtiers.",
  "expectedResults": "50 hectares de mangroves restaurés avec un taux de survie de 80%. 200 personnes formées aux techniques de restauration. 1500 écoliers sensibilisés. Création d'un comité de gestion local.",
  "durationMonths": 12,

  "activitiesStartDate": "2025-03-01",
  "activitiesEndDate": "2026-02-28",
  "activitiesSummary": "Cartographie des zones dégradées, plantation de propagules, formation des communautés, sensibilisation scolaire, suivi écologique.",
  "activities": [
    {
      "title": "Diagnostic et cartographie des zones à restaurer",
      "start": "2025-03-01",
      "end": "2025-04-30",
      "summary": "Identification des zones prioritaires par imagerie satellite et relevés terrain.",
      "subs": [
        {
          "label": "Acquisition d'images satellites",
          "summary": "Achat et traitement d'images haute résolution"
        },
        {
          "label": "Relevés terrain",
          "summary": "Missions de terrain avec équipe d'écologues"
        }
      ]
    },
    {
      "title": "Plantation de propagules et restauration",
      "start": "2025-05-01",
      "end": "2025-10-31",
      "summary": "Collecte de propagules et plantation assistée avec les communautés.",
      "subs": [
        {
          "label": "Collecte de propagules",
          "summary": "Récolte dans zones saines avec communautés"
        },
        {
          "label": "Plantation",
          "summary": "Plantation de 50000 propagules sur 50 ha"
        }
      ]
    },
    {
      "title": "Formation et sensibilisation",
      "start": "2025-06-01",
      "end": "2026-01-31",
      "summary": "Sessions de formation et ateliers de sensibilisation.",
      "subs": []
    },
    {
      "title": "Suivi écologique et évaluation",
      "start": "2025-11-01",
      "end": "2026-02-28",
      "summary": "Monitoring de la survie des plants et de la biodiversité.",
      "subs": []
    }
  ],

  "risks": [
    {
      "description": "Mortalité élevée des plants due aux conditions climatiques (sécheresse, tempêtes)",
      "mitigation": "Plantation en saison favorable, sélection d'espèces résilientes, suivi rapproché et replantation si nécessaire."
    },
    {
      "description": "Faible engagement des communautés locales",
      "mitigation": "Implication dès la phase de conception, formation continue, création d'un comité de gestion local avec leaders communautaires."
    },
    {
      "description": "Conflits fonciers sur les zones de restauration",
      "mitigation": "Consultation préalable avec autorités locales, cartographie participative, accords écrits avec communautés."
    }
  ],

  "usdRate": 655,
  "budgetActivities": [
    {
      "activityIndex": 0,
      "lines": [
        {
          "label": "Acquisition images satellites",
          "kind": "direct",
          "cfa": 2000000,
          "fpbgPct": 100,
          "cofinPct": 0
        },
        {
          "label": "Missions terrain (transport, hébergement)",
          "kind": "direct",
          "cfa": 1500000,
          "fpbgPct": 80,
          "cofinPct": 20
        }
      ]
    },
    {
      "activityIndex": 1,
      "lines": [
        {
          "label": "Outils et matériel de plantation",
          "kind": "direct",
          "cfa": 3000000,
          "fpbgPct": 100,
          "cofinPct": 0
        },
        {
          "label": "Main d'œuvre communautaire",
          "kind": "direct",
          "cfa": 5000000,
          "fpbgPct": 70,
          "cofinPct": 30
        }
      ]
    },
    {
      "activityIndex": 2,
      "lines": [
        {
          "label": "Matériel pédagogique (brochures, affiches)",
          "kind": "direct",
          "cfa": 1000000,
          "fpbgPct": 100,
          "cofinPct": 0
        },
        {
          "label": "Ateliers de formation (facilitateurs, salle)",
          "kind": "direct",
          "cfa": 2500000,
          "fpbgPct": 90,
          "cofinPct": 10
        }
      ]
    },
    {
      "activityIndex": 3,
      "lines": [
        {
          "label": "Équipement de suivi (GPS, caméras)",
          "kind": "direct",
          "cfa": 2000000,
          "fpbgPct": 100,
          "cofinPct": 0
        },
        {
          "label": "Missions de suivi trimestrielles",
          "kind": "direct",
          "cfa": 1500000,
          "fpbgPct": 80,
          "cofinPct": 20
        }
      ]
    }
  ],
  "indirectOverheads": 1850000,

  "projectStage": "CONCEPTION",
  "hasFunding": false,
  "fundingDetails": "",
  "honorAccepted": true,

  "sustainability": "Un comité de gestion local sera créé et formé pour assurer la maintenance des zones restaurées après la fin du projet. Des accords de cogestion seront signés avec les autorités locales. Les revenus générés par l'écotourisme et la pêche durable financeront les coûts récurrents de gestion (environ 500000 FCFA/an).",
  "replicability": "Ce modèle peut être répliqué dans d'autres deltas côtiers du Gabon (Nyanga, Komo). Pré-requis : partenariat avec une ONG locale, soutien des autorités, budget minimum de 20 millions FCFA. Manuel de bonnes pratiques et formations disponibles.",

  "collaborateurs": [
    {
      "nom": "Mbongo",
      "prenom": "Pierre",
      "email": "pierre.mbongo@example.com",
      "telephone": "+241 06 12 34 56",
      "role": "Coordinateur de projet"
    },
    {
      "nom": "Ondimba",
      "prenom": "Marie",
      "email": "marie.ondimba@example.com",
      "telephone": "+241 06 23 45 67",
      "role": "Responsable technique écologie"
    },
    {
      "nom": "Nzamba",
      "prenom": "Jean",
      "email": "jean.nzamba@example.com",
      "telephone": "+241 06 34 56 78",
      "role": "Chargé de mobilisation communautaire"
    }
  ]
}
```

---

## 📦 Version minimaliste (champs obligatoires uniquement)

```json
{
  "title": "Test Restauration Mangroves",
  "domains": ["Conservation marine"],
  "location": "Delta de l'Ogooué",
  "targetGroup": "Communautés locales",
  "contextJustification": "Dégradation importante nécessitant une intervention urgente.",

  "objectives": "Restaurer 50 hectares de mangroves",
  "expectedResults": "50 hectares restaurés, 200 personnes formées",
  "durationMonths": 12,

  "activities": [
    {
      "title": "Diagnostic",
      "start": "2025-03-01",
      "end": "2025-04-30",
      "summary": "Identification des zones",
      "subs": []
    }
  ],

  "risks": [
    {
      "description": "Mortalité des plants",
      "mitigation": "Suivi rapproché"
    }
  ]
}
```

---

## 🧪 Test avec Postman / Insomnia

### Configuration

1. **Méthode** : POST
2. **URL** : `http://localhost:4000/api/aprojet-v1/submit`
3. **Headers** :
   ```
   Content-Type: application/json
   Authorization: Bearer VOTRE_TOKEN_ICI
   ```
4. **Body** : Coller le JSON ci-dessus

### Réponse attendue (succès)

```json
{
  "message": "Projet soumis avec succès",
  "projet": {
    "id": "cm2x3y4z5...",
    "title": "Restauration des mangroves du delta de l'Ogooué",
    "status": "SOUMIS",
    "organisationId": "org-id-123",
    "domains": ["Conservation marine", "Restauration des écosystèmes"],
    "location": "Delta de l'Ogooué...",
    "objectives": "1) Restaurer 50 hectares...",
    "durationMonths": 12,
    "submittedAt": "2025-10-14T12:34:56.789Z",
    "organisation": {
      "id": "org-id-123",
      "name": "Mon Organisation",
      "email": "contact@organisation.com",
      "typeOrganisation": {
        "nom": "ONG"
      }
    },
    "collaborateurs": [
      {
        "id": "collab-1",
        "nom": "Mbongo",
        "prenom": "Pierre",
        "email": "pierre.mbongo@example.com",
        "role": "Coordinateur de projet"
      },
      {
        "id": "collab-2",
        "nom": "Ondimba",
        "prenom": "Marie",
        "email": "marie.ondimba@example.com",
        "role": "Responsable technique écologie"
      }
    ],
    "createdAt": "2025-10-14T12:34:56.789Z",
    "updatedAt": "2025-10-14T12:34:56.789Z"
  }
}
```

---

## ❌ Erreurs possibles

### 1. Token manquant ou invalide

```json
{
  "error": "Token JWT requis"
}
```
**Solution** : Vérifier le header `Authorization: Bearer ...`

### 2. Champs obligatoires manquants

```json
{
  "error": "Le champ 'title' est requis"
}
```
**Solution** : Ajouter tous les champs obligatoires

### 3. Organisation non trouvée

```json
{
  "error": "Organisation non trouvée"
}
```
**Solution** : Vérifier que l'utilisateur connecté est bien une organisation

---

## 🔍 Vérification en base de données

Après la création, vérifiez en base :

```sql
-- Voir le projet créé
SELECT * FROM "Projet"
WHERE "organisationId" = 'votre-org-id'
ORDER BY "createdAt" DESC
LIMIT 1;

-- Voir les collaborateurs
SELECT * FROM "Collaborateur"
WHERE "projetId" = 'le-projet-id-retourné';
```

---

## 📝 Notes importantes

1. **Un seul projet par organisation** : Si un projet existe déjà, il sera **mis à jour** au lieu d'en créer un nouveau
2. **Les dates** : Format ISO 8601 (`YYYY-MM-DD`)
3. **Les tableaux** : `domains`, `activities`, `risks`, `collaborateurs` peuvent être vides `[]` mais pas `null`
4. **Budget** : `usdRate` par défaut = 655, `indirectOverheads` plafonné à 10% du total
5. **Statut** : Automatiquement mis à `"SOUMIS"` après création

---

## 🚀 Script de test automatisé (Node.js)

```javascript
// test-create-projet.js
const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testCreateProjet() {
  try {
    // 1. Login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'Jean Dupont',
      password: 'votre_password'
    });

    const token = loginRes.data.token;
    console.log('✅ Login réussi, token:', token.substring(0, 20) + '...');

    // 2. Créer projet
    const projetData = {
      title: "Test Restauration Mangroves " + Date.now(),
      domains: ["Conservation marine"],
      location: "Delta de l'Ogooué",
      targetGroup: "Communautés locales",
      contextJustification: "Test API",
      objectives: "Restaurer 50 hectares",
      expectedResults: "50 ha restaurés",
      durationMonths: 12,
      activities: [{
        title: "Diagnostic",
        start: "2025-03-01",
        end: "2025-04-30",
        summary: "Test",
        subs: []
      }],
      risks: [{
        description: "Risque test",
        mitigation: "Mitigation test"
      }]
    };

    const projetRes = await axios.post(
      `${BASE_URL}/aprojet-v1/submit`,
      projetData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Projet créé:', projetRes.data);
    console.log('📋 ID du projet:', projetRes.data.projet.id);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testCreateProjet();
```

**Exécution** :
```bash
npm install axios
node test-create-projet.js
```

---

Date : 14 octobre 2025
