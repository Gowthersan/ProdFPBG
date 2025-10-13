import { Injectable } from '@angular/core';
import instance from './axios-instance';

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
  private readonly baseUrl = '/api/aap';

  /**
   * Récupérer tous les appels à projets
   */
  async getAllAAPs(includeInactive: boolean = false): Promise<AAP[]> {
    const response = await instance.get(this.baseUrl, {
      params: { includeInactive }
    });
    return response.data;
  }

  /**
   * Récupérer un appel à projets par ID
   */
  async getAAPById(id: string): Promise<AAP> {
    const response = await instance.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Récupérer un appel à projets par code
   */
  async getAAPByCode(code: string): Promise<AAP> {
    const response = await instance.get(`${this.baseUrl}/code/${code}`);
    return response.data;
  }

  /**
   * Créer un nouvel appel à projets (admin only)
   */
  async createAAP(aapData: AAP): Promise<AAP> {
    const response = await instance.post(this.baseUrl, aapData);
    return response.data.aap;
  }

  /**
   * Mettre à jour un appel à projets (admin only)
   */
  async updateAAP(id: string, aapData: Partial<AAP>): Promise<AAP> {
    const response = await instance.put(`${this.baseUrl}/${id}`, aapData);
    return response.data.aap;
  }

  /**
   * Activer/Désactiver un appel à projets (admin only)
   */
  async toggleAAPStatus(id: string): Promise<AAP> {
    const response = await instance.patch(`${this.baseUrl}/${id}/toggle`);
    return response.data.aap;
  }

  /**
   * Supprimer un appel à projets (admin only)
   */
  async deleteAAP(id: string): Promise<{ message: string }> {
    const response = await instance.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Récupérer tous les types d'organisations
   */
  async getAllTypeOrganisations(): Promise<any[]> {
    const response = await instance.get(`${this.baseUrl}/types/organisations`);
    return response.data;
  }

  /**
   * Créer un type d'organisation (admin only)
   */
  async createTypeOrganisation(nom: string): Promise<any> {
    const response = await instance.post(`${this.baseUrl}/types/organisations`, { nom });
    return response.data.type;
  }
}
