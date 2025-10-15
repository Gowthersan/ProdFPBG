import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Authentifcationservice } from '../../services/auth/authentifcationservice';
import { LoginVM } from '../../model/loginvm';
import { HttpClientModule } from '@angular/common/http';
import { take } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HttpClientModule],
  templateUrl: './login.html',
  providers: [Authentifcationservice],
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private loginVM!: LoginVM;
  private authenticationService = inject(Authentifcationservice);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = false;

  // ...
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      this.loginVM = {
        email: this.form.value.email!,
        motDePasse: this.form.value.motDePasse!,
      };
      const { email, motDePasse } = this.form.value as any;
      this.authenticationService
        .login(this.loginVM)
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            console.log('Statut HTTP:', response.status); // 200
            console.log('Corps:', response.body);
            this.loadSuccessSwal('Connexion réussie');
            this.router.navigateByUrl('/admin/dashboard'); // [{ authority: 'SOUSMIS' }]
          },
          error: (err) => {
            console.error('Erreur:', err);
          },
        });
      // this.auth.loginAdmin(email, motDePasse);   // ⬅️ rôle ADMIN
      //
    } finally {
      this.loading = false;
    }
  }

  loadSuccessSwal(message: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 12000,
      timerProgressBar: false,
      iconColor: '#00e8b6',
      color: '#06417d',
    });

    Toast.fire({
      icon: 'success',
      title: message,
    });
  }
}
