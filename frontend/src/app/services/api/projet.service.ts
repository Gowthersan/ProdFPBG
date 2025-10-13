import { Injectable } from '@angular/core';
import instance from './axios-instance';

export interface Projet {
  id?: string;
  organisationId?: string;
  title?: string;
  actPrin?: string;
  dateLimPro?: string;
  rAtt?: string;
  objP?: string;
  conjP?: string;
  lexGcp?: string;
  poRistEnvSoPo?: string;
  dPRep?: string;
  conseilPr?: string;
  cv?: string[];
  ficheC?: string;
  lM?: string;
  stR?: string;
  rib?: string;
  cA?: string;
  budgetD?: string;
  che?: string;
  cartography?: string;
  lP?: string;
  stade?: string;
  funding?: string;
  dateCreation?: string;
  createdAt?: string;
  updatedAt?: string;
  organisation?: any;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProjetService {
  private readonly baseUrl = '/api/aprojet-v1';

  /**
   * Créer un nouveau projet
   */
  async createProjet(projetData: Partial<Projet>, files?: any): Promise<Projet> {
    const formData = new FormData();

    // Ajouter les données du projet
    Object.keys(projetData).forEach(key => {
      const value = (projetData as any)[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    // Ajouter les fichiers si présents
    if (files) {
      Object.keys(files).forEach(key => {
        const fileList = files[key];
        if (Array.isArray(fileList)) {
          fileList.forEach((file: File) => {
            formData.append(key, file);
          });
        } else {
          formData.append(key, fileList);
        }
      });
    }

    const response = await instance.post(`${this.baseUrl}/createProjet`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.projet;
  }

  /**
   * Récupérer tous les projets avec pagination
   */
  async getAllProjets(page: number = 0, size: number = 10, eagerload: boolean = false): Promise<PaginatedResponse<Projet>> {
    const response = await instance.get(this.baseUrl, {
      params: { page, size, eagerload }
    });
    return response.data;
  }

  /**
   * Récupérer tous les projets sans pagination
   */
  async getAllProjetsNoPage(): Promise<Projet[]> {
    const response = await instance.get(`${this.baseUrl}/all`);
    return response.data;
  }

  /**
   * Récupérer un projet par ID
   */
  async getProjetById(id: string): Promise<Projet> {
    const response = await instance.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Récupérer le projet de l'utilisateur connecté
   */
  async getProjetByUser(): Promise<Projet> {
    const response = await instance.get(`${this.baseUrl}/user`);
    return response.data;
  }

  /**
   * Mettre à jour un projet
   */
  async updateProjet(id: string, projetData: Partial<Projet>): Promise<Projet> {
    const response = await instance.put(`${this.baseUrl}/${id}`, projetData);
    return response.data.projet;
  }

  /**
   * Mise à jour partielle d'un projet
   */
  async partialUpdateProjet(id: string, projetData: Partial<Projet>): Promise<Projet> {
    const response = await instance.patch(`${this.baseUrl}/${id}`, projetData);
    return response.data.projet;
  }

  /**
   * Supprimer un projet
   */
  async deleteProjet(id: string): Promise<{ message: string }> {
    const response = await instance.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }
}
