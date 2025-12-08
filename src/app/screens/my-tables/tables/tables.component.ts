import { TableService } from 'src/app/services/table_service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Table } from 'src/app/models/table';
import { OrderService } from 'src/app/services/order_service';
import { Order } from 'src/app/models/order';
import { ReservationService } from 'src/app/services/reservation_service';
import { Reservation } from 'src/app/models/reservation';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit, OnDestroy {

  public tableScrollHeight: string = '';
  tables: Table[] = [];
  displayModal: boolean = false;
  selectedTable: Table = new Table('',1);
  selectedComponent: string = '';
  inactiveOrdersCount: number = 0; 
  inactiveOrders: Order[] = [];
  freeTables: Table[] = [];
  displayModalInactive: boolean =  false;
  displayReservationsModal = false;
  todayReservationsCount = 0;
  todayISO = this.getTodayISOString();

  loading: boolean = true;
  loadingTables: boolean = true;
  loadingOrders: boolean = true;

  displayUpcomingAlert = false;
  upcomingAlertMessage = '';
  private notificationInterval: any;

  lateReservationsCount = 0;
  upcomingReservationsCount = 0;

  reservationForCheckIn: Reservation | null = null;

  constructor(
    private tableService: TableService, 
    private orderService: OrderService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loadingTables = true;
    this.loadingOrders = true;

    this.loadTables();
    this.loadOrders();
    this.setScrollHeight();
    window.addEventListener('resize', () => { this.setScrollHeight(); });
    this.startNotificationTimer();
  }

  private getTodayISOString(): string {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }

  ngOnDestroy(): void {
    if (this.notificationInterval) clearInterval(this.notificationInterval);
  }

  setScrollHeight() {
    if (window.innerWidth <= 768) this.tableScrollHeight = '800px';
    else this.tableScrollHeight = '400px';
  }

  checkIfLoadingComplete(): void {
    if (!this.loadingTables && !this.loadingOrders) {
      this.loading = false;
    }
  }

  onTableClick(table: any) {
    this.selectedTable = table;
    this.reservationForCheckIn = null; 
    
    if (table.status === 'FREE') {
      this.selectedComponent = 'FREE';
      this.displayModal = true;
    } else if (table.status === 'BUSY') {
      this.selectedComponent = 'BUSY';
      this.displayModal = true;
    } else if (table.status === 'FINISHED') {
      this.selectedComponent = 'FINISHED';
      this.displayModal = true;
    }
    else if (table.status === 'RESERVED') {
      this.selectedComponent = 'RESERVED';
      this.displayModal = true;
    }
  }

  onReservationCheckIn(reservation: Reservation) {
    this.reservationForCheckIn = reservation; 
    this.selectedComponent = 'FREE'; 
  }

  onNotificationClick(): void { 
    this.displayModalInactive = true; 
  }

  closeModal() { 
    this.displayModal = false; 
    this.refreshData();
  }

  closeModalInactive(){ 
    this.displayModalInactive = false; 
    this.refreshData();
  }

  refreshData(): void {
    this.loadTables();
    this.loadOrders();
    this.checkUpcomingReservations();
  }

  loadTables(): void {
    this.loadingTables = true;
    this.tableService.getTables().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.tables = data; 
          this.sortTables();
          this.freeTables = this.tables.filter(table => table.status === 'FREE');
        }
        this.loadingTables = false;
        this.checkIfLoadingComplete();
      },
      error: (err) => {
        this.loadingTables = false;
        this.checkIfLoadingComplete();
      }
    });
  }

  sortTables() {
    this.tables.sort((a, b) => {
      const idA = Number(a.id ?? Number.MAX_SAFE_INTEGER);
      const idB = Number(b.id ?? Number.MAX_SAFE_INTEGER);
      return idA - idB;
    });
  }

  loadOrders(): void {
    this.loadingOrders = true;
    this.orderService.getInactiveOrders().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.inactiveOrders = data.filter(order => order.status === 'INACTIVE');
          this.countInactiveOrders();
        }
        this.loadingOrders = false;
        this.checkIfLoadingComplete();
      },
      error: (err) => {
        this.loadingOrders = false;
        this.checkIfLoadingComplete();
      }
    });
  }

  countInactiveOrders() { 
    this.inactiveOrdersCount = this.inactiveOrders.length; 
  }
  
  onReservationNotificationClick() { 
    this.displayReservationsModal = true; 
  }

  onReservationAssigned(): void { 
    this.refreshData();
  }

  onReservedTableClosed(): void {
    this.displayModal = false;
    this.refreshData();
  }

  startNotificationTimer(): void {
    this.checkUpcomingReservations(); 
    this.notificationInterval = setInterval(() => {
      this.checkUpcomingReservations();
    }, 600000); 
  }

  async checkUpcomingReservations(): Promise<void> {
    const allReservations = await this.reservationService.getReservationsByDay(this.todayISO);
    
    const unassignedReservations = allReservations.filter(r => !r.table_id || r.table_id === '');

    this.lateReservationsCount = 0;
    this.upcomingReservationsCount = 0;
    this.todayReservationsCount = unassignedReservations.length;

    if (unassignedReservations.length === 0) {
      this.displayUpcomingAlert = false;
      return;
    }

    unassignedReservations.forEach(r => {
      if (this.isLate(r.reservationTime)) {
        this.lateReservationsCount++;
      } else if (this.isSoon(r.reservationTime)) {
        this.upcomingReservationsCount++;
      }
    });

    if (this.upcomingReservationsCount > 0 && this.displayUpcomingAlert === false) {
        this.upcomingAlertMessage = `Attention! You have ${this.upcomingReservationsCount} upcoming reservations unassigned.`;
        this.displayUpcomingAlert = true;
    }
  }

  isLate(timeStr: string): boolean {
    if (!timeStr) return false;
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const resDate = new Date(); 
    resDate.setHours(h, m, 0, 0);
    return now > resDate;
  }

  isSoon(timeStr: string): boolean {
    if (!timeStr) return false;
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const resDate = new Date();
    resDate.setHours(h, m, 0, 0);
    
    const diffMs = resDate.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes > 0 && diffMinutes <= 60;
  }

  closeUpcomingAlert(): void { 
    this.displayUpcomingAlert = false; 
  }
}