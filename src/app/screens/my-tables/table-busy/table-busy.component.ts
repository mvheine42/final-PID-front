import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Category } from 'src/app/models/category';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { Product } from 'src/app/models/product';
import { Table } from 'src/app/models/table';
import { CategoryService } from 'src/app/services/category_service';
import { OrderService } from 'src/app/services/order_service';
import { ProductService } from 'src/app/services/product_service';
import { TableService } from 'src/app/services/table_service';
import { UserService } from 'src/app/services/user_service';
import { firstValueFrom } from 'rxjs';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-table-busy',
  templateUrl: './table-busy.component.html',
  styleUrls: ['./table-busy.component.css']
})
export class TableBusyComponent implements OnInit, OnDestroy{
  @Input() table: Table = new Table('',1);
  @Output() close = new EventEmitter<void>();
  actualOrder?: Order; 
  initialOI: OrderItem[] = [];
  orderItems: OrderItem[] = [];
  products : Product[] = [];
  currentDate: string = '';
  currentTime: string = '';
  employee: string = '';
  order: Order = new Order('', 0, '', '', '', [],1, '') ;
  selectedProduct: Product | null = null;
  selectedAmount: number = 1;
  canAddProduct: boolean = false;
  wantToAddNewProduct: boolean = false;
  displayConfirmDialog = false;
  loading: boolean = false;
  displayCloseTableDialog = false;
  amountOfPeople: number = 0;
  categories: Category[] = [];
  selectedCategories: Array<{ id: any, name: string }> = [];
  filteredProducts: Product[] = []; 
  user: any | null;
  newOrderItems: OrderItem[] = [];
  private timeInterval: Subscription | undefined;
  now: Date = new Date();

  constructor(private productService: ProductService,  private orderService: OrderService, private tableService: TableService, private categoryService: CategoryService, private userService: UserService) {}
  async ngOnInit() {
    this.loadProducts();
    this.getOrderInformation();
    this.orderItems = this.actualOrder?.orderItems ?? [];
    this.currentDate = this.actualOrder?.date ?? '';
    this.currentTime = this.actualOrder?.time ?? '';
    this.order = this.actualOrder ?? new Order('', 0, '', '', '', [],1, '');
    this.loadCategories();
    this.timeInterval = interval(60000).subscribe(() => {
      this.now = new Date();
    });
}

ngOnDestroy() {
    if (this.timeInterval) {
      this.timeInterval.unsubscribe();
    }
  }

  getWaitTime(createdAt: string): number {
    if (!createdAt) return 0;
    const start = new Date(createdAt).getTime();
    const current = this.now.getTime();
    return Math.floor((current - start) / 60000); // Devuelve minutos
  }

  // Calcula cuánto tardó en servirse (para items finalizados)
  getServedDuration(createdAt: string, servedAt: string): number {
    if (!createdAt || !servedAt) return 0;
    const start = new Date(createdAt).getTime();
    const end = new Date(servedAt).getTime();
    return Math.floor((end - start) / 60000);
  }
  
