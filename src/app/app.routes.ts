// app.routes.ts (exemple)
import { Routes } from '@angular/router';
import { userRoutes } from './user/user.routes';

export const routes: Routes = [
  // Accueil publique (landing)
  { path: '', loadComponent: () => import('./user/home/home').then(m => m.Home) },
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public global
  { path: 'login', loadComponent: () => import('./user/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./user/registration/registration').then(m => m.Registration) },
  { path: 'otp', loadComponent: () => import('./user/otp/otp').then(m => m.Otp) },

  // Groupe "user"
  { path: '', children: userRoutes }, // ⬅️ monte TOUT le bloc user ici

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
  { path: '**', redirectTo: 'login' }
];
