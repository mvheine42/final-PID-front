import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user_service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  items: MenuItem[] | undefined;
  displayConfirmDialog: boolean = false;

  constructor(
    private router: Router, 
    public userService: UserService, 
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.items = [
      {
        icon: 'pi pi-fw pi-home',
        routerLink: '/home',
        tooltip: 'Home'
      },
      {
        icon: 'pi pi-chart-line',
        routerLink: '/goals',
        items: [
          {
            label: 'Goals',
            routerLink: '/goals'
          },
          { 
            label: 'Charts',
            routerLink: '/charts'
          }
        ]
      },
      {
        icon: 'fa fa-glass-martini',
        routerLink: '/products-view',
        items: [
          {
            label: 'New Product',
            routerLink: '/register-product'
          },
          {
            label: 'View Products',
            routerLink: '/products-view'
          }
        ]
      },
      {
        icon: 'fa fa-cutlery',
        routerLink: '/tables',
        tooltip: 'Tables'
      },
      {
        icon: 'pi pi-receipt',
        routerLink: '/orders',
        tooltip: 'Orders'
      },
      {
        icon: 'pi pi-clock',
        routerLink: '/time',
        tooltip: 'Time'
      },
      {
        icon: 'pi pi-fw pi-user-edit',
        routerLink: '/user-profile',
        items: [
          {
            label: 'Edit',
            routerLink: '/user-profile'
          },
          {
            label: 'Quit',
            command: () => this.showConfirmDialog(),
          }
        ]
      },
    ];
  }

  async logOut() {
    try {
      await this.userService.logOut();
      // ✅ No need to remove token manually - sessionStorage cleared automatically
      // ✅ AuthService handles all cleanup
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  showConfirmDialog() {
    this.displayConfirmDialog = true;
  }

  closeConfirmDialog() {
    this.displayConfirmDialog = false;
  }
}