import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CalorieService } from 'src/app/services/calorie_service';

@Component({
  selector: 'app-calories',
  templateUrl: './calories.component.html',
  styleUrls: ['./calories.component.css']
})
export class CaloriesComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Output() totalCalories = new EventEmitter<number>();

  showPanel = true;
  showDropdown = false;
  selectedIngredient: any | null = null;
  filterText: string = '';
  ingredients: any[] = [];
  availableIngredients: any[] = [];
  canAddCustomIngredient: boolean = false;
  
  loadingInitial: boolean = false; 

  constructor(private calorieService: CalorieService) {} 

  ngOnInit() {
    this.loadCalories();
  }

  loadCalories() {
    this.loadingInitial = true; 
    this.calorieService.getCalories().subscribe({
      next: (response) => {
        if (response && response.message && response.message.food) {
          this.availableIngredients = response.message.food.map((item: any) => ({
            name: item.name,
            id: item.id ? item.id.toString() : '', 
            calories: item.calories_portion
          }));
          console.log(this.availableIngredients); 
        } else {
          console.error("No se encontraron alimentos en la respuesta.");
        }
        this.loadingInitial = false;
      },
      error: (error) => {
        console.error("Error al cargar las calorías: ", error);
        this.loadingInitial = false; 
      }
    });
  }
  
  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  addIngredient() {
    if (this.selectedIngredient) {
      this.ingredients.push({ ...this.selectedIngredient });
      this.resetDropdown();
    }
  }

  addCustomIngredient() {
    const newIngredient = {
      name: this.filterText,
      id: new Date().getTime().toString(),
      calories: 0
    };
    this.ingredients.push(newIngredient);
    this.availableIngredients.push(newIngredient);
    this.resetDropdown();
  }

  cancelSelection() {
    this.resetDropdown();
  }

  resetDropdown() {
    this.selectedIngredient = null;
    this.filterText = '';
    this.canAddCustomIngredient = false;
    this.showDropdown = false;
  }

  removeIngredient(id: string) {
    this.ingredients = this.ingredients.filter(ingredient => ingredient.id !== id);
  }

  getFilteredIngredients() {
    return this.availableIngredients.filter(ingredient =>
      !this.ingredients.some(selected => selected.id === ingredient.id)
    );
  }

  onDropdownFilter(event: any) {
    this.filterText = event.filter;
    this.canAddCustomIngredient = !!this.filterText && !this.availableIngredients.some(ingredient => ingredient.name.toLowerCase() === this.filterText.toLowerCase());
  }

  handleSave() {
    this.showPanel = false;
    this.totalCalories.emit(this.getTotalCalories());
    setTimeout(() => {
      this.onSave.emit();
    }, 1000);
  }

  getTotalCalories() {
    if (this.ingredients.some(ingredient => ingredient.calories === 0)) {
      return 0;
    }
    
    return this.ingredients.reduce((total, ingredient) => total + ingredient.calories, 0);
  }
}