# 🚀 GUIDE DE MIGRATION - FPBG (Français)

## ✅ Étapes déjà complétées

1. ✅ **Schema Prisma mis à jour** ([backend/prisma/schema.prisma](backend/prisma/schema.prisma))

   - Tous les modèles renommés en français
   - Tous les champs renommés selon le PDF

2. ✅ **Interfaces TypeScript Frontend créées** ([frontend/src/app/types/models.ts](frontend/src/app/types/models.ts))

   - Tous les types alignés sur le nouveau schema
   - Enums, interfaces, DTOs, labels pour l'UI

3. ✅ **DTOs Backend mis à jour** ([backend/src/types/index.ts](backend/src/types/index.ts))
   - Nouveaux DTOs en français
   - Anciens DTOs conservés pour compatibilité

---

## 📋 Étapes à suivre (dans l'ordre)

### ÉTAPE 1 : Migration de la base de données

```bash
# Se placer dans le dossier backend
cd backend

# Générer le client Prisma avec le nouveau schema
npx prisma generate

# Option A : Migration avec conservation des données (recommandé)
npx prisma migrate dev --name migration_francais

# Option B : Reset complet de la DB (si problèmes ou si tu veux repartir de zéro)
# npx prisma migrate reset

# Vérifier le schema dans Prisma Studio
npx prisma studio
```

⚠️ **IMPORTANT** :

- Si tu as des **données existantes**, Prisma va essayer de mapper automatiquement
- Tu devras peut-être répondre à des questions sur le mapping des colonnes
- En cas de problème, utilise `prisma migrate reset` pour tout réinitialiser

---

### ÉTAPE 2 : Adapter le service d'authentification backend

**Fichiers à modifier** :

- `backend/src/services/auth.service.ts`
- `backend/src/routes/auth.routes.ts`

**Changements à faire** :

```typescript
// AVANT (dans auth.service.ts ligne 39)
const existingUser = await prisma.user.findFirst({ ... });

// APRÈS
const existingUser = await prisma.utilisateur.findFirst({ ... });
```

**Liste complète des renommages dans auth.service.ts** :

- `prisma.user` → `prisma.utilisateur`
- `prisma.organisation` → reste `prisma.organisation`
- `password` → `hashMotPasse` (dans les creates)
- `firstName/lastName` → `prenom/nom`
- `numTel` → `telephone`

---

### ÉTAPE 3 : Créer le service pour les demandes de subvention

**Créer** : `backend/src/services/demandeSubvention.service.ts`

```typescript
import prisma from '../config/db.js';
import { DemandeSubventionDTO } from '../types/index.js';

export class DemandeSubventionService {
  // Créer une nouvelle demande
  async creer(data: DemandeSubventionDTO) {
    return await prisma.demandeSubvention.create({
      data: {
        titre: data.titre!,
        localisation: data.localisation!,
        groupeCible: data.groupeCible!,
        justificationContexte: data.justificationContexte!,
        objectifs: data.objectifs!,
        resultatsAttendus: data.resultatsAttendus!,
        dureeMois: data.dureeMois!,
        dateDebutActivites: new Date(data.dateDebutActivites!),
        dateFinActivites: new Date(data.dateFinActivites!),
        resumeActivites: data.resumeActivites!,
        texteDurabilite: data.texteDurabilite!,
        texteReplication: data.texteReplication,
        stadeProjet: data.stadeProjet || 'DEMARRAGE',
        aFinancement: data.aFinancement || false,
        detailsFinancement: data.detailsFinancement,
        idOrganisation: data.idOrganisation,
        idSoumisPar: data.idSoumisPar,
        idAppelProjets: data.idAppelProjets
      },
      include: {
        organisation: true,
        soumisPar: true,
        appelProjets: true
      }
    });
  }

  // Récupérer toutes les demandes
  async obtenirTout() {
    return await prisma.demandeSubvention.findMany({
      include: {
        organisation: true,
        soumisPar: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true
          }
        },
        appelProjets: {
          include: {
            typeSubvention: true
          }
        }
      },
      orderBy: {
        creeLe: 'desc'
      }
    });
  }

  // Récupérer les demandes d'un utilisateur
  async obtenirParUtilisateur(idUtilisateur: string) {
    return await prisma.demandeSubvention.findMany({
      where: { idSoumisPar: idUtilisateur },
      include: {
        organisation: true,
        appelProjets: {
          include: {
            typeSubvention: true
          }
        },
        activites: true,
        risques: true,
        piecesJointes: true
      },
      orderBy: {
        creeLe: 'desc'
      }
    });
  }

  // Récupérer une demande par ID
  async obtenirParId(id: string) {
    return await prisma.demandeSubvention.findUnique({
      where: { id },
      include: {
        organisation: true,
        soumisPar: true,
        appelProjets: {
          include: {
            typeSubvention: true,
            thematiques: true
          }
        },
        activites: {
          include: {
            sousActivites: true,
            lignesBudget: true
          }
        },
        risques: true,
        piecesJointes: true,
        evaluations: {
          include: {
            evaluateur: true
          }
        },
        contrat: true,
        rapports: true,
        cofinanceurs: true
      }
    });
  }

  // Mettre à jour une demande
  async mettreAJour(id: string, data: DemandeSubventionDTO) {
    return await prisma.demandeSubvention.update({
      where: { id },
      data: {
        titre: data.titre,
        localisation: data.localisation,
        objectifs: data.objectifs
        // ... autres champs
      }
    });
  }

  // Supprimer une demande
  async supprimer(id: string) {
    return await prisma.demandeSubvention.delete({
      where: { id }
    });
  }

  // Statistiques pour le dashboard admin
  async obtenirStatistiques() {
    const total = await prisma.demandeSubvention.count();
    const parStatut = await prisma.demandeSubvention.groupBy({
      by: ['statut'],
      _count: true
    });

    return {
      total,
      parStatut: parStatut.map((s) => ({
        statut: s.statut,
        nombre: s._count
      }))
    };
  }
}

export default new DemandeSubventionService();
```

