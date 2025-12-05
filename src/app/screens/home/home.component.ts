import { Component, HostListener } from '@angular/core';
import { UserService } from 'src/app/services/user_service';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  constructor(public userService: UserService, private confirmationService: ConfirmationService, private router: Router) {}

  navigateToTables(): void {
    this.router.navigate(['/tables']); 
  }

  navigateToOrders(): void {
    this.router.navigate(['/orders']);
  }

  navigateToProductsView(): void {
    this.router.navigate(['/products-view']); 
  }


}