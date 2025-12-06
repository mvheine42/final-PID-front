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
  private inactivityTimeout: any;
  
  // Tiempo de inactividad antes de logout automático
  private readonly INACTIVITY_TIME = 120 * 60 * 1000; // 10 minutos
  
  // 🔧 FIX: Store bound function reference for proper cleanup
  private boundResetTimer: any;
  
  constructor(private router: Router) {
    // Bind once and store reference
    this.boundResetTimer = this.resetInactivityTimer.bind(this);
    
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      
      if (user) {
        // Usuario logueado → iniciar detector de inactividad
        console.log('User logged in, starting inactivity detection');
        this.startInactivityDetection();
      } else {
        // Usuario deslogueado → limpiar detector
        console.log('User logged out, stopping inactivity detection');
        this.stopInactivityDetection();
      }
    });
  }

  /**
   * Inicia la detección de inactividad
   */
  private startInactivityDetection(): void {
    // Limpiar cualquier detector previo
    this.stopInactivityDetection();
    
    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',    // Click del mouse
      'mousemove',    // Movimiento del mouse
      'keypress',     // Teclas presionadas
      'scroll',       // Scroll
      'touchstart',   // Touch en móviles
      'click'         // Clicks
    ];
    
    // 🔧 FIX: Use stored bound function reference
    events.forEach(event => {
      document.addEventListener(event, this.boundResetTimer, true);
    });
    
    // Iniciar el timer
    this.resetInactivityTimer();
    
    console.log('Inactivity detection started - timeout in', this.INACTIVITY_TIME / 60000, 'minutes');
  }

  /**
   * Resetea el timer de inactividad (usuario hizo algo)
   */
  private resetInactivityTimer(): void {
    // Solo resetear si hay un usuario logueado
    if (!this.currentUser) {
      return;
    }
    
    // Limpiar timeout anterior
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    // Crear nuevo timeout
    this.inactivityTimeout = setTimeout(() => {
      console.log('User inactive for', this.INACTIVITY_TIME / 60000, 'minutes');
      this.handleInactivityLogout();
    }, this.INACTIVITY_TIME);
  }

  /**
   * Maneja el logout por inactividad
   */
  private handleInactivityLogout(): void {
    // Double check que todavía hay usuario logueado
    if (!this.currentUser) {
      return;
    }
    
    alert('Tu sesión se cerró por inactividad.');
    this.logout();
  }

  /**
   * Detiene la detección de inactividad
   */
  private stopInactivityDetection(): void {
    // Limpiar timeout
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    
    // 🔧 FIX: Use same bound function reference to remove listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.boundResetTimer, true);
    });
    
    console.log('Inactivity detection stopped');
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
          .then(() => { 
            this.resetInactivityTimer(); // Reiniciar timer de inactividad
            observer.next(true); 
            observer.complete(); 
          })
          .catch(() => { 
            this.logout(); 
            observer.error(false); 
          });
      } else {
        this.logout();
        observer.error(false);
      }
    });
  }

  async logout(): Promise<void> {
    try {
      this.stopInactivityDetection();
      await auth.signOut();
    } finally {
      this.currentUser = null;
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
  
  /**
   * Obtiene el tiempo restante antes del logout por inactividad (en segundos)
   */
  getRemainingInactivityTime(): number {
    return Math.floor(this.INACTIVITY_TIME / 1000);
  }
}