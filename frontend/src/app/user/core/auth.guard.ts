// app/user/core/auth.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanMatchFn = (route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1) Non connecté → on renvoie au login
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // 2) Logique d’onboarding (flag localStorage)
  const path = segments.map((s) => s.path).join('/');
  const onboardingDone = localStorage.getItem('onboarding_done') === '1';

  // Empêcher d'entrer sur dashboard si onboarding non fini
  if (path === 'dashboard' && !onboardingDone) {
    router.navigate(['/form']); // ou '/user/form' selon ton parent route
    return false;
  }

  // Empêcher d'entrer sur form si onboarding déjà fini
  if ((path === 'form' || path === 'soumission') && onboardingDone) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
