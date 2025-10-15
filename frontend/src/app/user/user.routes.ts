// app/user/user.routes.ts
import { Routes } from '@angular/router';

// @ts-ignore
export const userRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
  {
    path: 'register',
    loadComponent: () => import('./registration/registration').then((m) => m.Registration),
  },
  // OTP doit être accessible pubiquement
  { path: 'otp', loadComponent: () => import('./otp/otp').then((m) => m.Otp) },

  // tes composants existants côté user :
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'form/recap/:id',
    loadComponent: () => import('./form/recap/recap').then((m) => m.SubmissionRecap),
  },

  {
    path: 'form/recap', // fallback si pas d'id -> "current"
    redirectTo: 'form/recap/current',
    pathMatch: 'full',
  },
  {
    path: 'submission-wizard',
    loadComponent: () =>
      import('./form/submission-wizard/submission-wizard').then((m) => m.SubmissionWizard),
  },
];
