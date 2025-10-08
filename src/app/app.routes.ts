// app.routes.ts (exemple)
import { Routes } from '@angular/router';
import { userRoutes } from './user/user.routes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public global
  { path: 'login', loadComponent: () => import('./user/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./user/registration/registration').then(m => m.Registration) },
  { path: 'otp', loadComponent: () => import('./user/otp/otp').then(m => m.Otp) },

  // Groupe "user"
  { path: '', children: userRoutes }, // ⬅️ monte TOUT le bloc user ici

  // 404
  { path: '**', redirectTo: 'login' },
];
