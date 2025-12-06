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

  // --- VARIABLES DE ESTADO PARA SPINNERS ---
  loadingInitial: boolean = false; 
  savingNew: boolean = false;
  deletingCategory: boolean = false;
  savingEdit: boolean = false;
  // ----------------------------------------

  constructor(private categoryService: CategoryService) {}

  ngOnInit() {
    this.loadCategories(); // Cargar categorías por defecto
  }

  loadCategories():void{
    this.loadingInitial = true; // <--- INICIA CARGA INICIAL
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        console.log('Categories fetched:', data);
        if (data && Array.isArray(data.categories)) {
          this.categories = data.categories;
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loadingInitial = false; // <--- FINALIZA
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loadingInitial = false; // <--- FINALIZA EN ERROR
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
        // Check for duplicates before updating
        if (this.categories.some(cat => cat.id !== category.id && cat.name.toLowerCase() === category.name.trim().toLowerCase())) {
            this.message = 'Category cannot be repeated.';
            this.showNoticeDialog();
            return;
        }

        this.savingEdit = true; // <--- INICIA EDICIÓN
        this.categoryService.updateCategoryName(category.id, category.name).subscribe({
            next: () => {
                delete this.clonedCategories[category.id];
                this.editingCategory = null;
                this.loadCategories();
                this.savingEdit = false; // <--- FINALIZA
            },
            error: (error: any) => {
                console.error('Error updating category', error);
                this.savingEdit = false; // <--- FINALIZA EN ERROR
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

    // Check for duplicates in all categories
    if (this.categories.some(cat => cat.name.toLowerCase() === categoryName)) {
        this.message = `The category name "${this.newCategoryName}" already exists.`;
        this.showNoticeDialog();
        return;
    }

    this.savingNew = true; // <--- INICIA CREACIÓN
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
        this.savingNew = false; // <--- FINALIZA
    }
}

  onDeleteCategory() {
    // FIX: El diálogo de confirmación NO se cierra aquí. Se cierra al final.
    if (this.categoryToDelete.id !== undefined) {
      this.deletingCategory = true; // <--- INICIA ELIMINACIÓN
      this.categoryService.deleteCategory(this.categoryToDelete.id.toString()).subscribe({
        next: () => {
          this.message = 'Category deleted successfully.'; // Mensaje de éxito
          this.loadCategories(); // Recargar categorías después de eliminar
          
          // TAREAS DE LIMPIEZA EN ÉXITO
          this.deletingCategory = false; 
          this.displayDeleteDialog = false; // Cierra el diálogo de confirmación
          this.showNoticeDialog(); // Muestra el mensaje de éxito
        },
        error: (error) => {
          this.message = 'Error deleting category.'; // Mensaje de error
          console.error('Error deleting category:', error);
          
          // TAREAS DE LIMPIEZA EN ERROR
          this.deletingCategory = false; 
          this.displayDeleteDialog = false; // Cierra el diálogo de confirmación
          this.showNoticeDialog(); // Muestra el mensaje de error
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
    this.newCategoryName = ''; // Limpiar el nombre de la nueva categoría
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