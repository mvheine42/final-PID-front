import { Component, OnInit } from '@angular/core';
import { Product } from 'src/app/models/product';
import { ProductService } from 'src/app/services/product_service';
import { CategoryService } from 'src/app/services/category_service';
import { Router } from '@angular/router'; 
import { Category } from 'src/app/models/category';

@Component({
  selector: 'app-products-view',
  templateUrl: './products-view.component.html',
  styleUrls: ['./products-view.component.css']
})
export class ProductsViewComponent implements OnInit {
  categories: Category[] = [];
  products : Product[] = [];
  selectedCategories: Category[] = [];
  filteredProducts: Product[] = [];
  selectedFilterCategories: string[] = [];
  displayConfirmDialog: boolean = false;
  deleteID: number = 0;
  editingProductCategories: { [key: number]: Category[] } = {};
  originalProductState: { [key: number]: Product } = {};
  selectedProduct!: Product;
  dialogNoticeError: boolean = false;
  dialogNoticeSuccess: boolean = false;
  displayUpdateStockDialog: boolean = false;
  lowStockProducts: any[] = [];
  lowStockCount: number = 0; 
  alertStockDialog: boolean = false;
  public tableScrollHeight: string='';
  loading: boolean = true;
  deleting: boolean = false;
  savingRowId: number | null = null; 

  constructor(private productService: ProductService, private router: Router, private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loading = true;
    this.loadCategories();
    this.loadProducts();
    this.setScrollHeight();
    window.addEventListener('resize', () => {
      this.setScrollHeight();
    });
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
            console.log('categories', this.categories);
        },
        error: (err) => {
            console.error('Error fetching categories:', err);
        }
    });
}


getCategoryNamesByIds(ids: any): string {
  if (typeof ids !== 'string' || !ids) {
    return '';
  }
  const idArray = ids.split(',').map(id => id.trim());
  const categoryNames = this.categories
    .filter(category => category.id !== undefined && idArray.includes(category.id.toString()))
    .map(category => category.name);
  return categoryNames.join(', ');
}

filterByCategory(selectedCategoryIds: string[]): void {
  this.selectedFilterCategories = selectedCategoryIds;

  if (this.selectedFilterCategories.length === 0) {
    this.filteredProducts = [...this.products];
  } else {
    this.filteredProducts = this.products.filter(product => {
      const productCategories = product.category.split(',').map(id => parseInt(id.trim(), 10));
      const matches = this.selectedFilterCategories.some(categoryId => productCategories.includes(parseInt(categoryId)));
      return matches;
    });
  }
}

  updateTempSelectedCategories(productId: number, selectedCategories: Category[]): void {
    this.editingProductCategories[productId] = [...selectedCategories];
  }

  setScrollHeight() {
    if (window.innerWidth <= 768) {
      this.tableScrollHeight = '800px';
    } else {
      this.tableScrollHeight = '400px';
    }
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        if (data && Array.isArray(data.products)) {
          this.products = data.products;
          this.filteredProducts = [...this.products];
          this.filterLowStockProducts();
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loading = false; 
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loading = false; 
      }
      
    });
  }

  filterLowStockProducts() {
    this.lowStockProducts = this.filteredProducts.filter(product => {
      const stock = parseInt(product.stock, 10);
      return stock < 50;
    });
    this.lowStockCount = this.lowStockProducts.length; 
    if(this.lowStockCount > 0){ this.showAlertStockDialog(); }
  }

  isLowStock(stock: string): boolean {
    return parseInt(stock, 10) < 50;
  }

  showAlertStockDialog(){
    this.alertStockDialog = true;
  }

  closeAlertStockDialog(){
    this.alertStockDialog = false;
  }

  onRowEditInit(product: Product) {

    if (product.id === undefined) {
      console.error('Product ID is undefined');
      return;
    }
    this.originalProductState[product.id] = { ...product };

    const categoryIds = product.category.split(',').map(id => id.trim());
    this.editingProductCategories[product.id] = this.categories
      .filter((category: Category) => category.id && categoryIds.includes(category.id.toString()));
  }

  async onRowEditSave(product: Product) {
    if (product.id === undefined) {
      return;
    }

    this.savingRowId = product.id; 

    const originalProduct = this.originalProductState[product.id];
    const tempCategories = this.editingProductCategories[product.id];
    
    if (tempCategories) {
      const selectedIds = tempCategories.map(category => category.id).join(', ');
      if (selectedIds !== originalProduct.category) {
        product.category = selectedIds;
      }
    }

    if (parseFloat(product.price.toString()) < 0) {
      console.error('Price cannot be negative');
      this.savingRowId = null; 
      return;
    }

    const promises: Promise<any>[] = [];
    
    if (product.price !== originalProduct.price) {
      promises.push(this.productService.updateProductPrice(String(product.id), product.price));
    }

    if (product.description !== originalProduct.description) {
      promises.push(this.productService.updateProductDescription(String(product.id), product.description));
    }

    if (product.category !== originalProduct.category) {
      promises.push(this.productService.updateProductCategories(String(product.id), product.category));
    }

    try {
      await Promise.all(promises);
      delete this.originalProductState[product.id];
    } catch (error) {
      console.error('Failed to update product', error);
    } finally {
        this.savingRowId = null; 
    }
  }

  onRowEditCancel(product: Product, index: number) {  
    if (product.id !== undefined) {
      delete this.editingProductCategories[product.id];
      delete this.originalProductState[product.id];
    } else {
      console.error('Product ID is undefined, cannot cancel edit');
    }
    location.reload();
  }

  isProductDataValid(product: Product): boolean {
    if (product.id === undefined) {
      return false;
    }
  
    if (this.savingRowId === product.id) {
        return false;
    }

    const price = Number(product.price);
    const tempCategories = this.editingProductCategories[product.id];
  
    return (
      !isNaN(price) &&
      price > 0 &&
      !!product.description && 
      tempCategories !== undefined && 
      tempCategories.length > 0
    );
  }
  

  deleteProduct() {
    this.deleting = true; 
    this.productService.deleteProduct((this.deleteID).toString()).then(success => {
      if (success) {
        this.products = this.products.filter(product => product.id !== this.deleteID);
        this.filterByCategory(this.selectedFilterCategories); 
        this.filterLowStockProducts();
      }
      this.deleting = false; 
      this.closeConfirmDialog();
    });
  }

  customSort(event: { data: any[]; field: string; order: number }) {
    event.data.sort((data1, data2) => {
      let value1 = data1[event.field];
      let value2 = data2[event.field];
      let result = null;

      if (value1 == null && value2 != null) result = -1;
      else if (value1 != null && value2 == null) result = 1;
      else if (value1 == null && value2 == null) result = 0;
      else if (typeof value1 === 'string' && typeof value2 === 'string')
        result = value1.localeCompare(value2);
      else result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

      return (event.order * result);
    });
  }

  navigateToRegisterProduct(): void {
    this.router.navigate(['/register-product']); 
  }

  showConfirmDialog(id: number) {
    this.deleteID = id;
    this.displayConfirmDialog = true;
  }

  showUpdateStockDialog() {
    console.log(this.selectedProduct);
    this.displayUpdateStockDialog = true;
  }

  closeConfirmDialog() {
    this.displayConfirmDialog = false;
  }

  successUpdate(){
    location.reload();
    this.dialogNoticeSuccess = false; 
    this.displayUpdateStockDialog = false;
  }

}