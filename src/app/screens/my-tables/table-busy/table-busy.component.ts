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
  @Output() tableUpdated = new EventEmitter<void>();
  
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
  displayCloseTableDialog = false;
  amountOfPeople: number = 0;
  categories: Category[] = [];
  selectedCategories: Array<{ id: any, name: string }> = [];
  filteredProducts: Product[] = []; 
  user: any | null;
  newOrderItems: OrderItem[] = [];
  private timeInterval: Subscription | undefined;
  now: Date = new Date();

  loadingProducts: boolean = false;
  loadingCategories: boolean = false;
  loadingOrder: boolean = true;
  savingOrder: boolean = false;
  closingTable: boolean = false;
  servingItems: Set<string> = new Set();

  constructor(
    private productService: ProductService,  
    private orderService: OrderService, 
    private tableService: TableService, 
    private categoryService: CategoryService, 
    private userService: UserService
  ) {}
  
  async ngOnInit() {
    this.loadingOrder = true;

    this.loadProducts();
    await this.getOrderInformation();
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
    return Math.max(0, Math.floor((current - start) / 60000));
  }

  getServedDuration(createdAt: string, servedAt: string): number {
    if (!createdAt || !servedAt) return 0;
    const start = new Date(createdAt).getTime();
    const end = new Date(servedAt).getTime();
    return Math.floor((end - start) / 60000);
  }
  
  isCriticalDelay(createdAt: string): boolean {
    return this.getWaitTime(createdAt) > 20;
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.categories)) {
          this.categories = data.categories.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type
          }));
        }
        this.loadingCategories = false;
      },
      error: (err) => {
        this.loadingCategories = false;
      }
    });
  }

  filterProductsByCategory() {
    if (this.selectedCategories.length === 0) {
      this.filteredProducts = [];
      this.loadingProducts = false;
    } else {
      this.loadingProducts = true;
      const categoryIds = this.selectedCategories.map((category: { id: any; }) => category.id).join(', ');
      this.getProductsByCategory(categoryIds);
    }
  }

  async getOrderInformation() {
    this.loadingOrder = true;

    if (this.table.order_id) {
      this.orderService.getOrderById(this.table.order_id.toString()).subscribe({
        next: async (order) => {
          this.actualOrder = order;

          this.orderItems = order.orderItems ?? [];
          this.initialOI = JSON.parse(JSON.stringify(order.orderItems));
          this.currentDate = order.date ?? '';
          this.currentTime = order.time ?? '';
          this.amountOfPeople = order.amountOfPeople ?? 0;

          this.employee = order.employee_name ?? 'Unknown Employee';

          this.loadingOrder = false;
        },
        error: (err) => {
          this.loadingOrder = false;
        }
      });
    }
  }
  
  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.products)) {
          this.products = data.products;
        }
        this.loadingProducts = false;
      },
      error: (err) => {
        this.loadingProducts = false;
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

  async updateOrder() {
    this.savingOrder = true;
    const total = this.calculateTotal().toString();

    if (this.newOrderItems.length === 0) {
      this.savingOrder = false;
      this.closeDialog();
      return;
    }

    if (this.table.order_id) {
      try {
        const success = await this.orderService.addOrderItems(
          this.table.order_id.toString(),
          this.newOrderItems,
          total
        );

        if (success) {
          await this.updateProductsStock();
          
          // ✅ CRITICAL: Reload order from backend to get fresh item_id and created_at
          await this.getOrderInformation();
          
          this.newOrderItems = [];
        }
      } catch (error) {
      } finally {
        this.savingOrder = false;
        this.closeDialog();
      }
    } else {
      this.savingOrder = false;
    }
  }

  async closeAndUpdateOrder() {
    this.closingTable = true;
    const total = this.calculateTotal().toString();

    if (!this.table.order_id) {
      this.closingTable = false;
      return;
    }

    try {
      if (this.newOrderItems.length > 0) {
        const success = await this.orderService.addOrderItems(
          this.table.order_id.toString(),
          this.newOrderItems,
          total
        );

        if (!success) {
          this.closingTable = false;
          return;
        }

        await this.updateProductsStock();
        
        // ✅ Reload order to get fresh data
        await this.getOrderInformation();
        
        this.newOrderItems = [];
      }

      await this.orderService.finalizeOrder(this.table.order_id.toString()).toPromise();

      this.userService.checkUserLevel(this.actualOrder?.employee ?? '').subscribe({
        next: (response) => {},
        error: (error) => {}
      });

      await this.tableService.closeTable(this.table).toPromise();

      this.closeDialog();

    } catch (error) {
    } finally {
      this.closingTable = false;
    }
  }

  closeDialog() {
    this.wantToAddNewProduct = false;
    this.displayConfirmDialog = false;
    this.tableUpdated.emit();
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
    this.loadingProducts = true;
    this.categoryService.getProductsByCategory(categoryIds)
      .then((data) => {
        if (data && Array.isArray(data)) {
          this.filteredProducts = data.map(product => ({
            ...product,
            disabled: product.stock === '0'
          }));
        } else {
          this.filteredProducts = [];
        }
        this.loadingProducts = false;
      })
      .catch((err) => {
        this.filteredProducts = [];
        this.loadingProducts = false;
      });
  }
  
  onProductChange(event: any) {
    const selectedProduct = event.value;
    if (selectedProduct?.disabled) {
      this.selectedProduct = null;
    }
  }

  validateAmount() {
    const maxStock = Number(this.selectedProduct?.stock) || 1;
    const enteredAmount = Number(this.selectedAmount);
  
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
    } catch (error) {
    }
  }

  onServeItem(item: OrderItem) {
    if (!this.table.order_id || !item.item_id) {
        return;
    }

    this.servingItems.add(item.item_id);

    this.orderService.serveOrderItem(this.table.order_id.toString(), item.item_id).subscribe({
      next: () => {
        item.served_at = new Date().toISOString();
        this.servingItems.delete(item.item_id!);
      },
      error: (err) => {
        this.servingItems.delete(item.item_id!);
      }
    });
  }

  isServingItem(itemId: string | undefined): boolean {
    return itemId !== undefined ? this.servingItems.has(itemId) : false;
  }

  get allItemsServed(): boolean {
    if (!this.orderItems || this.orderItems.length === 0) return true;
    return this.orderItems.every(item => !!item.served_at);
  }
}