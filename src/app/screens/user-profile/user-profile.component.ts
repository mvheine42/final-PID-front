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
  loadingProfile: boolean = true;
  loadingRewards: boolean = true;
  deleting: boolean = false;
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
      this.loading = true;
      this.loadingProfile = true;
      this.loadingRewards = true;
    
      (await this.userService.getUserDataFromFirestore(user.uid)).subscribe(
        (userData) => {
          this.name = userData.name;
          this.birthday = userData.birthday;
          this.levelName = userData.level.name;
          this.levelId = userData.level.id;
          this.currentGlobalPoints = parseInt(userData.globalPoints, 10) || 0;
          this.currentMonthlyPoints = parseInt(userData.monthlyPoints, 10) || 0;
          this.userService.getTopLevelStatus(this.levelId ?? '').subscribe(
            (statusData) => {
              this.isTopLevel = statusData.isTopLevel;
              if (!this.isTopLevel) {
                this.fetchNextLevelData();
              } else {
                this.fetchTopLevelStatus();
              }
              this.loadingProfile = false;
              this.fetchRewards();
              this.fetchRankingData();
            },
            (error) => {
              console.error('Error checking top-level status:', error);
              this.showErrorDialog();
              this.loading = false;
              this.loadingProfile = false;
              this.loadingRewards = false;
            }
          );
        },
        (error) => {
          console.error('Error fetching user data:', error);
          this.showErrorDialog();
          this.loading = false;
          this.loadingProfile = false;
          this.loadingRewards = false;
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
    this.pointsNeededToMaintain = 150 - this.currentMonthlyPoints;

    if (this.pointsNeededToMaintain <= 0) {
      this.achievedMonthlyPointsMessage = "You already achieved the monthly's points! Total monthly points: " + this.currentMonthlyPoints;
    } else {
      this.achievedMonthlyPointsMessage = null;
    }
  }


  async fetchRewards() {
    if (this.levelId) {
      this.loadingRewards = true;
      this.userService.getRewards(this.levelId).subscribe(
        (rewardsData) => {
          this.rewards = rewardsData;
          this.loadingRewards = false;
        },
        (error) => {
          console.error('Error fetching rewards data:', error);
          this.loadingRewards = false;
        }
      );
    } else {
      console.warn('No level ID; unable to fetch rewards.');
      this.loadingRewards = false;
    }
  }


  async fetchRankingData() {
    this.loading = true;
    this.userService.getRanking().subscribe(
      (rankingData) => {
        this.ranking = rankingData;
        this.loading = false;
      },
      (error) => {
        console.error('Error fetching ranking data:', error);
        this.loading = false;
      }
    );
  }

async onDeleteAccount() {
  this.deleting = true;
  try {
    await this.userService.deleteCurrentUser();
    console.log('Account deleted successfully');
    
    this.router.navigate(['/'], { replaceUrl: true });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    this.deleting = false;
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