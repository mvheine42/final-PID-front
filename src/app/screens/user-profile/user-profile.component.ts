import { Component, OnInit, HostListener  } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user_service';
import { LevelService } from 'src/app/services/level_service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  
  email: string | null = null;
  name: string = '';
  birthday: Date | null = null;
  levelName: string = '';
  levelId: string | null = null;
  isMobile: boolean = false; 
  currentGlobalPoints: number = 0;
  currentMonthlyPoints: number = 0;
  pointsToNextLevel: string | null = null;
  pointsNeededToMaintain: number | null = null;
  nextLevelData: any | null = null;
  isTopLevel: boolean = false;
  displayConfirmDeleteDialog: boolean = false;
  displayErrorDialog: boolean = false;
  displayChangePasswordDialog: boolean = false;
  displayDiscountDialog = false;
  selectedReward: any;
  displayInfoPointsDialog = false;
  responsiveOptions: any[] | undefined;
  loading: boolean = true;
  ranking: any[] = [];
  rewards: any;
  achievedMonthlyPointsMessage: string | null = null;

  constructor(
    private router: Router,
    private userService: UserService,
    private levelService: LevelService
  ) {}

  async ngOnInit(): Promise<void> {
    this.checkScreenSize();
    const today = new Date();
    if(today.getDate() === 1){
      await this.userService.resetMonthlyPoints();
    }
    const user = this.userService.currentUser;
    if (user) {
      this.email = user.email;
      this.loading = true; // Set loading to true when starting to fetch data
    
      // Fetch user data
      (await this.userService.getUserDataFromFirestore(user.uid)).subscribe(
        (userData) => {
          this.name = userData.name;
          this.birthday = userData.birthday;
          this.levelName = userData.level.name;
          this.levelId = userData.level.id;
          this.currentGlobalPoints = parseInt(userData.globalPoints, 10) || 0;
          this.currentMonthlyPoints = parseInt(userData.monthlyPoints, 10) || 0;
  
          // First check if the user is at the top level
          this.userService.getTopLevelStatus(this.levelId ?? '').subscribe(
            (statusData) => {
              this.isTopLevel = statusData.isTopLevel;
              if (!this.isTopLevel) {
                // Only fetch next level data if not at top level
                this.fetchNextLevelData();
              } else {
                // If at top level, fetch points needed to maintain this level
                this.fetchTopLevelStatus();
              }
              this.fetchRewards(); // Fetch rewards here
              this.fetchRankingData(); // Fetch ranking data here
            },
            (error) => {
              console.error('Error checking top-level status:', error);
              this.showErrorDialog();
              this.loading = false; // Stop loading in case of error
            }
          );
        },
        (error) => {
          console.error('Error fetching user data:', error);
          this.showErrorDialog();
          this.loading = false; // Stop loading in case of error
        }
      );
    } else {
      this.router.navigate(['/']);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }
  
  private fetchNextLevelData(): void {
    const nextLevelId = (parseInt(this.levelId ?? '', 10) + 1).toString();
    this.levelService.getLevel(nextLevelId).subscribe(
      (nextLevelData: any) => {
        if (nextLevelData) {
          this.nextLevelData = nextLevelData;
          this.pointsToNextLevel = ((this.nextLevelData.points ?? 0) - this.currentGlobalPoints).toString();
        }
      },
      (error) => {
        console.error('Error fetching next level points:', error);
        this.showErrorDialog();
      }
    );
  }
  
  private fetchTopLevelStatus(): void {
    // Calculate how many points are needed to maintain the top level
    this.pointsNeededToMaintain = 150 - this.currentMonthlyPoints;

    // Check if the user has already achieved the required monthly points
    if (this.pointsNeededToMaintain <= 0) {
      this.achievedMonthlyPointsMessage = "You already achieved the monthly's points! Total monthly points: " + this.currentMonthlyPoints;
    } else {
      this.achievedMonthlyPointsMessage = null; // Reset message if not achieved
    }
  }


  async fetchRewards() {
    if (this.levelId) {
      this.userService.getRewards(this.levelId).subscribe(
        (rewardsData) => {
          this.rewards = rewardsData;
        },
        (error) => {
          console.error('Error fetching rewards data:', error);
        }
      );
    } else {
      console.warn('No level ID; unable to fetch rewards.');
    }
  }


  async fetchRankingData() {
    this.loading = true; // Set loading for ranking data
    this.userService.getRanking().subscribe(
      (rankingData) => {
        this.ranking = rankingData;
        this.loading = false; // Stop loading when data is fetched
      },
      (error) => {
        console.error('Error fetching ranking data:', error);
        this.loading = false; // Stop loading in case of error
      }
    );
  }

async onDeleteAccount() {
  try {
    await this.userService.deleteCurrentUser();
    console.log('Account deleted successfully');
    
    // Navegar inmediatamente, sin setTimeout
    this.router.navigate(['/'], { replaceUrl: true });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    this.showErrorDialog();
  }
}

  async changePassword() {
    this.userService.resetPassword(this.email ?? '');
    this.userService.logOut().then(() => {
      localStorage.removeItem("token");
      this.router.navigate(['/']);
    });
  }

  showChangePasswordDialog() {
    this.displayChangePasswordDialog = true;
  }

  closeChangePasswordDialog() {
    this.displayChangePasswordDialog = false;
  }

  showConfirmDeleteDialog() {
    this.displayConfirmDeleteDialog = true;
  }

  
  showInfoPointsDialog() {
    this.displayInfoPointsDialog = true;
  }


  closeConfirmDeleteDialog() {
    this.displayConfirmDeleteDialog = false;
  }

  showErrorDialog() {
    this.closeConfirmDeleteDialog();
    this.displayErrorDialog = true;
  }

  closeErrorDialog() {
    this.displayErrorDialog = false;
  }

  showDiscountCode(reward: any) {
    this.selectedReward = reward;
    this.displayDiscountDialog = true;
  }
}
