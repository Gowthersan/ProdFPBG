# 📚 Documentation API Backend FPBG

## 🌐 URL de base
```
http://localhost:4000
```

## 🔒 Authentification
Toutes les routes protégées nécessitent un token JWT dans le header `Authorization` ou dans les cookies.

```
Authorization: Bearer <token>
```

---

## 📋 Table des matières
1. [Authentification](#authentification)
2. [Gestion des Projets](#gestion-des-projets)
3. [Gestion des Organisations](#gestion-des-organisations)
4. [Appels à Projets (AAP)](#appels-à-projets-aap)

---

## 🔐 Authentification

### 1. Enregistrer un agent FPBG
**POST** `/api/registeragentfpbg`

**Body:**
```json
{
  "username": "john.doe",
  "email": "john@fpbg.org",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "numTel": "+241 06 00 00 00",
  "postalAddress": "BP 123, Libreville",
  "physicalAddress": "Quartier X, Libreville",
  "userType": "agent"
}
```

**Response:** `201 Created`
```json
{
  "message": "Agent FPBG enregistré avec succès. Un code OTP a été envoyé à votre email.",
  "user": {
    "id": "uuid",
    "username": "john.doe",
    "email": "john@fpbg.org",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "agent",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Enregistrer une organisation
**POST** `/api/registerOrganisation`

**Body:**
```json
{
  "email": "contact@ong-exemple.org",
  "password": "securepass123",
  "name": "ONG Exemple",
  "username": "ong_exemple",
  "contact": "Marie Dupont",
  "numTel": "+241 06 00 00 01",
  "postalAddress": "BP 456, Libreville",
  "physicalAddress": "Avenue de l'Indépendance",
  "type": "ONG",
  "usernamePersonneContacter": "marie.dupont",
  "typeOrganisationId": "uuid-type-org"
}
```

**Response:** `201 Created`
```json
{
  "message": "Organisation enregistrée avec succès. Un code OTP a été envoyé à votre email.",
  "organisation": {
    "id": "uuid",
    "email": "contact@ong-exemple.org",
    "name": "ONG Exemple",
    "type": "ONG",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Vérifier un code OTP
**GET** `/api/otpverifcation/:otp?email=user@example.com`

**Params:**
- `otp` (required): Code OTP à 6 chiffres
- `email` (optional query param): Email de l'utilisateur

**Response:** `200 OK`
```json
{
  "message": "Code OTP vérifié avec succès.",
  "valid": true
}
```

**Error:** `400 Bad Request`
```json
{
  "error": "Code OTP invalide ou expiré."
}
```

---

### 4. Login
**POST** `/api/login`

**Body:**
```json
{
  "username": "john.doe",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Connexion réussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "john.doe",
    "email": "john@fpbg.org",
    "userType": "agent"
  },
  "type": "user"
}
```

**Note:** Le token est également envoyé dans un cookie `HttpOnly`.

---

### 5. Vérifier l'authentification
**GET** `/api/authenticate` 🔒

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "username": "john.doe",
    "email": "john@fpbg.org",
    "userType": "agent"
  },
  "type": "user"
}
```

---

### 6. Déconnexion
**GET** `/api/disconnected`

**Response:** `200 OK`
```json
{
  "message": "Déconnexion réussie."
}
```

---

### 7. Rafraîchir le token
**POST** `/api/refresh-token` 🔒

**Response:** `200 OK`
```json
{
  "message": "Token rafraîchi avec succès.",
  "token": "new-jwt-token",
  "user": {...},
  "type": "user"
}
```

---

## 📁 Gestion des Projets

### 1. Créer un projet
**POST** `/api/aprojet-v1/createProjet` 🔒

**Content-Type:** `multipart/form-data` ou `application/json`

**Body:**
```json
{
  "title": "Restauration de 3 km de berges",
  "actPrin": "Cartographie, ingénierie écologique, replantation",
  "dateLimPro": "2026-12-31",
  "rAtt": "3 km de berges traitées, 18 000 plants indigènes",
  "objP": "Restaurer la stabilité des berges",
  "conjP": "Érosion accélérée, turbidité élevée",
  "lexGcp": "Rivières Nkomi et Komo, 6 villages riverains",
  "poRistEnvSoPo": "Crues exceptionnelles, blocages administratifs",
  "dPRep": "Maintenance confiée aux comités locaux",
  "conseilPr": "Fenêtre de travaux adaptée",
  "stade": "BROUILLON",
  "funding": "20 M FCFA"
}
```

**Response:** `201 Created`
```json
{
  "message": "Projet créé avec succès.",
  "projet": {
    "id": "uuid",
    "title": "Restauration de 3 km de berges",
    "organisationId": "uuid",
    "stade": "BROUILLON",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "organisation": {...}
  }
}
```

---

### 2. Récupérer tous les projets (paginé)
**GET** `/api/aprojet-v1?page=0&size=10&eagerload=true`

**Query Params:**
- `page` (default: 0): Numéro de la page
- `size` (default: 10): Nombre de projets par page
- `eagerload` (default: true): Inclure les relations

**Response:** `200 OK`
```json
{
  "projets": [...],
  "total": 50,
  "page": 0,
  "size": 10,
  "totalPages": 5
}
```

---

### 3. Récupérer tous les projets (sans pagination)
**GET** `/api/aprojet-v1/all`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Projet 1",
    "organisation": {...}
  },
  ...
]
```

---

### 4. Récupérer un projet par ID
**GET** `/api/aprojet-v1/:id`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Restauration de 3 km de berges",
  "actPrin": "...",
  "organisation": {
    "id": "uuid",
    "name": "ONG Exemple",
    "typeOrganisation": {...}
  }
}
```

---

### 5. Récupérer le projet de l'utilisateur connecté
**GET** `/api/aprojet-v1/user` 🔒

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Mon Projet",
  "stade": "SOUMIS",
  "organisation": {...}
}
```

---

### 6. Mettre à jour un projet
**PUT** `/api/aprojet-v1/:id` 🔒

**Body:** (tous les champs du projet)

**Response:** `200 OK`
```json
{
  "message": "Projet mis à jour avec succès.",
  "projet": {...}
}
```

---

### 7. Mise à jour partielle d'un projet
**PATCH** `/api/aprojet-v1/:id` 🔒

**Body:** (champs à mettre à jour uniquement)
```json
{
  "stade": "SOUMIS",
  "funding": "30 M FCFA"
}
```

**Response:** `200 OK`
```json
{
  "message": "Projet mis à jour avec succès.",
  "projet": {...}
}
```

---

### 8. Supprimer un projet
**DELETE** `/api/aprojet-v1/:id` 🔒

**Response:** `200 OK`
```json
{
  "message": "Projet supprimé avec succès."
}
```

---

## 🏢 Gestion des Organisations

### 1. Récupérer l'organisation connectée
**GET** `/api/organisations/organismeconnected` 🔒

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "ONG Exemple",
  "email": "contact@ong-exemple.org",
  "typeOrganisation": {
    "id": "uuid",
    "nom": "ONG"
  },
  "projets": [...]
}
```

---

### 2. Récupérer toutes les organisations (admin)
**GET** `/api/organisations` 🔒👮

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Organisation 1",
    "email": "org1@example.com",
    "typeOrganisation": {...},
    "_count": {
      "projets": 3
    }
  },
  ...
]
```

---

### 3. Récupérer une organisation par ID (admin)
**GET** `/api/organisations/:id` 🔒👮

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "ONG Exemple",
  "typeOrganisation": {...},
  "projets": [...]
}
```

---

### 4. Mettre à jour une organisation
**PUT** `/api/organisations/:id` 🔒

**Body:**
```json
{
  "name": "Nouveau nom",
  "numTel": "+241 06 00 00 02"
}
```

**Response:** `200 OK`
```json
{
  "message": "Organisation mise à jour avec succès.",
  "organisation": {...}
}
```

---

### 5. Supprimer une organisation (admin)
**DELETE** `/api/organisations/:id` 🔒👮

**Response:** `200 OK`
```json
{
  "message": "Organisation supprimée avec succès."
}
```

---

## 📢 Appels à Projets (AAP)

### 1. Créer un appel à projets (admin)
**POST** `/api/aap` 🔒👮

**Body:**
```json
{
  "code": "AAP-OBL-2025",
  "titre": "Appel à projets pour la conservation marine",
  "resume": "Le FPBG lance un appel...",
  "contexte": "Le Gabon abrite des écosystèmes marins...",
  "objectif": "Financer des projets...",
  "contactEmail": "contact@fpbg.org",
  "geographicEligibility": ["Gabon", "Zones marines"],
  "eligibleOrganisations": ["ONG", "PME", "Coopératives"],
  "eligibleActivities": ["Matériels de pêche", "Formations"],
  "cofinancement": "Contrepartie en nature encouragée",
  "annexes": ["Formulaire NC", "Lettre de motivation"],
  "launchDate": "2025-09-22",
  "tags": ["Conservation", "Marine"],
  "isActive": true,
  "subventions": [
    {
      "name": "Petite subvention",
      "amountMin": 5000000,
      "amountMax": 50000000,
      "durationMaxMonths": 12,
      "deadlineNoteConceptuelle": "2025-11-23",
      "cycle": [
        {
          "step": "Publication de l'appel",
          "dates": "22 septembre 2025"
        }
      ]
    }
  ],
  "thematiques": [
    {
      "title": "Pêche communautaire durable",
      "bullets": ["Cogestion", "Diversification"],
      "typeSubvention": "petite"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Appel à projets créé avec succès.",
  "aap": {...}
}
```

---

### 2. Récupérer tous les appels à projets
**GET** `/api/aap?includeInactive=false`

**Query Params:**
- `includeInactive` (default: false): Inclure les AAP inactifs

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "code": "AAP-OBL-2025",
    "titre": "Conservation marine et littorale",
    "isActive": true,
    "subventions": [...],
    "thematiques": [...]
  }
]
```

---

### 3. Récupérer un AAP par ID
**GET** `/api/aap/:id`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "code": "AAP-OBL-2025",
  "titre": "...",
  "subventions": [...],
  "thematiques": [...]
}
```

---

### 4. Récupérer un AAP par code
**GET** `/api/aap/code/:code`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "code": "AAP-OBL-2025",
  ...
}
```

---

### 5. Mettre à jour un AAP (admin)
**PUT** `/api/aap/:id` 🔒👮

**Body:** (champs à mettre à jour)

**Response:** `200 OK`
```json
{
  "message": "Appel à projets mis à jour avec succès.",
  "aap": {...}
}
```

---

### 6. Activer/Désactiver un AAP (admin)
**PATCH** `/api/aap/:id/toggle` 🔒👮

**Response:** `200 OK`
```json
{
  "message": "Appel à projets activé avec succès.",
  "aap": {...}
}
```

---

### 7. Supprimer un AAP (admin)
**DELETE** `/api/aap/:id` 🔒👮

**Response:** `200 OK`
```json
{
  "message": "Appel à projets supprimé avec succès."
}
```

---

### 8. Récupérer les types d'organisations
**GET** `/api/aap/types/organisations`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "nom": "ONG"
  },
  {
    "id": "uuid",
    "nom": "PME"
  }
]
```

---

### 9. Créer un type d'organisation (admin)
**POST** `/api/aap/types/organisations` 🔒👮

**Body:**
```json
{
  "nom": "Startup"
}
```

**Response:** `201 Created`
```json
{
  "message": "Type d'organisation créé avec succès.",
  "type": {
    "id": "uuid",
    "nom": "Startup"
  }
}
```

---

## 🚨 Codes d'erreur

| Code | Signification |
|------|---------------|
| 400  | Bad Request - Données invalides |
| 401  | Unauthorized - Authentification requise |
| 403  | Forbidden - Accès refusé |
| 404  | Not Found - Ressource non trouvée |
| 409  | Conflict - Conflit (ex: email déjà utilisé) |
| 500  | Internal Server Error |

---

## 🔑 Légende
- 🔒 = Route protégée (authentification requise)
- 👮 = Route admin (droits administrateur requis)

---

## 🧪 Tests avec cURL

### Exemple: Créer un agent FPBG
```bash
curl -X POST http://localhost:4000/api/registeragentfpbg \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john@fpbg.org",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "agent"
  }'
```

### Exemple: Login
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123"
  }'
```

### Exemple: Récupérer tous les projets (avec auth)
```bash
curl -X GET http://localhost:4000/api/aprojet-v1/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
