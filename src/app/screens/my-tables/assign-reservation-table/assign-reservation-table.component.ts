import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReservationService } from 'src/app/services/reservation_service';
import { TableService } from 'src/app/services/table_service';
import { Reservation } from 'src/app/models/reservation';
import { Table } from 'src/app/models/table';
import { ConfirmationService } from 'primeng/api';
@Component({
  selector: 'app-assign-reservation-table',
  templateUrl: './assign-reservation-table.component.html',
  styleUrl: './assign-reservation-table.component.css'
})
export class AssignReservationTableComponent implements OnInit {
  @Input() dateISO!: string; // YYYY-MM-DD (lo pasa el padre)
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>(); // para refrescar padre tras asignar
  @Output() showConfirmation = new EventEmitter<{ message: string; mode: 'ASSIGN' | 'CANCEL';}>();

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  availableTables: any[] = []; 

  selectedTable: number|string|null = null;

  searchText = '';
  isLoading = false;
  confirmationDialog = false;
  displayErrorModal = false;
  errorMessage = '';
  displaySuccessModal = false;
  successMessage = '';
  confirmationMode: 'ASSIGN' | 'CANCEL' = 'ASSIGN'; 
  popupSubtitle: string = '';      // Para cambiar el texto del modal
  popupSendLabel: string = '';     // Para cambiar el texto del botón del modal
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private reservationService: ReservationService, private tableService: TableService, private confirmationService: ConfirmationService) {}


  ngOnInit(): void {
    this.loadReservations();
  }

  getRowClass(r: Reservation): string {
    // 1. Si ya tiene mesa asignada -> Verde (Prioridad total)
    if (r.table_id && r.table_id !== '') {
      return 'row-assigned';
    }

    // 2. Si NO tiene mesa y YA PASÓ la hora -> Rojo (Urgencia máxima/Error)
    if (this.isLate(r.reservationTime)) {
      return 'row-late';
    }

    // 3. (NUEVO) Si NO tiene mesa y falta MENOS DE 1 HORA -> Amarillo (Alerta)
    if (this.isSoon(r.reservationTime)) {
      return 'row-warning';
    }

    // 4. Si falta mucho tiempo -> Blanco (Normal)
    return '';
  }

  private isSoon(timeStr: string): boolean {
    if (!timeStr) return false;

    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Creamos la fecha de la reserva
    const reservationDate = new Date();
    reservationDate.setHours(hours, minutes, 0, 0);

    // Calculamos la diferencia en minutos
    // (reservationDate - now) te da milisegundos
    const diffMs = reservationDate.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // Lógica:
    // Si la diferencia es positiva (futuro) Y es menor a 60 minutos
    return diffMinutes > 0 && diffMinutes <= 60;
  }

  // FUNCIÓN AUXILIAR PARA COMPARAR HORAS
  private isLate(timeStr: string): boolean {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const reservationDate = new Date();
    reservationDate.setHours(hours, minutes, 0, 0);

    // Si la hora actual es mayor a la de la reserva (+15 min de tolerancia opcional)
    // Aquí lo hacemos estricto: si ya pasó la hora, marca rojo.
    return now > reservationDate;
  }

async loadReservations(): Promise<void> {
  this.isLoading = true;

  try {
    const res = await this.reservationService.getReservationsByDay(this.dateISO);
    this.reservations = res ?? [];
    this.applyFilter();
  } catch (error) {
    console.error("Error cargando reservas:", error);
    this.reservations = [];
    this.applyFilter();
  } finally {
    this.isLoading = false;
  }
}

async selectReservation(r: Reservation): Promise<void> {
  this.selectedReservation = r;
  this.availableTables = [];
  
  // ¡AQUÍ LA MAGIA!
  // Si la reserva 'r' ya tiene un table_id, lo usamos 
  // para pre-seleccionar el dropdown.
  this.selectedTable = r.table_id || null; 

  this.tableService.getAvailableTablesForReservation(r.id!)
    .subscribe({
      next: (tables) => {
        this.availableTables = (tables ?? []).map(t => ({
          ...t,
          label: `Mesa #${t.id} — cap: ${t.capacity}`
        }));
        
        // (Opcional, pero recomendado por si la API tarda)
        // Re-aseguramos que la mesa seleccionada es la de la reserva.
        if (this.selectedReservation && this.selectedReservation.table_id) {
          this.selectedTable = this.selectedReservation.table_id;
        }

      },
      error: () => {
        this.availableTables = [];
      }
    });
}


// --- REEMPLAZAR ESTA FUNCIÓN ENTERA ---
assignTable(): void {
  if (!this.selectedReservation || !this.selectedTable) return;

  this.isLoading = true;
  this.confirmationDialog = false; // Cierra el pop-up de confirmación

  this.tableService
    .assignReservationToTable(this.selectedTable, this.selectedReservation.id!)
    .subscribe({
      next: () => {
        this.isLoading = false;
        this.assigned.emit();      // refresca mesas en el padre
        this.loadReservations();   // refresca lista

        this.successMessage = 'Mesa exitosamente reservada.'; // <-- ¡Puedes cambiar este texto!
        this.displaySuccessModal = true;
      },
      error: (err) => {
        // --- ESTA ES LA LÓGICA DE ERROR ACTUALIZADA ---
        this.isLoading = false;
        
        // Ya no usamos alert():
        // alert(err?.error?.detail || 'No se pudo asignar la mesa.');
        
        // Usamos el modal en su lugar:
        this.errorMessage = this.translateBackendError(err);
        this.displayErrorModal = true;
        // --- FIN DE LA LÓGICA DE ERROR ---
      }
    });
}

