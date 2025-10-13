import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
})
export class Registration {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  // état UI
  public step = signal<1 | 2>(1);
  public loading = signal(false);
  public error = signal<string | null>(null);

  // listes
  public orgTypes = [
    'Secteur privé (PME, PMI, Startups)',
    'ONG et Associations',
    'Coopératives communautaires',
    'Communautés organisées',
    'Entités gouvernementales',
    'Organismes de recherche',
  ];
  public coverages = ['Estuaire', 'Ogooué Maritime', 'Nyanga'];
  public grantTypes = ['Petite subvention', 'Moyenne subvention']; // ⬅️ AJOUT

  // form commun aux 2 étapes
  public form = this.fb.group({
    // ÉTAPE 1 — organisme
    orgName: ['', Validators.required],
    orgType: ['', Validators.required],
    coverage: ['', Validators.required],
    grantType: ['', Validators.required], // ⬅️ AJOUT
    orgEmail: ['', [Validators.required, Validators.email]],
    orgPhone: ['', [Validators.required, gabonPhoneValidator()]],

    // ÉTAPE 2 — demandeur + credentials
    contact: ['', Validators.required],
    position: [''],
    phone: ['', [Validators.required, gabonPhoneValidator()]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required, Validators.minLength(6)]],
  });

  // passage étape 1 -> 2
  public next() {
    this.error.set(null);

    // Contrôles réellement présents à l'étape 1
    const step1Ctrls = [
      this.form.controls.orgName,
      this.form.controls.orgType,
      this.form.controls.coverage,
      this.form.controls.orgEmail,
      this.form.controls.orgPhone,
    ];

    // Si grantType existe SUR LE FORMULAIRE, on le valide, sinon on l’ignore
    const grantTypeCtrl = this.form.get('grantType');
    if (grantTypeCtrl) step1Ctrls.push(grantTypeCtrl as any);

    const invalid = step1Ctrls.some((c) => c.invalid);
    if (invalid) {
      step1Ctrls.forEach((c) => c.markAsTouched());
      this.error.set('Veuillez compléter correctement les informations de l’organisme.');
      return;
    }

    // Préremplissage de l’étape 2 si vide
    if (!this.form.controls.email.value) {
      this.form.controls.email.setValue(this.form.controls.orgEmail.value as string);
    }
    if (!this.form.controls.phone.value) {
      this.form.controls.phone.setValue(this.form.controls.orgPhone.value as string);
    }

    this.step.set(2);
  }

  // soumission finale → appel backend + OTP
  public submit() {
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez compléter tous les champs requis.');
      return;
    }
    if (this.form.value.password !== this.form.value.confirm) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);

    const data = {
      orgName: this.form.value.orgName!,
      orgType: this.form.value.orgType!,
      coverage: this.form.value.coverage!,
      grantType: this.form.value.grantType!,
      orgEmail: this.form.value.orgEmail!,
      orgPhone: this.form.value.orgPhone!,
      contact: this.form.value.contact!,
      position: this.form.value.position || '',
      phone: this.form.value.phone!,
      email: this.form.value.email!,
      password: this.form.value.password!,
    };

    // Appeler le backend pour générer et envoyer l'OTP via EmailJS
    this.auth.registerOrganisation(data).subscribe({
      next: (response) => {
        console.log('✅ Registration initié:', response);

        // Stocker les infos pour la page OTP
        const pending = {
          data,
          email: response.email,
          expiresAt: Date.now() + 10 * 60 * 1000,
        };

        localStorage.setItem('fpbg.pendingReg', JSON.stringify(pending));
        localStorage.setItem('fpbg.autofillLogin', '1');

        this.loading.set(false);
        this.router.navigate(['/otp'], { queryParams: { email: response.email } });
      },
      error: (err) => {
        this.loading.set(false);
        console.error('❌ Erreur registration:', err);
        const msg = err.message || 'Erreur lors de l\'inscription.';
        if (msg.includes('déjà utilisé') || msg.includes('TAKEN')) {
          this.error.set('Cet email ou nom d\'utilisateur est déjà utilisé.');
        } else {
          this.error.set('Erreur lors de l\'inscription. Veuillez réessayer.');
        }
      }
    });
  }
}

// Validation du numéro de téléphone gabonais
export function gabonPhoneValidator(): ValidatorFn {
  const re = /^(?:0\d{8}|\+241\d{8}|00241\d{8}|0\d{2}(?:[ -]?\d{2}){3})$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const val = (control.value ?? '').toString().trim();
    if (!val) return null; // laisser required() gérer l'absence
    return re.test(val) ? null : { gabonPhone: { valid: false, actual: val } };
  };
}
