// soumission.ts
// ============================================================================
// FPBG – Wizard de soumission (Standalone Angular Component)
// Organisation & commentaires pour faciliter l’intégration backend ultérieure.
// Etapes UI affichées à partir de 1 dans le template (i+1), logique interne 0-based.
// ============================================================================
//
// ✅ Ce qui a été nettoyé/synchronisé (sans retirer de logique fonctionnelle) :
// - Harmonisation des champs pour coller au HTML actuel :
//   • Activité : champ de description = `summary` (au lieu de `description`).
//   • Sous-activités : `label` + `summary` (au lieu de `title` + `description`).
// - Autosave : 1 seule souscription `form.valueChanges.pipe(debounceTime(400))`
//   qui met à jour LS_DRAFT_KEY + DRAFT_META_KEY + event `fpbg:draft-updated`.
// - Ajout de la logique de modal “Engagement sur l’honneur” (hasFunding === false).
//
// ❌ Suppressions (non utilisées / doublons) :
// - `lineAmountsMatch`, `arrSum` (jamais utilisées).
// - `wordLimit: any` (déclaration redondante).
// - `protected readonly FormGroup = FormGroup` (inutile).
//
// NB : Les clés LS sont conservées :
//   - Brouillon :  LS_DRAFT_KEY = 'fpbg_submission_v3'
//   - Etape      :  LS_STEP_KEY  = 'fpbg_submission_step_v3'
//   - Méta       :  DRAFT_META_KEY = 'fpbg.nc.draft'
//
// ============================================================================

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';

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
import { environment } from '../../../../environments/environment';

/* ==============================
   Constantes & petites utilités
   ============================== */
const LS_DRAFT_KEY = 'fpbg_submission_v3';
const LS_STEP_KEY = 'fpbg_submission_step_v3';
const DRAFT_META_KEY = 'fpbg.nc.draft'; // méta simple pour dashboard/aperçus

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo

/* ---- Validators ---- */
// Limite de mots
function wordLimit(max: number) {
  return (c: AbstractControl): ValidationErrors | null => {
    const t = ('' + (c.value ?? '')).trim();
    const n = t ? t.split(/\s+/).length : 0;
    return n > max ? { wordLimit: { max, actual: n } } : null;
  };
}
// Contrôle "array non vide"
function nonEmpty(min = 1) {
  return (c: AbstractControl) => ((c as FormArray).length < min ? { arrayMin: { min } } : null);
}
// Contrôle "array non vide" pour FormControl<string[]>
function minArrayLen(min = 1) {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = c.value as string[] | null | undefined;
    return Array.isArray(v) && v.length >= min ? null : { arrayMin: { min } };
  };
}

// Validateur pour une ligne de budget : label, cfa>0, fpbg+cofin = 100
function budgetLineValidator(group: AbstractControl): ValidationErrors | null {
  const g = group as FormGroup;
  const label = (g.get('label')?.value || '').toString().trim();
  const cfa = Number(g.get('cfa')?.value || 0);
  const a = Number(g.get('fpbgPct')?.value || 0);
  const b = Number(g.get('cofinPct')?.value || 0);

  const errs: any = {};
  if (!label) errs.labelRequired = true;
  if (!(cfa > 0)) errs.cfaMin = true;
  if (a + b !== 100) errs.pctSum = true;

  return Object.keys(errs).length ? errs : null;
}

// Contraintes fichiers
function fileConstraints() {
  return (c: AbstractControl): ValidationErrors | null => {
    const f: File | null = c.value;
    if (!f) return null;
    if (f.size > MAX_FILE_BYTES) return { fileTooLarge: true };
    if (!ALLOWED_MIME.includes(f.type)) return { fileType: true };
    return null;
  };
}

@Component({
  selector: 'app-soumission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soumission.html',
})
export class SubmissionWizard {
  /* ==============================
     Injections & services
     ============================== */
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  // Type d'organisation de l'utilisateur connecté
  usertype: string = '';
  userAccount: any = null;

  // 🎯 Configuration des types de subvention
  subventionConfig: Record<string, { libelle: string; montantMin: string; montantMax: string; dureeMax: string }> = {
    'PETITE': {
      libelle: 'Petite subvention',
      montantMin: '5.000.000',
      montantMax: '50.000.000',
      dureeMax: '12 mois'
    },
    'MOYENNE': {
      libelle: 'Moyenne subvention',
      montantMin: '51.000.000',
      montantMax: '200.000.000',
      dureeMax: '24 mois'
    }
  };

  // Signals pour les informations de type de subvention
  typeSubvention = signal<string>('Petite subvention');
  montantRange = signal<string>('5.000.000 – 50.000.000 FCFA');
  dureeMax = signal<string>('12 mois');

  // État des documents (pour l'interface de sélection/upload)
  documentsState: Map<
    string,
    {
      selected: boolean;
      file: File | null;
      uploaded: boolean;
    }
  > = new Map();

  // État de la modale de succès
  showSuccessModal = false;
  submissionSummary: {
    projectTitle: string;
    documentsCount: number;
    totalBudget: number;
  } | null = null;

  /* ==============================
     Navigation locale (UI)
     ============================== */
  steps = [
    'Proposition de projet', // Etape 1 (index 0)
    'Objectifs & résultats', // Etape 2 (index 1)
    'Activités & calendrier', // Etape 3 (index 2)
    'Risques', // Etape 4 (index 3)
    'Estimation du budget', // Etape 5 (index 4)
    'État & financement', // Etape 6 (index 5)
    'Durabilité & réplication', // Etape 7 (index 6)
    'Annexes', // Etape 8 (index 7)
    'Récapitulatif', // Etape 9 (index 8)
  ] as const;

  current = signal<number>(
    Math.max(0, Math.min(this.steps.length - 1, Number(localStorage.getItem(LS_STEP_KEY) || 0)))
  );

  // 2) Dans goTo(i), juste après avoir changé 'current':
  goTo = (i: number) => {
    if (i < 0 || i >= this.steps.length) return;
    const curr = this.current();
    if (!(i === curr || i === curr - 1 || i === curr + 1)) return;
    this.current.set(i);
    localStorage.setItem(LS_STEP_KEY, String(i));

    // ⬇️ tant qu'on est avant l'étape 5, tout budget reste OFF
    if (i < 4) this.ensureAllBudgetsDisabledBeforeStep5();
  };
  next = () => this.goTo(this.current() + 1);
  prev = () => this.goTo(this.current() - 1);

  // Calcul de la progression basé sur l'étape actuelle (simple et visuel)
  progress = computed(() => {
    const currentStep = this.current() + 1; // Étape actuelle (1-9)
    const totalSteps = this.steps.length; // Total d'étapes (9)
    return Math.round((currentStep / totalSteps) * 100);
  });

  debugStep3(): any {
    const out: any = { header: {}, activities: [] };
    out.header.valid = this.activitiesHeader.valid;
    out.header.errors = this.activitiesHeader.errors;
    const groups = this.activities.controls as FormGroup[];
    groups.forEach((g, idx) => {
      out.activities[idx] = {
        title: g.get('title')?.errors || null,
        start: g.get('start')?.errors || null,
        end: g.get('end')?.errors || null,
        summary: g.get('summary')?.errors || null,
        budgetDisabled: (g.get('budget') as FormGroup)?.disabled ?? true,
      };
    });
    return out;
  }

  //calcul de la taille mot
  // Dans soumission.ts (dans la classe)
  countWords(v: any): number {
    const t = ('' + (v ?? '')).trim();
    return t ? t.split(/\s+/).length : 0;
  }

  //calcul de la barre de progression
  private isFilled(ctrl: AbstractControl | null): boolean {
    if (!ctrl) return false;
    if (ctrl.invalid) return false; // on ne compte que ce qui est valide
    const v = ctrl.value;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return v !== null && v !== undefined;
  }

