import { Component, OnInit } from '@angular/core';
import { Product } from 'src/app/models/product';
import { ProductService } from 'src/app/services/product_service';
import { Order } from 'src/app/models/order';
import { OrderService } from 'src/app/services/order_service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  
  products: Product[] = [];
  orders: Order[] = [];
  nroTableOptions: number[] = [];
  statusOptions: string[] = [];
  selectedNroTable: number[] = [];
  selectedStatus: string[] = [];
  selectedDate: Date = new Date();
  filteredOrders: Order[] = [];
  infoDialogVisible = false;
  selectedOrder!: Order;

  loading: boolean = true;
  loadingOrders: boolean = true;
  loadingProducts: boolean = true;

  public tableScrollHeight: string='';

  constructor(private productService: ProductService, private orderService: OrderService) {
    this.filteredOrders = this.orders; 
    this.nroTableOptions = [...new Set(this.orders.map(order => order.tableNumber))];
    this.statusOptions = [...new Set(this.orders.map(order => order.status))];
    
  }

  ngOnInit(): void {
    this.loading = true;
    this.loadingOrders = true;
    this.loadingProducts = true;

    this.loadOrders();
    this.loadProducts();
    this.setScrollHeight();
    
    window.addEventListener('resize', () => {
      this.setScrollHeight();
    }) 
  }

  setScrollHeight() {
    if (window.innerWidth <= 768) {
      this.tableScrollHeight = '800px';
    } else { 
      this.tableScrollHeight = '400px';
    }
  }

  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        if (data && data.message && Array.isArray(data.products)) {
          this.products = data.products;
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loadingProducts = false;
        this.checkIfLoadingComplete();
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loadingProducts = false;
        this.checkIfLoadingComplete();
      }
    });
  }

  loadOrders(): void {
    this.loadingOrders = true;
    this.orderService.getOrders().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.orders = data;
          this.filterOrdersByDate();
          this.nroTableOptions = [...new Set(this.orders.map(order => order.tableNumber))];
          this.statusOptions = [...new Set(this.orders.map(order => order.status))];
        } else {
        }
        this.loadingOrders = false;
        this.checkIfLoadingComplete();
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.loadingOrders = false;
        this.checkIfLoadingComplete();
      }
    });
  }

  checkIfLoadingComplete(): void {
    if (!this.loadingOrders && !this.loadingProducts) {
      this.loading = false;
    }
  }
  

  getSeverity(status: string) {
    if (status === 'IN PROGRESS') return 'success';
    if (status === 'PROBLEM') return 'danger';
    if (status === 'FINALIZED') return undefined;
    return 'info';
  }

  filterOrdersByDate(): void {
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const formattedSelectedDate = `${year}-${month}-${day}`;
    this.filteredOrders = this.orders.filter(order => order.date === formattedSelectedDate);
  }

  displayInfoDialog(order: Order): void {
    this.selectedOrder = order;
    this.infoDialogVisible = true;
  }
  

}