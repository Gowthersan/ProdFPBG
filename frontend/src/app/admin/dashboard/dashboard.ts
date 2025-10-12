import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass, JsonPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Aprojetv1 } from '../../services/aprojetv1';
import { HttpClientModule } from '@angular/common/http';
import { environDev } from '../../../environments/environment.development';
import { ProjetFormDTO } from '../../model/projetFormdto';

type ProjectStatus = 'BROUILLON' | 'SOUMIS' | 'EN_REVUE' | 'ACCEPTE' | 'REJETE';
type BudgetCategory = 'ACTIVITES_TERRAIN' | 'INVESTISSEMENTS' | 'FONCTIONNEMENT';
type DocumentType =
  | 'FORMULAIRE'
  | 'LETTRE_MOTIVATION'
  | 'STATUTS_REGLEMENT'
  | 'FICHE_CIRCUIT'
  | 'RIB'
  | 'AGREMENT'
  | 'CV'
  | 'BUDGET_DETAILLE'
  | 'CHRONOGRAMME'
  | 'CARTOGRAPHIE'
  | 'LETTRE_SOUTIEN';

const ADMIN_DATA_KEY = 'fpbg_admin_records';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    NgClass,
    JsonPipe,
    HttpClientModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './dashboard.html',
  providers: [Aprojetv1],
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private aprojetv1 = inject(Aprojetv1);
  allProjets: ProjetFormDTO[] = [];

  ngOnInit() {
    // Appel à la méthode pour récupérer les projets
    this.getAllProjet();
  }
  getAllProjet() {
    this.aprojetv1.getAllProjetsNoPage().subscribe({
      next: (response) => {
        console.log('Projets récupérés avec succès:', response);
        this.allProjets = response;
        console.log('Corps:', this.allProjets);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des projets:', error);
      },
    });
  }
  // ===== Store local =====
  private readStore(): any[] {
    const raw = localStorage.getItem(ADMIN_DATA_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  private writeStore(list: any[]) {
    localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(list));
  }

  // ===== State =====
  records = signal<any[]>(this.readStore());

  // Recherche
  q = new FormControl<string>('', { nonNullable: true });
  filtered = computed(() => {
    const query = (this.q.value || '').toLowerCase().trim();
    if (!query) return this.records();
    return this.records().filter((r) => {
      return (
        (r.project?.title || '').toLowerCase().includes(query) ||
        (r.applicant?.orgName || '').toLowerCase().includes(query) ||
        (r.applicant?.contactPerson || '').toLowerCase().includes(query) ||
        (r.status || '').toLowerCase().includes(query)
      );
    });
  });

  // Stats
  totalProjects = computed(() => this.records().length);
  totalPeople = computed(() =>
    this.records().reduce((n, r) => n + (r?.applicant?.contactPerson ? 1 : 0), 0)
  );

  // Labels mois
  monthsLabels = [
    'Jan',
    'Fév',
    'Mar',
    'Avr',
    'Mai',
    'Jun',
    'Jul',
    'Aoû',
    'Sep',
    'Oct',
    'Nov',
    'Déc',
  ];

  // Actions UI
  refresh() {
    this.records.set(this.readStore());
  }
  trackByIndex = (i: number) => i;

  // ===== Maj de statut (par id) =====
  private updateStatus(id: string, s: ProjectStatus) {
    const list = this.readStore();
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return;

    const cur = { ...list[idx], status: s, updatedAt: Date.now() };
    list[idx] = cur;

    this.writeStore(list);
    this.records.set(list);
  }
  markInReview(r: any) {
    if (r?.id) this.updateStatus(r.id, 'EN_REVUE');
  }
  validate(r: any) {
    if (r?.id) this.updateStatus(r.id, 'ACCEPTE');
  }
  reject(r: any) {
    if (r?.id) this.updateStatus(r.id, 'REJETE');
  }

  // ===== Navigation =====
  goToRecap(id: number) {
    if (!id) return;
    this.router.navigate(['/admin/recap', id]);
  }

  // ===== Divers =====
  docs: DocumentType[] = [
    'LETTRE_MOTIVATION',
    'STATUTS_REGLEMENT',
    'FICHE_CIRCUIT',
    'RIB',
    'AGREMENT',
    'CV',
    'BUDGET_DETAILLE',
    'CHRONOGRAMME',
    'CARTOGRAPHIE',
    'LETTRE_SOUTIEN',
  ];

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login'); // adapte si nécessaire
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
