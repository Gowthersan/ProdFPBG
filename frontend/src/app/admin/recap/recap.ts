import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
import { ProjetFormDTO } from '../../model/projetFormdto';
import { Aprojetv1 } from '../../services/aprojetv1';
// --- Types existants inchangés ---
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
  attachments?: Record<string, string>; // nom -> filename/url
  status?: SubmissionStatus;
  updatedAt?: number; // timestamp
}

@Component({
  selector: 'app-submission-recap',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './recap.html',
  providers: [Aprojetv1],
})
export class SubmissionRecap implements OnInit, OnDestroy {
  id!: number;
  projets!: ProjetFormDTO;
  private router = inject(Router);
  constructor(private route: ActivatedRoute) {}
  // ---------- Démo : données statiques si rien dans le localStorage ----------
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
        'Zones d’intervention : rivières Nkomi et Komo (communes X et Y). Groupes cibles : 6 villages riverains (~2 300 hab.), pêcheurs artisanaux, comités de gestion locaux.',
      contextJustification:
        'Érosion accélérée, turbidité élevée, perte d’habitats aquatiques. Causes : déboisement des ripisylves, pression agricole, crues extrêmes. ' +
        'Le projet propose fascines et enrochements végétalisés, replantation d’espèces indigènes, suivi hydrologique et sensibilisation communautaire.',
    },
    step3: {
      objectives:
        'Obj.1 Restaurer la stabilité des berges et réduire l’érosion ; ' +
        'Obj.2 Améliorer la qualité de l’eau ; Obj.3 Renforcer la gouvernance locale et la participation.',
      expectedResults:
        '3 km de berges traitées ; 18 000 plants indigènes ; 6 comités formés ; amélioration mesurable de la turbidité.',
      durationMonths: 12,
    },
    activitiesSummary:
      'Cartographie fine, plan d’ingénierie écologique, travaux de stabilisation, replantation, suivi qualité eau, ' +
      'sensibilisation et formation des comités.',
    activities: [
      { label: 'Cartographie & diagnostic', months: [1, 2] },
      { label: 'Ingénierie écologique (fascines/enrochements)', months: [3, 4, 5] },
      { label: 'Replantation espèces indigènes', months: [6, 7, 8] },
      { label: 'Suivi hydrologique & biodiversité', months: [2, 6, 9, 12] },
      { label: 'Sensibilisation communautaire', months: [1, 4, 7, 10] },
    ],
    risks: [
      {
        description: 'Crues exceptionnelles',
        mitigation: 'Fenêtre de travaux adaptée + protections temporaires',
      },
      {
        description: 'Blocages administratifs',
        mitigation: 'Concertation précoce avec autorités locales',
      },
    ],
    budgetLines: [
      {
        category: 'ACTIVITES_TERRAIN',
        description: 'Travaux d’ingénierie écologique',
        total: 55000000,
      },
      {
        category: 'INVESTISSEMENTS',
        description: 'Matériels de suivi hydrologique',
        total: 12000000,
      },
      { category: 'FONCTIONNEMENT', description: 'Coordination & logistique', total: 6000000 },
    ],
    stateStep: {
      projectStage: 'DEMARRAGE',
      hasFunding: true,
      fundingDetails: 'Co-finance Bailleurs A/B : 20 M FCFA, accord de principe',
    },
    sustainabilityStep: {
      sustainability:
        'Maintenance confiée aux comités ; convention communale ; transfert de compétences.',
      replicability:
        'Modèle réplicable dans 2 bassins voisins (conditions : coût/ha, matériaux, capacité locale).',
    },
    attachments: {
      LETTRE_MOTIVATION: 'Lettre_RiviereClaire.pdf',
      STATUTS_REGLEMENT: 'Statuts_ONG.pdf',
      BUDGET_DETAILLE: 'Budget_detaille.xlsx',
    },
    status: 'BROUILLON',
    updatedAt: Date.now(),
  };
  private aprojetv1 = inject(Aprojetv1);

  // --------- Charger le dossier depuis le localStorage (fallback multi-clés) ----------
  private load(): Submission | null {
    const keys = ['fpbg_submission', 'submission', 'FPBG_SUBMISSION'];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          return JSON.parse(raw) as Submission;
        } catch {
          /* ignore */
        }
      }
    }
    return null;
  }

  submission = signal<Submission | null>(this.load() ?? this.staticDemo);

  // --------- Utilitaires d’affichage existants (inchangés) -----------
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

  // --------- Modal “plein écran” (inchangé) -----------
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
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    //console.log('ID du projet :', this.id);
    this.getRecap(this.id);
  }
  ngOnDestroy() {
    document.removeEventListener('keydown', this.escHandler);
  }

  // --------- Nouveau : Stepper d’AFFICHAGE (ne change pas la logique) ----------
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
  // ...dans la classe SubmissionRecap (même fichier recap.ts)

  fileHref(v?: string): string {
    if (!v) return '#';
    // Si c’est déjà une URL absolue ou un blob/data, on renvoie tel quel
    if (/^(https?:\/\/|data:|blob:)/i.test(v)) return v;
    // Sinon on suppose que tu déposes les annexes dans /assets/uploads/
    return `/assets/uploads/${v}`;
  }
  getRecap(id: number) {
    if (id != 0) {
      this.aprojetv1.getProjetById(id).subscribe({
        next: (response) => {
          console.log('Récapitulatif récupéré avec succès:', response);
          this.projets = response;
          this.loadSuccessSwal('Récapitulatif chargé avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la récupération du récapitulatif:', error);
        },
      });
    } else {
      this.aprojetv1
        .getProjetByUser()
        .pipe(take(1))
        .subscribe(
          (data) => {
            this.projets = data;
            console.log(this.projets);
          },
          (err) => {
            console.error(err);
          }
        );
    }
  }

  showFile(pathFile: File) {
    this.aprojetv1.showFile(pathFile).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pathFile.name || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  loadSuccessSwal(message: any) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 7000,
      timerProgressBar: false,
      iconColor: '#00e8b6',
      color: '#06417d',
    });

    Toast.fire({
      icon: 'success',
      title: message,
    });
  }
  redirectionUserOradmin() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (this.id != 0) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
