import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
  public emailAlreadyUsed = signal(false);

  // listes
  public type = [
    'Secteur privé (PME, PMI, Startups)',
    'ONG et Associations',
    'Coopératives communautaires',
    'Communautés organisées',
    'Entités gouvernementales',
    'Organismes de recherche',
  ];
  public couvertureGeographique = ['Estuaire', 'Ogooué Maritime', 'Nyanga'];
  public typeSubvention = ['Petite subvention', 'Moyenne subvention']; // ⬅️ AJOUT

  // form commun aux 2 étapes
  public form = this.fb.group({
    // ÉTAPE 1 — organisme
    nom_organisation: ['', Validators.required],
    type: ['', Validators.required],
    couvertureGeographique: ['', Validators.required],
    typeSubvention: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, gabonPhoneValidator()]],

    // ÉTAPE 2 — demandeur + credentials
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    personneContact: ['', Validators.required],
    fonction: [''],
    telephoneContact: ['', [Validators.required, gabonPhoneValidator()]],
    // email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
    confirmMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Réinitialiser l'erreur d'email quand l'utilisateur modifie le champ
    this.form.controls.email.valueChanges.subscribe(() => {
      if (this.emailAlreadyUsed()) {
        this.emailAlreadyUsed.set(false);
        this.error.set(null);
        // Enlever l'erreur spécifique d'email utilisé
        const errors = this.form.controls.email.errors;
        if (errors && errors['emailUsed']) {
          delete errors['emailUsed'];
          if (Object.keys(errors).length === 0) {
            this.form.controls.email.setErrors(null);
          } else {
            this.form.controls.email.setErrors(errors);
          }
        }
      }
    });
  }

  // passage étape 1 -> 2
  public next() {
    this.error.set(null);
    this.emailAlreadyUsed.set(false);

    // Contrôles réellement présents à l'étape 1
    const step1Ctrls = [
      this.form.controls.nom_organisation,
      this.form.controls.type,
      this.form.controls.couvertureGeographique,
      this.form.controls.email,
      this.form.controls.telephone,
    ];

    // Si typeSubvention existe SUR LE FORMULAIRE, on le valide, sinon on l'ignore
    const typeSubventionCtrl = this.form.get('typeSubvention');
    if (typeSubventionCtrl) step1Ctrls.push(typeSubventionCtrl as any);

    const invalid = step1Ctrls.some((c) => c.invalid);
    if (invalid) {
      step1Ctrls.forEach((c) => c.markAsTouched());
      this.error.set('Veuillez compléter correctement les informations de votre organisation.');
      return;
    }

    // Préremplissage de l'étape 2 si vide
    if (!this.form.controls.email.value) {
      this.form.controls.email.setValue(this.form.controls.email.value as string);
    }
    if (!this.form.controls.telephoneContact.value) {
      this.form.controls.telephoneContact.setValue(this.form.controls.telephone.value as string);
    }

    this.step.set(2);
  }

  // soumission finale → appel backend + OTP
  public submit() {
    this.error.set(null);
    this.emailAlreadyUsed.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez compléter tous les champs requis.');
      return;
    }
    if (this.form.value.motDePasse !== this.form.value.confirmMotDePasse) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);

    const data = {
      // Organisation
      nom_organisation: this.form.value.nom_organisation!,
      type: this.form.value.type!,
      couvertureGeographique: this.form.value.couvertureGeographique!,
      typeSubvention: this.form.value.typeSubvention!,
      email: this.form.value.email!,
      telephone: this.form.value.telephone!,
      // Utilisateur
      prenom: this.form.value.prenom!,
      nom: this.form.value.nom!,
      personneContact: this.form.value.personneContact!,
      fonction: this.form.value.fonction || '',
      telephoneContact: this.form.value.telephoneContact!,
      // email: this.form.value.email!,
      motDePasse: this.form.value.motDePasse!,
    };

    // ====================================
    // Appeler le backend pour générer et envoyer l'OTP via Nodemailer
    // ====================================
    this.auth.registerOrganisation(data).subscribe({
      next: (response) => {
        console.log('✅ Registration initié:', response);
        console.log('📧 Email OTP envoyé automatiquement par le backend via Nodemailer');

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

        // Gestion des erreurs spécifiques
        if (err.status === 409) {
          this.emailAlreadyUsed.set(true);
          this.error.set("⚠️ Cet email est déjà utilisé. Veuillez utiliser une autre adresse email ou vous connecter si vous avez déjà un compte.");
          // Marquer le champ email comme invalide pour le mettre en surbrillance
          this.form.controls.email.setErrors({ emailUsed: true });
          // Retourner à l'étape 1 si on est à l'étape 2
          if (this.step() === 2) {
            this.step.set(1);
          }
        } else if (err.status === 400) {
          this.error.set("Données invalides. Vérifiez vos informations.");
        } else {
          this.error.set("Erreur lors de l'inscription. Veuillez réessayer.");
        }
      },
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
