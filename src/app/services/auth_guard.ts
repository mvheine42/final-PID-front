// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseconfig';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {

    const publicRoutes = new Set([
      '',                 // home
      'login',
      'user-register',
      'user-forgot-password',
      'reset-password',
      'make-reservation',
      'available-slots',
    ]);

    const path = route.routeConfig?.path ?? '';

    // Si es pública → permitir
    if (publicRoutes.has(path)) {
      return Promise.resolve(true);
    }

    // Si NO es pública → verificar usuario Firebase
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, user => {
        unsub();
        if (user) {
          resolve(true);
        } else {
          this.router.navigate(['/login'], { queryParams: { redirectTo: state.url }});
          resolve(false);
        }
      });
    });
  }
}
