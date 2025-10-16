import { CommonModule, NgClass } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

type Appel = {
  id: string;
  code: string;
  titre: string;
  resume: string;
  tags: string[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NgClass],
  templateUrl: './home.html',
})
export class Home {
  private router = inject(Router);
  private elRef = inject(ElementRef<HTMLElement>);

  // --- État UI ---
  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);
  isDropdownOpen = signal(false);

  // --- Données exemple pour le menu déroulant ---
  private _appels: Appel[] = [
    {
      id: 'aap-1',
      code: 'AAP-OBL-2025',
      titre: 'Conservation marine & littorale',
      resume: 'Soutien aux initiatives locales au Gabon.',
      tags: ['Marine', 'Littoral', 'Gabon'],
    },
  ];
  appels = () => this._appels;

  constructor() {
    // Fermer le menu à chaque navigation
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.isMobileMenuOpen.set(false);
      this.isDropdownOpen.set(false);
    });
  }

  // --- Toggle menu burger ---
  toggleMobileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMobileMenuOpen.update((v) => !v);

    // Empêcher le scroll du body quand le menu est ouvert
    if (this.isMobileMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.isDropdownOpen.set(false);
    document.body.style.overflow = '';
  }

  // --- Toggle dropdown Appels à Projet ---
  toggleDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isDropdownOpen.update((v) => !v);
  }

  // --- Clic extérieur ---
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const header = this.elRef.nativeElement.querySelector('[data-header-root]');
    const target = ev.target as Node;

    // Fermer le menu mobile si clic à l'extérieur
    if (this.isMobileMenuOpen() && header && !header.contains(target)) {
      this.closeMobileMenu();
    }

    // Fermer le dropdown si clic à l'extérieur
    if (this.isDropdownOpen() && header && !header.contains(target)) {
      this.isDropdownOpen.set(false);
    }
  }

  // --- Échap ---
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeMobileMenu();
  }

  // --- Effet scroll ---
  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  // --- Scroll vers section ---
  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();

    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  }
}
