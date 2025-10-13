# 🔗 Guide d'intégration Frontend Angular

Ce guide explique comment adapter votre frontend Angular pour qu'il fonctionne parfaitement avec le nouveau backend.

## 📋 Changements nécessaires

### 1. Configuration de l'environnement

**Fichier : `frontend/src/environments/environment.development.ts`**

```typescript
export const environDev = {
  production: false,
  urlServer: 'http://localhost:4000'
};
```

**Fichier : `frontend/src/environments/environment.ts`**

```typescript
export const environment = {
  production: true,
  urlServer: 'https://votre-api-backend.com'
};
```

---

### 2. Service d'authentification

**Fichier : `frontend/src/app/services/auth/authentifcationservice.ts`**

✅ **Aucun changement nécessaire !** Le service existant est parfaitement compatible avec le backend.

Les endpoints suivants fonctionnent tel quel :
- `POST /api/registeragentfpbg`
- `POST /api/registerOrganisation`
- `GET /api/otpverifcation/:otp`
- `POST /api/login`
- `GET /api/authenticate`
- `GET /api/disconnected`
- `POST /api/refresh-token`

---

### 3. Service des projets

**Fichier : `frontend/src/app/services/aprojetv1.ts`**

✅ **Aucun changement nécessaire !** Tous les endpoints sont compatibles :

- `POST /api/aprojet-v1/createProjet`
- `GET /api/aprojet-v1` (pagination)
- `GET /api/aprojet-v1/all`
- `GET /api/aprojet-v1/:id`
- `GET /api/aprojet-v1/user`
- `PUT /api/aprojet-v1/:id`
- `PATCH /api/aprojet-v1/:id`
- `DELETE /api/aprojet-v1/:id`

---

### 4. Service des organisations

**Fichier : `frontend/src/app/services/organisme/organismeservice.ts`**

✅ **Aucun changement nécessaire !**

- `GET /api/organisations/organismeconnected`

---

### 5. Gestion des cookies et credentials

**Important :** Pour que les cookies JWT fonctionnent correctement, assurez-vous que toutes vos requêtes HTTP incluent `withCredentials: true`.

**Exemple dans un service Angular :**

```typescript
import { HttpClient } from '@angular/common/http';

constructor(private http: HttpClient) {}

// ✅ CORRECT
login(credentials: LoginVM) {
  return this.http.post(`${this.apiUrl}/api/login`, credentials, {
    withCredentials: true // <-- IMPORTANT !
  });
}

// ✅ CORRECT
getProjects() {
  return this.http.get(`${this.apiUrl}/api/aprojet-v1/all`, {
    withCredentials: true // <-- IMPORTANT !
  });
}
```

---

### 6. Intercepteur HTTP (optionnel mais recommandé)

Créez un intercepteur pour ajouter automatiquement `withCredentials: true` à toutes les requêtes.

**Fichier : `frontend/src/app/interceptors/credentials.interceptor.ts`**

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Cloner la requête et ajouter withCredentials
    const clonedRequest = req.clone({
      withCredentials: true
    });

    return next.handle(clonedRequest);
  }
}
```

**Enregistrez l'intercepteur dans `app.config.ts` :**

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CredentialsInterceptor } from './interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([CredentialsInterceptor])
    ),
    // ... autres providers
  ]
};
```

---

### 7. Gestion des erreurs

Le backend retourne des erreurs au format suivant :

```json
{
  "error": "Message d'erreur descriptif"
}
```

**Exemple de gestion des erreurs dans un composant :**

```typescript
login(credentials: LoginVM) {
  this.authService.login(credentials).subscribe({
    next: (response) => {
      console.log('Login successful:', response);
      // Redirection ou autre logique
    },
    error: (err) => {
      // Le backend renvoie { error: "message" }
      const errorMessage = err.error?.error || 'Une erreur est survenue';
      console.error('Login error:', errorMessage);
      alert(errorMessage);
    }
  });
}
```

---

### 8. Modification du modèle ProjetFormDTO

Le backend utilise des **IDs de type String (UUID)** au lieu d'Int. Mettez à jour votre modèle :

