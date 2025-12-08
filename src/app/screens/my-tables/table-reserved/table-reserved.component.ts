import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Reservation } from 'src/app/models/reservation';
import { Table } from 'src/app/models/table';
import { ReservationService } from 'src/app/services/reservation_service';

@Component({
  selector: 'app-table-reserved',
  templateUrl: './table-reserved.component.html',
  styleUrls: ['./table-reserved.component.css']
})
export class TableReservedComponent implements OnInit, OnChanges{
  @Input() table!: Table;
  @Output() close = new EventEmitter<void>();
  @Output() checkIn = new EventEmitter<Reservation>(); 

  reservation: Reservation | null = null;
  displaySuccessModal = false;
  successMessage = '';

  displayErrorModal = false;
  errorMessage = '';

  displayConfirmDialog = false;
  confirmationMode: 'CANCEL' | 'NO_SHOW' = 'CANCEL';
  confirmationSubtitle = '';

  loadingReservation: boolean = true;
  cancelingReservation: boolean = false;

  constructor(private reservationService: ReservationService) { }

  ngOnInit(): void {
    this.loadReservationDetails();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['table'] && !changes['table'].isFirstChange()) {
      this.reservation = null;
      this.loadReservationDetails();
    }
  }

  async loadReservationDetails(): Promise<void> {
    if (this.table && this.table.current_reservation_id) {
      this.loadingReservation = true;
      try {
        const todayISO = this.getTodayISOString();
        const reservations = await this.reservationService.getReservationsByDay(todayISO);
        this.reservation = reservations.find(r => r.id === this.table.current_reservation_id) || null;
      } catch (e) {
        this.errorMessage = 'Error loading reservation details.';
        this.displayErrorModal = true;
      } finally {
        this.loadingReservation = false;
      }
    }
  }

  isReservationLate(): boolean {
    if (!this.reservation) return false;

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

  confirmCancellation(mode: 'CANCEL' | 'NO_SHOW'): void {
    if (!this.reservation) return;

    this.confirmationMode = mode;

    this.confirmationSubtitle =
      mode === 'NO_SHOW'
        ? `Do you confirm that ${this.reservation.customerName} did 'No Show'?`
        : `Do you confirm you want to cancel the reservation of ${this.reservation.customerName}?`;

    this.displayConfirmDialog = true;
  }

  handleConfirmationAction(): void {
    this.doCancel(this.confirmationMode);
  }

  private doCancel(mode: 'CANCEL' | 'NO_SHOW'): void {
    if (!this.reservation) return;

    this.cancelingReservation = true;
    this.displayConfirmDialog = false;

    this.reservationService.cancelReservation(this.reservation.id!)
      .then(() => {
        this.cancelingReservation = false;

        this.successMessage =
          mode === 'NO_SHOW'
            ? `Reservation of ${this.reservation?.customerName} passed the 15min tolerance.`
            : `Reservation of ${this.reservation?.customerName} cancelled successfully.`;

        this.displaySuccessModal = true;
      })
      .catch(() => {
        this.cancelingReservation = false;
        this.errorMessage = 'Error cancelling reservation.';
        this.displayErrorModal = true;
      });
  }

  onCheckIn(): void {
    if (this.reservation) this.checkIn.emit(this.reservation);
  }

  isTooEarlyToCheckIn(): boolean {
    if (!this.reservation) return true;

    const now = new Date();
    const [hours, minutes] = this.reservation.reservationTime.split(':').map(Number);
    
    const reservationDate = new Date();
    reservationDate.setHours(hours, minutes, 0, 0);

    return now < reservationDate;
  }

  closeDialog() {
    this.close.emit();
  }

  closeConfirmationPopUp(): void {
    this.displayConfirmDialog = false;
  }

  closeSuccessModal(): void {
    this.displaySuccessModal = false;
    this.close.emit();
  }

  closeErrorModal(): void {
    this.displayErrorModal = false;
  }

  get isLoading(): boolean {
    return this.loadingReservation || this.cancelingReservation;
  }
}