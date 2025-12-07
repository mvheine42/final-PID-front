import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { Category } from 'src/app/models/category';
import { CategoryService } from 'src/app/services/category_service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  displayConfirmDialog: boolean = false;
  editingCategory: any;
  newCategoryName: string = '';
  showPanel = true;
  displayNewCategoryDialog: boolean = false;
  displayNoticeDialog: boolean = false;
  message: string = '';
  clonedCategories: { [s: string]: any } = {};
  categories: Category[] = [];
  defaultCategoryNames: string[] = [];
  displayDeleteDialog: boolean = false;
  categoryToDelete: any;
  loadingInitial: boolean = false; 
  savingNew: boolean = false;
  deletingCategory: boolean = false;
  savingEdit: boolean = false;

  constructor(private categoryService: CategoryService) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories():void{
    this.loadingInitial = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        console.log('Categories fetched:', data);
        if (data && Array.isArray(data.categories)) {
          this.categories = data.categories;
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loadingInitial = false;
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loadingInitial = false;
      }
    });
  }

  handleSave() {
    this.showPanel = false;
    setTimeout(() => {
      this.onSave.emit();
    }, 1000);
  }

  onRowEditInit(category: any) {
    this.clonedCategories[category.id] = { ...category };
  }

  onRowEditSave() {
    const category = this.editingCategory;
    if (category.name.trim()) {
        if (this.categories.some(cat => cat.id !== category.id && cat.name.toLowerCase() === category.name.trim().toLowerCase())) {
            this.message = 'Category cannot be repeated.';
            this.showNoticeDialog();
            return;
        }

        this.savingEdit = true;
        this.categoryService.updateCategoryName(category.id, category.name).subscribe({
            next: () => {
                delete this.clonedCategories[category.id];
                this.editingCategory = null;
                this.loadCategories();
                this.savingEdit = false;
            },
            error: (error: any) => {
                console.error('Error updating category', error);
                this.savingEdit = false;
            }
        });
    }
    this.displayConfirmDialog = false;
}

  onRowEditCancel(category: any, index: number) {
    this.categories[index] = this.clonedCategories[category.id];
    delete this.clonedCategories[category.id];
  }

  async onNewCategory() {
    const categoryName = this.newCategoryName.trim().toLowerCase();

    if (this.categories.some(cat => cat.name.toLowerCase() === categoryName)) {
        this.message = `The category name "${this.newCategoryName}" already exists.`;
        this.showNoticeDialog();
        return;
    }

    this.savingNew = true;
    const category = new Category(this.newCategoryName, 'Custom');
    try {
        await this.categoryService.createCategory(category).toPromise();
        this.message = 'Creation successful';
        this.loadCategories();
        this.closeNewCategoryDialog();
        this.showNoticeDialog();
    } catch (error: any) {
        this.message = 'Something went wrong';
        this.showNoticeDialog();
    } finally {
        this.savingNew = false;
    }
}

  onDeleteCategory() {
    if (this.categoryToDelete.id !== undefined) {
      this.deletingCategory = true;
      this.categoryService.deleteCategory(this.categoryToDelete.id.toString()).subscribe({
        next: () => {
          this.message = 'Category deleted successfully.';
          this.loadCategories();
          
          this.deletingCategory = false; 
          this.displayDeleteDialog = false;
          this.showNoticeDialog();
        },
        error: (error) => {
          this.message = 'Error deleting category.';
          console.error('Error deleting category:', error);
          
          this.deletingCategory = false; 
          this.displayDeleteDialog = false;
          this.showNoticeDialog();
        }
      });
    } else {
      console.error('Category ID is undefined');
    }
  }

  showDeleteDialog(category: any){
    this.categoryToDelete = category;
    this.displayDeleteDialog = true;
  }

  closeDeleteDialog() {
    this.displayDeleteDialog = false;
  }
  
  showConfirmDialog(category: any) {
    this.editingCategory = category;
    this.displayConfirmDialog = true;
  }

  closeConfirmDialog() {
    this.displayConfirmDialog = false;
  }

  showNewCategoryDialog() {
    this.displayNewCategoryDialog = true;
  }

  closeNewCategoryDialog() {
    this.newCategoryName = '';
    this.displayNewCategoryDialog = false;
  }

  showNoticeDialog() {
    this.closeNewCategoryDialog();
    this.displayNoticeDialog = true;
  }

  closeNoticeDialog() {
    this.displayNoticeDialog = false;
  }
  
}