import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { Category } from 'src/app/models/category';
import { Goal } from 'src/app/models/goal';
import { CategoryService } from 'src/app/services/category_service';
import { GoalService } from 'src/app/services/goal_service';


@Component({
  selector: 'app-new-goal',
  templateUrl: './new-goal.component.html',
  styleUrl: './new-goal.component.css'
})
export class NewGoalComponent implements OnInit  {
  @Output() goalAdded = new EventEmitter<any>();
  @Output() onSuccess = new EventEmitter<string>();
  @Output() onError = new EventEmitter<string>();
  displayNoticeDialog: boolean = false;
  noticeMessage: string = '';

  selectedGoalType: string = '';
  selectedCategory: any;
  targetAmount!: number;
  goalColor: string = '#ffffff';
  selectedIcon: string= '';
  goalTitle: string = '';
  goalDescription: string = '';
  goalDeadline: Date = new Date();
  categories: Category[] = [];
  minDate: Date = new Date();
  isFormComplete: boolean = false;
  goals: Goal[] = [];
  loading: boolean = false;
  icons = [
    { label: 'Briefcase', value: 'pi-briefcase' },
    { label: 'Bullseye', value: 'pi-bullseye' },
    { label: 'Check', value: 'pi-check' },
    { label: 'Clipboard', value: 'pi-clipboard' },
    { label: 'Dollar', value: 'pi-dollar' },
    { label: 'Money Bill', value: 'pi-money-bill' },
    { label: 'Paperclip', value: 'pi-paperclip' },
    { label: 'Receipt', value: 'pi-receipt' },
    { label: 'Star', value: 'pi-star' },
  ];
  hasFinalGainGoal: boolean = false;

  constructor(private categoryService: CategoryService, private goalService: GoalService){}

  ngOnInit() {
    this.loadCategories();
    const today = new Date();
    this.minDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    this.goalDeadline = this.minDate;
  }

  checkFormComplete() {
    this.isFormComplete = !!this.goalTitle && !!this.goalDeadline && !!this.goalDescription;
  }

  onDateChange(event: any){
    this.loadCategories();
    this.selectedCategory = null;
  }

async addTotalGainGoal() {
  this.loading = true;
  const newGoal = new Goal(this.goalTitle, this.goalDescription, this.targetAmount, 0, this.goalColor, 'pi ' + this.selectedIcon, this.formatDeadline(this.goalDeadline), this.selectedCategory?.id ?? null);
  
  try {
    const response = await this.goalService.createGoal(newGoal);
    this.loading = false;

    if (response) {
      this.goalAdded.emit(newGoal);
      this.onSuccess.emit('Goal successfully created!');
    } else {
      this.onError.emit('Something went wrong.');
    }
  } catch (error: any) {
    this.loading = false;
    const errorMessage = error?.error?.message || error?.message || 'Something went wrong.';
    this.onError.emit(errorMessage);
  }
}

async addCategoryGoal() {
    this.loading = true;
    const newGoal = new Goal(
      this.goalTitle, 
      this.goalDescription, 
      this.targetAmount, 
      0, 
      this.goalColor, 
      'pi ' + this.selectedIcon, 
      this.formatDeadline(this.goalDeadline), 
      this.selectedCategory?.id
    );
    
    try {
      const response = await this.goalService.createGoal(newGoal);
      this.loading = false;

      if (response) {
        this.goalAdded.emit(newGoal);
        this.onSuccess.emit('Goal successfully created!'); 
      } else {
        this.onError.emit('Something went wrong.');
      }
    } catch (error: any) {
      this.loading = false;
      const errorMessage = error?.error?.message || error?.message || 'Something went wrong.';
      this.onError.emit(errorMessage);
  }
}

  addGoal(){
    if (this.selectedGoalType == 'category'){
      this.addCategoryGoal();
    }
    else{
      this.addTotalGainGoal();
    }
    this.selectedGoalType = '';
    this.selectedCategory = null;
    this.targetAmount = 0;
    this.goalColor = '#ffffff';
    this.selectedIcon = '';
    this.goalTitle = '';
    this.goalDescription = '';
    this.goalDeadline = new Date();

  }

  formatDeadline(date: Date): string {
    if (!date) return '';
    
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear().toString().slice(-2);
    
    return `${month}/${year}`;
  }
  

  selectGoalType(type: string) {
    this.selectedGoalType = type;
  }
  loadCategories(): void {
    this.loading = true;
    const month = (this.goalDeadline.getMonth() + 1).toString(); 
    const year = (this.goalDeadline.getFullYear().toString()).slice(-2); 
  
    this.goalService.getGoals(month, year).subscribe((goals: Goal[]) => {
      this.goals = goals;
      
      this.hasFinalGainGoal = goals.some(goal => goal.categoryId === null);
      console.log('Is there a final gain goal for this period?', this.hasFinalGainGoal);
  
      const categoryIdsWithGoals = goals.map(goal => goal.categoryId?.toString());
      this.categoryService.getCategories().subscribe({
        next: (categoryData) => {
          if (categoryData && Array.isArray(categoryData.categories)) {
            this.categories = categoryData.categories.filter(category => 
              !categoryIdsWithGoals.includes(category.id?.toString())
            );
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading categories:', err);
        }
      });
    });
  }


  onTargetAmountChange() {
    if (this.targetAmount <= 0 || this.targetAmount == null) {
      this.targetAmount = 1;
    }
 }


 isFormValid(): boolean {
  return this.goalTitle && this.goalDeadline && this.goalDescription && this.goalColor && this.selectedIcon &&
         this.targetAmount > 0 &&
         ((this.selectedGoalType === 'category' && this.selectedCategory) || 
          (this.selectedGoalType === 'finalGain' && !this.hasFinalGainGoal));
}

}