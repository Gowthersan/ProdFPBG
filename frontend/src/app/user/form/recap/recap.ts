// app/user/form/recap/recap.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type SubmissionStatus = 'BROUILLON' | 'SOUMIS' | 'EN_REVUE' | 'ACCEPTE' | 'REFUSE';

interface Activity {
  label: string;
  months?: number[];
}
interface Risk {
  description: string;
  mitigation: string;
}
interface BudgetLine {
  category: 'ACTIVITES_TERRAIN' | 'INVESTISSEMENTS' | 'FONCTIONNEMENT';
  description: string;
  total: number;
  partFPBG?: number;
  partCofinance?: number;
}
interface Step1 {
  nom_organisation: string;
  type: string;
  contactPerson: string;
  geocouvertureGeographique: string;
  domains: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}
interface Step2 {
  title: string;
  locationAndTarget: string;
  contextJustification: string;
}
interface Step3 {
  objectives: string;
  expectedResults: string;
  durationMonths: number;
}
interface StateStep {
  projectStage: string;
  hasFunding: boolean;
  fundingDetails?: string;
}
interface SustainabilityStep {
  sustainability?: string;
  replicability?: string;
}
interface Submission {
  step1: Step1;
  step2: Step2;
  step3: Step3;
  activitiesSummary?: string;
  activities?: Activity[];
  risks?: Risk[];
  budgetLines?: BudgetLine[];
  stateStep?: StateStep;
  sustainabilityStep?: SustainabilityStep;
  attachments?: Record<string, string>;
  status?: SubmissionStatus;
  updatedAt?: number;
}

const ADMIN_DATA_KEY = 'fpbg_admin_records'; // liste des dossiers "soumis" (ton wizard l’écrit)
const SUBMISSION_META_KEY = 'submission_meta'; // { id, status, updatedAt } (écrit au submit)
const DRAFT_KEYS = ['fpbg.nc.draft', 'fpbg_submission_v2']; // brouillon (selon version)

