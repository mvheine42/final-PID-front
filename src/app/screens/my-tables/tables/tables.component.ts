import { TableService } from 'src/app/services/table_service';
import { Component, OnInit } from '@angular/core';
import { Table } from 'src/app/models/table';
import { OrderService } from 'src/app/services/order_service';
import { Order } from 'src/app/models/order';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {

  public tableScrollHeight: string = '';
  tables: Table[] = [];
  displayModal: boolean = false;
  selectedTable: Table = new Table('',1);
  selectedComponent: string = '';
  inactiveOrdersCount: number = 0; 
  inactiveOrders: Order[] = [];
  freeTables: Table[] = [];
  displayModalInactive: boolean =  false;
  displayReservationsModal = false;
  todayReservationsCount = 0;
  todayISO = new Date().toISOString().split('T')[0];

  constructor(private tableService: TableService, private orderService: OrderService) {}

  ngOnInit(): void {
    this.todayISO = new Date().toISOString().split('T')[0];
    this.loadTables();
    this.loadOrders();
    this.setScrollHeight();
    window.addEventListener('resize', () => {
      this.setScrollHeight();
    });

  }

  setScrollHeight() {
    if (window.innerWidth <= 768) {
      this.tableScrollHeight = '800px';
    } else {
      this.tableScrollHeight = '400px';
    }
  }

  onTableClick(table: any) {
    this.selectedTable = table;
    if (table.status === 'FREE') {
      this.selectedComponent = 'FREE';
      this.displayModal = true;
    } else if (table.status === 'BUSY') {
      this.selectedComponent = 'BUSY';
      this.displayModal = true;
    } else if (table.status === 'FINISHED') {
      this.selectedComponent = 'FINISHED';
      this.displayModal = true;
    } else {
      console.log('Table is not available.');
    }
  }

  onNotificationClick(): void {
    this.displayModalInactive = true; 
  }

  closeModal() {
    this.displayModal = false;
    location.reload();
  }

  closeModalInactive(){
    this.displayModalInactive = false;
    location.reload();
  }

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.tables = data; 
          this.sortTables();
          this.freeTables = this.tables.filter(table => table.status === 'FREE');
        } else {
          console.error('Unexpected data format:', data);
        }
      },
      error: (err) => {
        console.error('Error fetching tables:', err);
      }
    });
  }

sortTables() {
  this.tables.sort((a, b) => {
    const idA = Number(a.id ?? Number.MAX_SAFE_INTEGER);
    const idB = Number(b.id ?? Number.MAX_SAFE_INTEGER);
    return idA - idB;
  });
}

  loadOrders(): void {
    this.orderService.getInactiveOrders().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.inactiveOrders = data.filter(order => order.status === 'INACTIVE');
          this.countInactiveOrders();
        } else {
          console.error('Unexpected data format:', data);
        }
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
      }
    });
  }

  countInactiveOrders() {
    this.inactiveOrdersCount = this.inactiveOrders.length;
  }
  
onReservationNotificationClick() {
  this.displayReservationsModal = true;
}
onReservationAssigned(): void {
  this.loadTables(); // refrescás las mesas cuando asignaste una reserva
}

}
