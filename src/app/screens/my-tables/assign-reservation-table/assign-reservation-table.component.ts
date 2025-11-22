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
    // 1. Si ya tiene mesa asignada -> Verde
    if (r.table_id && r.table_id !== '') {
      return 'row-assigned';
    }

    // 2. Si NO tiene mesa, verificamos si se pasó la hora -> Rojo
    if (this.isLate(r.reservationTime)) {
      return 'row-late';
    }

    // 3. Si no, normal -> Blanco
    return '';
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
// --- FIN DE LA FUNCIÓN ---


  // === UI ===
  applyFilter(): void {
    const q = (this.searchText || '').toLowerCase();
    this.filteredReservations = this.reservations.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      r.reservationTime.toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
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
