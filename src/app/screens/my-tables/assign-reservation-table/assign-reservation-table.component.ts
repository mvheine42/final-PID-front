import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReservationService } from 'src/app/services/reservation_service';
import { TableService } from 'src/app/services/table_service';
import { Reservation } from 'src/app/models/reservation';
import { Table } from 'src/app/models/table';

@Component({
  selector: 'app-assign-reservation-table',
  templateUrl: './assign-reservation-table.component.html',
  styleUrl: './assign-reservation-table.component.css'
})
export class AssignReservationTableComponent implements OnInit {
  @Input() dateISO!: string; // YYYY-MM-DD (lo pasa el padre)
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>(); // para refrescar padre tras asignar

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


  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private reservationService: ReservationService, private tableService: TableService) {}


  ngOnInit(): void {
    this.loadReservations();
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

  showConfirmPopUp(): void {
    this.confirmationDialog = true;
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
