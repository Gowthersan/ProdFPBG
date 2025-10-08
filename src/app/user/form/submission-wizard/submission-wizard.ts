import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';

/* ==============================
   Constantes & utils
   ============================== */
const LS_DRAFT_KEY = 'fpbg_submission_v3';
const LS_STEP_KEY  = 'fpbg_submission_step_v3';

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png'
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo

/* ---- Validators ---- */
function wordLimit(max: number) {
  return (c: AbstractControl): ValidationErrors | null => {
    const t = ('' + (c.value ?? '')).trim();
    const n = t ? t.split(/\s+/).length : 0;
    return n > max ? { wordLimit: { max, actual: n } } : null;
  };
}

function fileConstraints() {
  return (c: AbstractControl): ValidationErrors | null => {
    const f: File | null = c.value;
    if (!f) return null;
    if (f.size > MAX_FILE_BYTES) return { fileTooLarge: true };
    if (!ALLOWED_MIME.includes(f.type)) return { fileType: true };
    return null;
  };
}

function nonEmpty(min = 1) {
  return (c: AbstractControl): ValidationErrors | null => {
    const arr = (c as FormArray).controls ?? [];
    return arr.length < min ? { minItems: { min, actual: arr.length } } : null;
  };
}

function lineAmountsMatch(group: AbstractControl): ValidationErrors | null {
  const total = Number(group.get('total')?.value || 0);
  const a = Number(group.get('partFPBG')?.value || 0);
  const b = Number(group.get('partCofinance')?.value || 0);
  return (a + b) === total ? null : { amountsMismatch: true };
}

function arrSum<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce((s, x) => s + Number(x[key] || 0), 0);
}

/* ==============================
   Composant
   ============================== */
@Component({
  selector: 'app-submission-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './submission-wizard.html',
})
export class SubmissionWizard {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  /* ---- Steps ---- */
  steps = [
    'Proposition de projet',
    'Objectifs & résultats',
    'Activités & calendrier',
    'Risques',
    'Estimation du budget',
    'État & financement',
    'Durabilité & réplication',
    'Annexes',
    'Récapitulatif',
  ] as const;

  current = signal<number>(Math.max(0, Math.min(this.steps.length - 1, Number(localStorage.getItem(LS_STEP_KEY) || 0))));
  goTo = (i: number) => {
    if (i < 0 || i >= this.steps.length) return;
    this.current.set(i);
    localStorage.setItem(LS_STEP_KEY, String(i));
  };
  next = () => this.goTo(this.current() + 1);
  prev = () => this.goTo(this.current() - 1);
  progress = computed(() => Math.round(((this.current() + 1) / this.steps.length) * 100));

  /* ---- Données auxiliaires ---- */
  domaines = [
    'Conservation marine', 'Restauration des écosystèmes', 'Pêche durable', 'Réduction pollution plastique',
    'Sensibilisation environnementale', 'Renforcement capacités', 'Recherche scientifique', 'Économie bleue'
  ];

  /* ==============================
     Formulaires par étape
     ============================== */

  // Étape 1: Proposition
  prop = this.fb.group({
    title: ['', [Validators.maxLength(120)]],
    domains: this.fb.control<string[]>([]),
    locationAndTarget: ['', [wordLimit(200)]],
    contextJustification: ['', [wordLimit(500)]],
  });

  // Étape 2: Objectifs & résultats
  obj = this.fb.group({
    objectives: ['', [wordLimit(200)]],
    expectedResults: ['', [wordLimit(100)]],
    durationMonths: [12, [Validators.min(1)]],
  });

  // Étape 3: Activités & calendrier
  activitiesHeader = this.fb.group({
    startDate: [this.today(), [Validators.required]],
    endDate:   [this.today(), [Validators.required]],
    summary:   ['', [wordLimit(200)]],
  });

  activities = this.fb.array<FormGroup>([], nonEmpty(1));
  private makeActivity(label = '', start?: string, end?: string) {
    return this.fb.group({
      label: [label, [Validators.required, Validators.maxLength(160)]],
      start: [start ?? this.today(), [Validators.required]],
      end:   [end   ?? this.today(), [Validators.required]],
    });
  }
  addActivity(label = 'Activité 1') { this.activities.push(this.makeActivity(label)); }
  removeActivity(i: number) { this.activities.removeAt(i); }

  // Étape 4: Risques
  risks = this.fb.array<FormGroup>([], nonEmpty(1));
  private makeRisk(description = '', mitigation = '') {
    return this.fb.group({
      description: [description, [Validators.required, Validators.maxLength(200)]],
      mitigation:  [mitigation,  [Validators.required, Validators.maxLength(200)]],
    });
  }
  addRisk() { this.risks.push(this.makeRisk()); }
  removeRisk(i: number) { this.risks.removeAt(i); }

  // Étape 5: Budget (agrégé par rubrique)
  budget = this.fb.group({
    terrain: [0, [Validators.min(0)]],
    invest:  [0, [Validators.min(0)]],
    overhead:[0, [Validators.min(0)]],            // fonctionnement
    cofin:   [0, [Validators.min(0)]],            // facultatif
  });

