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
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall =
      req.url.startsWith('http://127.0.0.1:8000') 
      
    if (!isApiCall) return next.handle(req);

    return from(this.attachToken(req, false)).pipe(
      switchMap((authedReq) => next.handle(authedReq)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Fuerza refresh UNA vez y reintenta
          return from(this.attachToken(req, true)).pipe(
            switchMap((retryReq) => next.handle(retryReq)),
            catchError((err) => throwError(() => err))
          );
        }
        return throwError(() => error);
      })
    );
  }

  private async attachToken(req: HttpRequest<any>, forceRefresh = false): Promise<HttpRequest<any>> {
    const user = auth.currentUser;
    if (!user) return req; // público

    const token = await getIdToken(user, forceRefresh);
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
}