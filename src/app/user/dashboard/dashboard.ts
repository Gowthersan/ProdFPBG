// app/user/dashboard/dashboard.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ToastHost } from '../ui/toast-host/toast-host';

type Submission = { id?: string; status: 'BROUILLON' | 'EN REVUE' | 'ACCEPTE' | 'REJETE'; updatedAt: number };
type Collaborator = { fullName: string; email: string; role: string };

const LS = {
  draft: 'fpbg.nc.draft',
  submission: 'fpbg.submission',
  collaborators: 'fpbg.collaborators',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgOptimizedImage, ToastHost],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** === ÉTATS UI === */
  asideOpen = signal(false);
  imgError = signal(false);
  showAddCollaborator = signal(false);

  /** === UTILISATEUR === */
  user = signal<{ fullName: string; photoUrl?: string }>({ fullName: 'Utilisateur' });

  /** === DONNÉES PROJET === */
  submission = signal<Submission | null>(null);

  /** === COLLABORATEURS === */
  collaborators = signal<Collaborator[]>([]);
  collabForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Éditeur', Validators.required],
  });

  ngOnInit() {
    // Profil (depuis LocalStorage via AuthService)
    this.auth.me().subscribe({
      next: (acc) => {
        const fullName = [acc.firstName, acc.lastName].filter(Boolean).join(' ') || acc.login;
        this.user.set({ fullName, photoUrl: '' });
      },
      error: () => void 0,
    });

    // Projet soumis (statique)
    try {
      const subRaw = localStorage.getItem(LS.submission);
      if (subRaw) this.submission.set(JSON.parse(subRaw));
    } catch {}

    // Collaborateurs
    try {
      this.collaborators.set(JSON.parse(localStorage.getItem(LS.collaborators) || '[]'));
    } catch {}
  }

  /* ===== Méthodes appelées par le template ===== */

  toggleAside() { this.asideOpen.update(v => !v); }

  initials(): string {
    const n = this.user().fullName || '';
    return n.split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  hasProject(): boolean { return this.isDraft() || !!this.submission(); }
  isDraft(): boolean { return !!localStorage.getItem(LS.draft); }

  status(): string {
    if (this.isDraft()) return 'BROUILLON';
    return this.submission()?.status ?? '';
  }

  statusClass(): string {
    const s = this.status();
    if (s === 'BROUILLON') return 'bg-amber-100 text-amber-800';
    if (s === 'EN REVUE')  return 'bg-blue-100 text-blue-800';
    if (s === 'ACCEPTE')   return 'bg-green-100 text-green-800';
    if (s === 'REJETE')    return 'bg-red-100 text-red-800';
    return 'bg-slate-200 text-slate-800';
  }

  ctaLabel(): string {
    if (!this.hasProject()) return 'Créer un projet';
    if (this.isDraft())     return 'Continuer le formulaire';
    return 'Voir le projet';
  }

  primaryActionClick() {
    if (!this.hasProject() || this.isDraft()) this.router.navigate(['/submission-wizard']);
    else this.goRecap();
    this.asideOpen.set(false);
  }

  scrollTo(id: string) {
    this.asideOpen.set(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goRecap() {
    // En mode statique on renvoie vers le formulaire (ou remplace par /recap quand tu auras la route).
    this.router.navigate(['/recap']);
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }

  /* ===== Cartes d’actions ===== */

  startProject() {
    if (!this.isDraft()) {
      const draft = { createdAt: Date.now(), updatedAt: Date.now(), step: 1 };
      localStorage.setItem(LS.draft, JSON.stringify(draft));
    }
    this.router.navigate(['/submission-wizard']);
  }

  resumeDraft() { this.router.navigate(['/submission-wizard']); }

  clearDraftOnly() {
    localStorage.removeItem(LS.draft);
    // pas de reload nécessaire, les bindings utilisent isDraft()
  }

  submitProjectMock() {
    // Démo: transforme le brouillon en "soumis"
    const submission: Submission = { id: crypto.randomUUID(), status: 'EN REVUE', updatedAt: Date.now() };
    localStorage.setItem(LS.submission, JSON.stringify(submission));
    localStorage.removeItem(LS.draft);
    this.submission.set(submission);
    alert('Projet soumis (mode démo).');
  }

  addCollaborator() {
    if (this.collabForm.invalid) { this.collabForm.markAllAsTouched(); return; }
    const list = [...this.collaborators(), this.collabForm.getRawValue() as Collaborator];
    this.collaborators.set(list);
    localStorage.setItem(LS.collaborators, JSON.stringify(list));
    this.collabForm.reset({ role: 'Éditeur' });
    this.showAddCollaborator.set(false);
  }
  // Lire un éventuel titre depuis le brouillon (formulaire) ou retour '—'
  projectName(): string {
    try {
      const d = JSON.parse(localStorage.getItem('fpbg.nc.draft') || 'null');
      // d.data.titre si tu as gardé le schéma du formulaire proposé
      return d?.data?.titre?.trim?.() || '';
    } catch {
      return '';
    }
  }

// Renvoie un timestamp (ms) à utiliser avec le date pipe
  lastUpdate(): number | null {
    // 1) si projet soumis
    if (this.submission()?.updatedAt) return this.submission()!.updatedAt;

    // 2) sinon, dernier update du brouillon
    try {
      const d = JSON.parse(localStorage.getItem('fpbg.nc.draft') || 'null');
      // compat : soit updatedAt numérique, soit _updatedAt string
      if (typeof d?.updatedAt === 'number') return d.updatedAt;
      if (d?._updatedAt) return Date.parse(d._updatedAt);
    } catch {}

    return null;
  }

}
