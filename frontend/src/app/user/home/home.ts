import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

type AAPCard = {
  id: string;
  code: string;
  titre: string;
  resume: string;
  launchDate: string;
  tags: string[];
};

const AAP_CARDS: AAPCard[] = [
  {
    id: 'aap-obl-2025',
    code: 'AAP-OBL-2025',
    titre: 'Conservation marine et littorale (Obligations Bleues – FPBG)',
    resume: `Appel visant des projets locaux de protection, restauration, sensibilisation et gestion durable des écosystèmes marins et littoraux au Gabon.`,
    launchDate: '2025-09-22',
    tags: ['Gabon', 'Océan & littoral', 'FPBG'],
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './home.html',
})
export class Home {
  readonly appels = signal<AAPCard[]>(AAP_CARDS);
}
