// app/user/core/auth.service.ts
// Auth avec backend API (emails envoyés via Nodemailer backend)

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const LS = {
  token: 'fpbg.token',
  account: 'fpbg.account',
  users: 'fpbg.users',
};

export interface Account {
  login: string; // <= ici: le NOM (personneContact), pas l'email
  prenom?: string;
  nom?: string;
  telephone?: string;
  fonction?: string;
  nom_organisation?: string;
  typeUtilisateur?: string;
  motDePasse?: string;
  email?: string;
  authorities: string[];
}

export interface LoginPayload {
  email: string; // <= NOM (Personne de personneContact)
  motDePasse: string;
}

export interface RegisterPayload {
  email: string;
  motDePasse: string;
  phone?: string;
  personneContact?: string; // "Nom Prénom" (sert d'identifiant de connexion)
  fonction?: string;
  nom_organisation?: string;
  type?: string;
  couvertureGeographique?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.urlServer + '/api/auth';

  // === LOGIN : via backend API ===
  login(p: LoginPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, p, { withCredentials: true }).pipe(
      map((response) => {
        const user = response.user;
        const account: Account = {
          login: user.nomUtilisateur || user.personneContact || user.name,
          prenom: user.prenom,
          nom: user.nom,
          telephone: user.telephone,
          fonction: user.fonction,
          nom_organisation: user.nom_organisation || user.name,
          typeUtilisateur: user.typeUtilisateur,
          motDePasse: user.motDePasse,
          email: user.email,
          authorities: ['UTILISATEUR'],
        };

        // ✅ Stocker dans les deux clés pour compatibilité avec l'intercepteur
        localStorage.setItem(LS.token, response.token);
        localStorage.setItem('token', response.token); // Pour l'intercepteur
        localStorage.setItem(LS.account, JSON.stringify(account));

        // Stocker aussi les infos utilisateur standard
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        if (response.type) {
          localStorage.setItem('userType', response.type);
        }
        if (user.role) {
          localStorage.setItem('role', user.role);
        }

        // ✅ IMPORTANT : Retourner la réponse complète pour permettre la redirection
        return response;
      }),
      catchError((error) => {
        console.error('❌ Erreur login:', error);
        return throwError(() => new Error('INVALID_CREDENTIALS'));
      })
    );
  }

  // === REGISTER : appel backend pour générer et envoyer OTP via Nodemailer ===
  registerOrganisation(data: {
    nom_organisation: string;
    type: string;
    couvertureGeographique: string;
    typeSubvention: string;
    email: string;
    telephone: string;
    personneContact: string;
    fonction: string;
    telephoneContact: string;
    // email: string;
    motDePasse: string;
    adressePostale?: string;
    adressePhysique?: string;
  }): Observable<{ email: string }> {
    // Préparer les données au format backend
    const payload = {
      email: data.email,
      personneContact: data.personneContact, // username = nom de personneContact
      motDePasse: data.motDePasse,
      nom_organisation: data.nom_organisation,
      type: data.type,
      typeSubvention: data.typeSubvention,
      telephone: data.telephone,
      telephoneContact: data.telephoneContact,
      postalAddress: data.adressePostale || null,
      adressePhysique: data.adressePhysique || null,
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
    return this.http
      .post<any>(`${this.apiUrl}/verify-otp`, { email, otp }, { withCredentials: true })
      .pipe(
        map((response) => {
          const user = response.user;
          const account: Account = {
            login: user.nomUtilisateur || user.personneContact || user.nom,
            prenom: user.prenom,
            nom: user.nom,
            telephone: user.telephoneContact || user.telephone,
            fonction: user.fonction,
            nom_organisation: user.nom_organisation || user.nom,
            typeUtilisateur: user.type,
            motDePasse: user.motDePasse,
            email: user.email,
            authorities: ['ROLE_USER'],
          };

          // ✅ Stocker dans les deux clés pour compatibilité avec l'intercepteur
          localStorage.setItem(LS.token, response.token);
          localStorage.setItem('token', response.token); // Pour l'intercepteur
          localStorage.setItem(LS.account, JSON.stringify(account));

          // Stocker aussi les infos utilisateur standard
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          if (response.type) {
            localStorage.setItem('userType', response.type);
          }
          if (user.role) {
            localStorage.setItem('role', user.role);
          }

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
    if (users.some((u) => this._norm(u.nomUtilisateur) === this._norm(p.personneContact || ''))) {
      return throwError(() => new Error('USERNAME_TAKEN')); // nom déjà utilisé
    }
    if (users.some((u) => this._norm(u.email) === this._norm(p.email))) {
      return throwError(() => new Error('EMAIL_TAKEN')); // email déjà utilisé
    }

    users.push({
      nomUtilisateur: p.personneContact, // <= identifiant de connexion = NOM
      personneContact: p.personneContact,
      email: p.email,
      motDePasse: p.motDePasse,
      telephone: p.phone,
      fonction: p.fonction,
      nom_organisation: p.nom_organisation,
      type: p.type,
      couvertureGeographique: p.couvertureGeographique,
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

  /**
   * Vérifie si l'utilisateur est authentifié localement
   * On vérifie la présence du token dans l'une des deux clés possibles
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(LS.token) || localStorage.getItem('token');
    return !!token;
  }

  logout(): Observable<void> {
    localStorage.removeItem(LS.token);
    localStorage.removeItem('token'); // Nettoyer aussi l'autre clé
    localStorage.removeItem(LS.account);
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('userType');
    return of(void 0);
  }

  // === helpers ===
  private _getUsers(): any[] {
    try {
      return JSON.parse(localStorage.getItem(LS.users) || '[]');
    } catch {
      return [];
    }
  }
  private _norm(v: string | undefined | null): string {
    return (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
