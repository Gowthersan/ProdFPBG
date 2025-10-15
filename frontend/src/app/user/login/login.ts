import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  // Connexion par EMAIL + mot de passe uniquement
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    // Pré-remplir si on arrive depuis OTP : /login?email=...
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) this.form.controls.email.setValue(emailFromQuery);

    // Pré-remplir si flag posé après inscription/OTP
    const wantsAutofill = localStorage.getItem('fpbg.autofillLogin') === '1';
    if (wantsAutofill) {
      try {
        const raw = localStorage.getItem('fpbg.pendingReg');
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.data?.email) this.form.controls.email.setValue(p.data.email);
          if (p?.data?.password) this.form.controls.password.setValue(p.data.password);
        }
      } catch {}
    }
  }

  submit() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, motDePasse } = this.form.value as { email: string; motDePasse: string };

    this.auth.login({ email: email, motDePasse }).subscribe({
      next: () => {
        this.loading.set(false);
        // Aller au dashboard
        this.router.navigate(['/dashboard']);
        // Nettoyage
        localStorage.removeItem('fpbg.autofillLogin');
        localStorage.removeItem('fpbg.pendingReg');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Email ou mot de passe incorrect.');
      },
    });
  }
}
