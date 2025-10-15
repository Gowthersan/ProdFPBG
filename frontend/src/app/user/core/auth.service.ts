// app/user/core/auth.service.ts
// Auth avec backend API (emails envoyés via Nodemailer backend)

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);
  private apiUrl = environment.urlServer + '/api/auth';

  // === LOGIN : via backend API ===
  login(p: LoginPayload): Observable<void> {
    return this.http.post<any>(`${this.apiUrl}/login`, p, { withCredentials: true }).pipe(
      map((response) => {
        const user = response.user;
        const account: Account = {
          login: user.username || user.contact || user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.numTel || user.phone,
          position: user.position,
          orgName: user.orgName || user.name,
          orgType: user.orgType || user.type,
          coverage: user.coverage,
          email: user.email,
          authorities: ['ROLE_USER'],
        };

        localStorage.setItem(LS.token, response.token);
        localStorage.setItem(LS.account, JSON.stringify(account));
      }),
      catchError((error) => {
        console.error('❌ Erreur login:', error);
        return throwError(() => new Error('INVALID_CREDENTIALS'));
      })
    );
  }

  // === REGISTER : appel backend pour générer et envoyer OTP via Nodemailer ===
  registerOrganisation(data: {
    orgName: string;
    orgType: string;
    coverage: string;
    grantType: string;
    orgEmail: string;
    orgPhone: string;
    contact: string;
    position: string;
    phone: string;
    email: string;
    password: string;
  }): Observable<{ email: string }> {
    // Préparer les données au format backend
    const payload = {
      email: data.email,
      username: data.contact, // username = nom de contact
      password: data.password,
      name: data.orgName,
      type: data.orgType,
      grantType: data.grantType,
      contact: data.contact,
      numTel: data.phone,
      postalAddress: null,
      physicalAddress: null,
    };

    return this.http.post<any>(`${this.apiUrl}/register/organisation`, payload).pipe(
      map((response) => {
        console.log('✅ Backend response:', response);
        // Le backend retourne { email, message }
        // L'email OTP est envoyé automatiquement par le backend via Nodemailer
        return response;
      }),
      catchError((error) => {
        console.error('❌ Erreur registration backend:', error);
        const msg = error?.error?.message || error?.message || 'REGISTRATION_FAILED';
        return throwError(() => new Error(msg));
      })
    );
  }

  // === VERIFY OTP : vérifier via backend ===
  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-otp`, { email, otp }, { withCredentials: true }).pipe(
      map((response) => {
        const user = response.user;
        const account: Account = {
          login: user.username || user.contact || user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.numTel || user.phone,
          position: user.position,
          orgName: user.orgName || user.name,
          orgType: user.orgType || user.type,
          coverage: user.coverage,
          email: user.email,
          authorities: ['ROLE_USER'],
        };

        localStorage.setItem(LS.token, response.token);
        localStorage.setItem(LS.account, JSON.stringify(account));

        // ✅ Retourner la réponse complète (avec redirectTo)
        return response;
      }),
      catchError((error) => {
        console.error('❌ Erreur verify OTP:', error);
        return throwError(() => new Error(error?.error?.message || 'OTP_INVALID'));
      })
    );
  }

  // === RESEND OTP : redemander un OTP via backend ===
  resendOtp(email: string): Observable<{ email: string }> {
    return this.http.post<any>(`${this.apiUrl}/resend-otp`, { email }).pipe(
      map((response) => {
        console.log('✅ OTP renvoyé:', response);
        // L'email OTP est envoyé automatiquement par le backend via Nodemailer
        return response;
      }),
      catchError((error) => {
        console.error('❌ Erreur resend OTP:', error);
        return throwError(() => new Error('RESEND_FAILED'));
      })
    );
  }

  // === REGISTER (ancienne méthode locale - à garder pour compatibilité) ===
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