  // Étape 6: État & financement
  projectState = this.fb.group({
    stage: this.fb.control<'CONCEPTION'|'DEMARRAGE'|'AVANCE'|'PHASE_FINALE'>('DEMARRAGE'),
    hasFunding: this.fb.control<boolean>(false),
    fundingDetails: this.fb.control<string>(''),
  });

  // Étape 7: Durabilité & réplication
  sustainability = this.fb.group({
    text: ['', [wordLimit(250)]],
  });

  // Étape 8: Annexes (10 pièces)
  attachments = this.fb.group({
    LETTRE_MOTIVATION:     new FormControl<File|null>(null, [fileConstraints()]),
    STATUTS_REGLEMENT:     new FormControl<File|null>(null, [fileConstraints()]),
    FICHE_CIRCUIT:         new FormControl<File|null>(null, [fileConstraints()]),
    COTE:                  new FormControl<File|null>(null, [fileConstraints()]),
    AGREMENT:              new FormControl<File|null>(null, [fileConstraints()]),
    CV:                    new FormControl<File|null>(null, [fileConstraints()]),
    BUDGET_DETAILLE:       new FormControl<File|null>(null, [fileConstraints()]),
    CHRONOGRAMME:          new FormControl<File|null>(null, [fileConstraints()]),
    CARTOGRAPHIE:          new FormControl<File|null>(null, [fileConstraints()]),   // optionnel
    LETTRE_SOUTIEN:        new FormControl<File|null>(null, [fileConstraints()]),   // optionnel
  });

  // Form racine (pour le recap & sauvegarde)
  form = this.fb.group({
    prop: this.prop,
    obj: this.obj,
    activitiesHeader: this.activitiesHeader,
    activities: this.activities,
    risks: this.risks,
    budget: this.budget,
    projectState: this.projectState,
    sustainability: this.sustainability,
    attachments: this.attachments
  });

  /* ---- Aide & conseils (sanitisés) ---- */
  guideHtml: SafeHtml[] = [];
  conseilsHtml: SafeHtml[] = [];

  /* ---- Calculs & helpers ---- */
  totalBudget = computed(() => {
    const b = this.budget.getRawValue();
    return Number(b.terrain||0) + Number(b.invest||0) + Number(b.overhead||0);
  });

  overheadTooHigh = computed(() => {
    const total = this.totalBudget();
    if (!total) return false;
    const fct = Number(this.budget.get('overhead')?.value || 0);
    return fct > total * 0.10;
  });

  allowedAccept = ALLOWED_MIME.join(',');

