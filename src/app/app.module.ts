import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { AppRoutingModule } from './app-routing.module';
import { FloatLabelModule } from 'primeng/floatlabel';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FooterComponent } from './screens/common/footer/footer.component';
import { HeaderComponent } from './screens/common/header/header.component';
import { HttpClientModule } from '@angular/common/http';
import { LogInComponent } from './screens/User-LogIn/log-in/log-in.component';
import { UserRegisterComponent } from './screens/User-LogIn/user-register/user-register.component';
import { UserForgotPasswordComponent } from './screens/User-LogIn/user-forgot-password/user-forgot-password.component';
import { MenubarModule } from 'primeng/menubar';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HomeComponent } from './screens/home/home.component';
import { DialogModule } from 'primeng/dialog';
import { UserProfileComponent } from './screens/user-profile/user-profile.component';
import { ProductsViewComponent } from './screens/product/products-view/products-view.component';
import { RegisterProductComponent } from './screens/product/register-product/register-product.component';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationPopUpComponent } from './screens/announcements/confirmation-pop-up/confirmation-pop-up.component';
import { NoticeComponent } from './screens/announcements/notice/notice.component';
import { DropdownModule } from 'primeng/dropdown';
import { CategoriesComponent } from "./screens/product/categories/categories.component";
import { TablesComponent } from './screens/my-tables/tables/tables.component';
import { OrdersComponent } from './screens/my-orders/orders/orders.component';
import { ResetPasswordComponent } from './screens/User-LogIn/reset-password/reset-password.component';
import { CaloriesComponent } from './screens/product/calories/calories.component';
import { MultiSelectModule } from 'primeng/multiselect';  
import { TableBusyComponent } from './screens/my-tables/table-busy/table-busy.component';
import { TableFreeComponent } from './screens/my-tables/table-free/table-free.component';
import { OrderInfoComponent } from './screens/my-orders/order-info/order-info.component';
import { ExportExcelComponent } from './screens/my-orders/export-excel/export-excel.component';
import { TableFinishedComponent } from './screens/my-tables/table-finished/table-finished.component';
import { FileUploadModule } from 'primeng/fileupload';
import { ChartsComponent } from './screens/charts/charts.component';
import { ChartModule } from 'primeng/chart';
import { MenuComponent } from './screens/user-order-or-reservation/user-order/menu/menu.component';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MyCartComponent } from './screens/user-order-or-reservation/user-order/my-cart/my-cart.component';
import { CreateOrderComponent } from './screens/user-order-or-reservation/user-order/create-order/create-order.component';
import { AsignInactiveOrderComponent } from './screens/my-tables/asign-inactive-order/asign-inactive-order.component';
import { InputIconModule } from 'primeng/inputicon'; 
import { GoalsComponent } from './screens/goal-screen/goals/goals.component';
import { KnobModule } from 'primeng/knob';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { SpeedDialModule } from 'primeng/speeddial';
import { MeterGroupModule } from 'primeng/metergroup';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { NewGoalComponent } from './screens/goal-screen/new-goal/new-goal.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { CarouselModule } from 'primeng/carousel';
import { UpdateStockComponent } from './screens/product/update-stock/update-stock.component';
import { InfoPointsComponent } from './screens/info-points/info-points.component';
import { AlertStockComponent } from './screens/product/alert-stock/alert-stock.component';
import { SplitterModule } from 'primeng/splitter';
import { UserReserveOrderComponent } from './screens/user-order-or-reservation/user-reserve-order/user-reserve-order.component';
import { UserReserveComponent } from './screens/user-order-or-reservation/user-reserve/user-reserve.component';
import { AssignReservationTableComponent } from './screens/my-tables/assign-reservation-table/assign-reservation-table.component';
import { TableReservedComponent } from './screens/my-tables/table-reserved/table-reserved.component';

@NgModule({
  declarations: [
    AppComponent,
    GoalsComponent,
    MenuComponent,
    MyCartComponent,
    AlertStockComponent,
    CreateOrderComponent,
    TablesComponent,
    ChartsComponent,
    InfoPointsComponent,
    ExportExcelComponent,
    NewGoalComponent,
    OrdersComponent,
    OrderInfoComponent,
    UpdateStockComponent,
    TableBusyComponent,
    TableFreeComponent,
    TableFinishedComponent,
    CaloriesComponent,
    FooterComponent,
    AsignInactiveOrderComponent,
    HeaderComponent,
    HomeComponent,
    UserProfileComponent,
    ProductsViewComponent,
    ConfirmationPopUpComponent,
    RegisterProductComponent,
    LogInComponent,
    UserRegisterComponent,
    NoticeComponent,
    UserForgotPasswordComponent,
    CategoriesComponent,
    ResetPasswordComponent,
    UserReserveOrderComponent,
    UserReserveComponent,
    AssignReservationTableComponent,
    TableReservedComponent,
  ],
  imports: [
    BrowserModule,
    ScrollPanelModule,
    KnobModule,
    CardModule,
    ProgressBarModule,
    SpeedDialModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    FileUploadModule,
    AutoCompleteModule,
    SplitterModule,
    TagModule,
    TableModule,
    ColorPickerModule,
    HttpClientModule,
    MultiSelectModule,
    FormsModule,
    TieredMenuModule,
    PasswordModule,
    InputIconModule,
    ProgressSpinnerModule,
    ButtonModule,
    DialogModule,
    BrowserAnimationsModule,
    DividerModule,
    InputTextModule,
    AppRoutingModule,
    FloatLabelModule,
    CalendarModule,
    MenubarModule,
    ChartModule,
    MeterGroupModule,
    CarouselModule
],
  providers: [ConfirmationService, MessageService, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