---

### ÉTAPE 4 : Adapter le formulaire d'inscription frontend

**Fichier** : `frontend/src/app/user/registration/registration.ts`

**Changements** :

```typescript
// Importer les nouveaux types
import { TypeOrganisation, InscriptionOrganisationDTO } from '../../types/models';

// Mettre à jour le formulaire
public form = this.fb.group({
  // ÉTAPE 1 — organisme
  nomOrganisation: ['', Validators.required],
  typeOrganisation: ['', Validators.required],
  couvertureGeographique: ['', Validators.required],
  typeSubvention: ['', Validators.required],
  emailOrganisation: ['', [Validators.required, Validators.email]],
  telephoneOrganisation: ['', [Validators.required, gabonPhoneValidator()]],

  // ÉTAPE 2 — demandeur
  personneContact: ['', Validators.required],
  fonction: [''],
  telephone: ['', [Validators.required, gabonPhoneValidator()]],
  email: ['', [Validators.required, Validators.email]],
  motDePasse: ['', [Validators.required, Validators.minLength(6)]],
  confirmation: ['', [Validators.required, Validators.minLength(6)]],
});

// Adapter la méthode submit()
public submit() {
  // ... validations ...

  const data: InscriptionOrganisationDTO = {
    nomOrganisation: this.form.value.nomOrganisation!,
    typeOrganisation: this.form.value.typeOrganisation! as TypeOrganisation,
    couvertureGeographique: this.form.value.couvertureGeographique!,
    typeSubvention: this.form.value.typeSubvention!,
    emailOrganisation: this.form.value.emailOrganisation!,
    telephoneOrganisation: this.form.value.telephoneOrganisation!,
    personneContact: this.form.value.personneContact!,
    fonction: this.form.value.fonction || '',
    telephone: this.form.value.telephone!,
    email: this.form.value.email!,
    motDePasse: this.form.value.motDePasse!,
  };

  this.auth.registerOrganisation(data).subscribe({ /* ... */ });
}
```

**Fichier HTML** : `frontend/src/app/user/registration/registration.html`

Renommer tous les `formControlName` :

- `nom_organisation` → `nomOrganisation`
- `type` → `typeOrganisation`
- `couvertureGeographique` → `couvertureGeographique`
- `typeSubvention` → `typeSubvention`
- `orgEmail` → `emailOrganisation`
- `orgPhone` → `telephoneOrganisation`
- `contact` → `personneContact`
- `position` → `fonction`
- `password` → `motDePasse`
- `confirm` → `confirmation`

---

### ÉTAPE 5 : Créer le service Angular pour les demandes