  /* ==============================
     Cycle de vie
     ============================== */
  constructor() {
    // init défauts
    if (this.activities.length === 0) this.addActivity();

    // restauration brouillon
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw);
        (v.activities ?? []).forEach((a: any, i: number) => {
          if (i === 0 && this.activities.length) this.activities.removeAt(0);
          this.activities.push(this.makeActivity(a.label, a.start, a.end));
        });
        (v.risks ?? []).forEach((r: any) => this.risks.push(this.makeRisk(r.description, r.mitigation)));
        this.form.patchValue(v, { emitEvent: false });
      } catch {}
    }

    // autosave
    this.form.valueChanges.pipe(debounceTime(350))
      .subscribe(v => localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(v)));

    // précharger guides
    this.loadGuides();
  }

  /* ==============================
     Méthodes UI
     ============================== */
  trackByIndex = (i: number) => i;

  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  toggleDomain(d: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const ctrl = this.prop.get('domains') as FormControl<string[]>;
    let arr = [...(ctrl.value ?? [])];
    if (checked) { if (!arr.includes(d)) arr.push(d); }
    else { arr = arr.filter(x => x !== d); }
    ctrl.setValue(arr);
  }

  onFile(e: Event, key: string) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.attachments.get(key)?.setValue(f);
  }

  canGoNext(): boolean {
    const i = this.current();
    // petite validation "soft" avant de passer à l'étape suivante
    switch (i) {
      case 0: return this.prop.valid;
      case 1: return this.obj.valid;
      case 2: return this.activitiesHeader.valid && this.activities.valid;
      case 3: return this.risks.valid;
      case 4: return this.budget.valid && !this.overheadTooHigh();
      case 5: return this.projectState.valid;
      case 6: return this.sustainability.valid;
      case 7: return this.attachments.valid;
      default: return true;
    }
  }

  submit() {
    // validations finales minimales
    if (!this.canGoNext()) {
      this.form.markAllAsTouched();
      alert('Veuillez corriger les erreurs avant la soumission.');
      return;
    }
    if (this.overheadTooHigh()) {
      alert('Les frais de fonctionnement dépassent 10% du total.');
      return;
    }

    // (simulation) “envoi” & nettoyage
    localStorage.removeItem(LS_DRAFT_KEY);
    localStorage.removeItem(LS_STEP_KEY);
    alert('Dossier soumis (simulation front).');
    this.router.navigateByUrl('/dashboard');
  }

  /* ==============================
     Guides (colonne droite)
     ============================== */
  private sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  private loadGuides() {
    const guides: string[] = [
      /* 0 - Proposition */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Proposition de projet</p>
      <ul class="list-disc ml-5 space-y-1">
        <li><b>Titre du projet</b> : clair, concis, accrocheur.</li>
        <li><b>Lieu & groupe cible</b> (≤200 mots) : sites d’intervention et bénéficiaires.</li>
        <li><b>Contexte & justification</b> (≤500 mots) : problèmes/pressions, causes, acteurs, solutions envisagées.</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li><b>Soyez clair et concis</b> : allez à l’essentiel pour susciter l’intérêt.</li>
        <li><b>Impact</b> : mettez en avant les bénéfices concrets.</li>
        <li><b>Alignement</b> : cohérence avec les objectifs/priorités FPBG.</li>
        <li><b>Professionnalisme</b> : respect des limites de mots, chiffres vérifiés.</li>
      </ul>
      `,
      /* 1 - Objectifs & résultats */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Objectifs & résultats</p>
      <ul class="list-disc ml-5 space-y-1">
        <li><b>Objectifs</b> (≤200 mots) : formuler des objectifs SMART.</li>
        <li><b>Résultats attendus</b> (≤100 mots) : changements <b>mesurables</b>.</li>
        <li><b>Durée</b> : ex. 12 mois.</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li><b>Soyez clair et concis</b> : allez à l’essentiel.</li>
        <li><b>Impact</b> : bénéfices concrets.</li>
        <li><b>Alignement</b> : cohérence avec les appels en cours.</li>
        <li><b>Professionnalisme</b> : limites de mots.</li>
      </ul>
      `,
      /* 2 - Activités & calendrier */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Activités & calendrier</p>
      <ul class="list-disc ml-5 space-y-1">
        <li><b>Activités principales</b> (≤200 mots).</li>
        <li><b>Calendrier</b> : planifier les périodes (début/fin) par activité.</li>
        <li><b>Exemples</b> : cartographie, planification d’ingénierie écologique, plantations, suivi, sensibilisation…</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>Soyez concis et cohérent.</li>
        <li>Respect des limites de mots et des dates.</li>
      </ul>
      `,
      /* 3 - Risques */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Risques</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Risques techniques, environnementaux, sociaux, politiques.</li>
        <li>Mesures d’évitement ou d’atténuation.</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>Clarté, concision, cohérence globale.</li>
      </ul>
      `,
      /* 4 - Budget */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Budget estimatif</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Trois rubriques : <b>Activités de terrain</b>, <b>Investissements</b>, <b>Fonctionnement</b>.</li>
        <li>Co-financements éventuels (numéraire / nature).</li>
        <li>Frais de fonctionnement indirects <b>≤ 10%</b> du total.</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>Soyez concis ; chiffres vérifiés.</li>
      </ul>
      `,
      /* 5 - État & financement */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> État & financement</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Stade : Conception, Démarrage, Avancé, Phase finale.</li>
        <li>Financement : bailleur(s), montant(s), statut.</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>Clarté et cohérence.</li>
      </ul>
      `,
      /* 6 - Durabilité & réplication */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Durabilité & réplication</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Comment les effets perdurent après la fin du projet ?</li>
        <li>Réplicabilité ailleurs au Gabon (conditions, partenaires, coûts).</li>
      </ul>
      <hr class="my-3">
      <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>Allez à l’essentiel ; impacts concrets.</li>
      </ul>
      `,
      /* 7 - Annexes */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Annexes</p>
      <p class="text-sm">Téléverser les pièces justificatives requises (PDF/DOC/XLS/JPG/PNG).</p>
      <ol class="list-decimal ml-5 space-y-0.5 text-sm">
        <li>Lettre de motivation</li>
        <li>Statuts & règlement</li>
        <li>Fiche circuit (PME/PMI/Startup)</li>
        <li>CÔTE</li>
        <li>Agrément / Récépissé</li>
        <li>CV (porteur & responsables)</li>
        <li>Budget détaillé</li>
        <li>Chronogramme</li>
        <li>Cartographie (optionnel)</li>
        <li>Lettre de soutien (optionnel)</li>
      </ol>
      `,
      /* 8 - Récapitulatif */
      `
      <p class="text-sm mb-2"><span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span> Récapitulatif</p>
      <ul class="list-disc ml-5 space-y-1">
        <li>Vérifier la cohérence <b>objectifs ↔ activités ↔ budget</b>.</li>
        <li>Relire et corriger avant la soumission.</li>
      </ul>
      `
    ];

    const conseils = guides.map(() => `
      <h4 class="font-semibold text-emerald-700 mb-1">Sélection des dossiers</h4>
      <ul class="list-disc ml-5 space-y-1">
        <li>La fiche d’évaluation (FPBG) est disponible.</li>
        <li>Après analyse, classement par ordre de priorité.</li>
        <li>Le Comité Technique peut demander des précisions.</li>
      </ul>
    `);

    this.guideHtml = guides.map(g => this.sanitize(g));
    this.conseilsHtml = conseils.map(c => this.sanitize(c));
  }
}
