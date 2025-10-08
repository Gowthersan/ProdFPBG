// app/user/user.routes.ts
import { Routes } from '@angular/router';

// @ts-ignore
export const userRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./registration/registration').then(m => m.Registration) },
// OTP doit être accessible pubiquement
  { path: 'otp', loadComponent: () => import('./otp/otp').then(m => m.Otp) },

  // tes composants existants côté user :
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'submission-wizard', loadComponent: () => import('./form/submission-wizard/submission-wizard').then(m => m.SubmissionWizard) },
];
