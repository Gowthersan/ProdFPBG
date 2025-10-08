/*import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive} from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-user-login',
  standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './login.html'
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = false;
  error: string | null = null;

  ngOnInit() {
    // 1) si on arrive de l'OTP: préremplir l'email depuis la query
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) this.form.controls.email.setValue(emailFromQuery);

    // 2) si on vient juste de s'inscrire: préremplir email + mdp depuis pendingReg
    const wantsAutofill = localStorage.getItem('fpbg.autofillLogin') === '1';
    const raw = localStorage.getItem('fpbg.pendingReg');
    if (wantsAutofill && raw) {
      try {
        const pending = JSON.parse(raw);
        if (pending?.data?.email) this.form.controls.email.setValue(pending.data.email);
        if (pending?.data?.password) this.form.controls.password.setValue(pending.data.password);
        // (optionnel) auto-login:
        // setTimeout(() => this.submit(), 150);
      } catch {}
    }
  }

  submit() {
    this.error = null;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    const { email, password } = this.form.value as { email: string; password: string };

    // 👉 utilise ta méthode de login "utilisateur" (pas admin)
    // Si ton service expose `login(email, password)` :
    // this.auth.login({ username: email, password }).subscribe({ ... });
    // Je garde une version générique ici :
/*
    this.auth.login({ username: email, password }).subscribe({
      next: () => {
        this.loading = false;

        // après connexion, on va au FORMULAIRE (onboarding)
        this.router.navigate(['/form']);

        // on nettoie l'autofill
        localStorage.removeItem('fpbg.autofillLogin');
        // (garde fpbg.pendingReg si tu en as besoin; sinon: localStorage.removeItem('fpbg.pendingReg');)
      },
      error: () => {
        this.loading = false;
        this.error = 'Identifiants incorrects.';
      }
    });

   loadSuccessSwal(message: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 12000,
      timerProgressBar: false,
      iconColor: '#00e8b6',
      color: '#06417d'
    })

    Toast.fire({
      icon: 'success',
      title: message
    })

  }
}
*/
