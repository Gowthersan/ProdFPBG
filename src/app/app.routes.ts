// app.routes.ts (exemple)
import { Routes } from '@angular/router';
import { userRoutes } from './user/user.routes';
import {adminRoutes} from './admin/admin.route';
import {redirectIfLoggedIn} from './core/redirect-if-logged-in.guard';

export const routes: Routes = [
  // Accueil publique (landing)
  { path: '', loadComponent: () => import('./user/home/home').then(m => m.Home) },
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public global
  { path: 'otp', loadComponent: () => import('./user/otp/otp').then(m => m.Otp) },
  { path: 'page404', loadComponent: () => import('./page404/page404').then(m => m.Page404) },
  { path: 'appelaprojet', loadComponent: () => import('./appelaprojet/appelaprojet').then(m => m.Appelaprojet) },
  { path: 'liste-appels', loadComponent: () => import('./liste-appels/liste-appels').then(m => m.ListeAppels) },



  // Groupe "user"
  { path: '', children: userRoutes }, //
  { path: 'admin', children: adminRoutes }, //


  // Récap projet (page dédiée) — ex: /admin/recap/123
  { path: 'admin/recap/:id',
    loadComponent: () => import('./admin/recap/recap').then(m => m.SubmissionRecap)
  },

   // Récap projet (page dédiée) — ex: /user/recap/123
  { path: 'user/recap/:id',
    loadComponent: () => import('./admin/recap/recap').then(m => m.SubmissionRecap)
  },

  // Tableau de bord admin (liste)
  { path: 'admin/dashboard',
    loadComponent: () => import('./admin/dashboard/dashboard').then(m => m.Dashboard)
  },

  // Fallback
  { path: '**', redirectTo: 'page404' }
];
