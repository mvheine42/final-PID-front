import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { Product } from 'src/app/models/product';
import { Router } from '@angular/router';
import { ProductService } from 'src/app/services/product_service';
import { CategoryService } from 'src/app/services/category_service';
import { Category } from 'src/app/models/category';
import { FileUpload } from 'primeng/fileupload';

interface UploadEvent {
  originalEvent: Event;
  files: File[];
}

@Component({
  selector: 'app-register-product',
  templateUrl: './register-product.component.html',
  styleUrl: './register-product.component.css'
})
export class RegisterProductComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload: FileUpload | undefined;
  name: string = '';
  description: string = '';
  price: string = '';
  cost: string = '';
  stock: string = '';
  product: Product | undefined;
  categories: Category[] = [];
  categoryOptions: { label: string; value: string }[] = [];
  displayConfirmDialog: boolean = false;
  displayErrorDialog: boolean = false;
  errorSubtitle: string = '';
  loading: boolean = false; 
  isMobile: boolean = false;
  selectedCategories: Category[] = [];
  selectedCategoryIds: string = '';
  showCategoryPanel = false;
  showCaloriesPanel = false;
  totalCaloriesValue?: number; 
  imageUrl: string = '';
  fileName: string = '';
  compressingImage: boolean = false;


  constructor( private productService: ProductService, private router: Router, private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.checkIfMobile();   
  }

 async onImageSelect(event: any) {
    const file = event.files[0]; 
    this.fileName = file.name; 

    this.compressingImage = true;

    try {
        const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
        this.imageUrl = compressedBase64;
      } catch (error) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imageUrl = e.target.result;
        };
        reader.readAsDataURL(file);
      } finally {
        this.compressingImage = false;
      }
    
  }

    private compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          const sizeInKB = Math.round(compressedBase64.length / 1024);
          if (sizeInKB > 800) {
            const recompressed = canvas.toDataURL('image/jpeg', 0.5);
            resolve(recompressed);
          } else {
            resolve(compressedBase64);
          }
        };

        img.onerror = () => reject(new Error('Error cargando la imagen'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsDataURL(file);
    });
  }


  onImageClear(fileUpload: any) {
    this.fileName = ''; 
    this.imageUrl = ''; 
    fileUpload.clear(); 
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkIfMobile();
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth <= 770;
  }

  async onRegister() {
    this.closeConfirmDialog();
    this.loading = true;
    try {
      this.product = new Product(this.name, this.description, this.price, this.selectedCategoryIds, this.totalCaloriesValue ?? 0, this.cost, this.stock, this.imageUrl);
      const response = await this.productService.onRegister(this.product);

      if (response) {
        this.router.navigate(['/products-view']);
      } else {
        this.errorSubtitle = 'An unexpected error occurred. Please try again.';
        this.showErrorDialog();
      }
    } catch (error: any) {
      this.errorSubtitle = 'An error occurred during registration.';
      this.showErrorDialog();
    } finally {
      this.loading = false;
    }
  }

  onCategoryChange(event: any): void {
    this.selectedCategories = event.value;
    this.selectedCategoryIds = this.selectedCategories.join(', ');
  }

  getSelectedCategoriesLabel(): string {
    return this.selectedCategories.length > 0 
      ? this.selectedCategories.map(cat => cat.name).join(', ')
      : 'Select categories'; 
  }
  
  showConfirmDialog() {
    this.displayConfirmDialog = true;
  }

  closeConfirmDialog() {
    this.displayConfirmDialog = false;
  }

  showErrorDialog() {
    this.closeConfirmDialog();
    this.displayErrorDialog = true;
  }

  closeErrorDialog() {
    this.displayErrorDialog = false;
  }

  
  onStockChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
  
    if (value < 0) {
      input.value = '0';
      this.stock = '0';
    } else {
      this.stock = input.value;
    }
  }

  onPriceChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
  
    if (value < 0) {
      input.value = '0';
      this.price = '0';
    } else {
      this.price = input.value;
    }

    if(this.cost != ''  ){
      this.onCostChange(event);
    }
  }

  onCostChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
  
    if (value < 0) {
      input.value = '0';
      this.cost = '0';
    } else if (value >= Number(this.price)) {
      input.value = (Number(this.price) - 1).toString();
      this.cost = (Number(this.price) - 1).toString();
    } else {
      this.cost = input.value;
    }
  }
  


  onlyAllowNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  showCategories() {
    this.showCategoryPanel = true;
    this.showCaloriesPanel = false;
  }


  handleCategorySave() {
    this.loadCategories();
    this.showCategoryPanel = false;
  }

  handleCategoryClose() {
    this.showCategoryPanel = false;
  } 
  
  isFormValid(): boolean {
    return this.name.trim() !== '' && 
           this.description.trim() !== '' &&
           this.price !== '' && 
           parseFloat(this.price) > 0 &&
           this.selectedCategories.length > 0 &&
           this.totalCaloriesValue !== undefined &&
           this.imageUrl !== '';
  }
  

  showCalories() {
    this.showCaloriesPanel = true;
    this.showCategoryPanel = false;
  }


  handleCaloriesSave() {
    this.showCaloriesPanel = false;
  }

  handleCaloriesClose() {
    this.showCaloriesPanel = false;
  } 

  handleTotalCalories(calories: number) {
    this.totalCaloriesValue = calories;
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(response => {
      this.categories = response.categories;
  
      this.categoryOptions = this.categories.map((category: Category) => ({
        label: category.name,
        value: category.id !== undefined ? category.id.toString() : ''
      }));
    });
  }

}