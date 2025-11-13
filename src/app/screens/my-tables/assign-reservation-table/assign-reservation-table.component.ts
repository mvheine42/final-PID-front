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
  this.selectedTable = null;
  this.availableTables = [];

  this.tableService.getAvailableTablesForReservation(r.id!)
    .subscribe({
      next: (tables) => {
        this.availableTables = (tables ?? []).map(t => ({
          ...t,
          label: `Mesa #${t.id} — cap: ${t.capacity}`
        }));
      },
      error: () => {
        this.availableTables = [];
      }
    });
}


assignTable(): void {
  if (!this.selectedReservation || !this.selectedTable) return;

  this.isLoading = true;

  this.tableService
    .assignReservationToTable(this.selectedTable, this.selectedReservation.id!)
    .subscribe({
      next: () => {
        this.isLoading = false;
        this.confirmationDialog = false;

        this.assigned.emit();      // refresca mesas en el padre
        this.loadReservations();   // refresca lista
      },
      error: (err) => {
        this.isLoading = false;
        this.confirmationDialog = false;
        alert(err?.error?.detail || 'No se pudo asignar la mesa.');
      }
    });
}


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

}