  private computeProgressParts(): { done: number; total: number } {
    let done = 0,
      total = 0;

    // Étape 1
    const s1 = this.stepProp.controls;
    const s1Ctrls = [s1.title, s1.location, s1.targetGroup, s1.contextJustification, s1.domains];
    s1Ctrls.forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 2
    const s2 = this.obj.controls;
    [s2.objectives, s2.expectedResults, s2.durationMonths].forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 3 – header
    const h = this.activitiesHeader.controls;
    [h.startDate, h.endDate, h.summary].forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 3 – activités (dynamiques)
    (this.activities.controls as FormGroup[]).forEach((a) => {
      ['title', 'start', 'end', 'summary'].forEach((k) => {
        total++;
        if (this.isFilled(a.get(k))) done++;
      });
    });

    // Étape 4 – risques (dynamiques)
    (this.risks.controls as FormGroup[]).forEach((r) => {
      ['description', 'mitigation'].forEach((k) => {
        total++;
        if (this.isFilled(r.get(k))) done++;
      });
    });

    // Étape 5 – budget (chaque ligne)
    (this.activities.controls as FormGroup[]).forEach((a) => {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      lines.forEach((line) => {
        // on compte 3 "unités" : label, cfa, somme des pourcentages
        total += 3;
        if (this.isFilled(line.get('label'))) done++;
        if (this.isFilled(line.get('cfa'))) done++;
        if (!line.errors?.['pctSum']) done++; // somme = 100
      });
    });

    // Étape 6 – état & financement
    const st = this.projectState;
    total += 2; // stage + hasFunding
    if (this.isFilled(st.get('stage'))) done++;
    if (this.isFilled(st.get('hasFunding'))) done++;
    if (st.get('hasFunding')!.value === true) {
      total += 1;
      if (this.isFilled(st.get('fundingDetails'))) done++;
    } else {
      total += 1; // honorAccepted (si Non)
      if (st.get('honorAccepted')!.value === true) done++;
    }

    // Étape 7 – durabilité
    total += 1;
    if (this.isFilled(this.sustainability.get('text'))) done++;

    // (Étape 8 annexes — ignorée pour le moment)

    return { done, total };
  }

