import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp.html',
})
export class Otp {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = signal<string>('');
  error = signal<string | null>(null);
  digits = signal<string[]>(['', '', '', '', '', '']);
  counter = signal<number>(60);
  currentOtp = signal<string | null>(null);
  private timerId: any = null;

  ngOnInit() {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
    const p = this._getPending();
    if (!p) {
      this.router.navigate(['/register']);
      return;
    }
    this._startTimer();
  }

  // ===== UI handlers =====
  onInput(i: number, ev: Event) {
    const v = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 1);
    const arr = [...this.digits()];
    arr[i] = v;
    this.digits.set(arr);
    if (v && i < 5) this.inputs.get(i + 1)?.nativeElement.focus();
  }
  onKeyDown(i: number, ev: KeyboardEvent) {
    if (ev.key === 'Backspace' && !this.digits()[i] && i > 0) {
      this.inputs.get(i - 1)?.nativeElement.focus();
    }
  }

  resend() {
    const p = this._getPending();
    if (!p) return;

    this.error.set(null);

    // ====================================
    // Appeler le backend pour générer et envoyer un nouveau OTP via Nodemailer
    // ====================================
    this.auth.resendOtp(p.email).subscribe({
      next: (response: any) => {
        console.log('✅ Nouveau OTP généré et envoyé via Nodemailer');

        this.counter.set(60);
        this._startTimer();
        // Mettre à jour l'expiration
        p.expiresAt = Date.now() + 10 * 60 * 1000;
        this._savePending(p);
      },
      error: (err) => {
        console.error('❌ Erreur resend:', err);
        this.error.set('Erreur lors du renvoi du code.');
      },
    });
  }

  // ===== Vérification + création utilisateur via backend =====
  verify() {
    const code = this.digits().join('');
    const p = this._getPending();
    if (!p) {
      this.error.set('Session expirée.');
      return;
    }
    if (Date.now() > p.expiresAt) {
      this.error.set('Code expiré.');
      return;
    }

    this.error.set(null);

    // ====================================
    // Vérifier l'OTP via le backend
    // ====================================
    this.auth.verifyOtp(p.email, code).subscribe({
      next: (response: any) => {
        console.log('✅ OTP vérifié, compte créé - Réponse complète:', response);
        console.log('🔍 Token:', response?.token ? 'présent' : 'absent');
        console.log('🔍 redirectTo:', response?.redirectTo);

        // Nettoyer le localStorage
        localStorage.removeItem('fpbg.pendingReg');
        localStorage.removeItem('onboarding_done'); // Supprimer ce flag obsolète

        // ====================================
        // 🎯 Le token est déjà stocké par auth.service.verifyOtp()
        // 🎯 Redirection vers /soumission (par défaut)
        // ====================================
        const redirectUrl = response?.redirectTo || '/soumission';
        console.log(`🎯 Redirection vers: ${redirectUrl}`);

        // Petit délai pour s'assurer que le token est bien stocké
        setTimeout(() => {
          this.router.navigate([redirectUrl]).then((success) => {
            if (success) {
              console.log('✅ Navigation réussie vers', redirectUrl);
            } else {
              console.error('❌ Échec de la navigation vers', redirectUrl);
              // Fallback : essayer /dashboard
              this.router.navigate(['/dashboard']);
            }
          });
        }, 100);
      },
      error: (err) => {
        console.error('❌ Erreur verify OTP:', err);
        const msg = err.message || '';
        if (msg.includes('invalide') || msg.includes('INVALID')) {
          this.error.set('Code OTP invalide.');
        } else if (msg.includes('expiré') || msg.includes('EXPIRED')) {
          this.error.set('Code expiré. Veuillez en demander un nouveau.');
        } else {
          this.error.set('Erreur lors de la vérification.');
        }
      },
    });
  }

  private _goLogin(p: any) {
    localStorage.setItem('fpbg.autofillLogin', '1');
    this.router.navigate(['/login'], { queryParams: { email: p.data?.email || p.email } });
  }

  // ===== helpers =====
  private _getPending(): any {
    try {
      return JSON.parse(localStorage.getItem('fpbg.pendingReg') || '');
    } catch {
      return null;
    }
  }
  private _savePending(p: any) {
    localStorage.setItem('fpbg.pendingReg', JSON.stringify(p));
  }
  private _startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.counter() <= 0) {
        clearInterval(this.timerId);
        this.timerId = null;
        return;
      }
      this.counter.update((v) => v - 1);
    }, 1000);
  }
}
