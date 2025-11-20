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

  // Notificaciones
  displayUpcomingAlert = false;
  upcomingAlertMessage = '';
  private notificationInterval: any;

  // Check-in
  reservationForCheckIn: Reservation | null = null;

  // --- 3. VARIABLES PARA LA CONFIRMACIÓN GLOBAL ---
  displayGlobalConfirmation = false;
  globalConfirmationMessage = '';
  pendingConfirmationAction: { mode: 'CANCEL' | 'NO_SHOW', reservation: Reservation } | null = null;

  constructor(
    private tableService: TableService, 
    private orderService: OrderService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
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
     else {
      console.log('Table is not available.');
    }
  }

  onReservationCheckIn(reservation: Reservation) {
    this.reservationForCheckIn = reservation; 
    this.selectedComponent = 'FREE'; 
  }

  // --- 4. MANEJO DE CONFIRMACIÓN (RECIBE DEL HIJO) ---
  openGlobalConfirmation(event: { message: string, mode: 'CANCEL' | 'NO_SHOW', reservation: Reservation }) {
    this.globalConfirmationMessage = event.message;
    this.pendingConfirmationAction = { mode: event.mode, reservation: event.reservation };
    this.displayGlobalConfirmation = true;
  }

  async handleGlobalConfirmationSend() {
    if (!this.pendingConfirmationAction) return;
    
    this.displayGlobalConfirmation = false;
    const { reservation } = this.pendingConfirmationAction;

    try {
      // ¡AQUÍ SE LLAMA AL SERVICIO!
      await this.reservationService.cancelReservation(reservation.id!);
      
      // Éxito: Cerramos el modal de la mesa y refrescamos
      this.displayModal = false; 
      this.loadTables(); 
      alert("Reserva gestionada con éxito.");
    } catch (error) {
      console.error("Error cancelando reserva:", error);
      alert("Error al cancelar la reserva.");
    }
    this.pendingConfirmationAction = null;
  }
  // --- FIN MANEJO CONFIRMACIÓN ---

  onNotificationClick(): void { this.displayModalInactive = true; }

  closeModal() { this.displayModal = false; location.reload(); }

  closeModalInactive(){ this.displayModalInactive = false; location.reload(); }

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.tables = data; 
          this.sortTables();
          this.freeTables = this.tables.filter(table => table.status === 'FREE');
        }
      },
      error: (err) => console.error('Error fetching tables:', err)
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
    this.orderService.getInactiveOrders().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.inactiveOrders = data.filter(order => order.status === 'INACTIVE');
          this.countInactiveOrders();
        }
      },
      error: (err) => console.error('Error fetching orders:', err)
    });
  }

  countInactiveOrders() { this.inactiveOrdersCount = this.inactiveOrders.length; }
  
  onReservationNotificationClick() { this.displayReservationsModal = true; }
  onReservationAssigned(): void { this.loadTables(); this.checkUpcomingReservations(); }

  startNotificationTimer(): void {
    this.checkUpcomingReservations(); 
    this.notificationInterval = setInterval(() => {
      this.checkUpcomingReservations();
    }, 60000); 
  }

  async checkUpcomingReservations(): Promise<void> {
    const allReservations = await this.reservationService.getReservationsByDay(this.todayISO);
    const unassignedReservations = allReservations.filter(r => !r.table_id || r.table_id === '');

    if (unassignedReservations.length === 0) {
      this.todayReservationsCount = 0;
      this.displayUpcomingAlert = false;
      return;
    }
    this.todayReservationsCount = unassignedReservations.length;
    
    const now = new Date();
    const currentHour = now.getHours();
    const upcomingReservations = unassignedReservations.filter(r => {
      const [resHour, resMin] = r.reservationTime.split(':').map(Number);
      const hourDifference = resHour - currentHour;
      return hourDifference > 0 && hourDifference <= 2;
    });

    if (upcomingReservations.length > 0) {
      if (this.displayUpcomingAlert === false) {
        this.upcomingAlertMessage = `¡Atención! Tienes ${upcomingReservations.length} reserva(s) para la próxima hora sin asignar. Por favor, gestiónalas.`;
        this.displayUpcomingAlert = true;
      }
    }
  }

  closeUpcomingAlert(): void { this.displayUpcomingAlert = false; }
}