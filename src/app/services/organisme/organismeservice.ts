import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environDev } from '../../../environments/environment.development';
import { ProjetFormDTO } from '../../model/projetFormdto';
import { OrganisationDTO } from '../../model/organisationdto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Organismeservice {
   private baseUrl = 'api/organisations';
    private ApiUrl = environDev.urlServer;
    constructor(private http: HttpClient) { }
  
     /**
       * Récupérer la liste complète sans pagination
       */
      getOrganismeConnected(): Observable<OrganisationDTO> {
        return this.http.get<OrganisationDTO>(`${this.ApiUrl}/${this.baseUrl}/organismeconnected`);
      }
}
