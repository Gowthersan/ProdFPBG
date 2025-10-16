import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environDev } from '../../../environments/environment.development';

export interface Subvention {
  id?: string;
  name: string;
  amountMin: number;
  amountMax: number;
  durationMaxMonths: number;
  deadlineNoteConceptuelle: string;
  cycleSteps?: CycleStep[];
}

export interface CycleStep {
  id?: string;
  step: string;
  dates: string;
  ordre: number;
}

export interface Thematique {
  id?: string;
  title: string;
  bullets: string[];
  typeSubvention: string;
}

export interface AAP {
  id?: string;
  code: string;
  titre: string;
  resume: string;
  contexte: string;
  objectif: string;
  contactEmail: string;
  geographicEligibility: string[];
  eligibleOrganisations: string[];
  eligibleActivities: string[];
  cofinancement?: string;
  annexes: string[];
  launchDate: string;
  cover?: string;
  tags: string[];
  isActive?: boolean;
  subventions?: Subvention[];
  thematiques?: Thematique[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AAPService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environDev.urlServer}/api/aap`;

  /**
   * Récupérer tous les appels à projets
   */
  getAllAAPs(includeInactive: boolean = false): Observable<AAP[]> {
    return this.http.get<AAP[]>(this.baseUrl, {
      params: { includeInactive: includeInactive.toString() }
    });
  }

  /**
   * Récupérer un appel à projets par ID
   */
  getAAPById(id: string): Observable<AAP> {
    return this.http.get<AAP>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer un appel à projets par code
   */
  getAAPByCode(code: string): Observable<AAP> {
    return this.http.get<AAP>(`${this.baseUrl}/code/${code}`);
  }

  /**
   * Créer un nouvel appel à projets (admin only)
   */
  createAAP(aapData: AAP): Observable<AAP> {
    return this.http.post<{ aap: AAP }>(this.baseUrl, aapData)
      .pipe(
        map(response => response.aap)
      );
  }

  /**
   * Mettre à jour un appel à projets (admin only)
   */
  updateAAP(id: string, aapData: Partial<AAP>): Observable<AAP> {
    return this.http.put<{ aap: AAP }>(`${this.baseUrl}/${id}`, aapData)
      .pipe(
        map(response => response.aap)
      );
  }

  /**
   * Activer/Désactiver un appel à projets (admin only)
   */
  toggleAAPStatus(id: string): Observable<AAP> {
    return this.http.patch<{ aap: AAP }>(`${this.baseUrl}/${id}/toggle`, {})
      .pipe(
        map(response => response.aap)
      );
  }

  /**
   * Supprimer un appel à projets (admin only)
   */
  deleteAAP(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer tous les types d'organisations
   */
  getAllTypeOrganisations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/types/organisations`);
  }

  /**
   * Créer un type d'organisation (admin only)
   */
  createTypeOrganisation(nom: string): Observable<any> {
    return this.http.post<{ type: any }>(`${this.baseUrl}/types/organisations`, { nom })
      .pipe(
        map(response => response.type)
      );
  }
}