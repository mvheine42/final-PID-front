import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FooterComponent } from './screens/common/footer/footer.component';
import { HeaderComponent } from './screens/common/header/header.component';
import { LogInComponent } from './screens/User-LogIn/log-in/log-in.component';
import { UserRegisterComponent } from './screens/User-LogIn/user-register/user-register.component';
import { UserForgotPasswordComponent } from './screens/User-LogIn/user-forgot-password/user-forgot-password.component';
import { HomeComponent } from './screens/home/home.component';
import { UserProfileComponent } from './screens/user-profile/user-profile.component';
import { ProductsViewComponent } from './screens/product/products-view/products-view.component';
import { RegisterProductComponent } from './screens/product/register-product/register-product.component';
import { AuthGuard } from './services/auth_guard';
import { ResetPasswordComponent } from './screens/User-LogIn/reset-password/reset-password.component';
import { CategoriesComponent } from './screens/product/categories/categories.component';
import { TablesComponent } from './screens/my-tables/tables/tables.component';
import { ChartsComponent } from './screens/charts/charts.component';
import { OrdersComponent } from './screens/my-orders/orders/orders.component';
import { MenuComponent } from './screens/user-order-or-reservation/user-order/menu/menu.component';
import { GoalsComponent } from './screens/goal-screen/goals/goals.component';
import { UserReserveOrderComponent } from './screens/user-order-or-reservation/user-reserve-order/user-reserve-order.component';
import { UserReserveComponent } from './screens/user-order-or-reservation/user-reserve/user-reserve.component';
import { AssignReservationTableComponent } from './screens/my-tables/assign-reservation-table/assign-reservation-table.component';

const routes: Routes = [
  { path: '', component: LogInComponent},
  { path: 'footer', component: FooterComponent},
  { path: 'header', component: HeaderComponent},
  { path: 'user-register', component: UserRegisterComponent},
  { path: 'user-forgot-password', component: UserForgotPasswordComponent},
  { path: 'categories', component: CategoriesComponent, canActivate:[AuthGuard]},
  { path: 'home', component: HomeComponent, canActivate:[AuthGuard]},
  { path: 'user-profile', component: UserProfileComponent, canActivate:[AuthGuard]},
  { path: 'products-view', component: ProductsViewComponent, canActivate:[AuthGuard]},
  { path: 'register-product', component: RegisterProductComponent, canActivate:[AuthGuard]},
  { path: 'reset-password', component: ResetPasswordComponent},
  { path: 'tables', component: TablesComponent, canActivate:[AuthGuard]},
  { path: 'orders', component: OrdersComponent, canActivate:[AuthGuard]},
  { path: 'charts', component: ChartsComponent, canActivate:[AuthGuard]},
  { path: 'goals', component: GoalsComponent, canActivate:[AuthGuard]},
  { path: 'menu-order', component: MenuComponent},
  { path: 'user-reserve-order', component: UserReserveOrderComponent},
  { path: 'user-reserve', component: UserReserveComponent},
  { path: 'assign-reservation-table', component: AssignReservationTableComponent},
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
