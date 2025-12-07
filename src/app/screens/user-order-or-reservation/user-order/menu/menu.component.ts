import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Category } from 'src/app/models/category';
import { OrderItem } from 'src/app/models/orderItem';
import { Product } from 'src/app/models/product';
import { CategoryService } from 'src/app/services/category_service';
import { ProductService } from 'src/app/services/product_service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  categories: Category[] = [];
  colors: string[] = ['#7f522e', '#b37a3a'];
  products : Product[] = [];
  visibleCategories: Category[] = [];
  selectedCategories: Category[] = [];
  searchQuery: string = '';
  filteredProducts: Product[] = [];
  currentIndex: number = 0;
  itemsPerPage: number = 6;
  orderItems: OrderItem[] = [];
  cart: { [key: number]: number } = {};
  cartVisible: boolean = false;

  loadingProducts: boolean = true;
  loadingCategories: boolean = true;
  loadingFilteredProducts: boolean = false;

  constructor(private productService: ProductService, private router: Router, private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.updateItemsPerPage(window.innerWidth);
    this.loadCategories()
    this.loadProducts(); 
  }
  
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
      const target = event.target as Window;
      this.updateItemsPerPage(target.innerWidth);
      this.updateVisibleCategories();
  }

  private updateItemsPerPage(width: number) {
      if (width < 768) {
          this.itemsPerPage = 3;
      } else if (width < 1024) {
          this.itemsPerPage = 4;
      } else if (width < 1340) {
          this.itemsPerPage = 5;
      } else { 
          this.itemsPerPage = 6;
      }
  }

  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.products)) {
          this.products = data.products;
          this.filteredProducts = this.products; 
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loadingProducts = false;
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loadingProducts = false;
      }
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.categories)) {
          this.categories = data.categories.map((item, index) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            color: this.colors[index % this.colors.length],
          }));
          this.updateVisibleCategories();
        }
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
        this.loadingCategories = false;
      },
    });
  }

  searchProducts(event: any): void {
    const query = event.query?.toLowerCase() || '';
    console.log('Searching for:', query);
    this.filteredProducts = this.products.filter(product =>
        product.name.toLowerCase().includes(query)
    );
    console.log('Filtered products:', this.filteredProducts);
  }

  onSearchChange(query: string): void {
    console.log('Search query:', query);
    if (query.trim() === '') {
        console.log('Input is empty, showing all products.');
        this.filteredProducts = [...this.products];
    } else {
        this.searchProducts({ query });
    }
  }

  updateVisibleCategories(): void {
    this.visibleCategories = this.categories.slice(this.currentIndex, this.currentIndex + this.itemsPerPage);
  }

  onNextPage(): void {
    if (this.currentIndex + this.itemsPerPage < this.categories.length) {
      this.currentIndex++;
      this.updateVisibleCategories();
    }
  }

  onPreviousPage(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateVisibleCategories();
    }
  }

  addProduct(productId: number): void {
    const product = this.products.find(p => p.id === productId);
    if (product) {
        const orderItem = this.orderItems.find(item => item.product_id === productId);
        if (orderItem) {
            orderItem.amount += 1;
        } else {
            this.orderItems.push(new OrderItem(productId, 1, product.name, product.price.toString(), product.imageUrl));
        }
        this.cart[productId] = (this.cart[productId] || 0) + 1;
    } else {
        console.error('Product not found');
    }
  }

  getTotalItemsInCart(): number {
    return Object.values(this.cart).reduce((acc, count) => acc + count, 0);
  }

  decrementProduct(productId: number): void {
    const orderItem = this.orderItems.find(item => item.product_id === productId);
    if (this.cart[productId] > 0) {
        this.cart[productId]--;
        if (orderItem) {
            orderItem.amount--;
            if (orderItem.amount === 0) {
                this.orderItems = this.orderItems.filter(item => item.product_id !== productId);
            }
        }
    } else {
        console.error('El producto no está en el carrito o la cantidad ya es 0');
    }
  }

  getProductCount(productId: number): number {
    return this.cart[productId] || 0;
  }

  toggleCategorySelection(category: Category): void {
    const index = this.selectedCategories.indexOf(category);
    if (index === -1) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories.splice(index, 1);
    }
    this.filterProductsByCategory();
  }

  filterProductsByCategory(): void {
    if (this.selectedCategories.length === 0) {
      this.filteredProducts = this.products; 
      this.loadingFilteredProducts = false;
    } else {
      const categoryIds = this.selectedCategories.map(category => category.id).join(', ');
      this.getProductsByCategory(categoryIds);
    }
  }

  getProductsByCategory(categoryIds: string): void {
    this.loadingFilteredProducts = true;
    this.categoryService.getProductsByCategory(categoryIds)
      .then((data) => {
        if (data && Array.isArray(data)) {
          this.filteredProducts = data;
        } else {
          this.filteredProducts = [];
        }
        this.loadingFilteredProducts = false;
      })
      .catch((err) => {
        console.error('Error fetching products by category:', err);
        this.filteredProducts = [];
        this.loadingFilteredProducts = false;
      });
  }

  toggleCart(): void {
    this.cartVisible = !this.cartVisible;
  }

  handleCartClosed(updatedOrderItems: OrderItem[]): void {
    this.orderItems = updatedOrderItems;
    this.cart = {};
    for (const item of this.orderItems) {
      this.cart[item.product_id] = item.amount;
    }
    this.cartVisible = false;
  }
}