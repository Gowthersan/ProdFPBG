# Guide de Test - Connexion Frontend ↔ Backend

## ✅ Backend démarré et fonctionnel
Le backend tourne sur `http://localhost:4000`

### Tests effectués :
1. **Health Check** : ✅ `http://localhost:4000/health`
2. **Route AAP** : ✅ `http://localhost:4000/api/aap` (retourne `[]` - base vide)

---

## 🧪 Comment tester l'intégration

### Option 1 : Test rapide avec un composant existant

Ouvrez un de vos composants (par exemple `liste-appels.ts`) et ajoutez ce code :

```typescript
import { Component, OnInit } from '@angular/core';
import { AAPService } from './services/api/aap.service';

@Component({
  selector: 'app-liste-appels',
  templateUrl: './liste-appels.html',
  styleUrls: ['./liste-appels.css']
})
export class ListeAppelsComponent implements OnInit {
  aaps: any[] = [];
  loading = false;
  error: string = '';

  constructor(private aapService: AAPService) {}

  async ngOnInit() {
    await this.chargerAAPs();
  }

  async chargerAAPs() {
    this.loading = true;
    this.error = '';

    try {
      this.aaps = await this.aapService.getAllAAPs();
      console.log('✅ AAPs chargés:', this.aaps);
    } catch (error: any) {
      this.error = error.response?.data?.error || error.message;
      console.error('❌ Erreur:', error);
    } finally {
      this.loading = false;
    }
  }
}
```

Dans le template HTML :
```html
<div *ngIf="loading">Chargement...</div>
<div *ngIf="error" class="error">Erreur: {{error}}</div>
<div *ngIf="!loading && !error">
  <p>Nombre d'AAPs: {{aaps.length}}</p>
  <div *ngFor="let aap of aaps">
    <h3>{{aap.titre}}</h3>
    <p>{{aap.resume}}</p>
  </div>
</div>
```

### Option 2 : Test depuis la console du navigateur

1. Démarrez le frontend : `cd frontend && npm start`
2. Ouvrez votre navigateur sur `http://localhost:4200`
3. Ouvrez la console (F12)
4. Testez les appels API :

```javascript
// Test 1 : Récupérer tous les AAPs
fetch('http://localhost:4000/api/aap', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('AAPs:', data));

// Test 2 : Récupérer les types d'organisations
fetch('http://localhost:4000/api/aap/types/organisations', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('Types:', data));

// Test 3 : Health check
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(data => console.log('Backend:', data));
```

### Option 3 : Créer un composant de test dédié

Créez `frontend/src/app/test-api/test-api.component.ts` :

```typescript
import { Component } from '@angular/core';
import { AAPService } from '../services/api/aap.service';
import { ProjetService } from '../services/api/projet.service';
import { OrganisationService } from '../services/api/organisation.service';

@Component({
  selector: 'app-test-api',
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h1>🧪 Test API Backend</h1>

      <button (click)="testerAAPs()">Tester AAPs</button>
      <button (click)="testerProjets()">Tester Projets</button>
      <button (click)="testerTypes()">Tester Types Org</button>

      <pre style="background: #f5f5f5; padding: 20px; margin-top: 20px;">
{{ resultat | json }}
      </pre>
    </div>
  `
})
export class TestApiComponent {
  resultat: any = null;

  constructor(
    private aapService: AAPService,
    private projetService: ProjetService,
    private orgService: OrganisationService
  ) {}

  async testerAAPs() {
    try {
      this.resultat = await this.aapService.getAllAAPs();
      console.log('✅ AAPs:', this.resultat);
    } catch (error) {
      this.resultat = { error };
      console.error('❌ Erreur:', error);
    }
  }

  async testerProjets() {
    try {
      this.resultat = await this.projetService.getAllProjetsNoPage();
      console.log('✅ Projets:', this.resultat);
    } catch (error) {
      this.resultat = { error };
      console.error('❌ Erreur:', error);
    }
  }

  async testerTypes() {
    try {
      this.resultat = await this.aapService.getAllTypeOrganisations();
      console.log('✅ Types:', this.resultat);
    } catch (error) {
      this.resultat = { error };
      console.error('❌ Erreur:', error);
    }
  }
}
```

Ajoutez dans vos routes (`app.routes.ts`) :
```typescript
{
  path: 'test-api',
  loadComponent: () => import('./test-api/test-api.component').then(m => m.TestApiComponent)
}
```

Puis accédez à : `http://localhost:4200/test-api`

---

## 📝 Tester les appels avec données

### Créer un AAP (Admin uniquement)

```bash
curl -X POST http://localhost:4000/api/aap \
  -H "Content-Type: application/json" \
  -H "Cookie: token=VOTRE_TOKEN_JWT" \
  -d '{
    "code": "AAP-2025-001",
    "titre": "Appel à Projets Test",
    "resume": "Ceci est un test",
    "contexte": "Contexte du test",
    "objectif": "Objectif du test",
    "contactEmail": "test@fpbg.sn",
    "geographicEligibility": ["Dakar", "Thiès"],
    "eligibleOrganisations": ["ONG", "PME"],
    "eligibleActivities": ["Santé", "Agriculture"],
    "launchDate": "2025-01-01",
    "annexes": [],
    "tags": ["test", "santé"]
  }'
```

### Se connecter

```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "votre_username",
    "password": "votre_password"
  }'
```

---

## 🚀 Prochaines étapes

1. Démarrez le frontend : `cd frontend && npm start`
2. Vérifiez que CORS est bien configuré (déjà fait dans server.ts)
3. Testez les appels depuis votre composant
4. Vérifiez les cookies dans les DevTools → Application → Cookies

## ⚠️ Vérifications importantes

- ✅ Backend démarré sur port 4000
- ✅ Prisma connecté à la base de données
- ✅ Routes API configurées
- ✅ Services frontend créés
- ✅ Intercepteur HTTP configuré
- ⏳ Frontend à démarrer sur port 4200

## 🐛 En cas d'erreur CORS

Si vous voyez une erreur CORS, vérifiez dans `backend/src/server.ts` que :
```typescript
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

## 📊 Structure des données

Consultez `backend/prisma/schema.prisma` pour voir tous les modèles disponibles :
- User (agents FPBG)
- Organisation
- Projet
- AppelAProjet (AAP)
- TypeOrganisation
- Subvention
- Thematique
