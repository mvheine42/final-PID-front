import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth_service';
import { filter } from 'rxjs/operators';
import { auth } from './services/firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';

@Component({
  selector: 'pm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeader: boolean = false;
  isAuthenticated: boolean = false;

  constructor(private router: Router, private authService: AuthService) {
    
    // ✅ ESCUCHAR cambios de autenticación
    onAuthStateChanged(auth, (user) => {
      this.isAuthenticated = !!user;
      this.updateHeaderVisibility();
    });

    // ✅ ESCUCHAR cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateHeaderVisibility();
    });
  }

  ngOnInit() {
    // Initial check handled by onAuthStateChanged
  }

  // 🔥 NUEVA FUNCIÓN: Decidir si mostrar header
  private updateHeaderVisibility(): void {
    const publicRoutes = [
      '/', 
      '/user-register', 
      '/user-forgot-password', 
      '/menu-order', 
      '/user-reserve-order', 
      '/user-reserve'
    ];

    const currentUrl = this.router.url;
    const isPublicRoute = publicRoutes.includes(currentUrl) || currentUrl.startsWith('/reset-password');

    // ✅ MOSTRAR HEADER SOLO SI:
    // 1. NO es ruta pública Y
    // 2. Usuario está autenticado
    this.showHeader = !isPublicRoute && this.isAuthenticated;
  }
}