**Fichier : `frontend/src/app/model/projetFormdto.ts`**

```typescript
export interface ProjetFormDTO {
  id?: string; // ← Changé de number à string
  idOrganisme?: OrganisationDTO;

  // ... reste des champs identiques
}
```

**De même pour OrganisationDTO et TypeOrganisation :**

```typescript
export interface TypeOrganisation {
  id: string; // ← Changé de number à string
  nom: string;
}

export interface OrganisationDTO {
  id?: string; // ← Ajoutez ce champ
  name?: string;
  email: string;
  // ... reste des champs
}
```

---

### 9. Appels aux nouveaux endpoints

#### Récupérer les types d'organisations

```typescript
// Service : organismeservice.ts
getAllTypeOrganisations(): Observable<TypeOrganisation[]> {
  return this.http.get<TypeOrganisation[]>(
    `${this.ApiUrl}/api/aap/types/organisations`,
    { withCredentials: true }
  );
}
```

#### Récupérer les appels à projets

```typescript
// Créer un nouveau service : aap.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environDev } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AAPService {
  private apiUrl = environDev.urlServer;

  constructor(private http: HttpClient) {}

  getAllAAPs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/aap`, {
      withCredentials: true
    });
  }

  getAAPByCode(code: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/aap/code/${code}`, {
      withCredentials: true
    });
  }
}
```

---

### 10. Tester la connexion frontend-backend

**Étape 1 : Démarrer le backend**
```bash
cd backend
npm run dev
```

**Étape 2 : Démarrer le frontend**
```bash
cd frontend
ng serve
```

**Étape 3 : Tester l'inscription**
1. Allez sur `http://localhost:4200/register`
2. Remplissez le formulaire d'inscription
3. Vérifiez que vous recevez bien un email avec le code OTP
4. Entrez le code OTP pour valider votre compte

**Étape 4 : Tester la connexion**
1. Allez sur `http://localhost:4200/login`
2. Connectez-vous avec vos identifiants
3. Vérifiez que vous êtes bien redirigé vers le dashboard

---

### 11. Débogage

#### Problème : CORS Error

**Solution :**
Vérifiez que le backend autorise bien votre frontend dans le fichier `.env` :
```env
FRONT_URL="http://localhost:4200"
```

#### Problème : Cookies non envoyés

**Solution :**
Assurez-vous que toutes vos requêtes incluent `withCredentials: true`.

#### Problème : JWT invalide

**Solution :**
1. Vérifiez que le `JWT_SECRET` est le même dans le `.env` du backend
2. Supprimez les cookies de votre navigateur et reconnectez-vous

#### Problème : OTP non reçu

**Solution :**
1. Vérifiez vos identifiants Gmail dans le `.env`
2. Vérifiez que vous avez généré un mot de passe d'application
3. Consultez les logs du backend pour voir les erreurs

---

### 12. Checklist finale

- [ ] Variables d'environnement configurées (`environment.development.ts`)
- [ ] `withCredentials: true` sur toutes les requêtes HTTP
- [ ] Modèles TypeScript mis à jour (IDs en string)
- [ ] Intercepteur HTTP configuré (optionnel)
- [ ] Backend démarré sur le port 4000
- [ ] Frontend démarré sur le port 4200
- [ ] Test de connexion réussi
- [ ] Test de création de projet réussi

---

### 13. Exemples de tests unitaires

**Test du service d'authentification :**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Authentifcationservice } from './authentifcationservice';

describe('Authentifcationservice', () => {
  let service: Authentifcationservice;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [Authentifcationservice]
    });
    service = TestBed.inject(Authentifcationservice);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should login successfully', () => {
    const mockResponse = {
      token: 'mock-jwt-token',
      user: { id: '1', username: 'test' }
    };

    service.login({ username: 'test', password: 'password' }).subscribe(response => {
      expect(response.body).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:4000/api/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
```

---

## 🎉 Félicitations !

Votre frontend Angular est maintenant entièrement intégré avec le backend. Tous les endpoints sont fonctionnels et sécurisés.

Pour toute question, consultez la [documentation API](./API_DOCUMENTATION.md).
