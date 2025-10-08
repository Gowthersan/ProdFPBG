import { Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
  digits = signal<string[]>(['','','','','','']);
  counter = signal<number>(60);
  currentOtp = signal<string | null>(null);
  private timerId: any = null;

  ngOnInit() {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
    const p = this._getPending();
    if (!p) { this.router.navigate(['/register']); return; }
    this.currentOtp.set(p?.otp ?? null); // DEV only
    this._startTimer();
  }

  // ===== UI handlers =====
  onInput(i: number, ev: Event) {
    const v = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0,1);
    const arr = [...this.digits()]; arr[i] = v; this.digits.set(arr);
    if (v && i<5) this.inputs.get(i+1)?.nativeElement.focus();
  }
  onKeyDown(i:number, ev: KeyboardEvent) {
    if (ev.key === 'Backspace' && !this.digits()[i] && i>0) {
      this.inputs.get(i-1)?.nativeElement.focus();
    }
  }

  resend() {
    const p = this._getPending(); if (!p) return;
    p.otp = this._genOTP();
    p.expiresAt = Date.now() + 10*60*1000;
    this._savePending(p);
    this.currentOtp.set(p.otp);
    this.counter.set(60);
    this._startTimer();
  }

  // ===== Vérification + création utilisateur =====
  verify() {
    const code = this.digits().join('');
    const p = this._getPending();
    if (!p) { this.error.set('Session expirée.'); return; }
    if (Date.now() > p.expiresAt) { this.error.set('Code expiré.'); return; }
    if (code !== p.otp) { this.error.set('Code OTP invalide.'); return; }

    // Création du compte LOCAL (username = contact)
    this.auth.register({
      email:    p.data.email,
      password: p.data.password,
      phone:    p.data.phone,
      contact:  p.data.contact,     // <= NOM utilisé pour se connecter
      position: p.data.position,
      orgName:  p.data.orgName,
      orgType:  p.data.orgType,
      coverage: p.data.coverage,
    }).subscribe({
      next: () => this._goLogin(p),
      error: (e) => {
        const msg = (e?.message || e?.error?.message || '').toString();
        // S'il existe déjà -> on continue quand même
        if (msg === 'EMAIL_TAKEN' || msg === 'USERNAME_TAKEN') this._goLogin(p);
        else this.error.set('Erreur à la création du compte.');
      }
    });
  }

  private _goLogin(p: any) {
    localStorage.setItem('fpbg.autofillLogin','1');
    this.router.navigate(['/login'], { queryParams: { contact: p.data.contact } });
  }

  // ===== helpers =====
  private _getPending(): any {
    try { return JSON.parse(localStorage.getItem('fpbg.pendingReg') || ''); } catch { return null; }
  }
  private _savePending(p: any) {
    localStorage.setItem('fpbg.pendingReg', JSON.stringify(p));
  }
  private _genOTP(): string { return Math.floor(100000 + Math.random()*900000).toString(); }
  private _startTimer(){
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(()=> {
      if (this.counter()<=0) { clearInterval(this.timerId); this.timerId = null; return; }
      this.counter.update(v=>v-1);
    }, 1000);
  }
}
