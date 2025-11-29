import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { auth } from '../services/firebaseconfig';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser: User | null = null;

  constructor(private router: Router) {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  isAuthenticated(): Promise<boolean> {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => resolve(!!user));
    });
  }

  handleTokenExpiration(): Observable<boolean> {
    return new Observable(observer => {
      const extend = window.confirm('Tu sesión ha expirado. ¿Querés extenderla?');
      if (extend) {
        auth.currentUser?.getIdToken(true)
          .then(() => { observer.next(true); observer.complete(); })
          .catch(() => { this.logout(); observer.error(false); });
      } else {
        this.logout();
        observer.error(false);
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await auth.signOut();
    } finally {
      this.currentUser = null;
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

}