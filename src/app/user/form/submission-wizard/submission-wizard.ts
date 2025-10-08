import {Component, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {Router} from '@angular/router';
import {debounceTime} from 'rxjs/operators';

const LS_DRAFT_KEY = 'fpbg_submission_v2';
const LS_STEP_KEY  = 'fpbg_submission_step_v2';
const ADMIN_DATA_KEY = 'fpbg_admin_records';
const SUBMISSION_META_KEY = 'submission_meta';

type BudgetCategory = 'ACTIVITES_TERRAIN' | 'INVESTISSEMENTS' | 'FONCTIONNEMENT';
type DocumentType =
  | 'LETTRE_MOTIVATION' | 'STATUTS_REGLEMENT' | 'FICHE_CIRCUIT' | 'RIB'
  | 'AGREMENT' | 'CV' | 'BUDGET_DETAILLE' | 'CHRONOGRAMME' | 'CARTOGRAPHIE' | 'LETTRE_SOUTIEN';

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'image/jpeg', 'image/png'
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// ---------- Validators ----------
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
function nonEmptyArray(min = 1) {
  return (c: AbstractControl) => (c as FormArray).length < min ? { arrayMin: { min } } : null;
}
function amountsMatch(group: AbstractControl): ValidationErrors | null {
  const total = Number(group.get('total')?.value || 0);
  const a = Number(group.get('partFPBG')?.value || 0);
  const b = Number(group.get('partCofinance')?.value || 0);
  return (a + b) === total ? null : { amountsMismatch: true };
}
function budget10Percent(root: AbstractControl): ValidationErrors | null {
  const lines = (root.get('budgetLines') as FormArray).controls;
  let total = 0, fonctionnement = 0;
  for (const l of lines) {
    const amount = Number(l.get('total')?.value || 0);
    total += amount;
    if (l.get('category')?.value === 'FONCTIONNEMENT') fonctionnement += amount;
  }
  if (!total) return null;
  return fonctionnement > total * 0.10 ? { overheadTooHigh: { fonctionnement, total } } : null;
}

// ========== Component ==========
@Component({
  selector: 'app-submission-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './submission-wizard.html',
})
export class SubmissionWizard {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // ---- Étapes (1..9) : on démarre à "Proposition de projet"
  readonly steps = [
    'Proposition de projet',
    'Objectifs & résultats',
    'Activités & calendrier',
    'Risques',
    'Budget estimatif',
    'État & financement',
    'Durabilité & réplication',
    'Annexes',
    'Récapitulatif'
  ];
  current = signal<number>(Math.max(0, Math.min(this.steps.length - 1, Number(localStorage.getItem(LS_STEP_KEY) ?? 0))));
  goTo   = (i: number) => { if (i < 0 || i >= this.steps.length) return; this.current.set(i); localStorage.setItem(LS_STEP_KEY, String(i)); };
  next   = () => this.goTo(this.current() + 1);
  prev   = () => this.goTo(this.current() - 1);
  progress = computed(() => Math.round(((this.current() + 1) / this.steps.length) * 100));

  // ---- Domaine d'intervention (case à cocher)
  domainesOptions = [
    'Conservation marine', 'Restauration des écosystèmes',
    'Pêche durable', 'Réduction pollution plastique',
    'Sensibilisation environnementale', 'Renforcement capacités',
    'Recherche scientifique', 'Économie bleue'
  ];

  // ---- Mois (pour le calendrier)
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  monthsLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  // ---- Formulaires par étape
  // 1) Proposition
  stepProp = this.fb.group({
    title: ['', [Validators.maxLength(120)]],
    domains: this.fb.control<string[]>([]),
    locationAndTarget: ['', [wordLimit(200)]],
    contextJustification: ['', [wordLimit(500)]],
  });

  // 2) Objectifs & résultats
  stepObj = this.fb.group({
    objectives: ['', [wordLimit(200)]],
    expectedResults: ['', [wordLimit(100)]],
    durationMonths: [12, [Validators.min(1), Validators.max(48)]],
  });

  // 3) Activités
  activitiesSummary = new FormControl<string>('', [wordLimit(200)]);
  activities = this.fb.array<FormGroup>([], nonEmptyArray(1));

  // 4) Risques
  risks = this.fb.array<FormGroup>([]);

  // 5) Budget
  budgetLines = this.fb.array<FormGroup>([], nonEmptyArray(1));

  // 6) État & financement
  stateStep = this.fb.group({
    projectStage: this.fb.control<'CONCEPTION' | 'DEMARRAGE' | 'AVANCE' | 'PHASE_FINALE'>('DEMARRAGE'),
    hasFunding: this.fb.control<boolean>(false),
    fundingDetails: this.fb.control<string>(''),
  });

  // 7) Durabilité
  sustainabilityStep = this.fb.group({
    sustainability: this.fb.control<string>('', [wordLimit(250)]),
    replicability: this.fb.control<string>('', [wordLimit(250)]),
  });

  // 8) Annexes
  attachments = this.fb.group({
    LETTRE_MOTIVATION: new FormControl<File | null>(null, [fileConstraints()]),
    STATUTS_REGLEMENT: new FormControl<File | null>(null, [fileConstraints()]),
    FICHE_CIRCUIT:      new FormControl<File | null>(null, [fileConstraints()]),
    RIB:                new FormControl<File | null>(null, [fileConstraints()]),
    AGREMENT:           new FormControl<File | null>(null, [fileConstraints()]),
    CV:                 new FormControl<File | null>(null, [fileConstraints()]),
    BUDGET_DETAILLE:    new FormControl<File | null>(null, [fileConstraints()]),
    CHRONOGRAMME:       new FormControl<File | null>(null, [fileConstraints()]),
    CARTOGRAPHIE:       new FormControl<File | null>(null, [fileConstraints()]),
    LETTRE_SOUTIEN:     new FormControl<File | null>(null, [fileConstraints()])
  });





  // ---- Form global (pour validations transverses)
  form = this.fb.group({
    stepProp: this.stepProp,
    stepObj: this.stepObj,
    activitiesSummary: this.activitiesSummary,
    activities: this.activities,
    risks: this.risks,
    budgetLines: this.budgetLines,
    stateStep: this.stateStep,
    sustainabilityStep: this.sustainabilityStep,
    attachments: this.attachments
  }, { validators: budget10Percent });

  // ---- Contenu du panneau "Guide / Conseils / Sélection" (droite)
  adviceHtml = `
    <ul class="list-disc ml-4">
      <li><b>Soyez clair et concis</b> : allez à l’essentiel.</li>
      <li><b>Impact</b> : bénéfices concrets (environnementaux, sociaux, économiques, capacités).</li>
      <li><b>Alignement</b> : cohérence avec les priorités FPBG et les appels en cours.</li>
      <li><b>Professionnalisme</b> : respect des limites de mots, chiffres vérifiés.</li>
    </ul>`;
  selectionHtml = `
    <ul class="list-disc ml-4">
      <li>Fiche d’évaluation disponible (via FPBG).</li>
      <li>Classement par ordre de priorité par le Comité Technique.</li>
      <li>Précisions ou reformulations possibles selon critères.</li>
    </ul>`;
  help = [
    { title: 'Proposition de projet', html: `
      <ul class="list-disc ml-4">
        <li><b>Titre</b> clair, concis, accrocheur.</li>
        <li><b>Domaines d’intervention</b> : sélectionnez un ou plusieurs.</li>
        <li><b>Lieu & groupe cible</b> (≤200 mots).</li>
        <li><b>Contexte & justification</b> (≤500 mots).</li>
      </ul>`},
    { title: 'Objectifs & résultats', html: `
      <ul class="list-disc ml-4">
        <li><b>Objectifs</b> (≤200 mots) — SMART.</li>
        <li><b>Résultats attendus</b> (≤100 mots) — mesurables.</li>
        <li><b>Durée</b> : ex. 12 mois.</li>
      </ul>`},
    { title: 'Activités & calendrier', html: `
      <ul class="list-disc ml-4">
        <li>Résumé des activités (≤200 mots).</li>
        <li>Calendrier : cochez les mois par activité.</li>
      </ul>`},
    { title: 'Risques', html: `
      <ul class="list-disc ml-4">
        <li>Techniques, environnementaux, sociaux, politiques.</li>
        <li>Mesures d’évitement / atténuation.</li>
      </ul>`},
    { title: 'Budget estimatif', html: `
      <ul class="list-disc ml-4">
        <li>Rubriques : Activités de terrain, Investissements, Fonctionnement.</li>
        <li>Fonctionnement ≤ <b>10 %</b> du total.</li>
      </ul>`},
    { title: 'État & financement', html: `
      <ul class="list-disc ml-4">
        <li>Stade : Conception, Démarrage, Avancé, Phase finale.</li>
        <li>Financement : bailleur(s), montants, statut.</li>
      </ul>`},
    { title: 'Durabilité & réplication', html: `
      <ul class="list-disc ml-4">
        <li>Comment les effets perdurent après le projet ?</li>
        <li>Réplication ailleurs au Gabon.</li>
      </ul>`},
    { title: 'Annexes', html: `
      <p class="mb-1">Téléversez les pièces requises (PDF/DOC/XLS/JPG/PNG, 10 Mo max).</p>
      <ol class="list-decimal ml-5">
        <li>Lettre de motivation</li><li>Statuts & règlement</li><li>Fiche circuit</li><li>RIB</li>
        <li>Agrément / Récépissé</li><li>CV</li><li>Budget détaillé</li><li>Chronogramme</li>
        <li>Cartographie (optionnel)</li><li>Lettre de soutien (optionnel)</li>
      </ol>`},
    { title: 'Récapitulatif', html: `
      <ul class="list-disc ml-4"><li>Vérifiez la cohérence objectifs ↔ activités ↔ budget.</li></ul>`},
  ];

  allowedAccept = ALLOWED_MIME.join(',');

  constructor() {
    // Restauration du brouillon
    const saved = localStorage.getItem(LS_DRAFT_KEY);
    if (saved) {
      const v = JSON.parse(saved);
      (v.activities ?? []).forEach((a: any) => this.addActivity(a.label, a.months ?? []));
      (v.risks ?? []).forEach((r: any) => this.addRisk(r.description, r.mitigation));
      (v.budgetLines ?? []).forEach((b: any) => this.addBudgetLine(b.category, b.description, b.total, b.partFPBG, b.partCofinance));
      this.form.patchValue(v, { emitEvent: false });
    } else {
      this.addActivity('Activité 1', []);
      this.addBudgetLine('ACTIVITES_TERRAIN', 'Atelier de lancement', 0, 0, 0);
    }
    // Autosave
    this.form.valueChanges.pipe(debounceTime(400))
      .subscribe(v => localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(v)));
  }

  // ----- Helpers (activités)
  private makeActivity(label = '', months: number[] = []) {
    return this.fb.group({ label: [label], months: [months] });
  }
  addActivity(label = '', months: number[] = []) { this.activities.push(this.makeActivity(label, months)); }
  removeActivity(i: number) { this.activities.removeAt(i); }
  isChecked(activity: FormGroup, m: number) {
    const arr = activity.get('months')?.value as number[] || [];
    return arr.includes(m);
  }
  toggleMonth(activity: FormGroup, m: number) {
    const arr = (activity.get('months')?.value as number[] || []).slice();
    const idx = arr.indexOf(m);
    idx >= 0 ? arr.splice(idx, 1) : arr.push(m);
    activity.get('months')?.setValue(arr);
    activity.markAsDirty();
  }

  // ---- Step "Activités & calendrier"
  private makeCalRow(): FormGroup {
    return this.fb.group({
      label: this.fb.control<string>('', { nonNullable: true }),
      debut: this.fb.control<string>(this.today(), { nonNullable: true }),
      fin:   this.fb.control<string>(this.today(), { nonNullable: true }),
    });
  }

  get activitesGrp(): FormGroup {
    return this.form.get('activites') as unknown as FormGroup;
  }


  calendrier(): FormArray<FormGroup> {
    return this.activitesGrp.get('calendrier') as FormArray<FormGroup>;
  }

  addActiviteRow(): void {
    this.calendrier().push(this.makeCalRow());

  }

  removeActiviteRow(i: number): void {
    this.calendrier().removeAt(i);

  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

// ---- domains helpers
  hasDomaine(d: string): boolean {
    const arr = (this.stepProp.get('domains')?.value as string[] | null) ?? [];
    return arr.includes(d);
  }

  onDomaineToggle(d: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const ctrl = this.stepProp.get('domains') as FormControl<string[]>;
    let next = [...(ctrl.value ?? [])];

    if (checked) {
      if (!next.includes(d)) next.push(d);
    } else {
      next = next.filter(x => x !== d);
    }

    ctrl.setValue(next);
    ctrl.markAsDirty();
    //this.saveDraft();   // si tu as une sauvegarde locale
  }


  // ----- Helpers (risques)
  private makeRisk(description = '', mitigation = '') {
    return this.fb.group({ description: [description], mitigation: [mitigation] });
  }
  addRisk(description = '', mitigation = '') { this.risks.push(this.makeRisk(description, mitigation)); }
  removeRisk(i: number) { this.risks.removeAt(i); }

  // ----- Helpers (budget)
  private makeBudgetLine(category: BudgetCategory = 'ACTIVITES_TERRAIN', description = '', total = 0, partFPBG = 0, partCofinance = 0) {
    return this.fb.group({ category: [category], description: [description], total: [total], partFPBG: [partFPBG], partCofinance: [partCofinance] }, { validators: amountsMatch });
  }
  addBudgetLine(category?: BudgetCategory, description?: string, total?: number, partFPBG?: number, partCofinance?: number) {
    this.budgetLines.push(this.makeBudgetLine(category, description, total, partFPBG, partCofinance));
  }
  removeBudgetLine(i: number) { this.budgetLines.removeAt(i); }
  get budgetError() { return (this.form.errors?.['overheadTooHigh']) ?? null; }

  // ----- Fichiers
  onFileChange(e: Event, key: string) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachments.get(key)?.setValue(file);
  }

  // ----- Soumission (stockage local simulant l’espace admin)
  private newProjectId(): string {
    const t = Date.now().toString(36).toUpperCase();
    return `PRJ-${t.slice(-6)}`;
  }
  private computeBudgetTotals() {
    const lines = this.budgetLines.getRawValue() as Array<{ category: BudgetCategory; total: number; partFPBG: number; partCofinance: number; }>;
    const sum = (k: 'total' | 'partFPBG' | 'partCofinance') => lines.reduce((s, l) => s + (Number(l[k]) || 0), 0);
    const total = sum('total'), partFPBG = sum('partFPBG'), partCofinance = sum('partCofinance');
    const fonctionnement = lines.filter(l => l.category === 'FONCTIONNEMENT').reduce((s, l) => s + (Number(l.total) || 0), 0);
    return { total, partFPBG, partCofinance, fonctionnement };
  }
  formatMonths(months?: number[] | null): string {
    const arr = months ?? [];
    return arr.length ? arr.map(m => this.monthsLabels[m - 1]).join(', ') : '—';
  }
  trackByIndex = (i: number) => i;

  submit() {
    const id = this.newProjectId();
    const now = Date.now();

    const record = {
      id,
      status: 'SOUMIS' as const,
      updatedAt: now,
      project: {
        ...this.stepProp.getRawValue(),
        ...this.stepObj.getRawValue(),
        activitiesSummary: this.activitiesSummary.value || '',
        activities: this.activities.getRawValue(),
        risks: this.risks.getRawValue(),
        budgetLines: this.budgetLines.getRawValue(),
        budgetTotals: this.computeBudgetTotals(),
        ...this.stateStep.getRawValue(),
        ...this.sustainabilityStep.getRawValue()
      },
      attachments: Object.fromEntries(
        Object.keys(this.attachments.controls).map(k => {
          const f = this.attachments.get(k)?.value as File | null;
          return [k, f ? { name: f.name, size: f.size, type: f.type } : null];
        })
      )
    };

    const raw = localStorage.getItem(ADMIN_DATA_KEY);
    const list = raw ? JSON.parse(raw) as any[] : [];
    list.unshift(record);
    localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(list));
    localStorage.setItem(SUBMISSION_META_KEY, JSON.stringify({ id, status: 'SOUMIS', updatedAt: now }));

    alert('Votre dossier est marqué comme SOUMIS (simulation front).');
    this.router.navigateByUrl('/dashboard');
  }



  // ---- UI helpers
  canGoNext(): boolean { return true; }
}
