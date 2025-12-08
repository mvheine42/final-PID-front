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
  @Input() dateISO!: string;
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  availableTables: any[] = []; 

  selectedTable: number|string|null = null;

  searchText = '';
  displayConfirmDialog = false;
  displayErrorModal = false;
  errorMessage = '';
  displaySuccessModal = false;
  successMessage = '';
  confirmationMode: 'ASSIGN' | 'CANCEL' = 'ASSIGN'; 
  confirmationSubtitle: string = '';
  private baseUrl = 'http://127.0.0.1:8000';

  loadingReservations: boolean = true;
  loadingTables: boolean = false;
  assigningTable: boolean = false;
  deletingReservation: boolean = false;

  constructor(
    private reservationService: ReservationService, 
    private tableService: TableService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  getRowClass(r: Reservation): string {
    if (r.table_id && r.table_id !== '') {
      return 'row-assigned';
    }

    if (this.isLate(r.reservationTime)) {
      return 'row-late';
    }

    if (this.isSoon(r.reservationTime)) {
      return 'row-warning';
    }

    return '';
  }

  private isSoon(timeStr: string): boolean {
    if (!timeStr) return false;

    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const reservationDate = new Date();
    reservationDate.setHours(hours, minutes, 0, 0);

    const diffMs = reservationDate.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes > 0 && diffMinutes <= 60;
  }

  private isLate(timeStr: string): boolean {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const reservationDate = new Date();
    reservationDate.setHours(hours, minutes, 0, 0);

    return now > reservationDate;
  }

  async loadReservations(): Promise<void> {
    this.loadingReservations = true;

    try {
      const res = await this.reservationService.getReservationsByDay(this.dateISO);
      this.reservations = res ?? [];
      this.applyFilter();
    } catch (error) {
      this.reservations = [];
      this.applyFilter();
      this.errorMessage = 'Error loading reservations. Please try again.';
      this.displayErrorModal = true;
    } finally {
      this.loadingReservations = false;
    }
  }

  async selectReservation(r: Reservation): Promise<void> {
    this.selectedReservation = r;
    this.availableTables = [];
    this.selectedTable = r.table_id || null;

    this.loadingTables = true;
    this.tableService.getAvailableTablesForReservation(r.id!)
      .subscribe({
        next: (tables) => {
          this.availableTables = (tables ?? []).map(t => ({
            ...t,
            label: `Table #${t.id} – cap: ${t.capacity}`
          }));
          
          if (this.selectedReservation && this.selectedReservation.table_id) {
            this.selectedTable = this.selectedReservation.table_id;
          }
          this.loadingTables = false;
        },
        error: () => {
          this.availableTables = [];
          this.loadingTables = false;
          this.errorMessage = 'Error loading available tables.';
          this.displayErrorModal = true;
        }
      });
  }

  assignTable(): void {
    if (!this.selectedReservation || !this.selectedTable) return;

    this.assigningTable = true;
    this.displayConfirmDialog = false;

    this.tableService
      .assignReservationToTable(this.selectedTable, this.selectedReservation.id!)
      .subscribe({
        next: () => {
          this.assigningTable = false;
          this.assigned.emit();
          this.loadReservations();

          this.successMessage = 'Table successfully assigned.';
          this.displaySuccessModal = true;
        },
        error: (err) => {
          this.assigningTable = false;
          this.errorMessage = this.translateBackendError(err);
          this.displayErrorModal = true;
        }
      });
  }

  isTooEarlyToAssign(reservationTime: string): boolean {
    if (!this.dateISO || !reservationTime) return true;

    const now = new Date();
    const [year, month, day] = this.dateISO.split('-').map(Number);
    const [hours, minutes] = reservationTime.split(':').map(Number);

    const reservationDate = new Date(year, month - 1, day, hours, minutes);
    const diffMs = reservationDate.getTime() - now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    return diffMs > twoHoursMs;
  }

  applyFilter(): void {
    const q = (this.searchText || '').toLowerCase();

    let tempReservations = this.reservations.filter(r =>
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.reservationTime || '').toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );

    this.filteredReservations = tempReservations.sort((a, b) => {
      const hasTableA = this.hasTable(a);
      const hasTableB = this.hasTable(b);

      if (hasTableA && !hasTableB) return 1;
      if (!hasTableA && hasTableB) return -1;
      
      return a.reservationTime.localeCompare(b.reservationTime);
    });
  }

  private hasTable(r: Reservation): boolean {
    return r.table_id !== null && r.table_id !== undefined && r.table_id !== '' && r.table_id !== 0;
  }

  showConfirmPopUp(mode: 'ASSIGN' | 'CANCEL') {
    if (!this.selectedReservation) return;

    this.confirmationMode = mode;

    this.confirmationSubtitle =
      mode === 'ASSIGN'
        ? `Do you want to assign table #${this.selectedTable} to the reservation of ${this.selectedReservation.customerName}?`
        : `Do you want to cancel the reservation of ${this.selectedReservation.customerName}?`;

    this.displayConfirmDialog = true;
  }

  handleConfirmationAction(): void {
    if (this.confirmationMode === 'ASSIGN') {
      this.assignTable();
    } else {
      this.deleteReservation();
    }
  }

  deleteReservation(): void {
    if (!this.selectedReservation) return;
    
    this.deletingReservation = true;
    this.displayConfirmDialog = false;

    this.reservationService.cancelReservation(this.selectedReservation.id!)
      .then(() => {
        this.deletingReservation = false;
        this.successMessage = 'Reservation successfully deleted.';
        this.displaySuccessModal = true;
        
        this.loadReservations();
        this.resetState();
      })
      .catch((error) => {
        this.deletingReservation = false;
        this.errorMessage = 'Error deleting reservation.';
        this.displayErrorModal = true;
      });
  }

  closeConfirmationPopUp(): void {
    this.displayConfirmDialog = false;
  }

  private translateBackendError(err: any): string {
    const errorType = err?.error?.error;
    
    if (errorType === 'Reservation already has a table assigned') {
      const tableId = err.error.current_table_id;
      return `Reservation already has a table assigned (Table #${tableId}).`;
    }

    if (errorType === 'Table is busy') {
      return 'Table is busy.';
    }
    
    if (errorType === 'La mesa no tiene capacidad suficiente para la reserva') {
       return 'The table does not have enough capacity for the reservation.';
    }
    
    if (errorType === 'Table is already booked for another reservation') {
       return 'That table is already booked for another reservation.';
    }

    return err?.error?.detail || 'An error occurred. Please try again.';
  }

  closeErrorModal(): void {
    this.displayErrorModal = false;
  }

  closeSuccessModal(): void {
    this.displaySuccessModal = false;
    this.resetState();
    this.close.emit(); 
  }

  private resetState(): void {
    this.selectedReservation = null;
    this.selectedTable = null;
    this.availableTables = [];
    this.searchText = '';
  }

  onCloseClick(): void {
    this.resetState();
    this.close.emit();
  }

  get isLoading(): boolean {
    return this.loadingReservations || this.loadingTables || this.assigningTable || this.deletingReservation;
  }
}