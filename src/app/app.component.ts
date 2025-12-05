import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth_service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'pm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeader: boolean = true;
  isAuthenticated: boolean | null = null;

  constructor(private router: Router, private authService: AuthService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const publicRoutes = ['/', '/user-register', '/user-forgot-password', '/menu-order', '/user-reserve-order', '/user-reserve'];
      if (publicRoutes.includes(this.router.url) || this.router.url.startsWith('/reset-password')) {
        this.showHeader = false;
      } else {
        this.showHeader = true;
      }
    });
    
  }

  ngOnInit() {
    this.authService.isAuthenticated().then((authStatus) => {
      this.isAuthenticated = authStatus;
    });
  }
}
