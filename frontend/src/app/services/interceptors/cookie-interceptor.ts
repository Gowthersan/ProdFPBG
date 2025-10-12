import { HttpInterceptorFn } from '@angular/common/http';

import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class CookieInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone la requête et active l'envoi des cookies
    const clonedRequest = req.clone({
      withCredentials: true
    });

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          console.warn('Session expirée ou non autorisée');
          // Redirection possible vers la page de login
          // this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
