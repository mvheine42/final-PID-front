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



  lateReservationsCount = 0;
  upcomingReservationsCount = 0;


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
  onReservedTableClosed(): void {
  this.displayModal = false;
  this.loadTables(); 
}

  startNotificationTimer(): void {
    this.checkUpcomingReservations(); 
    this.notificationInterval = setInterval(() => {
      this.checkUpcomingReservations();
    }, 600000); 
  }

  async checkUpcomingReservations(): Promise<void> {
    const allReservations = await this.reservationService.getReservationsByDay(this.todayISO);
    
    // Filtramos SOLO las que NO tienen mesa asignada
    const unassignedReservations = allReservations.filter(r => !r.table_id || r.table_id === '');

    // Reseteamos contadores
    this.lateReservationsCount = 0;
    this.upcomingReservationsCount = 0;
    this.todayReservationsCount = unassignedReservations.length; // Mantenemos el total por las dudas

    if (unassignedReservations.length === 0) {
      this.displayUpcomingAlert = false;
      return;
    }

    // Calculamos cuántas son Late y cuántas Soon
    unassignedReservations.forEach(r => {
      if (this.isLate(r.reservationTime)) {
        this.lateReservationsCount++;
      } else if (this.isSoon(r.reservationTime)) {
        this.upcomingReservationsCount++;
      }
    });

    // Lógica del popup de alerta (la mantenemos igual, pero usando la cuenta nueva)
    if (this.upcomingReservationsCount > 0 && this.displayUpcomingAlert === false) {
        this.upcomingAlertMessage = `¡Atención! Tienes ${this.upcomingReservationsCount} reserva(s) próximas sin asignar.`;
        this.displayUpcomingAlert = true;
    }
  }

  // --- HELPERS DE TIEMPO (Añadir al final de la clase) ---
  isLate(timeStr: string): boolean {
    if (!timeStr) return false;
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const resDate = new Date(); 
    resDate.setHours(h, m, 0, 0);
    // Si "ahora" es mayor que la fecha de reserva -> Tarde
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

    // Si falta entre 0 y 60 minutos -> Próxima
    return diffMinutes > 0 && diffMinutes <= 60;
  }

  closeUpcomingAlert(): void { this.displayUpcomingAlert = false; }
}