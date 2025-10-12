// app/user/dashboard/dashboard.ts
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject, signal } from '@angular/core';
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
  photo: 'fpbg.user.photo', // <= avatar (data:URL)
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgOptimizedImage, ToastHost, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** === ÉTATS UI === */
  asideOpen = signal(false);
  imgError = signal(false);
  showAddCollaborator = signal(false);

  // Menu avatar
  avatarMenuOpen = signal(false);
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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

  // “cache” réactif de la dernière mise à jour
  private lastUpdatedAt = signal<number | null>(null);
  private heartbeat?: any;

  // ---------- lifecycle ----------
// Dans Dashboard (TS)

  ngOnInit() {
    /** 1) Avatar : charger la photo locale AVANT tout rendu/asynchrone */
    const localPhoto = this.readPhotoFromLS() || '';
    const current = this.user();
    this.user.set({ ...current, photoUrl: localPhoto });
    this.imgError.set(false); // on repart d’un état sain au mount

    /** 2) Profil depuis AuthService (maj du nom, on préserve la photo) */
    this.auth.me().subscribe({
      next: (acc) => {
        const fullName =
          [acc.firstName, acc.lastName].filter(Boolean).join(' ') || acc.login;
        // on garde la photo déjà chargée en mémoire / LS
        const photoUrl = this.user().photoUrl || this.readPhotoFromLS() || '';
        this.user.set({ fullName, photoUrl });
      },
      error: () => {
        // si me() échoue, au moins on conserve la photo locale déjà lue
        const u = this.user();
        this.user.set({ ...u, photoUrl: u.photoUrl || localPhoto });
      },
    });

    /** 3) Données projet + horodatage */
    this.refreshSubmissionFromStorage();
    this.refreshLastUpdated();

    /** 4) Collaborateurs */
    try {
      this.collaborators.set(
        JSON.parse(localStorage.getItem(LS.collaborators) || '[]')
      );
    } catch {
      /* noop */
    }

    /** 5) Listeners (MAJ live date + mutli-onglets) */
    window.addEventListener('storage', this.onStorage);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('fpbg:draft-updated', this.onDraftEvent as EventListener);

    /** 6) Heartbeat : rafraîchit l’heure toutes les 5s */
    this.heartbeat = setInterval(() => this.refreshLastUpdated(), 5000);
  }

  /** Appelé si l’image ne charge pas (URL invalide, data:URL corrompue, etc.) */
  onAvatarLoadError() {
    // On bascule sur le fallback visuel, mais on NE supprime PAS la valeur LS.
    // Ainsi, si l’utilisateur recharge ou ré-uploade, l’avatar peut revenir.
    this.imgError.set(true);
    // Optionnel: log dev
    // console.warn('Avatar image failed to load; showing fallback.');
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.onStorage);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('fpbg:draft-updated', this.onDraftEvent as EventListener);
    if (this.heartbeat) clearInterval(this.heartbeat);
  }

  // ---------- Dernière MAJ ----------
  private onStorage = (e: StorageEvent) => {
    if (e.key === LS.submission || e.key === LS.draft) {
      this.refreshSubmissionFromStorage();
      this.refreshLastUpdated();
    }
    if (e.key === LS.photo) {
      // si la photo change dans un autre onglet
      const current = this.user();
      this.user.set({ ...current, photoUrl: this.readPhotoFromLS() || '' });
      this.imgError.set(false);
    }
  };
  private onVisibility = () => { if (!document.hidden) this.refreshLastUpdated(); };
  private onFocus = () => this.refreshLastUpdated();
  private onDraftEvent = () => this.refreshLastUpdated();

  private refreshSubmissionFromStorage() {
    try {
      const subRaw = localStorage.getItem(LS.submission);
      this.submission.set(subRaw ? JSON.parse(subRaw) : null);
    } catch { this.submission.set(null); }
  }
  private readLastUpdatedAtFromStorage(): number | null {
    try {
      const subRaw = localStorage.getItem(LS.submission);
      if (subRaw) {
        const sub = JSON.parse(subRaw) as Submission;
        if (typeof sub?.updatedAt === 'number') return sub.updatedAt;
      }
    } catch {}
    try {
      const d = JSON.parse(localStorage.getItem(LS.draft) || 'null');
      if (typeof d?.updatedAt === 'number') return d.updatedAt;
      if (typeof d?.updatedAt === 'string') {
        const t = Date.parse(d.updatedAt);
        if (!Number.isNaN(t)) return t;
      }
      if (d?._updatedAt) {
        const t = Date.parse(d._updatedAt);
        if (!Number.isNaN(t)) return t;
      }
    } catch {}
    return null;
  }
  private refreshLastUpdated() { this.lastUpdatedAt.set(this.readLastUpdatedAtFromStorage()); }
  lastUpdate(): number | null { return this.lastUpdatedAt(); }

  // ---------- Avatar ----------
  toggleAvatarMenu(ev?: Event) {
    ev?.stopPropagation();
    this.avatarMenuOpen.update(v => !v);
  }
  @HostListener('document:click')
  closeAvatarMenu() { this.avatarMenuOpen.set(false); }

  triggerAvatarUpload() {
    this.closeAvatarMenu();
    this.fileInputRef?.nativeElement?.click();
  }

  onAvatarFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // reset
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Formats acceptés : JPG, PNG, WebP');
      return;
    }
    const MAX = 2 * 1024 * 1024; // 2 Mo
    if (file.size > MAX) {
      alert('Image trop lourde (max 2 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.savePhotoToLS(dataUrl);
      const current = this.user();
      this.user.set({ ...current, photoUrl: dataUrl });
      this.imgError.set(false);
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.closeAvatarMenu();
    localStorage.removeItem(LS.photo);
    const current = this.user();
    this.user.set({ ...current, photoUrl: '' });
    this.imgError.set(true); // force fallback
  }

  private readPhotoFromLS(): string | null {
    try { return localStorage.getItem(LS.photo); } catch { return null; }
  }
  private savePhotoToLS(dataUrl: string) {
    try { localStorage.setItem(LS.photo, dataUrl); } catch {}
  }

  // ---------- Divers UI ----------
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
  // Dashboard.ts
  goRecap() {
    const meta = JSON.parse(localStorage.getItem('submission_meta') || 'null');
    const id = meta?.id ?? 'current';
    this.router.navigate(['/form/recap', id]);
  }


  logout() {
    this.closeAvatarMenu();
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }

  // Cartes d’actions
  startProject() {
    if (!this.isDraft()) {
      const now = Date.now();
      const draft = { createdAt: now, updatedAt: now, _updatedAt: new Date(now).toISOString(), step: 1 };
      localStorage.setItem(LS.draft, JSON.stringify(draft));
    }
    this.refreshLastUpdated();
    this.router.navigate(['/submission-wizard']);
  }
  resumeDraft() { this.router.navigate(['/submission-wizard']); }
  clearDraftOnly() {
    localStorage.removeItem(LS.draft);
    this.refreshLastUpdated();
  }
  submitProjectMock() {
    const submission: Submission = { id: crypto.randomUUID(), status: 'EN REVUE', updatedAt: Date.now() };
    localStorage.setItem(LS.submission, JSON.stringify(submission));
    localStorage.removeItem(LS.draft);
    this.submission.set(submission);
    this.refreshLastUpdated();
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

  projectName(): string {
    try {
      const d = JSON.parse(localStorage.getItem(LS.draft) || 'null');
      return d?.data?.titre?.trim?.() || d?.title || '';
    } catch { return ''; }
  }


}