@Component({
  selector: 'app-submission-recap',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './recap.html',
})
export class SubmissionRecap implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);

  /** ===== Démo par défaut si rien dans le LS ===== */
  private staticDemo: Submission = {
    step1: {
      nom_organisation: 'Association Rivière Claire',
      type: 'ONG',
      contactPerson: 'Mireille Ndong',
      geocouvertureGeographique: 'Prov. de l’Estuaire',
      domains: 'Conservation, ingénierie écologique, sensibilisation',
      address: 'Baie des Rois, Immeuble FGIS 2ème étage',
      contactEmail: 'contact@riviereclaire.org',
      contactPhone: '+241 06 00 00 00',
    },
    step2: {
      title: 'Restauration de 3 km de berges pour la résilience climatique',
      locationAndTarget:
        'Rivières Nkomi & Komo. Groupes cibles : villages riverains, pêcheurs artisanaux, comités locaux.',
      contextJustification:
        'Érosion des berges, turbidité, perte d’habitats. Ingénierie écolo, replantation, suivi & sensibilisation.',
    },
    step3: {
      objectives:
        'Stabiliser les berges ; améliorer la qualité de l’eau ; renforcer la gouvernance locale.',
      expectedResults:
        '3 km traités ; 18 000 plants ; 6 comités formés ; indicateurs qualité eau en progrès.',
      durationMonths: 12,
    },
    activitiesSummary:
      'Cartographie, plan d’ingénierie, travaux, replantation, suivi hydrologique, sensibilisation.',
    activities: [
      { label: 'Cartographie & diagnostic', months: [1, 2] },
      { label: 'Ingénierie écologique', months: [3, 4, 5] },
      { label: 'Replantation', months: [6, 7, 8] },
      { label: 'Suivi & biodiversité', months: [2, 6, 9, 12] },
      { label: 'Sensibilisation', months: [1, 4, 7, 10] },
    ],
    risks: [
      {
        description: 'Crues exceptionnelles',
        mitigation: 'Fenêtre travaux + protections provisoires',
      },
      { description: 'Blocages administratifs', mitigation: 'Concertation précoce autorités' },
    ],
    budgetLines: [
      { category: 'ACTIVITES_TERRAIN', description: 'Travaux ingénierie écolo', total: 55_000_000 },
      { category: 'INVESTISSEMENTS', description: 'Matériels de suivi', total: 12_000_000 },
      { category: 'FONCTIONNEMENT', description: 'Coordination & logistique', total: 6_000_000 },
    ],
    stateStep: {
      projectStage: 'DEMARRAGE',
      hasFunding: true,
      fundingDetails: 'Co-fin A/B : 20 M FCFA',
    },
    sustainabilityStep: {
      sustainability: 'Maintenance par comités ; convention communale.',
      replicability: 'Réplicable dans 2 bassins voisins.',
    },
    attachments: {
      LETTRE_MOTIVATION: 'Lettre.pdf',
      STATUTS_REGLEMENT: 'Statuts.pdf',
      BUDGET_DETAILLE: 'Budget.xlsx',
    },
    status: 'BROUILLON',
    updatedAt: Date.now(),
  };

  /** ===== Chargement depuis LS ===== */
  private loadFromSubmitted(idHint?: string | null): Submission | null {
    try {
      const meta = JSON.parse(localStorage.getItem(SUBMISSION_META_KEY) || 'null');
      const id = idHint || meta?.id;
      if (!id) return null;

      const list = JSON.parse(localStorage.getItem(ADMIN_DATA_KEY) || '[]') as any[];
      const rec = list.find((r) => r?.id === id);
      if (!rec) return null;

      // mapping -> notre interface Submission
      const p = rec.project || {};
      const s: Submission = {
        step1: p.step1 || {
          nom_organisation: p.nom_organisation || '—',
          type: p.type || '—',
          contactPerson: p.contact || '—',
          geocouvertureGeographique: p.couvertureGeographique || '—',
          domains: (p.domains || []).join(', ') || '—',
          address: p.address || '—',
          contactEmail: p.email || '—',
          contactPhone: p.phone || '—',
        },
        step2: {
          title: p.title || '—',
          locationAndTarget: p.locationAndTarget || '—',
          contextJustification: p.contextJustification || '—',
        },
        step3: {
          objectives: p.objectives || '—',
          expectedResults: p.expectedResults || '—',
          durationMonths: +p.durationMonths || 0,
        },
        activitiesSummary: p.activitiesSummary || '',
        activities: p.activities || [],
        risks: p.risks || [],
        budgetLines: p.budgetLines || [],
        stateStep: {
          projectStage: p.projectStage || 'CONCEPTION',
          hasFunding: !!p.hasFunding,
          fundingDetails: p.fundingDetails || '',
        },
        sustainabilityStep: {
          sustainability: p.sustainability || '',
          replicability: p.replicability || '',
        },
        attachments: rec.attachments || {},
        status: rec.status || 'SOUMIS',
        updatedAt: rec.updatedAt || Date.now(),
      };
      return s;
    } catch {
      return null;
    }
  }

  private loadFromDraft(): Submission | null {
    // Essaie plusieurs clés de brouillon
    for (const k of DRAFT_KEYS) {
      try {
        const d = JSON.parse(localStorage.getItem(k) || 'null');
        if (!d) continue;

        // mapping "léger" pour afficher quelque chose de propre
        const s: Submission = {
          step1: {
            nom_organisation: d?.nom_organisation || '—',
            type: d?.type || '—',
            contactPerson: d?.contact || '—',
            geocouvertureGeographique: d?.couvertureGeographique || '—',
            domains: (d?.stepProp?.domains || []).join(', ') || '—',
            address: d?.address || '—',
            contactEmail: d?.email || '—',
            contactPhone: d?.phone || '—',
          },
          step2: {
            title: d?.stepProp?.title || d?.title || '—',
            locationAndTarget: d?.stepProp?.locationAndTarget || '—',
            contextJustification: d?.stepProp?.contextJustification || '—',
          },
          step3: {
            objectives: d?.stepObj?.objectives || '—',
            expectedResults: d?.stepObj?.expectedResults || '—',
            durationMonths: +d?.stepObj?.durationMonths || 0,
          },
          activitiesSummary: d?.activitiesSummary || '',
          activities: d?.activities || [],
          risks: d?.risks || [],
          budgetLines: d?.budgetLines || [],
          stateStep: {
            projectStage: d?.stateStep?.projectStage || 'CONCEPTION',
            hasFunding: !!d?.stateStep?.hasFunding,
            fundingDetails: d?.stateStep?.fundingDetails || '',
          },
          sustainabilityStep: {
            sustainability: d?.sustainabilityStep?.sustainability || '',
            replicability: d?.sustainabilityStep?.replicability || '',
          },
          attachments: {},
          status: 'BROUILLON',
          updatedAt: d?.updatedAt || Date.now(),
        };
        return s;
      } catch {
        /* continue */
      }
    }
    return null;
  }

  private loadInitial(): Submission {
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    return this.loadFromSubmitted(idFromRoute) || this.loadFromDraft() || this.staticDemo;
  }

  submission = signal<Submission | null>(this.loadInitial());

  /** ====== Utils d’affichage ====== */
  status = computed<SubmissionStatus | null>(() => this.submission()?.status ?? null);

  budgetTotal = computed(() =>
    (this.submission()?.budgetLines ?? []).reduce((s, b) => s + (+b.total || 0), 0)
  );
  budgetFonct = computed(() =>
    (this.submission()?.budgetLines ?? [])
      .filter((b) => b.category === 'FONCTIONNEMENT')
      .reduce((s, b) => s + (+b.total || 0), 0)
  );
  budgetWarn = computed(() => {
    const tot = this.budgetTotal() || 0;
    const fct = this.budgetFonct() || 0;
    return tot > 0 && fct / tot > 0.1;
  });

  short(text?: string, n = 220) {
    if (!text) return '—';
    return text.length > n ? text.slice(0, n).trim() + '…' : text;
  }

  /** ===== Modal plein écran ===== */
  modalOpen = signal(false);
  modal = signal<{ title: string; text: string } | null>(null);
  openModal(title: string, text?: string) {
    this.modal.set({ title, text: text || '—' });
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
    this.modal.set(null);
  }
  private escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.closeModal();
  };
  ngOnInit() {
    document.addEventListener('keydown', this.escHandler);
  }
  ngOnDestroy() {
    document.removeEventListener('keydown', this.escHandler);
  }

  /** ===== Stepper d’affichage ===== */
  stepIndex = signal(0);
  stepTitles = [
    'Demandeur / Soumissionnaire',
    'Proposition de projet',
    'Objectifs & résultats',
    'Activités & calendrier',
    'Risques',
    'Budget estimatif',
    'État & financement',
    'Durabilité & réplication',
    'Annexes',
  ];
  goTo = (i: number) => {
    if (i >= 0 && i < this.stepTitles.length) this.stepIndex.set(i);
  };
  next = () => this.goTo(this.stepIndex() + 1);
  prev = () => this.goTo(this.stepIndex() - 1);
  progress = computed(() => Math.round(((this.stepIndex() + 1) / this.stepTitles.length) * 100));

  protected readonly Object = Object;

  /** Lien de fichier (assets locaux ou URL absolue) */
  fileHref(v?: string): string {
    if (!v) return '#';
    if (/^(https?:\/\/|data:|blob:)/i.test(v)) return v;
    return `/assets/uploads/${v}`;
  }
}
