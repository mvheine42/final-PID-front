import { Component, OnInit, HostListener   } from '@angular/core';
import { Goal } from 'src/app/models/goal';
import { CalendarMonthChangeEvent, CalendarYearChangeEvent } from 'primeng/calendar';
import { GoalService } from 'src/app/services/goal_service';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.css']
})
export class GoalsComponent implements OnInit {
  goals: Goal[] = [];
  totalProgress: number = 0;
  visibleGoals: Goal[] = [];
  currentIndex: number = 0;
  itemsPerPage: number = 4;
  selectedDate: Date = new Date();  
  data: any;
  options: any;
  isMobile: boolean = false;
  colors: string[] = ['#7f522e', '#b37a3a'];
  displayDialog: boolean = false;
  totalIncomeExpected: number = 0;
  loading: boolean = false;

  displayNoticeDialog: boolean = false;
  noticeMessage: string = '';

  constructor(private goalService: GoalService) { 
    this.checkIfMobile();
  }

  ngOnInit(): void {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    this.getGoals(month, year);    
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkIfMobile();
    this.updateVisibleGoals();
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  updateVisibleGoals() {
    if (this.isMobile) {
      this.visibleGoals = this.goals;
      this.itemsPerPage = 1;
    } else {
      this.visibleGoals = this.goals.slice(0, 4);
      this.itemsPerPage = 4;
    }
  }


  getGoals(month: string, year: string){
    this.loading = true;
    this.goalService.getGoals(month, year).subscribe(
      (goals: Goal[]) => {
        this.goals = goals; 
        this.visibleGoals = this.goals.slice(0, this.itemsPerPage);
        this.updateVisibleGoals();
  
        this.calculateProgressValues();
        this.totalProgress = this.goals.reduce((acc, item) => acc + item.actualIncome, 0);
        this.totalIncomeExpected = this.goals.reduce((acc, item) => acc + item.expectedIncome, 0);
  
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
  
        this.data = {
          labels: this.goals.map(goal => goal.title),
          datasets: [
            {
              label: '% Progress',
              backgroundColor: this.goals.map(goal => goal.color),
              borderColor: this.goals.map(goal => goal.color),
              data: this.goals.map(goal => Math.min((goal.actualIncome / goal.expectedIncome) * 100, 100))
            }
          ]
        };
  
        this.options = {
          indexAxis: 'y',
          maintainAspectRatio: false,
          aspectRatio: 1.2,
          plugins: {
            legend: {
              labels: {
                color: textColor
              }
            }
          },
          scales: {
            x: {
              max: 100,
              ticks: {
                color: textColorSecondary,
                font: {
                  weight: 500
                }
              },
              grid: {
                color: surfaceBorder,
                drawBorder: false
              }
            },
            y: {
              ticks: {
                color: textColorSecondary
              },
              grid: {
                color: surfaceBorder,
                drawBorder: false
              }
            }
          }
        };
        this.loading = false;
      },
      (error) => {
        this.loading = false;
        this.noticeMessage = 'Error loading goals. Please try again.';
        this.displayNoticeDialog = true;
      }
    );
  }

  onDateChange(event: any){
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const year = String(this.selectedDate.getFullYear()).slice(-2);
    this.getGoals(month, year);   
  }
  

  calculateProgressValues() {
    this.goals.forEach(goal => {
      const progress = (goal.actualIncome / goal.expectedIncome) * 100;
      goal.progressValue = progress >= 100 ? 100 : parseFloat(progress.toFixed(2));
    });
  }

  progressWidth(progress: number) {
    return progress / this.goals.length;
  }

  onMonthChange(event: CalendarMonthChangeEvent): void {
    const month = event.month;
    const year = event.year;

    if (month !== undefined && year !== undefined) {
      this.setLastDayOfMonth(month, year);
    }
  }

  onYearChange(event: CalendarYearChangeEvent): void {
    const year = event.year;

    if (year !== undefined) {
      this.setLastDayOfMonth(this.selectedDate.getMonth() + 1, year);
    }
  }

  setLastDayOfMonth(month: number, year: number): void {
    this.selectedDate = new Date(year, month, 0);
  }

  
  updateVisibleCategories(): void {
    this.visibleGoals = this.goals.slice(this.currentIndex, this.currentIndex + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentIndex + this.itemsPerPage < this.goals.length) {
      this.currentIndex++;
      this.updateVisibleCategories();
    }
  }

  prevPage(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateVisibleCategories();
    }
  }

  getDaysRemainingInMonth(): number {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return (lastDayOfMonth.getDate() - today.getDate());
  }

  getProgressColor(): string {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const totalExpectedIncome = this.goals.reduce((acc, item) => acc + item.expectedIncome, 0);
    const progress = (this.totalProgress/totalExpectedIncome)*100;

  
    if (dayOfMonth >= 1 && dayOfMonth <= 10) {
      return 'green';
    } else if (dayOfMonth >= 11 && dayOfMonth <= 20) {
      if (progress > 40) {
        return 'green';
      } else if (progress > 20) {
        return 'orange';
      } else {
        return 'red';
      }
    } else {
      if (progress > 80) {
        return 'green';
      } else if (progress > 50) {
        return 'orange';
      } else {
        return 'red';
      }
    }
  }
  
  openDialog() {
    this.displayDialog = true;
  }

  showNoticeDialog(message: string) {
    this.noticeMessage = message;
    this.displayNoticeDialog = true;
  }

  closeNoticeDialog() {
    this.displayNoticeDialog = false;
  }

  onGoalAdded(newGoal: any) {
    this.goals.push(newGoal);
    this.displayDialog = false;
    
    this.calculateProgressValues();
    this.totalProgress = this.goals.reduce((acc, item) => acc + item.actualIncome, 0);
    this.totalIncomeExpected = this.goals.reduce((acc, item) => acc + item.expectedIncome, 0);
    
    this.updateVisibleGoals();
  }
}