  // Define si el tiempo es crítico (ej: más de 20 min)
  isCriticalDelay(createdAt: string): boolean {
    return this.getWaitTime(createdAt) > 20; // Umbral de 20 minutos
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.categories)) {
          this.categories = data.categories.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type
          }));
        }
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
      }
    });
  }

    
  filterProductsByCategory() {
    if (this.selectedCategories.length === 0) {
      this.filteredProducts = [];
    } else {
      const categoryIds = this.selectedCategories.map((category: { id: any; }) => category.id).join(', ');
      this.getProductsByCategory(categoryIds);
    }
  }

  async getOrderInformation() {
    console.log(this.table);
    if (this.table.order_id) {
      this.orderService.getOrderById(this.table.order_id.toString()).subscribe({
        next: async (order) => {
          this.actualOrder = order;
          this.orderItems = this.actualOrder?.orderItems ?? [];
          this.initialOI = JSON.parse(JSON.stringify(order.orderItems));
          this.currentDate = this.actualOrder?.date ?? '';
          this.currentTime = this.actualOrder?.time ?? '';
          this.amountOfPeople = this.actualOrder.amountOfPeople ?? 0;
          if (this.actualOrder.employee) {
            try {
              const userData = await firstValueFrom(await this.userService.getUserDataFromFirestore(this.actualOrder.employee));
              this.employee = userData?.name ?? 'Unknown Employee';
              console.log('Employee Name:', this.employee);
            } catch (err) {
              console.error('Error fetching employee data:', err);
            }
          }
        },
        error: (err) => {
          console.error('Error fetching order information:', err);
        }
      });
    }
  }
  
  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        console.log('Products fetched:', data);
        if (data && Array.isArray(data.products)) {
          this.products = data.products;
        } else {
          console.error('Unexpected data format:', data);
        }
      },
      error: (err) => {
        console.error('Error fetching products:', err);
      }
      
    });
  }


  validateForm() {
    this.canAddProduct = !!this.selectedProduct && this.selectedAmount > 0;
  }

  addNewProducts() {
    this.wantToAddNewProduct = true;
  }

  addOrderItem() {
    console.log(this.selectedProduct);
    console.log(this.selectedAmount);
    if (this.selectedProduct && this.selectedAmount > 0) {
      const newItem: OrderItem = {
        product_id: this.selectedProduct.id ?? 0,
        amount: this.selectedAmount,
        product_name: this.selectedProduct.name,
        product_price: this.selectedProduct.price
      };
      this.orderItems.push(newItem);
      this.newOrderItems.push(newItem);
      this.resetForm();
    }
  }
  
  getProductById(productId: number | undefined): Product | undefined {
    if (productId === undefined) {
      return undefined; 
    }
    return this.products.find(product => (product.id) === productId);
  }
  

  removeOrderItem(item: OrderItem) {
    const index = this.orderItems.indexOf(item);
    if (index > -1) {
      this.orderItems.splice(index, 1);
    }
  }

  resetForm() {
    this.selectedProduct = null;
    this.selectedAmount = 1;
    this.canAddProduct = false;
  }

  calculateTotal() {
    return this.orderItems.reduce((total, item) => {
      const price = parseFloat(item.product_price);
      
      return total + (item.amount * price);
    }, 0);
  }

  //UPDATE
async updateOrder() {
  this.loading = true;
  const total = this.calculateTotal().toString();

  // Si no se agregaron productos nuevos, no hace falta ir al backend
  if (this.newOrderItems.length === 0) {
    this.loading = false;
    this.closeDialog();
    return;
  }

  if (this.table.order_id) {
    try {
      // ⬇⬇⬇ ENVIAMOS SOLO LOS NUEVOS ÍTEMS ⬇⬇⬇
      const success = await this.orderService.addOrderItems(
        this.table.order_id.toString(),
        this.newOrderItems,
        total
      );

      if (success) {
        await this.updateProductsStock();
        console.log('Order items added and stock updated successfully');

        // Ya se guardaron, vaciamos el buffer de nuevos ítems
        this.newOrderItems = [];
      } else {
        console.error('Error adding order items.');
      }
    } catch (error) {
      console.error('Error adding order items:', error);
    } finally {
      this.loading = false;
      this.closeDialog();
    }
  } else {
    console.error('Order ID is undefined.');
    this.loading = false;
  }
}

  

