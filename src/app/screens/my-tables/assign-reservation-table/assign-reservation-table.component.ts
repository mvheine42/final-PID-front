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
  @Input() dateISO!: string;
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();
  @Output() showConfirmation = new EventEmitter<{ message: string; mode: 'ASSIGN' | 'CANCEL';}>();

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  availableTables: any[] = []; 

  selectedTable: number|string|null = null;

  searchText = '';
  confirmationDialog = false;
  displayErrorModal = false;
  errorMessage = '';
  displaySuccessModal = false;
  successMessage = '';
  confirmationMode: 'ASSIGN' | 'CANCEL' = 'ASSIGN'; 
  popupSubtitle: string = '';
  popupSendLabel: string = '';
  private baseUrl = 'http://127.0.0.1:8000';

  // --- LOADING STATES ---
  loadingReservations: boolean = true;
  loadingTables: boolean = false;
  assigningTable: boolean = false;
  deletingReservation: boolean = false;

  constructor(private reservationService: ReservationService, private tableService: TableService, private confirmationService: ConfirmationService) {}

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
      console.error("Error cargando reservas:", error);
      this.reservations = [];
      this.applyFilter();
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
            label: `Mesa #${t.id} – cap: ${t.capacity}`
          }));
          
          if (this.selectedReservation && this.selectedReservation.table_id) {
            this.selectedTable = this.selectedReservation.table_id;
          }
          this.loadingTables = false;
        },
        error: () => {
          this.availableTables = [];
          this.loadingTables = false;
        }
      });
  }

  assignTable(): void {
    if (!this.selectedReservation || !this.selectedTable) return;

    this.assigningTable = true;
    this.confirmationDialog = false;

    this.tableService
      .assignReservationToTable(this.selectedTable, this.selectedReservation.id!)
      .subscribe({
        next: () => {
          this.assigningTable = false;
          this.assigned.emit();
          this.loadReservations();

          this.successMessage = 'Mesa exitosamente reservada.';
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

    const message =
      mode === 'ASSIGN'
        ? `¿Confirmás que querés asignar la mesa #${this.selectedTable} a la reserva de ${this.selectedReservation.customerName}?`
        : `¿Confirmás que deseas cancelar la reserva de ${this.selectedReservation.customerName}?`;

    this.confirmationService.confirm({
      key: 'assign-reservation-confirm',
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
      this.assignTable();
    } else {
      this.deleteReservation();
    }
  }

  deleteReservation(): void {
    if (!this.selectedReservation) return;
    
    this.deletingReservation = true;
    this.confirmationDialog = false;

    this.reservationService.cancelReservation(this.selectedReservation.id!)
      .then(() => {
        this.deletingReservation = false;
        this.successMessage = 'Reserva eliminada correctamente.';
        this.displaySuccessModal = true;
        
        this.loadReservations();
        this.resetState();
      })
      .catch((error) => {
        this.deletingReservation = false;
        console.error("Error:", error);
        this.errorMessage = 'Error eliminando la reserva.';
        this.displayErrorModal = true;
      });
  }

  closeConfirmationPopUp(): void {
    this.confirmationDialog = false;
  }

  private translateBackendError(err: any): string {
    const errorType = err?.error?.error;
    
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

    return err?.error?.detail || 'No se pudo completar la asignación. Intente de nuevo.';
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

  // Helper para saber si está cargando algo
  get isLoading(): boolean {
    return this.loadingReservations || this.loadingTables || this.assigningTable || this.deletingReservation;
  }
}