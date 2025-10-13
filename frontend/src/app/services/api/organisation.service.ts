import { Injectable } from '@angular/core';
import instance from './axios-instance';

export interface Organisation {
  id?: string;
  name?: string;
  username?: string;
  email: string;
  password?: string;
  contact?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  type?: string;
  usernamePersonneContacter?: string;
  typeOrganisationId?: string;
  typeOrganisation?: any;
  projets?: any[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {
  private readonly baseUrl = '/api/organisations';

  /**
   * Récupérer l'organisation connectée
   */
  async getOrganismeConnected(): Promise<Organisation> {
    const response = await instance.get(`${this.baseUrl}/organismeconnected`);
    return response.data;
  }

  /**
   * Récupérer toutes les organisations (admin only)
   */
  async getAllOrganisations(): Promise<Organisation[]> {
    const response = await instance.get(this.baseUrl);
    return response.data;
  }

  /**
   * Récupérer une organisation par ID (admin only)
   */
  async getOrganisationById(id: string): Promise<Organisation> {
    const response = await instance.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganisation(id: string, organisationData: Partial<Organisation>): Promise<Organisation> {
    const response = await instance.put(`${this.baseUrl}/${id}`, organisationData);
    return response.data.organisation;
  }

  /**
   * Supprimer une organisation (admin only)
   */
  async deleteOrganisation(id: string): Promise<{ message: string }> {
    const response = await instance.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }
}