async closeAndUpdateOrder() {
  this.loading = true;
  const total = this.calculateTotal().toString();

  if (!this.table.order_id) {
    console.error('Order ID is undefined.');
    this.loading = false;
    return;
  }

  try {
    // 1) Si hay productos nuevos, primero los agregamos
    if (this.newOrderItems.length > 0) {
      const success = await this.orderService.addOrderItems(
        this.table.order_id.toString(),
        this.newOrderItems,
        total
      );

      if (!success) {
        console.error('Error adding order items.');
        this.loading = false;
        return;
      }

      await this.updateProductsStock();
      this.newOrderItems = [];
    }

    // 2) Finalizar la orden
    await this.orderService.finalizeOrder(this.table.order_id.toString()).toPromise();
    console.log('Order status updated to FINALIZED');

    this.userService.checkUserLevel(this.actualOrder?.employee ?? '').subscribe({
      next: (response) => {
        console.log('User level checked successfully:', response);
      },
      error: (error) => {
        console.error('Error checking user level:', error);
      }
    });

    // 3) Cerrar la mesa
    await this.tableService.closeTable(this.table).toPromise();
    console.log('Table closed successfully');

    // 4) Cerrar diálogo
    this.closeDialog();

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    this.loading = false;
  }
}

  

  closeDialog() {
    this.wantToAddNewProduct = false;
    this.displayConfirmDialog = false;
    location.reload();
    this.close.emit();  
  }

  showConfirmDialog() {
  
    if (this.areOrderItemsEqual(this.initialOI, this.orderItems)) {
      this.closeDialog();
    } else {
      this.displayConfirmDialog = true;
    }
  }
  
  areOrderItemsEqual(items1: OrderItem[] = [], items2: OrderItem[] = []): boolean {
    if (items1.length !== items2.length) {
      return false;
    }
  
    return items1.every((item, index) => 
      item.product_id === items2[index].product_id && item.amount === items2[index].amount
    );
  }

  getProductsByCategory(categoryIds: string) {
    this.categoryService.getProductsByCategory(categoryIds)
      .then((data) => {
        if (data && Array.isArray(data)) {
          this.filteredProducts = data.map(product => ({
            ...product,
            disabled: product.stock === '0'  // Si stock es '0', deshabilitar
          }));
        } else {
          console.error('Unexpected data format:', data);
          this.filteredProducts = [];
        }
      })
      .catch((err) => {
        console.error('Error fetching products by category:', err);
        this.filteredProducts = []; 
      });
  }
  
  onProductChange(event: any) {
    const selectedProduct = event.value;
    
    // Verifica si el producto seleccionado está deshabilitado
    if (selectedProduct?.disabled) {
      // Si está deshabilitado, cancela la selección
      this.selectedProduct = null;
    }
  }

  validateAmount() {
    const maxStock = Number(this.selectedProduct?.stock) || 1;
    const enteredAmount = Number(this.selectedAmount);
  
    // Asegura que no se pueda poner más del stock disponible ni menos de 1
    if (enteredAmount > maxStock) {
      this.selectedAmount = maxStock;
    } else if (enteredAmount < 1) {
      this.selectedAmount = 1;
    } else {
      this.selectedAmount = enteredAmount;
    }
  }
  

  showCloseTableDialog() {
    this.displayCloseTableDialog = true;
  }

  closeCloseTableDialog() {
    this.displayCloseTableDialog = false;
  }

  async updateProductsStock() {
    try {
      const updatePromises = this.newOrderItems.map(orderItem => 
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

  onServeItem(item: OrderItem) {
    // CAMBIO CLAVE: Usamos this.table.order_id en vez de this.actualOrder.id
    if (!this.table.order_id || !item.item_id) {
        console.error('Falta ID de orden o de ítem', { orderId: this.table.order_id, itemId: item.item_id });
        return;
    }

    this.orderService.serveOrderItem(this.table.order_id.toString(), item.item_id).subscribe({
      next: () => {
        item.served_at = new Date().toISOString();
      },
      error: (err) => console.error('Error al servir:', err)
    });
  }

  get allItemsServed(): boolean {
    // Si no hay items, asumimos que se puede cerrar (o ajustar según tu lógica)
    if (!this.orderItems || this.orderItems.length === 0) return true;
    
    // Devuelve TRUE solo si TODOS tienen 'served_at'
    return this.orderItems.every(item => !!item.served_at);
  }

}
 