isTooEarlyToAssign(reservationTime: string): boolean {
    if (!this.dateISO || !reservationTime) return true; // Por seguridad

    const now = new Date();

    // 1. Construimos la fecha completa de la reserva
    // dateISO viene como "YYYY-MM-DD"
    const [year, month, day] = this.dateISO.split('-').map(Number);
    // reservationTime viene como "HH:MM"
    const [hours, minutes] = reservationTime.split(':').map(Number);

    const reservationDate = new Date(year, month - 1, day, hours, minutes);

    // 2. Calculamos la diferencia en milisegundos
    const diffMs = reservationDate.getTime() - now.getTime();
    
    // 3. Definimos 2 horas en milisegundos
    const twoHoursMs = 2 * 60 * 60 * 1000;

    // Si la diferencia es mayor a 2 horas, es demasiado temprano -> TRUE (Deshabilitar botón)
    // Si la diferencia es menor o igual (o negativa si ya pasó la hora) -> FALSE (Habilitar botón)
    return diffMs > twoHoursMs;
  }
// --- FIN DE LA FUNCIÓN ---


  // === UI ===
 applyFilter(): void {
    const q = (this.searchText || '').toLowerCase();

    // 1. Primero Filtramos (tu lógica original)
    let tempReservations = this.reservations.filter(r =>
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.reservationTime || '').toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );

    // 2. Después Ordenamos: Sin mesa primero, Con mesa al final
    this.filteredReservations = tempReservations.sort((a, b) => {
      const hasTableA = this.hasTable(a);
      const hasTableB = this.hasTable(b);

      if (hasTableA && !hasTableB) return 1;  // A tiene mesa, va abajo
      if (!hasTableA && hasTableB) return -1; // A no tiene mesa, va arriba
      
      // 3. (Opcional) Si ambos tienen o no tienen mesa, ordenamos por hora
      return a.reservationTime.localeCompare(b.reservationTime);
    });
  }

  // Helper simple para saber si tiene mesa asignada
  private hasTable(r: Reservation): boolean {
    return r.table_id !== null && r.table_id !== undefined && r.table_id !== '' && r.table_id !== 0;
  }

showConfirmPopUp(mode: 'ASSIGN' | 'CANCEL') {
  if (!this.selectedReservation) return;

  const message =
    mode === 'ASSIGN'
      ? `¿Confirmás que querés asignar la mesa #${this.selectedTable} a la reserva de ${this.selectedReservation.customerName}?`
      : `¿Confirmás que deseas cancelar la reserva de ${this.selectedReservation.customerName}?`;

  this.confirmationService.confirm({
    key: 'assign-reservation-confirm',   // 👈 clave propia de este componente
    message,
    header: 'Confirmar Gestión',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: mode === 'CANCEL' ? 'Cancelar reserva' : 'Asignar',
    rejectLabel: 'Volver',
    acceptButtonStyleClass:
      mode === 'CANCEL' ? 'p-button-danger' : 'p-button-success',
    rejectButtonStyleClass: 'p-button-secondary',
    accept: () => {
      if (mode === 'ASSIGN') this.assignTable();
      else this.deleteReservation();
    }
  });
}


  handleConfirmationAction(): void {
    if (this.confirmationMode === 'ASSIGN') {
      this.assignTable(); // Tu función original
    } else {
      this.deleteReservation(); // La nueva función
    }
  }

  deleteReservation(): void {
    if (!this.selectedReservation) return;
    
    this.isLoading = true;
    this.confirmationDialog = false; // Cerramos el popup de confirmación

    this.reservationService.cancelReservation(this.selectedReservation.id!)
      .then(() => {
        this.isLoading = false;
        this.successMessage = 'Reserva eliminada correctamente.';
        this.displaySuccessModal = true;
        
        this.loadReservations(); // Recargamos la lista
        this.resetState();       // Limpiamos la selección derecha
      })
      .catch((error) => {
        this.isLoading = false;
        console.error("Error:", error);
        this.errorMessage = 'Error eliminando la reserva.';
        this.displayErrorModal = true;
      });
  }
  closeConfirmationPopUp(): void {
    this.confirmationDialog = false;
  }

  private translateBackendError(err: any): string {
    const errorType = err?.error?.error; // El string que viene del backend
    
    if (errorType === 'Reservation already has a table assigned') {
      const tableId = err.error.current_table_id;
      return `Esta reserva ya está asignada a otra mesa (Mesa #${tableId}).`;
    }

    if (errorType === 'Table is busy') {
      return 'La mesa seleccionada está ocupada en este momento.';
    }
    
    if (errorType === 'La mesa no tiene capacidad suficiente para la reserva') {
       return 'La mesa no tiene capacidad suficiente para la reserva.';
    }
    
    if (errorType === 'Table is already booked for another reservation') {
       return 'Esa mesa ya está reservada para otra reserva.';
    }

    // Error genérico si no coincide ninguno
    return err?.error?.detail || 'No se pudo completar la asignación. Intente de nuevo.';
  }

  // --- AÑADIR ESTA OTRA FUNCIÓN NUEVA ---
  closeErrorModal(): void {
    this.displayErrorModal = false;
  }

  closeSuccessModal(): void {
  this.displaySuccessModal = false;
  this.resetState(); // <-- AÑADE ESTA LÍNEA
  this.close.emit(); 
}

  private resetState(): void {
    this.selectedReservation = null;
    this.selectedTable = null;
    this.availableTables = [];
    this.searchText = '';
  }

  onCloseClick(): void {
    this.resetState(); // <-- Resetea el estado
    this.close.emit(); // <-- Cierra el modal
  }
}