**Créer** : `frontend/src/app/services/api/demande-subvention.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandeSubvention, CreationDemandeSubventionDTO } from '../../types/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DemandeSubventionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/demandes`;

  creer(data: CreationDemandeSubventionDTO): Observable<DemandeSubvention> {
    return this.http.post<DemandeSubvention>(this.baseUrl, data);
  }

  obtenirTout(): Observable<DemandeSubvention[]> {
    return this.http.get<DemandeSubvention[]>(this.baseUrl);
  }

  obtenirMesDemandes(): Observable<DemandeSubvention[]> {
    return this.http.get<DemandeSubvention[]>(`${this.baseUrl}/mes-demandes`);
  }

  obtenirParId(id: string): Observable<DemandeSubvention> {
    return this.http.get<DemandeSubvention>(`${this.baseUrl}/${id}`);
  }

  mettreAJour(id: string, data: Partial<DemandeSubvention>): Observable<DemandeSubvention> {
    return this.http.put<DemandeSubvention>(`${this.baseUrl}/${id}`, data);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  obtenirStatistiques(): Observable<any> {
    return this.http.get(`${this.baseUrl}/statistiques`);
  }
}
```

---

### ÉTAPE 6 : Connecter les dashboards

#### **User Dashboard** (`frontend/src/app/user/dashboard/dashboard.ts`)

```typescript
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import { DemandeSubvention, LABELS_STATUT_SOUMISSION } from '../../types/models';

export class Dashboard {
  private demandeService = inject(DemandeSubventionService);

  ngOnInit() {
    this.chargerDonnees();
  }

  chargerDonnees() {
    this.demandeService.obtenirMesDemandes().subscribe({
      next: (demandes) => {
        if (demandes.length > 0) {
          const derniere = demandes[0];
          this.projectName.set(derniere.titre);
          this.status.set(LABELS_STATUT_SOUMISSION[derniere.statut]);
          this.lastUpdate.set(new Date(derniere.misAJourLe).toLocaleDateString());
        }
      },
      error: (err) => console.error('Erreur chargement demandes:', err)
    });
  }
}
```

#### **Admin Dashboard** (`frontend/src/app/admin/dashboard/dashboard.ts`)

```typescript
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';

export class AdminDashboard {
  private demandeService = inject(DemandeSubventionService);

  ngOnInit() {
    this.chargerStatistiques();
  }

  chargerStatistiques() {
    this.demandeService.obtenirStatistiques().subscribe({
      next: (stats) => {
        this.totalProjets.set(stats.total);
        // Mapper les stats par statut
        const enRevue = stats.parStatut.find((s) => s.statut === 'EN_REVUE');
        const approuves = stats.parStatut.find((s) => s.statut === 'APPROUVE');
        this.projetsEnAttente.set(enRevue?.nombre || 0);
        this.projetsValides.set(approuves?.nombre || 0);
      },
      error: (err) => console.error('Erreur stats:', err)
    });
  }
}
```

---

### ÉTAPE 7 : Configuration uploadthing

```bash
# Backend
cd backend
npm install uploadthing @uploadthing/node

# Frontend
cd ../frontend
npm install uploadthing @uploadthing/angular
```

**Backend - Créer** : `backend/src/config/uploadthing.ts`

```typescript
import { createUploadthing, type FileRouter } from 'uploadthing/server';

const f = createUploadthing();

export const uploadRouter = {
  pdfUploader: f({ pdf: { maxFileSize: '16MB', maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // Authentification de l'utilisateur
      const user = req.user; // depuis le JWT middleware
      if (!user) throw new Error('Non autorisé');
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complet pour userId:', metadata.userId);
      console.log('URL fichier:', file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    })
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

---

## 🎯 Commandes finales de test

```bash
# Backend
cd backend
npm run dev

# Frontend (nouveau terminal)
cd frontend
npm start

# Tester l'inscription
# http://localhost:4200/registration

# Tester la soumission
# http://localhost:4200/soumission
```

---

## 📌 Checklist finale

- [ ] Migration Prisma réussie (`npx prisma generate` + `npx prisma migrate dev`)
- [ ] Backend démarre sans erreur
- [ ] Frontend compile sans erreur TypeScript
- [ ] L'inscription fonctionne avec les nouveaux champs
- [ ] Le dashboard utilisateur affiche les données
- [ ] Le dashboard admin affiche les statistiques
- [ ] L'upload de PDF fonctionne avec uploadthing
- [ ] Les demandes de subvention sont enregistrées en DB

---

## 🆘 En cas de problème

1. **Erreurs TypeScript** : Vérifier que les imports utilisent les nouveaux noms
2. **Erreurs Prisma** : Relancer `npx prisma generate`
3. **Erreurs de migration** : Utiliser `npx prisma migrate reset` pour tout réinitialiser
4. **Erreurs backend** : Vérifier que tous les `prisma.user` sont devenus `prisma.utilisateur`
5. **Erreurs frontend** : Vérifier que tous les services utilisent les nouveaux types de `types/models.ts`

---

**📧 Besoin d'aide ?** Reviens me voir avec l'erreur précise et je t'aiderai ! 🚀