  // Bouton retour vers dashboard
  backToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }
  // Raccourci clavier (optionnel) Alt+←
  onKeydown(e: KeyboardEvent) {
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      this.backToDashboard();
    }
  }

  /* ==============================
     Données auxiliaires (UI)
     ============================== */
  domaines = [
    'Conservation marine',
    'Restauration des écosystèmes',
    'Pêche durable',
    'Réduction pollution plastique',
    'Sensibilisation environnementale',
    'Renforcement capacités',
    'Recherche scientifique',
    'Économie bleue',
  ];

  /* ==============================
     Formulaires par étape
     ============================== */

  // ---- Étape 1 : Proposition de projet ----
  stepProp = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    domains: this.fb.control<string[]>([], { validators: [minArrayLen(1)] }), // au moins 1 domaine
    location: ['', [Validators.required, wordLimit(200)]],
    targetGroup: ['', [Validators.required, wordLimit(200)]],
    contextJustification: ['', [Validators.required, wordLimit(500)]],
  });
  get sp() {
    return this.stepProp.controls;
  }

  // Helpers (récap) qui restent compatibles
  get propLocation(): string {
    const v = this.stepProp.getRawValue();
    return (v.location || (v as any).locationAndTarget || '').trim();
  }
  get propTarget(): string {
    return (this.stepProp.get('targetGroup')?.value || '').trim();
  }

  // ---- Étape 2 : Objectifs & résultats ----
  // ---- Étape 2 : Objectifs & résultats ----
  obj = this.fb.group({
    objectives: ['', [Validators.required, wordLimit(200)]],
    expectedResults: ['', [Validators.required, wordLimit(100)]],
    durationMonths: [12, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  // Force la durée entre 1 et 12 (appelé sur (change) de l'input)
  clampDuration(): void {
    const ctrl = this.obj.get('durationMonths') as FormControl<number | null>;
    const v = Number(ctrl?.value ?? 0);
    const clamped = Math.max(1, Math.min(12, isNaN(v) ? 12 : v));
    if (clamped !== v) ctrl.setValue(clamped);
  }

  // ---- Étape 3 : Activités & calendrier ----
  activitiesHeader = this.fb.group({
    startDate: this.fb.control<string>(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    summary: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, wordLimit(200)],
    }),
  });

  private makeActivity(
    data?: Partial<{ title: string; start: string; end: string; summary: string }>
  ): FormGroup {
    return this.fb.group({
      title: this.fb.control<string>(data?.title ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(160)],
      }),
      start: this.fb.control<string>(data?.start ?? this.today(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      end: this.fb.control<string>(data?.end ?? this.today(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      summary: this.fb.control<string>(data?.summary ?? '', {
        nonNullable: true,
        validators: [Validators.required, wordLimit(50)],
      }),
      subs: this.fb.array<FormGroup>([]),
    });
  }

  // Tableau des activités
  activities = this.fb.array<FormGroup>([], { validators: nonEmpty(1) });

  // Fabrique d’une sous-activité (alignée sur le HTML : label + summary)
  private makeSub(): FormGroup {
    return this.fb.group({
      label: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.maxLength(160)],
      }),
      summary: this.fb.control<string>('', { nonNullable: true, validators: [wordLimit(50)] }),
    });
  }

  // Fabrique d’une activité (alignée sur le HTML : title + dates + summary)

  // ---- BUDGET (par activité) ----
  public selectedBudgetActivity: number | null = null;

  private createBudgetLine(): FormGroup {
    return this.fb.group(
      {
        label: ['', [Validators.required]],
        kind: ['direct'], // 'direct' | 'indirect'
        cfa: [0, [Validators.required, Validators.min(1)]],
        fpbgPct: [100, [Validators.min(0), Validators.max(100)]],
        cofinPct: [0, [Validators.min(0), Validators.max(100)]],
      },
      { validators: [budgetLineValidator] }
    ); // ⬅️ somme 100 + label + cfa>0
  }

  // S’assure qu’une activité possède le sous-groupe budget
  // S’assure qu’une activité possède le sous-groupe budget
  // enabled=false  => le groupe est désactivé (n’influence pas la validité des étapes 1–4)
  // S’assure qu’une activité possède le sous-groupe budget
  // mode: 'keep' (ne touche pas l'état), 'enable', 'disable'
  private ensureActivityBudget(g: FormGroup, mode: 'keep' | 'enable' | 'disable' = 'keep'): void {
    if (!g || typeof g.get !== 'function') return;

    let budget = g.get('budget') as FormGroup | null;
    if (!budget) {
      budget = this.fb.group({
        lines: this.fb.array<FormGroup>([this.createBudgetLine()]),
      });
      g.addControl('budget', budget);
      // Si on vient de le créer et qu'on veut le laisser inactif avant l'étape 5 :
      if (mode === 'disable') budget.disable({ emitEvent: false });
      if (mode === 'enable') budget.enable({ emitEvent: false });
      return;
    }

    if (mode === 'disable' && !budget.disabled) budget.disable({ emitEvent: false });
    if (mode === 'enable' && budget.disabled) budget.enable({ emitEvent: false });
    // mode 'keep' -> ne rien faire
  }

  // Liste d’activités valides pour le sélecteur de budget
  // Liste d’activités valides pour le sélecteur de budget
  public activitiesForBudget(): { index: number; title: string }[] {
    const arr: { index: number; title: string }[] = [];
    (this.activities.controls as FormGroup[]).forEach((g, idx) => {
      const title = String(g.get('title')?.value || '').trim();
      const start = g.get('start')?.value;
      const end = g.get('end')?.value;
      if (title && start && end) {
        // Assure l'existence, NE TOUCHE PAS l'état (keep)
        this.ensureActivityBudget(g, 'keep');
        arr.push({ index: idx, title });
      }
    });
    return arr;
  }
  public selectBudgetActivity(i: number) {
    this.selectedBudgetActivity = i;
    this.ensureActivityBudget(this.activities.at(i) as FormGroup, 'enable'); // ⬅️ on active
  }
  private enableBudgetForActivity(i: number) {
    const g = this.activities.at(i) as FormGroup;
    const budget = g.get('budget') as FormGroup | null;
    if (budget && budget.disabled) {
      budget.enable({ emitEvent: false });
    }
  }
  public activityTitle(i: number | null): string {
    return i === null ? '' : this.activities.at(i).get('title')?.value || '';
  }

  public getBudgetLines(activityIndex: number): FormGroup[] {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    return lines.controls;
  }
  public addBudgetLine(activityIndex: number) {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    lines.push(this.createBudgetLine());
    this.recomputeIndirectCap();
  }
  public removeBudgetLine(activityIndex: number, lineIndex: number) {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    lines.removeAt(lineIndex);
    this.recomputeIndirectCap();
  }
  public asNumber(v: any): number {
    return Number(v || 0);
  }
  public linePctError(activityIndex: number, lineIndex: number): boolean {
    const l = this.activities.at(activityIndex).get(['budget', 'lines', lineIndex]) as FormGroup;
    const a = this.asNumber(l.get('fpbgPct')?.value);
    const b = this.asNumber(l.get('cofinPct')?.value);
    return a + b !== 100;
  }
  public totalActivityCfa(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) => s + this.asNumber(l.get('cfa')?.value),
      0
    );
  }
  public totalActivityUsd(activityIndex: number): number {
    const rate = Math.max(1, this.asNumber(this.form.get('usdRate')?.value));
    return Math.floor(this.totalActivityCfa(activityIndex) / rate);
  }
  public totalActivityFpbg(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) =>
        s +
        Math.round(
          this.asNumber(l.get('cfa')?.value) * (this.asNumber(l.get('fpbgPct')?.value) / 100)
        ),
      0
    );
  }
  public totalActivityCofin(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) =>
        s +
        Math.round(
          this.asNumber(l.get('cfa')?.value) * (this.asNumber(l.get('cofinPct')?.value) / 100)
        ),
      0
    );
  }

  // Règle globale : Indirects ≤ 10% du total projet
  public indirectCapError = false;
  private recomputeIndirectCap() {
    const acts = this.activities.controls as FormGroup[];
    let total = 0,
      indirect = 0;
    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      for (const l of lines) {
        const cfa = this.asNumber(l.get('cfa')?.value);
        total += cfa;
        if (l.get('kind')?.value === 'indirect') indirect += cfa;
      }
    }
    this.indirectCapError = total > 0 && indirect > total * 0.1;
  }
  get activitiesArray(): FormArray<FormGroup> {
    return this.activities;
  }

  // API template activités
  addActivity() {
    const g = this.makeActivity();
    this.ensureActivityBudget(g, 'disable'); // ⬅️ reste OFF tant qu'on n'est pas à l'étape 5
    this.activities.push(g);
  }
  removeActivity(i: number) {
    this.activitiesArray.removeAt(i);
  }
  addSub(i: number) {
    this.subArray(i).push(this.makeSub());
  }
  removeSub(i: number, j: number) {
    this.subArray(i).removeAt(j);
  }
  trackByIndex = (_idx: number, _item: unknown) => _idx;
  onDateBlur(g: FormGroup) {
    const s = g.get('start')?.value,
      e = g.get('end')?.value;
    if (s && e && new Date(e) < new Date(s)) {
      g.get('end')?.setValue(s);
      g.updateValueAndValidity({ onlySelf: true });
    }
  }

  // ---- Étape 4 : Risques ----
  risks = this.fb.array<FormGroup>([], nonEmpty(1));
  private makeRisk(description = '', mitigation = '') {
    return this.fb.group({
      description: [description, [Validators.required, Validators.maxLength(200)]],
      mitigation: [mitigation, [Validators.required, Validators.maxLength(200)]],
    });
  }
  addRisk() {
    this.risks.push(this.makeRisk());
  }
  removeRisk(i: number) {
    this.risks.removeAt(i);
  }

  // ---- Étape 5 : Budget agrégé (rubriques simples) ----
  budget = this.fb.group({
    terrain: [0, [Validators.min(0)]],
    invest: [0, [Validators.min(0)]],
    overhead: [0, [Validators.min(0)]], // fonctionnement (ancienne vue)
    cofin: [0, [Validators.min(0)]], // facultatif
  });
  // ---- Étape 6 : État & financement ----
  projectState = this.fb.group({
    stage: this.fb.control<'CONCEPTION' | 'DEMARRAGE' | 'AVANCE' | 'PHASE_FINALE'>('DEMARRAGE', {
      validators: [Validators.required],
    }),
    hasFunding: this.fb.control<boolean>(false, { validators: [Validators.required] }),
    fundingDetails: this.fb.control<string>(''), // devient requis si hasFunding = true
    honorAccepted: this.fb.control<boolean>(false), // requis si hasFunding = false (via modal)
  });

  public showHonorModal = false;

  // Ouvre la modal si hasFunding === false, et force l’acceptation
  private wireHonorModal(): void {
    // on s’abonne au changement Oui/Non
    const hasFundingCtrl = this.projectState.get('hasFunding') as FormControl<boolean | null>;
    const honor = this.projectState.get('honorAccepted') as FormControl<boolean>;

    hasFundingCtrl?.valueChanges.subscribe((v) => {
      if (v === false) {
        // Ouvre la modal et force l’utilisateur à cocher dans la modal
        this.showHonorModal = true;
        honor.setValue(false, { emitEvent: false });
      }
    });
  }

  // Fermeture de la modal (confirm = accepte l’engagement ; sinon on revient à Oui)
  closeHonorModal(confirm: boolean) {
    const honor = this.projectState.get('honorAccepted') as FormControl<boolean>;
    if (confirm) {
      honor.setValue(true);
      this.showHonorModal = false;
    } else {
      this.projectState.get('hasFunding')?.setValue(true);
      honor.setValue(false);
      this.showHonorModal = false;
    }
  }

  // ---- Étape 7 : Durabilité ----
  sustainability = this.fb.group({
    text: ['', [Validators.required, wordLimit(250)]],
  });

  // ---- Étape 8 : Annexes conditionnelles selon type d'organisation ----
  attachments = this.fb.group({
    // Documents communs obligatoires
    LETTRE_MOTIVATION: new FormControl<File | null>(null, [Validators.required, fileConstraints()]),
    CV: new FormControl<File | null>(null, [Validators.required, fileConstraints()]),

    // Documents conditionnels (ajoutés selon le type d'organisation)
    CERTIFICAT_ENREGISTREMENT: new FormControl<File | null>(null, [fileConstraints()]), // Association/ONG
    STATUTS_REGLEMENT: new FormControl<File | null>(null, [fileConstraints()]), // Association/ONG
    PV_ASSEMBLEE: new FormControl<File | null>(null, [fileConstraints()]), // Association/ONG
    RAPPORTS_FINANCIERS: new FormControl<File | null>(null, [fileConstraints()]), // Association/ONG
    RCCM: new FormControl<File | null>(null, [fileConstraints()]), // PME/PMI/Startup
    AGREMENT: new FormControl<File | null>(null, [fileConstraints()]), // PME (si applicable)
    ETATS_FINANCIERS: new FormControl<File | null>(null, [fileConstraints()]), // PME/PMI/Startup
    DOCUMENTS_STATUTAIRES: new FormControl<File | null>(null, [fileConstraints()]), // Secteur public
    RIB: new FormControl<File | null>(null, [fileConstraints()]), // Secteur public

    // Documents optionnels mais encouragés
    LETTRES_SOUTIEN: new FormControl<File | null>(null, [fileConstraints()]),
    PREUVE_NON_FAILLITE: new FormControl<File | null>(null, [fileConstraints()]),

    // Documents supplémentaires
    CARTOGRAPHIE: new FormControl<File | null>(null, [fileConstraints()]),
    FICHE_CIRCUIT: new FormControl<File | null>(null, [fileConstraints()]),
    BUDGET_DETAILLE: new FormControl<File | null>(null, [fileConstraints()]),
    CHRONOGRAMME: new FormControl<File | null>(null, [fileConstraints()]),
  });

  // ---- Form racine (pour autosave/récap) ----
  form = this.fb.group({
    prop: this.stepProp,
    obj: this.obj,
    activitiesHeader: this.activitiesHeader,
    activities: this.activities,
    risks: this.risks,
    budget: this.budget,
    projectState: this.projectState,
    sustainability: this.sustainability,
    attachments: this.attachments,
    // + champs additionnels dynamiques : usdRate, indirectOverheads (ajoutés au ctor)
  });

  /* ==============================
     Guides (colonne droite)
     ============================== */
  guideHtml: SafeHtml[] = [];
  conseilsHtml: SafeHtml[] = [];

  /* ==============================
     Calculs & helpers budget global
     ============================== */
  totalBudget = computed(() => {
    const b = this.budget.getRawValue();
    return Number(b.terrain || 0) + Number(b.invest || 0) + Number(b.overhead || 0);
  });

  overheadTooHigh = computed(() => {
    const total = this.totalBudget();
    if (!total) return false;
    const fct = Number(this.budget.get('overhead')?.value || 0);
    return fct > total * 0.1;
  });

  allowedAccept = ALLOWED_MIME.join(',');
  lastSavedAt = signal<number | null>(null);

  // Petites métriques pour badges
  public budgetLinesCount(i: number): number {
    const lines = this.activities.at(i).get(['budget', 'lines']) as FormArray;
    return lines?.length || 0;
  }
  public activityHasIndirectOver10(i: number): boolean {
    const lines =
      ((this.activities.at(i).get(['budget', 'lines']) as FormArray)?.controls as FormGroup[]) ||
      [];
    let total = 0,
      indirect = 0;
    for (const l of lines) {
      const cfa = this.asNumber(l.get('cfa')?.value);
      total += cfa;
      if (l.get('kind')?.value === 'indirect') indirect += cfa;
    }
    return total > 0 && indirect / total > 0.1;
  }
  public showSubtotalOnBadge = false;
  public formatK(n: number): string {
    n = Number(n || 0);
    if (n >= 1_000_000) return Math.round(n / 100_000) / 10 + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'k';
    return String(n);
  }

  // Budget global direct/indirect (vue projet)
  public sumDirect(): number {
    let total = 0;
    const acts = (this.activities.controls as FormGroup[]) || [];
    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      for (const l of lines) total += this.asNumber(l.get('cfa')?.value);
    }
    return total;
  }
  public totalIndirect(): number {
    return this.asNumber(this.form.get('indirectOverheads')?.value);
  }
  public totalProject(): number {
    return this.sumDirect() + this.totalIndirect();
  }
  public indirectShare(): number {
    const total = this.totalProject();
    return total > 0 ? this.totalIndirect() / total : 0;
  }

  // Erreur globale si dépassement 10 %
  private recomputeIndirectCapGlobal(): void {
    const share = this.indirectShare();
    this.indirectCapError = share > 0.1;

    const errs = { ...(this.form.errors || {}) };
    if (this.indirectCapError) errs['indirectCap'] = true;
    else delete errs['indirectCap'];
    this.form.setErrors(Object.keys(errs).length ? errs : null);
  }

  /* ==============================
     Méthodes pour gérer les annexes conditionnelles
     ============================== */

  /**
   * Retourne la liste des documents requis selon le type d'organisation
   */
  getRequiredDocuments(): Array<{ key: string; label: string; required: boolean }> {
    const common = [
      { key: 'LETTRE_MOTIVATION', label: 'Lettre de motivation', required: true },
      { key: 'CV', label: 'CV du porteur et des membres clés', required: true },
    ];

    const optional = [
      {
        key: 'LETTRES_SOUTIEN',
        label: 'Lettres de soutien (facultatives mais encouragées)',
        required: false,
      },
      {
        key: 'PREUVE_NON_FAILLITE',
        label: 'Preuve de non-faillite (recommandée pour les entreprises)',
        required: false,
      },
    ];

    const additional = [
      { key: 'CARTOGRAPHIE', label: 'Cartographie', required: false },
      { key: 'FICHE_CIRCUIT', label: 'Fiche Circuit', required: false },
      { key: 'BUDGET_DETAILLE', label: 'Budget détaillé', required: false },
      { key: 'CHRONOGRAMME', label: 'Chronogramme', required: false },
    ];

    let specific: Array<{ key: string; label: string; required: boolean }> = [];

    // Normaliser le type d'organisation (enlever accents, espaces, etc.)
    const type = this.usertype?.toLowerCase().trim() || '';

    if (
      type.includes('association') ||
      type.includes('ong') ||
      type.includes('communaut') ||
      type.includes('coopérative')
    ) {
      // 🏢 Association / ONG / Communautés / Coopératives
      specific = [
        { key: 'CERTIFICAT_ENREGISTREMENT', label: "Certificat d'enregistrement", required: true },
        { key: 'STATUTS_REGLEMENT', label: 'Statuts et règlement intérieur', required: true },
        { key: 'PV_ASSEMBLEE', label: 'PV de la dernière assemblée générale', required: true },
        {
          key: 'RAPPORTS_FINANCIERS',
          label: 'Rapports financiers des trois dernières années',
          required: true,
        },
      ];
    } else if (
      type.includes('pme') ||
      type.includes('pmi') ||
      type.includes('startup') ||
      type.includes('secteur privé') ||
      type.includes('privé')
    ) {
      // 💼 PME / PMI / Startup / Secteur privé
      specific = [
        { key: 'RCCM', label: 'RCCM (Registre du Commerce et du Crédit Mobilier)', required: true },
        { key: 'AGREMENT', label: "Agrément d'exploitation (si applicable)", required: false },
        {
          key: 'ETATS_FINANCIERS',
          label: 'États financiers récents ou preuve de non-faillite',
          required: true,
        },
      ];
    } else if (
      type.includes('gouvernement') ||
      type.includes('public') ||
      type.includes('recherche') ||
      type.includes('entités gouvernementales') ||
      type.includes('organismes de recherche')
    ) {
      // 🏛 Secteur public / Organismes de recherche
      specific = [
        {
          key: 'DOCUMENTS_STATUTAIRES',
          label: 'Documents statutaires ou arrêtés de création',
          required: true,
        },
        { key: 'RIB', label: "Relevé d'identité bancaire (RIB)", required: true },
      ];
    }

    return [...common, ...specific, ...optional, ...additional];
  }

  /**
   * Vérifie si un document doit être affiché
   */
  shouldShowDocument(key: string): boolean {
    return this.getRequiredDocuments().some((doc) => doc.key === key);
  }

  /**
   * Récupère les infos utilisateur depuis localStorage
   */
  private loadUserInfo(): void {
    try {
      // 🎯 Charger depuis la clé 'user' qui contient les données complètes du backend
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('📋 Données utilisateur complètes:', user);

        // Déterminer le type d'utilisateur
        const org = user?.organisation;
        this.usertype = org ? 'organisation' : 'user';

        // Charger le type de subvention depuis l'organisation
        if (org?.typeSubvention) {
          const typeSubv = org.typeSubvention;
          const code = typeSubv.code || 'PETITE';
          const config = this.subventionConfig[code];

          if (config) {
            this.typeSubvention.set(config.libelle);
            this.montantRange.set(`${config.montantMin} – ${config.montantMax} FCFA`);
            this.dureeMax.set(config.dureeMax);
            console.log('✅ Type de subvention chargé:', config.libelle, '(code:', code, ')');
          } else {
            console.warn('⚠️ Aucune configuration trouvée pour le code:', code);
          }
        } else {
          console.warn('⚠️ Aucun typeSubvention trouvé dans l\'organisation');
        }
      }

      // Fallback sur fpbg.account pour compatibilité
      const accountData = localStorage.getItem('fpbg.account');
      if (accountData) {
        this.userAccount = JSON.parse(accountData);
        if (!this.usertype) {
          this.usertype = this.userAccount?.type || '';
        }
        console.log("📋 Type d'organisation (fallback):", this.usertype);
      }

      this.updateAttachmentsValidators();
    } catch (error) {
      console.error('❌ Erreur lecture compte utilisateur:', error);
    }
  }

  /**
   * Met à jour les validateurs des champs d'annexes selon le type d'organisation
   */
  private updateAttachmentsValidators(): void {
    const requiredDocs = this.getRequiredDocuments();

    requiredDocs.forEach((doc) => {
      const control = this.attachments.get(doc.key);
      if (control) {
        if (doc.required) {
          control.setValidators([Validators.required, fileConstraints()]);
        } else {
          control.setValidators([fileConstraints()]);
        }
        control.updateValueAndValidity({ emitEvent: false });
      }

      // Initialiser l'état du document
      if (!this.documentsState.has(doc.key)) {
        this.documentsState.set(doc.key, {
          selected: false,
          file: null,
          uploaded: false,
        });
      }
    });
  }

  /* ==============================
     Gestion de l'interface de sélection/upload des documents
     ============================== */

  /**
   * Retourne les documents non uploadés
   */
  getPendingDocuments(): Array<{ key: string; label: string; required: boolean }> {
    return this.getRequiredDocuments().filter((doc) => {
      const state = this.documentsState.get(doc.key);
      return !state?.uploaded;
    });
  }

  /**
   * Retourne les documents uploadés
   */
  getUploadedDocuments(): Array<{
    key: string;
    label: string;
    required: boolean;
    file: File | null;
  }> {
    const uploaded = this.getRequiredDocuments()
      .filter((doc) => {
        const state = this.documentsState.get(doc.key);
        return state?.uploaded;
      })
      .map((doc) => ({
        ...doc,
        file: this.documentsState.get(doc.key)?.file || null,
      }));

    // Log pour debug
    if (this.current() === 8) {
      console.log('📎 getUploadedDocuments() appelé - Résultat:', uploaded.length, 'documents');
    }

    return uploaded;
  }

  /**
   * Toggle la sélection d'un document
   */
  toggleDocumentSelection(key: string): void {
    const state = this.documentsState.get(key);
    if (state) {
      state.selected = !state.selected;
    }
  }

  /**
   * Vérifie si un document est sélectionné
   */
  isDocumentSelected(key: string): boolean {
    return this.documentsState.get(key)?.selected || false;
  }

  /**
   * Ouvre le sélecteur de fichier pour un document
   */
  openFileSelector(key: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.allowedAccept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadDocument(key, file);
      }
    };
    input.click();
  }

  /**
   * Upload un document
   */
  uploadDocument(key: string, file: File): void {
    // Validation du fichier
    if (file.size > MAX_FILE_BYTES) {
      alert('Le fichier est trop volumineux (max 10 Mo)');
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      alert('Type de fichier non autorisé');
      return;
    }

    // Mettre à jour l'état
    const state = this.documentsState.get(key);
    if (state) {
      state.file = file;
      state.uploaded = true;
      state.selected = false;
    }

    // Mettre à jour le FormControl et marquer comme valide
    const control = this.attachments.get(key);
    if (control) {
      control.setValue(file);
      control.markAsTouched();
      control.updateValueAndValidity();
    }

    console.log(`✅ Document uploadé: ${key} - ${file.name}`);
  }

  /**
   * Supprime un document uploadé
   */
  removeDocument(key: string): void {
    const state = this.documentsState.get(key);
    if (state) {
      state.file = null;
      state.uploaded = false;
      state.selected = false;
    }

    // Réinitialiser le FormControl
    const control = this.attachments.get(key);
    if (control) {
      control.setValue(null);
      control.markAsUntouched();
      control.updateValueAndValidity();
    }

    console.log(`🗑️ Document supprimé: ${key}`);
  }

  /**
   * Prévisualise un document (ouvre dans un nouvel onglet)
   */
  previewDocument(key: string): void {
    const state = this.documentsState.get(key);
    if (state?.file) {
      const url = URL.createObjectURL(state.file);
      window.open(url, '_blank');
    }
  }

  /**
   * Télécharge les documents sélectionnés
   */
  uploadSelectedDocuments(): void {
    const selectedKeys = Array.from(this.documentsState.entries())
      .filter(([_, state]) => state.selected)
      .map(([key, _]) => key);

    if (selectedKeys.length === 0) {
      alert('Veuillez sélectionner au moins un document');
      return;
    }

    // Pour chaque document sélectionné, ouvrir le sélecteur de fichier
    selectedKeys.forEach((key) => {
      this.openFileSelector(key);
    });
  }

  /**
   * Formate la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Retourne les documents obligatoires manquants
   */
  getMissingRequiredDocuments(): Array<{ key: string; label: string; required: boolean }> {
    return this.getRequiredDocuments().filter((doc) => {
      if (!doc.required) return false;
      const state = this.documentsState.get(doc.key);
      return !state?.uploaded;
    });
  }

  /**
   * Compte le nombre de documents obligatoires uploadés
   */
  getUploadedRequiredCount(): number {
    return this.getUploadedDocuments().filter((doc) => doc.required).length;
  }

  /**
   * Compte le nombre total de documents obligatoires
   */
  getTotalRequiredCount(): number {
    return this.getRequiredDocuments().filter((doc) => doc.required).length;
  }

  /* ==============================
     Cycle de vie / Constructor
     ============================== */
  constructor() {
    // Charger les informations utilisateur
    this.loadUserInfo();
    // ---- Paramètre : taux USD (lecture seule côté UI) ----
    const DEFAULT_USD_RATE = 600;
    if (!this.form.get('usdRate')) {
      // @ts-ignore readonly côté UI
      this.form.addControl('usdRate', new FormControl({ value: DEFAULT_USD_RATE, disabled: true }));
    }
    if (!this.form.get('indirectOverheads')) {
      // @ts-ignore
      this.form.addControl('indirectOverheads', new FormControl(0, [Validators.min(0)]));
    }

    // Initialiser au moins une activité
    if (this.activities.length === 0) this.addActivity();

    // Restauration brouillon
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw);

        // Compat : ancienne liste d’activités (label/start/end/description)
        if (Array.isArray(v.activities)) {
          if (this.activities.length) this.activities.clear();
          for (const a of v.activities) {
            const gAct = this.makeActivity({
              title: a.label ?? a.title ?? '',
              start: a.start ?? this.today(),
              end: a.end ?? this.today(),
              summary: a.summary ?? a.description ?? '',
            });
            this.ensureActivityBudget(gAct);
            this.activities.push(gAct);
          }
          // Nettoyage pour éviter de repatcher ci-dessous
          delete v.activities;
        }

        // Compat risques
        if (Array.isArray(v.risks)) {
          this.risks.clear();
          for (const r of v.risks) this.risks.push(this.makeRisk(r.description, r.mitigation));
          delete v.risks;
        }

        // section pour la modal obligatoire

        // fundingDetails requis si hasFunding = true
        this.projectState.get('hasFunding')!.valueChanges.subscribe((v) => {
          const fd = this.projectState.get('fundingDetails')!;
          if (v === true) {
            fd.addValidators([Validators.required]);
          } else {
            fd.removeValidators([Validators.required]);
            fd.setValue(''); // on vide si Non
          }
          fd.updateValueAndValidity({ emitEvent: false });
        });

        // Compat locationAndTarget -> location/targetGroup
        if (v.stepProp?.locationAndTarget && !v.stepProp.location && !v.stepProp.targetGroup) {
          v.stepProp.location = v.stepProp.locationAndTarget;
          v.stepProp.targetGroup = '';
        }

        // Patch du reste
        this.form.patchValue(v, { emitEvent: false });
      } catch {
        /* ignore JSON error */
      }
    }

    // Autosave unique (LS + méta + event)
    this.form.valueChanges.pipe(debounceTime(400)).subscribe((v) => {
      // Sauve le brouillon
      localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(v));

      // Meta à jour (timestamp)
      const now = Date.now();
      const currentMeta = JSON.parse(localStorage.getItem(DRAFT_META_KEY) || '{}') || {};
      currentMeta.updatedAt = now; // ms
      currentMeta._updatedAt = new Date(now).toISOString(); // ISO lecture
      localStorage.setItem(DRAFT_META_KEY, JSON.stringify(currentMeta));

      // Event pour dashboard
      window.dispatchEvent(new Event('fpbg:draft-updated'));

      // Vérifie le plafond 10 % (global)
      this.recomputeIndirectCapGlobal();

      // Horodatage local (UI)
      this.lastSavedAt.set(now);
    });

    // Précharge guides (colonne droite)
    this.loadGuides();

    // Filtrage modal engagement d’honneur
    this.wireHonorModal();
  }

  // Affichage horodatage “Sauvegardé HH:MM:SS”
  lastSaved(): string {
    const t = this.lastSavedAt();
    if (!t) return '—';
    const d = new Date(t);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /* ==============================
     Méthodes UI diverses
     ============================== */
  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  toggleDomain(d: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const ctrl = this.stepProp.get('domains') as FormControl<string[]>;
    let arr = [...(ctrl.value ?? [])];
    if (checked) {
      if (!arr.includes(d)) arr.push(d);
    } else {
      arr = arr.filter((x) => x !== d);
    }
    ctrl.setValue(arr);
  }

  onFile(e: Event, key: string) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.attachments.get(key)?.setValue(f);
  }

  // Validation douce pour autoriser "Suivant"
  // Validation douce pour autoriser "Suivant"
  canGoNext(): boolean {
    const i = this.current();
    switch (i) {
      case 0:
        return this.stepProp.valid;
      case 1:
        return this.obj.valid;
      case 2: {
        // ⬇️ On valide seulement les champs requis de l’étape 3
        if (!this.activitiesHeader.valid) return false;
        const groups = this.activities.controls as FormGroup[];
        if (groups.length < 1) return false;

        // chaque activité doit avoir title/start/end/summary valides
        for (const g of groups) {
          if (g.get('title')?.invalid) return false;
          if (g.get('start')?.invalid) return false;
          if (g.get('end')?.invalid) return false;
          if (g.get('summary')?.invalid) return false;
          // ⛔️ on ignore totalement 'budget' ici, même s'il est actif quelque part
        }
        return true;
      }
      case 3:
        return this.risks.valid;
      case 4:
        return this.budget.valid && !this.overheadTooHigh();
      case 5:
        return this.projectState.valid;
      case 6:
        return this.sustainability.valid;
      case 7:
        // Vérifier que tous les documents obligatoires sont uploadés
        const missingRequired = this.getMissingRequiredDocuments();
        return missingRequired.length === 0;
      default:
        return true;
    }
  }
  private ensureAllBudgetsDisabledBeforeStep5(): void {
    const groups = this.activities.controls as FormGroup[];
    groups.forEach((g) => this.ensureActivityBudget(g, 'disable')); // ta version 'mode' de ensureActivityBudget
  }
  /**
   * Prépare les données pour la soumission incluant les fichiers
   */
  private prepareSubmissionData(): FormData {
    const formData = new FormData();

    // Récupérer toutes les données du formulaire
    const formValue = this.form.getRawValue();

    // Aplatir les données pour correspondre au schéma Prisma
    const projectData = {
      // Étape 1: Proposition
      title: formValue.prop?.title || '',
      domains: formValue.prop?.domains || [],
      location: formValue.prop?.location || '',
      targetGroup: formValue.prop?.targetGroup || '',
      contextJustification: formValue.prop?.contextJustification || '',

      // Étape 2: Objectifs
      objectives: formValue.obj?.objectives || '',
      expectedResults: formValue.obj?.expectedResults || '',
      durationMonths: formValue.obj?.durationMonths || 0,

      // Étape 3: Activités
      activitiesStartDate: formValue.activitiesHeader?.startDate || '',
      activitiesEndDate: formValue.activitiesHeader?.endDate || '',
      activitiesSummary: formValue.activitiesHeader?.summary || '',
      activities: formValue.activities || [],

      // Étape 4: Risques
      risks: formValue.risks || [],

      // Étape 5: Budget
      usdRate: 655,
      budgetActivities:
        formValue.activities?.map((act: any, index: number) => ({
          activityIndex: index,
          lines: act.budget?.lines || [],
        })) || [],
      indirectOverheads: formValue.budget?.overhead || 0,

      // Étape 6: État du projet
      projectStage: formValue.projectState?.stage || 'CONCEPTION',
      hasFunding: formValue.projectState?.hasFunding || false,
      fundingDetails: formValue.projectState?.fundingDetails || '',
      honorAccepted: formValue.projectState?.honorAccepted || false,

      // Étape 7: Durabilité
      sustainability: formValue.sustainability?.text || '',
      replicability: formValue.sustainability?.text || '',

      // Collaborateurs (si présents)
      collaborateurs: [],
    };

    // Ajouter les données textuelles en JSON
    formData.append('projectData', JSON.stringify(projectData));

    // Ajouter les fichiers uploadés
    const uploadedDocs = this.getUploadedDocuments();
    uploadedDocs.forEach((doc) => {
      if (doc.file) {
        // Ajouter chaque fichier avec sa clé comme nom de champ
        formData.append(`attachment_${doc.key}`, doc.file, doc.file.name);
      }
    });

    // Ajouter un index des documents
    const attachmentsIndex = uploadedDocs.map((doc) => ({
      key: doc.key,
      label: doc.label,
      required: doc.required,
      fileName: doc.file?.name,
      fileSize: doc.file?.size,
      fileType: doc.file?.type,
    }));
    formData.append('attachmentsIndex', JSON.stringify(attachmentsIndex));

    return formData;
  }

  // Soumission du projet
  submit() {
    // Vérifier les documents obligatoires
    const missingDocs = this.getMissingRequiredDocuments();
    if (missingDocs.length > 0) {
      alert(`Documents obligatoires manquants : ${missingDocs.map((d) => d.label).join(', ')}`);
      return;
    }

    // Vérifier la validité du formulaire
    if (!this.canGoNext()) {
      this.form.markAllAsTouched();
      alert('Veuillez corriger les erreurs avant la soumission.');
      return;
    }

    if (this.overheadTooHigh()) {
      alert('Les frais de fonctionnement dépassent 10% du total.');
      return;
    }

    // Préparer les données avec les fichiers
    const submissionData = this.prepareSubmissionData();

    // Logs pour debug
    console.log('📤 Soumission du projet avec les données suivantes :');
    console.log('- Documents uploadés:', this.getUploadedDocuments().length);

    // Envoyer au backend via HTTP
    const token = localStorage.getItem('fpbg.token');
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      this.router.navigateByUrl('/login');
      return;
    }

    // Afficher un loader
    console.log('⏳ Envoi en cours...');

    this.http
      .post(`${environment.urlServer}/api/aprojet-v1/submit`, submissionData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .subscribe({
        next: (response: any) => {
          console.log('✅ Projet soumis avec succès:', response);

          // Préparer le résumé de la soumission
          this.submissionSummary = {
            projectTitle: this.stepProp.get('title')?.value || 'Projet sans titre',
            documentsCount: this.getUploadedDocuments().length,
            totalBudget: this.totalProject(),
          };

          // Nettoyer le localStorage
          localStorage.removeItem(LS_DRAFT_KEY);
          localStorage.removeItem(LS_STEP_KEY);

          // Afficher la modale de succès
          this.showSuccessModal = true;
        },
        error: (error) => {
          console.error('❌ Erreur lors de la soumission:', error);

          let errorMessage = 'Une erreur est survenue lors de la soumission du projet.';

          if (error.status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            this.router.navigateByUrl('/login');
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          alert('❌ Erreur de soumission\n\n' + errorMessage);
        },
      });
  }

  /**
   * Ferme la modale de succès et redirige vers le dashboard
   */
  closeSuccessModal(): void {
    this.showSuccessModal = false;
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
      // 0 - Proposition
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Proposition de projet
    </p>
    <div class="text-xs text-slate-500 mb-2">Note conceptuelle : <b>max. 5 pages</b> (hors annexes).</div>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Titre du projet</b> : clair, concis, accrocheur, résumant l’objectif principal.</li>
      <li><b>Lieu d’exécution & groupe cible</b> (<b>≤ 200 mots</b>) : précisez les sites d’intervention et les bénéficiaires (inclure, si pertinent, aspects genre et conservation communautaire).</li>
      <li><b>Contexte & justification</b> (<b>≤ 500 mots</b>) : expliquez le contexte, l’origine du projet et sa pertinence pour le FPBG. Répondez explicitement :
        <ul class="list-disc ml-5">
          <li>D’où vient l’idée ? Comment a-t-elle été identifiée ?</li>
          <li>Quelle problématique sous-jacente et en quoi est-elle importante ?</li>
          <li>Quelles lacunes/défis que d’autres projets n’ont pas encore résolus ?</li>
          <li>Quelles ressources naturelles concernées (biodiversité/écosystèmes) ?</li>
          <li>Quels risques si aucune mesure n’est prise ?</li>
        </ul>
      </li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Soyez clair et concis</b> : allez à l’essentiel, respectez les limites de mots.</li>
      <li><b>Impact</b> : mettez en avant les bénéfices concrets pour l’environnement et les communautés.</li>
      <li><b>Alignement</b> : cohérence avec les objectifs/priorités FPBG.</li>
      <li><b>Professionnalisme</b> : chiffres sourcés, relecture attentive.</li>
    </ul>
    `,

      // 1 - Objectifs & résultats
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Objectifs & résultats
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Objectifs</b> (<b>≤ 200 mots</b>) : formulez des objectifs <b>SMART</b> (Spécifiques, Mesurables, Atteignables, Réalistes, Temporellement définis).</li>
      <li><b>Résultats attendus</b> (<b>≤ 100 mots</b>) : décrivez les changements <b>mesurables</b>. Exemples d’impacts :
        <ul class="list-disc ml-5">
          <li>Résilience accrue des écosystèmes face aux changements climatiques.</li>
          <li>Amélioration de la qualité de l’eau.</li>
          <li>Stabilisation des berges / réduction de l’érosion.</li>
          <li>Participation communautaire et sensibilisation renforcées.</li>
        </ul>
      </li>
      <li><b>Durée estimée</b> : indiquez une durée réaliste (<i>ex.</i> <b>12 mois</b>).</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Évitez les généralités ; reliez objectifs ↔ résultats ↔ indicateurs.</li>
      <li>Vérifiez la cohérence avec le calendrier et le budget.</li>
    </ul>
    `,

      // 2 - Activités & calendrier
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Activités & calendrier
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Activités principales</b> (<b>≤ 200 mots</b>) : décrivez les grandes lignes qui mènent aux résultats.</li>
      <li><b>Calendrier d’exécution</b> : planifiez les périodes <b>début/fin</b> par activité (mois).</li>
      <li><b>Exemples d’activités</b> :
        <ul class="list-disc ml-5">
          <li>Cartographie détaillée des zones de sensibilité (diagnostic, analyse des sols).</li>
          <li>Conception/planification d’<b>ingénierie écologique</b> (fascines, enrochements végétalisés, etc.).</li>
          <li>Plantation d’espèces <b>indigènes</b> adaptées.</li>
          <li>Mise en place de <b>suivi écologique</b> (qualité de l’eau, inventaires d’espèces).</li>
          <li>Actions de <b>sensibilisation</b> et d’engagement communautaire.</li>
        </ul>
      </li>
    </ul>
    <div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
      Assurez-vous que les activités respectent la <b>liste d’exclusion</b> FPBG (pas d’activités non éligibles).
    </div>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>La charge de travail et la durée doivent rester réalistes.</li>
      <li>Reliez chaque activité à au moins un résultat attendu.</li>
    </ul>
    `,

      // 3 - Risques
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Risques
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Identifiez les risques <b>techniques</b>, <b>environnementaux</b>, <b>sociaux</b> et <b>politiques</b> liés au projet.</li>
      <li>Décrivez, pour chacun, des <b>mesures d’évitement</b> ou <b>d’atténuation</b> concrètes (qui fait quoi, quand).</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Priorisez les risques majeurs et surveillables ; restez spécifique.</li>
    </ul>
    `,

      // 4 - Budget estimatif
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Budget estimatif
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Présentez une estimation réaliste par <b>grandes rubriques</b> :
        <ul class="list-disc ml-5">
          <li><b>Activités de terrain</b></li>
          <li><b>Investissements</b></li>
          <li><b>Fonctionnement</b></li>
        </ul>
      </li>
      <li>Indiquez les <b>cofinancements</b> éventuels (organisation, communautés, bailleurs A/B), en <b>numéraire</b> ou <b>en nature</b>.</li>
      <li>Les <b>frais indirects</b> (coûts institutionnels) doivent être <b>≤ 10 %</b> du budget total.</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Restez synthétique ici ; gardez le détail en annexe “Budget détaillé”.</li>
      <li>Assurez la cohérence <b>Activités ↔ Budget</b> et justifiez les montants clés.</li>
    </ul>
    `,

      // 5 - État & financement
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      État d’avancement & financement
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Stade de développement</b> : Conception, Démarrage, Avancé, Phase finale.</li>
      <li><b>Financements</b> : précisez si vous avez déjà demandé/obtenu des financements ; indiquez bailleur(s), montants et statuts.</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Transparence sur l’historique des demandes et la complémentarité des sources.</li>
    </ul>
    `,

      // 6 - Durabilité & réplication
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Durabilité & potentiel de réplication
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Durabilité</b> : que ferez-vous pour que les effets positifs perdurent après la fin du projet ? (gouvernance, maintenance, capacités locales, coûts récurrents)</li>
      <li><b>Réplication au Gabon</b> : dans quelles conditions le projet peut-il être reproduit ailleurs ? (pré-requis, partenaires, budget indicatif)</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Restez concret : mécanismes, responsabilités et calendrier post-projet.</li>
    </ul>
    `,

      // 7 - Annexes
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Annexes
    </p>
    <p class="text-sm">Téléversez les pièces demandées (PDF/DOC/XLS/JPG/PNG). <span class="text-xs text-slate-500">Hors pagination des 5 pages.</span></p>
    <ol class="list-decimal ml-5 space-y-0.5 text-sm">
      <li>Lettre de motivation</li>
      <li>Statuts & règlement / Agrément / Récépissé (selon type d’organisme)</li>
      <li>Fiche circuit (PME/PMI/Startup, si applicable)</li>
      <li>CV du porteur et des responsables techniques</li>
      <li>Budget détaillé (tableur)</li>
      <li>Chronogramme (Gantt mensuel)</li>
      <li>Cartographie / relevés techniques (si pertinent)</li>
      <li>Lettres de soutien / engagements partenaires (optionnel)</li>
    </ol>
    `,

      // 8 - Récapitulatif
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Récapitulatif & contrôle qualité
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Vérifiez la <b>cohérence</b> <i>Objectifs ↔ Activités ↔ Résultats ↔ Budget ↔ Calendrier</i>.</li>
      <li>Relisez, corrigez, et confirmez le <b>respect des limites de mots</b>.</li>
      <li>Confirmez la conformité aux <b>priorités FPBG</b> et à la <b>liste d’exclusion</b>.</li>
    </ul>
    `,
    ];

    // Bloc "Sélection des dossiers" (extraits page 3)
    const conseils = guides.map(
      () => `
    <h4 class="font-semibold text-emerald-700 mb-1">Sélection des dossiers</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>La <b>fiche d’évaluation</b> utilisée par le FPBG est disponible (voir lien officiel).</li>
      <li>Après analyse/évaluation, les projets sont classés par <b>ordre de priorité</b> par le Comité Technique.</li>
      <li>Si plusieurs projets sont <b>identiques</b>, le Comité Technique se réserve le droit de <b>rejeter</b> ou de <b>reporter</b> leur financement selon ses critères de priorisation.</li>
    </ul>
  `
    );

    this.guideHtml = guides.map((g) => this.sanitize(g));
    this.conseilsHtml = conseils.map((c) => this.sanitize(c));
  }

  /* ==============================
     Accès pratiques pour le template
     ============================== */
  get activityGroups(): FormGroup[] {
    return this.activities.controls as FormGroup[];
  }
  get riskGroups(): FormGroup[] {
    return this.risks.controls as FormGroup[];
  }
  subArray(i: number): FormArray<FormGroup> {
    return this.activities.at(i).get('subs') as FormArray<FormGroup>;
  }
  getSubGroups(i: number): FormGroup[] {
    return this.subArray(i).controls as FormGroup[];
  }

  /* ==============================
     GANTT (SVG) — Vue par MOIS
     ============================== */
  private parseDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  private diffDays(a: Date, b: Date) {
    return Math.max(
      0,
      Math.round((this.startOfDay(b).getTime() - this.startOfDay(a).getTime()) / 86400000)
    );
  }
  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  private addMonths(d: Date, n: number) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  }
  private monthDiff(a: Date, b: Date) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }
  private monthShort(d: Date) {
    return d.toLocaleString(undefined, { month: 'short' });
  }

  private readActivities(): Array<{ title: string; start: Date; end: Date; subs: number }> {
    const items: Array<{ title: string; start: Date; end: Date; subs: number }> = [];
    const groups = this.activities.controls as FormGroup[];
    for (const g of groups) {
      const title = String(g.get('title')?.value || '').trim();
      const s = this.parseDate(g.get('start')?.value);
      const e = this.parseDate(g.get('end')?.value);
      if (!title || !s || !e) continue;
      const subs = (g.get('subs') as FormArray<FormGroup>)?.length || 0;
      items.push({ title, start: s, end: e, subs });
    }
    return items;
  }

  private computeSpan(items: { start: Date; end: Date }[]) {
    if (!items.length) return null;
    let min = items[0].start,
      max = items[0].end;
    for (const it of items) {
      if (it.start < min) min = it.start;
      if (it.end > max) max = it.end;
    }
    min = this.startOfMonth(min);
    max = this.addMonths(this.startOfMonth(max), 1);
    return { min, max };
  }

  private computePxPerMonth(units: number, leftLabelsW: number): number {
    const vw = Math.max(360, (window as any)?.innerWidth || 1024);
    const containerGuess = Math.min(1280, vw - 64);
    const free = Math.max(300, containerGuess - leftLabelsW - 40);
    const ideal = Math.floor(free / Math.max(1, units));
    return Math.max(28, Math.min(72, ideal));
  }

  public ganttSvg(): SafeHtml {
    const acts = this.readActivities();
    if (!acts.length) {
      return this.sanitizer.bypassSecurityTrustHtml(
        `<div class="p-6 text-sm text-slate-500">Ajoute au moins une activité avec des dates pour voir le diagramme.</div>`
      );
    }
    const span = this.computeSpan(acts);
    if (!span) return this.sanitizer.bypassSecurityTrustHtml('');

    const { min, max } = span;
    const units =
      this.monthDiff(this.startOfMonth(min), this.startOfMonth(this.addDays(max, -1))) + 1;

    // métriques & couleurs
    const leftLabelsW = 300;
    const pxPerUnit = this.computePxPerMonth(units, leftLabelsW);
    const rowH = 36,
      gap = 8,
      headYearH = 26,
      headMonthH = 26;
    const topH = headYearH + headMonthH;

    const strokeGrid = '#CBD5E1';
    const strokeGridLight = '#E2E8F0';
    const headBg = '#F8FAFC';
    const textHead = '#334155';
    const textBody = '#0f172a';
    const subBullet = '#94a3b8';
    const barA = '#10b981';
    const barB = '#059669';

    const width = leftLabelsW + units * pxPerUnit + 40;
    const height = topH + acts.length * (rowH + gap) + 20;

    type YearSpan = { year: number; startU: number; count: number };
    const years: YearSpan[] = [];
    for (let u = 0; u < units; u++) {
      const d = this.addMonths(min, u);
      const y = d.getFullYear();
      const last = years[years.length - 1];
      if (!last || last.year !== y) years.push({ year: y, startU: u, count: 1 });
      else last.count++;
    }
    const headParts: string[] = [];
    years.forEach((s) => {
      const x0 = leftLabelsW + s.startU * pxPerUnit;
      const w = s.count * pxPerUnit;
      const cx = x0 + w / 2;
      headParts.push(`
      <rect x="${x0}" y="0" width="${w}" height="${headYearH}" fill="${headBg}" />
      <text x="${cx}" y="${
        headYearH - 8
      }" font-size="12" font-weight="700" fill="${textHead}" text-anchor="middle">${s.year}</text>
    `);
    });

    for (let u = 0; u < units; u++) {
      const x = leftLabelsW + u * pxPerUnit + 0.5;
      const d = this.addMonths(min, u);
      headParts.push(`
      <rect x="${
        x - 0.5
      }" y="${headYearH}" width="${pxPerUnit}" height="${headMonthH}" fill="${headBg}" />
      <line x1="${x}" y1="${headYearH}" x2="${x}" y2="${height}" stroke="${strokeGridLight}" />
      <text x="${x + pxPerUnit / 2}" y="${
        headYearH + headMonthH - 8
      }" font-size="11" fill="${textHead}" text-anchor="middle">${this.monthShort(d)}</text>
    `);
    }
    const lastX = leftLabelsW + units * pxPerUnit + 0.5;
    headParts.push(
      `<line x1="${lastX}" y1="${headYearH}" x2="${lastX}" y2="${height}" stroke="${strokeGrid}" />`
    );

    const hLines: string[] = [];
    for (let r = 0; r <= acts.length; r++) {
      const y = topH + r * (rowH + gap) - (r ? gap / 2 : 0);
      hLines.push(
        `<line x1="${leftLabelsW}" y1="${y}" x2="${
          leftLabelsW + units * pxPerUnit
        }" y2="${y}" stroke="${strokeGrid}" />`
      );
    }

    const rows: string[] = [];
    acts.forEach((a, idx) => {
      const y = topH + idx * (rowH + gap);
      const bullets = a.subs
        ? `<tspan dx="8" fill="${subBullet}" font-size="11">• x${a.subs} sous-activit${
            a.subs > 1 ? 'és' : 'é'
          }</tspan>`
        : '';
      rows.push(
        `<text x="12" y="${y + rowH / 2 + 4}" font-size="13" fill="${textBody}">${this.escapeXml(
          a.title
        )}${bullets}</text>`
      );

      const s0 = this.startOfMonth(a.start);
      const e0 = this.startOfMonth(a.end);
      const startUnit = Math.max(0, this.monthDiff(this.startOfMonth(min), s0));
      const endUnit = Math.max(
        startUnit + 1,
        this.monthDiff(this.startOfMonth(min), this.addMonths(e0, 1))
      );

      const x = leftLabelsW + startUnit * pxPerUnit + 1;
      const w = Math.max(10, (endUnit - startUnit) * pxPerUnit - 2);
      const fill = idx % 2 === 0 ? barA : barB;

      const daysLen = Math.max(1, this.diffDays(a.start, a.end) + 1);
      rows.push(`
      <rect x="${x}" y="${y + 6}" rx="6" ry="6" width="${w}" height="${
        rowH - 12
      }" fill="${fill}" opacity="0.96"></rect>
      <text x="${x + 8}" y="${y + rowH / 2 + 4}" font-size="12" fill="white">${daysLen} j</text>
    `);
    });

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
         style="display:block; max-width:100%;">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white" />

      <rect x="0" y="0" width="${leftLabelsW}" height="${topH}" fill="${headBg}" />
      <text x="12" y="${
        headYearH + headMonthH - 8
      }" font-size="12" font-weight="600" fill="${textHead}">Activités</text>
      <line x1="${leftLabelsW + 0.5}" y1="0" x2="${
      leftLabelsW + 0.5
    }" y2="${height}" stroke="${strokeGrid}" />

      ${headParts.join('')}
      ${hLines.join('')}
      ${rows.join('')}

      <rect x="0.5" y="0.5" width="${width - 1}" height="${
      height - 1
    }" fill="none" stroke="${strokeGrid}"/>
    </svg>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private escapeXml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  protected readonly Math = Math;
}
