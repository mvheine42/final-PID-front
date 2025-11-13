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
  isLoading: boolean = false;
  productsStock: Map<number, number> = new Map(); 
  confirmationDialog: boolean = false;

  // Lista para almacenar los product_ids deshabilitados
  disabledProductIds: string[] = [];
  user: any | null
  uid: string = '';

  constructor(
    private orderService: OrderService, private userService: UserService, private productService: ProductService) {}

  async ngOnInit() {
    if (this.selectedOrder) {
      this.loadProductStocks();
    }
    const user = this.userService.currentUser;
    if (user) {
      const userData =  (await this.userService.getUserDataFromFirestore(user.uid)).toPromise();
      if (userData) {
        this.user = userData;
        this.uid = user.uid;
        console.log(this.user);
      } else {
        console.error('Error fetching user points data.');
      }
  }}

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
              } else {
                console.error('Valor de stock no válido para el producto:', product);
              }
            } else {
              console.error('La respuesta no contiene stock válido para el producto:', response);
            }
          },
          error: (err) => {
            console.error('Error al obtener el producto:', err);
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
    this.isLoading = true;
    if (this.selectedTable && this.selectedOrder) {
      console.log(`Asignando la mesa ${this.selectedTable.id} a la orden ${this.selectedOrder.id}`);
      this.deleteDisabledItemsAndAssignOrder();
    } else {
      alert('Por favor selecciona una mesa y una orden.');
    }
  }

  
  async deleteDisabledItemsAndAssignOrder() {
    if (this.disabledProductIds.length > 0) {
      
      const selectedOrderId = this.selectedOrder.id ?? '0';
      this.orderService.deleteOrderItems(selectedOrderId.toString(), this.disabledProductIds).subscribe({
        next: async (response) => {
         console.log(response);
          await this.updateProductsStock(); 
          await this.createOrder(this.selectedOrder.id ?? 0, Number(this.selectedTable.id ?? 0)
);
        },
        error: (error) => {
          console.error('Error al eliminar productos deshabilitados:', error);
        }
      });
    } else {
      await this.updateProductsStock();
      this.createOrder(this.selectedOrder.id ?? 0, Number(this.selectedTable.id ?? 0)
);
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
  
      const responses = await Promise.all(updatePromises);
      console.log('All updates successful', responses);
    } catch (error) {
      console.error('One or more updates failed', error);
    }
  }
  

  // Función para crear la orden
  async createOrder(orderId: number, tableId: number) {
    this.orderService.assignEmployeeToOrder(orderId, this.uid).subscribe(
      (response) => {
          this.orderService.assignOrderToTable(orderId, tableId).subscribe({
            next: async (response) => {
              this.isLoading = false;
              this.close.emit();
            },
            error: (error) => {
              console.error('Error al asignar la orden:', error);
              this.isLoading = false;
              this.close.emit();
            }
          });
      },
      (error) => {
          console.error('Error assigning employee:', error);
      });
  }

  showConfirmPopUp(){
    this.confirmationDialog = true;
  }

  closeConfirmationPopUp(){
    this.confirmationDialog = false;
  }
}
