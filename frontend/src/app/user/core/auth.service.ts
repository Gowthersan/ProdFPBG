// app/user/core/auth.service.ts
// Auth locale (LocalStorage). Login par NOM uniquement (pas d'email).

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

const LS = {
  token: 'fpbg.token',
  account: 'fpbg.account',
  users: 'fpbg.users',
};

export interface Account {
  login: string;            // <= ici: le NOM (contact), pas l'email
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  orgName?: string;
  orgType?: string;
  coverage?: string;
  email?: string;
  authorities: string[];
}

export interface LoginPayload {
  username: string;         // <= NOM (Personne de contact)
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  phone?: string;
  contact?: string;         // "Nom Prénom" (sert d'identifiant de connexion)
  position?: string;
  orgName?: string;
  orgType?: string;
  coverage?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  // === LOGIN : par NOM uniquement ===
  login(p: LoginPayload): Observable<void> {
    const users = this._getUsers();
    const uname = this._norm(p.username);

    // on ne regarde QUE le nom d'utilisateur (contact)
    const found = users.find(u => this._norm(u.username) === uname && u.password === p.password);
    const ok = !!found || (uname === 'admin' && p.password === 'admin');

    if (!ok) return throwError(() => new Error('INVALID_CREDENTIALS'));

    const contact = found?.contact ?? 'Admin';
    const [firstName, ...rest] = contact.split(' ');
    const account: Account = {
      login: contact,                        // <= identifiant affiché = NOM
      firstName,
      lastName: rest.join(' '),
      phone: found?.phone,
      position: found?.position,
      orgName: found?.orgName,
      orgType: found?.orgType,
      coverage: found?.coverage,
      email: found?.email,                   // conservé pour le profil, pas pour le login
      authorities: ['ROLE_USER'],
    };

    localStorage.setItem(LS.token, crypto.randomUUID());
    localStorage.setItem(LS.account, JSON.stringify(account));
    return of(void 0);
  }

  // === REGISTER : on stocke username = contact (pas l'email) ===
  register(p: RegisterPayload): Observable<void> {
    const users = this._getUsers();

    // contrôle de doublons (email et nom de connexion)
    if (users.some(u => this._norm(u.username) === this._norm(p.contact || ''))) {
      return throwError(() => new Error('USERNAME_TAKEN')); // nom déjà utilisé
    }
    if (users.some(u => this._norm(u.email) === this._norm(p.email))) {
      return throwError(() => new Error('EMAIL_TAKEN'));    // email déjà utilisé
    }

    users.push({
      username: p.contact,            // <= identifiant de connexion = NOM
      contact: p.contact,
      email: p.email,
      password: p.password,
      phone: p.phone,
      position: p.position,
      orgName: p.orgName,
      orgType: p.orgType,
      coverage: p.coverage,
    });

    localStorage.setItem(LS.users, JSON.stringify(users));
    return of(void 0);
  }

  me() {
    const raw = localStorage.getItem(LS.account);
    if (!raw || !localStorage.getItem(LS.token)) {
      return throwError(() => new Error('UNAUTHENTICATED'));
    }
    return of(JSON.parse(raw) as Account);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(LS.token) && !!localStorage.getItem(LS.account);
  }

  logout(): Observable<void> {
    localStorage.removeItem(LS.token);
    localStorage.removeItem(LS.account);
    return of(void 0);
  }

  // === helpers ===
  private _getUsers(): any[] {
    try { return JSON.parse(localStorage.getItem(LS.users) || '[]'); }
    catch { return []; }
  }
  private _norm(v: string | undefined | null): string {
    return (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
