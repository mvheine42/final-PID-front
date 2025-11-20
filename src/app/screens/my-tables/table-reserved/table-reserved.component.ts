import { Component, OnInit } from '@angular/core';
import { EventEmitter, Input, Output } from '@angular/core';
import { Table } from 'src/app/models/table';
import { Reservation } from 'src/app/models/reservation';
import { ReservationService } from 'src/app/services/reservation_service';

@Component({
  selector: 'app-table-reserved',
  templateUrl: './table-reserved.component.html',
  styleUrl: './table-reserved.component.css'
})
export class TableReservedComponent implements OnInit {
  @Input() table!: Table;
  @Output() close = new EventEmitter<void>();
  @Output() checkIn = new EventEmitter<Reservation>(); 

  reservation: Reservation | null = null;
  isLoading = false;
  
  constructor(private reservationService: ReservationService) { }


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
        console.error("Error cargando detalles de reserva:", e);
      } finally {
        this.isLoading = false;
      }
    }
  }

  private getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCheckIn(): void {
    if (this.reservation) {
      this.checkIn.emit(this.reservation);
    }
  }

  closeDialog() {
    this.close.emit();
  }
}
