import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { Product } from 'src/app/models/product';
import { Table } from 'src/app/models/table';
import { OrderService } from 'src/app/services/order_service';
import { ProductService } from 'src/app/services/product_service';
import { TableService } from 'src/app/services/table_service';
import { CategoryService } from 'src/app/services/category_service';
import { Category } from 'src/app/models/category';
import { UserService } from 'src/app/services/user_service';

@Component({
  selector: 'app-table-free',
  templateUrl: './table-free.component.html',
  styleUrls: ['./table-free.component.css']
})
export class TableFreeComponent implements OnInit {
  @Input() table: Table = new Table('', 1);
  @Output() close = new EventEmitter<void>();
  searchTerm: string = ''; 
  filteredProducts: Product[] = []; 
  categories: Category[] = [];
  orderItems: OrderItem[] = [];
  loading: boolean = false;
  selectedProduct: Product | null = null;
  selectedAmount: number = 1;
  selectedAmountOfPeople: number = 1;
  canAddProduct: boolean = false;
  products: Product[] = [];
  currentTime: string = '';
  order: Order | undefined;
  currentDate: string = this.formatDate(new Date());
  user: any | null
  uid: string = '';
  
  selectedCategories: Array<{ id: any, name: string }> = [];

  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private tableService: TableService,
    private categoryService: CategoryService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    this.updateCurrentTime();
    this.loadProducts();
    this.loadCategories();
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
  }
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
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

  updateCurrentTime() {
    const hours = new Date().getHours().toString().padStart(2, '0');
    const minutes = new Date().getMinutes().toString().padStart(2, '0');
    this.currentTime = `${hours}:${minutes}`;
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
      this.resetForm();
    }
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
      const product = this.products.find(p => p.id === item.product_id);
      return product ? total + item.amount * parseFloat(product.price) : total;
    }, 0);
  }

  async createOrder() {
    this.loading = true;
    const total = this.calculateTotal();
    this.order = {
      status: 'IN PROGRESS',
      tableNumber: Number(this.table?.id ?? 0),
      date: this.currentDate,
      time: this.currentTime,
      total: total.toString(),
      orderItems: this.orderItems,
      amountOfPeople: this.selectedAmountOfPeople,
      employee: this.uid
    };
  
    try {
      const response = await this.orderService.onRegister(this.order!);
  
      if (response && response.order && response.order_id) {
      
        await this.updateProductsStock();
        await this.tableService.updateTableAndOrder(response.order, response.order_id);
        this.updateTable();
        this.closeDialog();
      } else {
        console.log('Order registration failed');
      }
    } catch (error: any) {
      console.error('Error durante el registro:', error);
    } finally {
      this.loading = false;
    }
  }
  

  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; 
  }


  getProductById(productId: number): Product | undefined {
    return this.products.find(product => product.id === productId);
  }


  updateTable() {
    this.table.status = 'BUSY';
    this.table.order_id = this.order?.id ?? 0;
  }


  closeDialog() {
    this.orderItems = [];
    this.order = undefined;
    location.reload();
    this.close.emit();
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
  
  
  

  async updateProductsStock() {
    try {
      const updatePromises = this.orderItems.map(orderItem => 
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

}
