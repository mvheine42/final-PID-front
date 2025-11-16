import { TableService } from 'src/app/services/table_service';
import { Component, OnInit, OnDestroy } from '@angular/core'; // <-- 1. AÑADIDO OnDestroy
import { Table } from 'src/app/models/table';
import { OrderService } from 'src/app/services/order_service';
import { Order } from 'src/app/models/order';
// --- 2. AÑADIR ESTOS DOS ---
import { ReservationService } from 'src/app/services/reservation_service';
import { Reservation } from 'src/app/models/reservation';
// --- FIN DE AÑADIDOS ---

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit, OnDestroy { // <-- 3. AÑADIDO OnDestroy

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
  todayISO = new Date().toISOString().split('T')[0];

  // --- 4. AÑADIR ESTAS TRES VARIABLES ---
  displayUpcomingAlert = false;
  upcomingAlertMessage = '';
  private notificationInterval: any;
  // --- FIN DE AÑADIDOS ---

  constructor(
    private tableService: TableService, 
    private orderService: OrderService,
    private reservationService: ReservationService // <-- 5. AÑADIR ESTO
  ) {}

  ngOnInit(): void {
    this.todayISO = new Date().toISOString().split('T')[0];
    this.loadTables();
    this.loadOrders();
    this.setScrollHeight();
    window.addEventListener('resize', () => {
      this.setScrollHeight();
    });

    // --- 6. AÑADIR ESTO ---
    // Chequear notificaciones ahora, y luego cada 1 minuto
    this.startNotificationTimer();
    // --- FIN DE AÑADIDO ---
  }

  // --- 7. AÑADIR ESTA FUNCIÓN (Buena práctica) ---
  ngOnDestroy(): void {
    // Limpia el timer si el componente se destruye
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  setScrollHeight() {
    if (window.innerWidth <= 768) {
      this.tableScrollHeight = '800px';
    } else {
      this.tableScrollHeight = '400px';
    }
  }

  onTableClick(table: any) {
    this.selectedTable = table;
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

  onNotificationClick(): void {
    this.displayModalInactive = true; 
  }

  closeModal() {
    this.displayModal = false;
    location.reload();
  }

  closeModalInactive(){
    this.displayModalInactive = false;
    location.reload();
  }

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.tables = data; 
          this.sortTables();
          this.freeTables = this.tables.filter(table => table.status === 'FREE');
        } else {
          console.error('Unexpected data format:', data);
        }
      },
      error: (err) => {
        console.error('Error fetching tables:', err);
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
    this.orderService.getInactiveOrders().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.inactiveOrders = data.filter(order => order.status === 'INACTIVE');
          this.countInactiveOrders();
        } else {
          console.error('Unexpected data format:', data);
        }
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
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
  this.loadTables(); // refrescás las mesas cuando asignaste una reserva
  // 8. AÑADIR ESTO (para re-chequear si quedan más)
  this.checkUpcomingReservations(); 
}

// --- 9. AÑADIR ESTAS 3 FUNCIONES NUEVAS AL FINAL ---
  
  startNotificationTimer(): void {
    // 1. Chequea inmediatamente al cargar
    this.checkUpcomingReservations(); 
    
    // 2. Y luego se re-chequea cada 60 segundos (60000 ms)
    this.notificationInterval = setInterval(() => {
      this.checkUpcomingReservations();
    }, 60000); 
  }

  async checkUpcomingReservations(): Promise<void> {
    const allReservations = await this.reservationService.getReservationsByDay(this.todayISO);

    // 1. Filtrar solo las que NO tienen mesa
    const unassignedReservations = allReservations.filter(r => !r.table_id || r.table_id === '');

    // Si no hay ninguna sin asignar, salimos y ponemos contador en 0
    if (unassignedReservations.length === 0) {
      this.todayReservationsCount = 0;
      return;
    }

    // Actualizamos el contador del ícono (solo cuenta las SIN ASIGNAR)
    this.todayReservationsCount = unassignedReservations.length;

    const now = new Date();
    const currentHour = now.getHours(); // Hora actual (ej: 19)

    // 2. Filtrar las "próximas" (ej. en las sig 2 horas)
    const upcomingReservations = unassignedReservations.filter(r => {
      // 'r.reservationTime' es un string "21:00"
      const [resHour, resMin] = r.reservationTime.split(':').map(Number);
      
      const hourDifference = resHour - currentHour;

      // Lógica: Es futura (es más tarde que ahora) Y faltan 2 horas o menos
      return hourDifference > 0 && hourDifference <= 2;
    });

    // 3. ¡Mostrar el cartel!
    if (upcomingReservations.length > 0) {
      // Para no mostrar el cartel 50 veces, 
      // solo lo mostramos si ya está cerrado
      if (this.displayUpcomingAlert === false) {
        this.upcomingAlertMessage = `¡Atención! Tienes ${upcomingReservations.length} reserva(s) próximas sin asignar. Por favor, gestiónalas.`;
        this.displayUpcomingAlert = true;
      }
    }
  }

  closeUpcomingAlert(): void {
    this.displayUpcomingAlert = false;
  }
  // --- FIN DE FUNCIONES AÑADIDAS ---

}