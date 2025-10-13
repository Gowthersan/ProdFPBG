# 🎯 Guide de Test Complet - FPBG

## ✅ Statut actuel

- **Backend** : ✅ Démarré sur http://localhost:4000
- **Base de données** : ✅ Connectée et fonctionnelle
- **Services Frontend** : ✅ Corrigés pour utiliser le backend réel

## 🧪 Test 1 : Inscription d'une organisation

### Via l'interface frontend

1. Ouvrez votre application : `http://localhost:4200/register`
2. Remplissez le formulaire d'inscription :
   - Email : `test@exemple.com`
   - Mot de passe : `Test1234`
   - Nom organisation : `Mon Organisation`
   - etc.
3. Soumettez le formulaire

### Vérification

Ouvrez la console du navigateur (F12) et regardez :
- La requête POST vers `http://localhost:4000/api/registerOrganisation`
- La réponse avec l'ID de l'organisation créée

### Via cURL (test direct)

```bash
curl -X POST http://localhost:4000/api/registerOrganisation \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test2@test.com\",\"password\":\"Test1234\",\"name\":\"Test Org 2\"}"
```

**Résultat attendu** :
```json
{
  "message": "Organisation enregistrée avec succès...",
  "organisation": {
    "id": "...",
    "email": "test2@test.com",
    "name": "Test Org 2",
    ...
  }
}
```

---

## 🧪 Test 2 : Connexion

### Via l'interface frontend

1. Allez sur : `http://localhost:4200/login`
2. Connectez-vous avec :
   - Username : `test@exemple.com`
   - Password : `Test1234`

**IMPORTANT** : Si vous n'avez pas vérifié l'OTP, vous aurez une erreur 403. Pour l'instant en développement, l'OTP n'est pas envoyé par email.

### Solution temporaire : Désactiver la vérification OTP

Dans `backend/src/services/auth.service.ts`, commentez ces lignes (TEMPORAIREMENT pour le développement) :

```typescript
// Ligne 212-214 pour les users
// if (user.otp !== null) {
//   throw new AppError("Veuillez d'abord valider votre compte...", 403);
// }

// Ligne 252-254 pour les organisations
// if (organisation.otp !== null) {
//   throw new AppError("Veuillez d'abord valider votre compte...", 403);
// }
```

### Via cURL

```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test@test.com\",\"password\":\"Test1234\"}" \
  -c cookies.txt
```

---

## 🧪 Test 3 : Créer un projet

### Via l'interface frontend

1. Connectez-vous en tant qu'organisation
2. Allez sur la page de soumission de projet
3. Remplissez le formulaire
4. Ajoutez les fichiers requis
5. Soumettez

### Vérification dans le code

Ouvrez `frontend/src/app/user/form/submission-wizard/submission-wizard.ts` et vérifiez que la méthode de soumission utilise bien :

```typescript
this.aprojetService.createProjet(formData).subscribe({
  next: (response) => {
    console.log('✅ Projet créé:', response);
    // Le projet est maintenant dans la base de données
  },
  error: (error) => {
    console.error('❌ Erreur:', error);
  }
});
```

### Via cURL

```bash
curl -X POST http://localhost:4000/api/aprojet-v1/createProjet \
  -H "Cookie: token=VOTRE_TOKEN_JWT" \
  -F "title=Mon Projet Test" \
  -F "objP=Objectif du projet" \
  -F "conjP=Contexte et justification" \
  -F "actPrin=Activités principales"
```

---

## 🔍 Vérifier les données dans la base

### Option 1 : Prisma Studio (Interface graphique)

```bash
cd backend
npx prisma studio
```

Ouvrez http://localhost:5555 et explorez :
- Table `Organisation` : Toutes les organisations inscrites
- Table `User` : Tous les agents FPBG
- Table `Projet` : Tous les projets soumis
- Table `AppelAProjet` : Tous les AAPs

### Option 2 : Requêtes SQL directes

```bash
cd backend
npx prisma studio
# ou
psql -h localhost -U votre_user -d fpbg_db
```

