import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Reservation } from 'src/app/models/reservation';
import { Table } from 'src/app/models/table';
import { ReservationService } from 'src/app/services/reservation_service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-table-reserved',
  templateUrl: './table-reserved.component.html',
  styleUrls: ['./table-reserved.component.css']
})
export class TableReservedComponent implements OnInit {
  @Input() table!: Table;
  @Output() close = new EventEmitter<void>();
  @Output() checkIn = new EventEmitter<Reservation>(); 
  
  // 1. DEFINIMOS LA SALIDA HACIA EL PADRE
  @Output() showConfirmation = new EventEmitter<{ message: string, mode: 'CANCEL' | 'NO_SHOW', reservation: Reservation }>();

  reservation: Reservation | null = null;
  isLoading = false;
  displaySuccessModal = false;
  successMessage = '';

  displayErrorModal = false;
  errorMessage = '';  
  constructor(private reservationService: ReservationService, private confirmationService: ConfirmationService) { }

  ngOnInit(): void {
    this.loadReservationDetails();
  }

  async loadReservationDetails(): Promise<void> {
    if (this.table && this.table.current_reservation_id) {
      this.isLoading = true;
      try {
        const todayISO = this.getTodayISOString();
        const reservations = await this.reservationService.getReservationsByDay(todayISO);
        this.reservation = reservations.find(r => r.id === this.table.current_reservation_id) || null;
      } catch (e) {
        console.error("Error cargando detalles:", e);
      } finally {
        this.isLoading = false;
      }
    }
  }

  isReservationLate(): boolean {
    if (!this.reservation) return false;
    
    // --- HACK DE TESTEO (Descomentar para probar "No Show" ahora) ---
    // return true; 
    // ---------------------------------------------------------------

    const reservationTimeStr = this.reservation.reservationTime; 
    const today = new Date();
    const [resHour, resMin] = reservationTimeStr.split(':').map(Number);
    
    const reservationDateTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      resHour,
      resMin,
      0 
    );

    const lateThreshold = 15 * 60 * 1000;
    const lateTime = reservationDateTime.getTime() + lateThreshold;
    
    return today.getTime() > lateTime;
  }

  private getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. ESTA FUNCIÓN SOLO EMITE EL EVENTO
confirmCancellation(mode: 'CANCEL' | 'NO_SHOW'): void {
  if (!this.reservation) return;

  const message =
    mode === 'NO_SHOW'
      ? `¿Confirmás que ${this.reservation.customerName} hizo 'No Show'?`
      : `¿Confirmás que deseas cancelar la reserva de ${this.reservation.customerName}?`;

  this.confirmationService.confirm({
    key: 'table-reserved-confirm',   // 👈 clave distinta
    message,
    header: 'Confirmar Gestión',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: mode === 'NO_SHOW' ? 'Marcar No Show' : 'Cancelar reserva',
    rejectLabel: 'Volver',
    acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary',
    accept: () => this.doCancel(mode)
  });
}


private doCancel(mode: 'CANCEL' | 'NO_SHOW'): void {
  if (!this.reservation) return;

  this.isLoading = true;

  this.reservationService.cancelReservation(this.reservation.id!)
    .then(() => {
      this.isLoading = false;

      this.successMessage =
        mode === 'NO_SHOW'
          ? `Reserva de ${this.reservation?.customerName} marcada como No Show.`
          : `Reserva de ${this.reservation?.customerName} cancelada correctamente.`;

      this.displaySuccessModal = true;
    })
    .catch(() => {
      this.isLoading = false;
      this.errorMessage = 'No se pudo procesar la reserva. Intentalo de nuevo.';
      this.displayErrorModal = true;
    });
}


  onCheckIn(): void {
    if (this.reservation) this.checkIn.emit(this.reservation);
  }

  closeDialog() {
    this.close.emit();
  }


closeSuccessModal(): void {
  this.displaySuccessModal = false;
  this.close.emit(); // si querés cerrar el diálogo de la mesa
}

closeErrorModal(): void {
  this.displayErrorModal = false;
}
}

