// auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { auth } from '../services/firebaseconfig';
import { getIdToken } from 'firebase/auth';
import { AuthService } from '../services/auth_service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    //const isApiCall = req.url.startsWith('http://127.0.0.1:8000');
    const isApiCall = req.url.startsWith('https://final-pid-back.onrender.com');

    
    if (!isApiCall) return next.handle(req);

    return from(this.attachToken(req, false)).pipe(
      switchMap((authedReq) => next.handle(authedReq)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isRefreshing) {
          // Primer intento: refrescar token
          this.isRefreshing = true;
          
          return from(this.attachToken(req, true)).pipe(
            switchMap((retryReq) => {
              this.isRefreshing = false;
              return next.handle(retryReq);
            }),
            catchError((retryError: HttpErrorResponse) => {
              this.isRefreshing = false;
              
              // Si el retry también falla con 401, la sesión está realmente expirada
              if (retryError.status === 401) {
                console.error('Token refresh failed, logging out');
                this.authService.logout();
              }
              
              return throwError(() => retryError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }

  private async attachToken(req: HttpRequest<any>, forceRefresh = false): Promise<HttpRequest<any>> {
    const user = auth.currentUser;
    if (!user) return req;

    try {
      const token = await getIdToken(user, forceRefresh);
      return req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error getting token:', error);
      // Si no se puede obtener token, logout
      this.authService.logout();
      return req;
    }
  }
}