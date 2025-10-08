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

  // ⚠️ Connexion par NOM (Personne de contact) + mot de passe
  form = this.fb.group({
    contact: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    // Pré-remplir si on arrive depuis OTP : /login?contact=...
    const contactFromQuery = this.route.snapshot.queryParamMap.get('contact');
    if (contactFromQuery) this.form.controls.contact.setValue(contactFromQuery);

    // Pré-remplir si flag posé après inscription/OTP
    const wantsAutofill = localStorage.getItem('fpbg.autofillLogin') === '1';
    if (wantsAutofill) {
      try {
        const raw = localStorage.getItem('fpbg.pendingReg');
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.data?.contact) this.form.controls.contact.setValue(p.data.contact);
          if (p?.data?.password) this.form.controls.password.setValue(p.data.password);
        }
      } catch {}
    }
  }

  submit() {
    this.error.set(null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    const { contact, password } = this.form.value as { contact: string; password: string };

    this.auth.login({ username: contact, password }).subscribe({
      next: () => {
        this.loading.set(false);
        // Aller au formulaire utilisateur
        this.router.navigate(['/dashboard']);
        // Nettoyage optionnel du flag d’autofill
        localStorage.removeItem('fpbg.autofillLogin');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Identifiants incorrects.');
      }
    });
  }
}
