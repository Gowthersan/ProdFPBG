// app/admin.admin.routes.ts
import { Routes } from '@angular/router';


// @ts-ignore
export const adminRoutes: Routes = [

  { path: 'login', loadComponent: () => import('./login/login').then(m => m.Login) },

  // tes composants existants côté user :
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
  {
    path: 'form/recap/:id',
    loadComponent: () => import('./recap/recap').then(m => m.SubmissionRecap),
  },
  {
    path: 'form/recap',           // fallback si pas d'id -> "current"
    redirectTo: 'form/recap/current',
    pathMatch: 'full',
  },
  // { path: 'submission-wizard', loadComponent: () => import('./form/submission-wizard/submission-wizard').then(m => m.SubmissionWizard) },
];