```sql
-- Voir toutes les organisations
SELECT * FROM "Organisation";

-- Voir tous les projets
SELECT * FROM "Projet";

-- Voir tous les AAPs
SELECT * FROM "AppelAProjet";
```

---

## 🐛 Résolution des problèmes

### Problème : "Les données ne sont pas sauvegardées"

**Causes possibles** :

1. **Le frontend n'appelle pas le backend**
   - Vérifiez dans la console (F12) → Onglet Network
   - Cherchez les requêtes vers `http://localhost:4000`
   - Si vous ne voyez aucune requête, le service frontend n'est pas utilisé

2. **Erreur CORS**
   ```
   Access to fetch at 'http://localhost:4000' from origin 'http://localhost:4200'
   has been blocked by CORS policy
   ```
   **Solution** : Vérifiez que dans `backend/src/server.ts` :
   ```typescript
   app.use(cors({
     origin: 'http://localhost:4200',
     credentials: true
   }));
   ```

3. **Erreur 401 (Non authentifié)**
   - Le cookie JWT n'est pas envoyé
   - Vérifiez que `withCredentials: true` est bien présent dans tous les services

4. **Erreur 403 (OTP non vérifié)**
   - Commentez temporairement la vérification OTP (voir Test 2)

### Problème : "Email OTP non reçu"

En développement, l'email n'est PAS envoyé (car pas de configuration SMTP).

**Solutions** :

1. **Pour le développement** : Désactivez la vérification OTP (voir Test 2)

2. **Pour la production** : Configurez les variables d'environnement SMTP dans `.env` :
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=votre-mot-de-passe-app
   SMTP_FROM=noreply@fpbg.sn
   NODE_ENV=production
   ```

---

## 📊 Test complet de bout en bout

### Scénario : Organisation soumet un projet

1. **Inscription**
   ```bash
   curl -X POST http://localhost:4000/api/registerOrganisation \
     -H "Content-Type: application/json" \
     -d '{"email":"ong@test.com","password":"Test1234","name":"Mon ONG"}'
   ```

2. **Vérifier OTP** (temporairement désactivé)

3. **Connexion**
   ```bash
   curl -X POST http://localhost:4000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"ong@test.com","password":"Test1234"}' \
     -c cookies.txt
   ```

4. **Créer un projet**
   ```bash
   curl -X POST http://localhost:4000/api/aprojet-v1/createProjet \
     -b cookies.txt \
     -F "title=Projet Santé" \
     -F "objP=Améliorer la santé des populations" \
     -F "stade=BROUILLON"
   ```

5. **Vérifier dans Prisma Studio**
   ```bash
   cd backend && npx prisma studio
   ```
   - Ouvrez http://localhost:5555
   - Allez dans la table `Projet`
   - Vous devriez voir votre projet créé

---

## ✅ Checklist de vérification

- [ ] Backend démarré sans erreurs
- [ ] Frontend démarré sans erreurs
- [ ] Inscription d'une organisation réussie
- [ ] Organisation visible dans Prisma Studio
- [ ] Connexion réussie avec token JWT
- [ ] Création de projet réussie
- [ ] Projet visible dans Prisma Studio
- [ ] Console navigateur sans erreurs CORS
- [ ] Cookies JWT bien stockés

---

## 📝 Notes importantes

1. **En développement** : L'OTP n'est pas envoyé par email, désactivez temporairement la vérification

2. **withCredentials** : Tous les services frontend doivent avoir `withCredentials: true` pour envoyer les cookies JWT

3. **URLs complètes** : Utilisez toujours `${this.ApiUrl}/${this.baseUrl}` dans les services frontend

4. **Prisma Studio** : Votre meilleur ami pour vérifier que les données sont bien enregistrées
   - Commande : `cd backend && npx prisma studio`
   - URL : http://localhost:5555

---

## 🚀 Prochaines étapes

Une fois que tout fonctionne :

1. Réactivez la vérification OTP
2. Configurez l'envoi d'emails SMTP
3. Ajoutez la gestion des fichiers (upload)
4. Testez tous les formulaires de votre application
5. Vérifiez les permissions (admin vs organisation)
