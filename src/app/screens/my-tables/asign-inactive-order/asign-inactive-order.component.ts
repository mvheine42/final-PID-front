import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderService } from 'src/app/services/order_service';
import { Table } from 'src/app/models/table';
import { ProductService } from 'src/app/services/product_service';
import { Product } from 'src/app/models/product';
import { UserService } from 'src/app/services/user_service';

@Component({
  selector: 'app-asign-inactive-order',
  templateUrl: './asign-inactive-order.component.html',
  styleUrls: ['./asign-inactive-order.component.css']
})
export class AsignInactiveOrderComponent implements OnInit {
  @Input() orders: any[] = []; 
  @Input() freeTables: any[] = [];
  @Output() close = new EventEmitter<void>();
  order!: Order;
  searchId: string = '';
  selectedOrder!: Order; 
  selectedTable!: Table;
  productsStock: Map<number, number> = new Map(); 
  confirmationDialog: boolean = false;

  disabledProductIds: string[] = [];
  user: any | null
  uid: string = '';

  loadingUser: boolean = true;
  loadingStocks: boolean = false;
  assigningTable: boolean = false;

  constructor(
    private orderService: OrderService, 
    private userService: UserService, 
    private productService: ProductService) {}

  async ngOnInit() {
    this.loadingUser = true;
    
    if (this.selectedOrder) {
      this.loadProductStocks();
    }
    
    const user = this.userService.currentUser;
    if (user) {
      const userData = (await this.userService.getUserData(user.uid))
      if (userData) {
        this.user = userData;
        this.uid = user.uid;
      }
    }
    this.loadingUser = false;
  }

  get filteredOrders() {
    return this.orders.filter(order => order.id.includes(this.searchId));
  }

  selectOrder(order: any) {
    this.selectedOrder = order;
    this.freeTables = this.freeTables.filter(table => table.capacity >= order.amountOfPeople);
    this.loadProductStocks();
  }

  loadProductStocks(): void {
    if (this.selectedOrder) {
      this.loadingStocks = true;
      let loadedCount = 0;
      const totalItems = this.selectedOrder.orderItems.length;

      this.selectedOrder.orderItems.forEach(item => {
        const productId = item.product_id.toString();
        this.productService.getProductById(productId).subscribe({
          next: (response: any) => {
            const product = response.product;
  
            if (product && product.stock !== undefined) {
              const stock = Number(product.stock);
              if (!isNaN(stock)) {
                this.productsStock.set(item.product_id, stock);
                this.checkProductAvailability(item, product);
              }
            }

            loadedCount++;
            if (loadedCount === totalItems) {
              this.loadingStocks = false;
            }
          },
          error: (err) => {
            loadedCount++;
            if (loadedCount === totalItems) {
              this.loadingStocks = false;
            }
          }
        });
      });
    }
  }

  checkProductAvailability(item: any, product: Product): void {
    if (product.stock >= item.amount) {
      item.disabled = false;
    } else {
      item.disabled = true;
      this.disabledProductIds.push(item.product_id);
    }
  }

  assignTable() {
    this.assigningTable = true;
    if (this.selectedTable && this.selectedOrder) {
      this.deleteDisabledItemsAndAssignOrder();
    } else {
      this.assigningTable = false;
    }
  }

  async deleteDisabledItemsAndAssignOrder() {
    if (this.disabledProductIds.length > 0) {
      const selectedOrderId = this.selectedOrder.id ?? '0';
      this.orderService.deleteOrderItems(selectedOrderId.toString(), this.disabledProductIds).subscribe({
        next: async (response) => {
          await this.updateProductsStock(); 
          await this.createOrder(this.selectedOrder.id ?? 0, Number(this.selectedTable.id ?? 0));
        },
        error: (error) => {
          this.assigningTable = false;
        }
      });
    } else {
      await this.updateProductsStock();
      this.createOrder(this.selectedOrder.id ?? 0, Number(this.selectedTable.id ?? 0));
    }
  }

  async updateProductsStock() {
    try {
      const availableItems = this.selectedOrder.orderItems.filter(
        orderItem => !this.disabledProductIds.includes(orderItem.product_id.toString())
      );
      const updatePromises = availableItems.map(orderItem => 
        this.productService.updateLowerStock(
          orderItem.product_id?.toString() ?? '',
          orderItem.amount.toString()
        )
      );
      await Promise.all(updatePromises);
    } catch (error) {
    }
  }

  async createOrder(orderId: number, tableId: number) {
    this.orderService.assignEmployeeToOrder(orderId).subscribe(
      (response) => {
        this.orderService.assignOrderToTable(orderId, tableId).subscribe({
          next: (response) => {
            this.assigningTable = false;
            this.close.emit();
          },
          error: (error) => {
            this.assigningTable = false;
          }
        });
      },
      (error) => {
        this.assigningTable = false;
      }
    );
  }

  showConfirmPopUp(){
    this.confirmationDialog = true;
  }

  closeConfirmationPopUp(){
    this.confirmationDialog = false;
  }

  get isLoading(): boolean {
    return this.loadingUser || this.loadingStocks || this.assigningTable;
  }
}