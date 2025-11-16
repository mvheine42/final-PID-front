import { Component, OnInit } from '@angular/core';
import { EventEmitter, Input, Output } from '@angular/core';
import { Table } from 'src/app/models/table';

@Component({
  selector: 'app-table-reserved',
  templateUrl: './table-reserved.component.html',
  styleUrl: './table-reserved.component.css'
})
export class TableReservedComponent implements OnInit {
  @Input() table!: Table;
  @Output() close = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
    // En el futuro, aquí podrías cargar los detalles
    // de la reserva usando this.table.current_reservation_id
  }

  closeDialog() {
    this.close.emit();
  }
}
