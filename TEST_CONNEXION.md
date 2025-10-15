# Test de connexion Backend ↔ Frontend

## ✅ Configuration validée

### Backend
- **Port**: 4000
- **Base de données**: PostgreSQL (Neon)
- **Routes configurées**:
  - `/api/auth/*` - Authentification
  - `/api/aprojet-v1/*` - Gestion des projets

### Frontend
- **URL Backend**: `http://localhost:4000`
- **Services créés**:
  - `AuthService` - Authentification
  - `ProjetService` - Projets et collaborateurs

---

## 🔧 Modifications apportées

### 1. Service ProjetService (`frontend/src/app/services/api/projet.service.ts`)

Nouvelles méthodes ajoutées :
- ✅ `submitProject(projectData)` - Soumettre un projet complet
- ✅ `getMyProject()` - Récupérer le projet de l'utilisateur
- ✅ `getMyCollaborateurs()` - Liste des collaborateurs
- ✅ `addCollaborateur(projetId, data)` - Ajouter un collaborateur
- ✅ `deleteCollaborateur(id)` - Supprimer un collaborateur

### 2. Dashboard (`frontend/src/app/user/dashboard/dashboard.ts`)

**Changements majeurs** :
- Import du `ProjetService`
- Nouvelle méthode `loadProjectAndCollaborators()` appelée au `ngOnInit`
- Méthode `addCollaborator()` mise à jour pour appeler le backend
- Gestion des erreurs et feedback utilisateur

**Avant** (ligne 358) :
```typescript
addCollaborator() {
  // Stockage local uniquement ❌
  const list = [...this.collaborators(), this.collabForm.getRawValue()];
  localStorage.setItem(LS.collaborators, JSON.stringify(list));
}
```

**Après** (ligne 405) :
```typescript
async addCollaborator() {
  // Appel backend ✅
  const result = await this.projetService.addCollaborateur(projetId, collaborateurData);
  await this.loadProjectAndCollaborateurs(); // Recharge depuis le backend
}
```

---

## 📋 Procédure de test

### Étape 1 : Démarrer le backend
```bash
cd backend
npm run dev
```

Vérifier que le serveur démarre sur `http://localhost:4000`

### Étape 2 : Démarrer le frontend
```bash
cd frontend
npm start
```

### Étape 3 : Tester l'ajout de collaborateur

1. **Se connecter** avec un compte utilisateur
2. **Accéder au dashboard** (`/dashboard`)
3. **Ajouter un collaborateur** :
   - Nom complet : "Jean Dupont"
   - Email : "jean.dupont@example.com"
   - Rôle : "Éditeur"
4. **Cliquer sur "Ajouter"**

### Étape 4 : Vérifications

#### Console navigateur (F12)
Vous devriez voir :
```
✅ Collaborateur ajouté: { id: "...", nom: "Dupont", prenom: "Jean", ... }
```

#### Console backend
Vous devriez voir :
```
POST /api/aprojet-v1/:projetId/collaborateurs 201
```

#### Base de données
Vérifier dans PostgreSQL :
```sql
SELECT * FROM "Collaborateur";
```

Le collaborateur doit apparaître avec :
- `userId` = ID de l'utilisateur connecté
- `projetId` = ID du projet
- `nom`, `prenom`, `email`, `role`

---

## 🐛 Dépannage

### Erreur : "Aucun projet trouvé"
**Cause** : L'utilisateur n'a pas encore de projet
**Solution** : Créer un projet via le wizard avant d'ajouter des collaborateurs

### Erreur : "401 Unauthorized"
**Cause** : Token JWT expiré ou invalide
**Solution** : Se reconnecter

### Erreur : "CORS policy"
**Cause** : Configuration CORS backend
**Solution** : Vérifier `backend/src/server.ts:18-30` - doit autoriser `http://localhost:*`

### Erreur : "Network Error"
**Cause** : Backend non démarré
**Solution** : Vérifier que le backend tourne sur le port 4000

---

## 🎯 Points de validation

- [ ] Backend démarre sans erreur
- [ ] Frontend se connecte au backend
- [ ] Authentification fonctionne
- [ ] Liste des collaborateurs se charge
- [ ] Ajout d'un collaborateur persiste en base
- [ ] Rechargement de la page affiche les collaborateurs depuis le backend
- [ ] Suppression d'un collaborateur fonctionne (si implémentée dans l'UI)

---

## 📊 Architecture de la connexion

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │   Dashboard    │────────▶│  ProjetService   │            │
│  │  (Component)   │         │   (API calls)    │            │
│  └────────────────┘         └──────────────────┘            │
│         │                            │                        │
│         │ addCollaborator()          │ HTTP POST              │
│         └────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
                                │
                                │ axios instance
                                │ http://localhost:4000
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         BACKEND                               │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │ projet.routes  │────────▶│ ProjetController │            │
│  │   (Router)     │         │   (Business)     │            │
│  └────────────────┘         └──────────────────┘            │
│         │                            │                        │
│         │ POST /api/aprojet-v1/      │ projetService         │
│         │ :projetId/collaborateurs   │ .addCollaborateur()   │
│         └────────────────────────────┘                        │
│                                │                               │
│                                ▼                               │
│  ┌──────────────────────────────────────────────┐            │
│  │           ProjetService (Backend)             │            │
│  │    prisma.collaborateur.create(...)          │            │
│  └──────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES                            │
│              PostgreSQL (Neon Cloud)                          │
│                                                                │
│  Tables : User, Organisation, Projet, Collaborateur          │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Améliorations futures

1. **Toast notifications** : Remplacer `alert()` par des toasts
2. **Suppression de collaborateurs** : Ajouter un bouton "Supprimer" dans l'UI
3. **Édition de collaborateurs** : Permettre la modification des infos
4. **Gestion des erreurs** : Afficher des messages plus explicites
5. **Loading states** : Ajouter des spinners pendant les requêtes
6. **Validation** : Vérifier les doublons d'email

---

Date : 14 octobre 2025
Auteur : Claude Code Assistant
