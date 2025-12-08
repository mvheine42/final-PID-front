import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user_service';
import { LevelService } from 'src/app/services/level_service';
import { auth } from 'src/app/services/firebaseconfig';

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
  redirecting: boolean = false;
  ranking: any[] = [];
  rewards: any;
  achievedMonthlyPointsMessage: string | null = null;

  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private userService: UserService,
    private levelService: LevelService
  ) {}

  async ngOnInit(): Promise<void> {
    this.checkScreenSize();

    const today = new Date();
    if (today.getDate() === 1) {
      await this.userService.resetMonthlyPoints();
    }

    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      this.router.navigate(['/']);
      return;
    }

    this.email = firebaseUser.email;
    this.loading = this.loadingProfile = this.loadingRewards = true;

    (await this.userService.getUserDataFromFirestore(firebaseUser.uid)).subscribe(
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

            if (!this.isTopLevel) this.fetchNextLevelData();
            else this.fetchTopLevelStatus();

            this.loadingProfile = false;

            this.fetchRewards();
            this.fetchRankingData();
          },
          () => {
            this.errorMessage = 'Error loading user data';
            this.showErrorDialog();
            this.loading = false;
            this.loadingProfile = false;
            this.loadingRewards = false;
          }
        );
      },
      () => {
        this.errorMessage = 'Error loading user data';
        this.showErrorDialog();
        this.loading = false;
        this.loadingProfile = false;
        this.loadingRewards = false;
      }
    );
  }


  @HostListener('window:resize', ['$event'])
  onResize() {
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
          this.pointsToNextLevel = (
            (nextLevelData.points ?? 0) - this.currentGlobalPoints
          ).toString();
        }
      },
      () => {
        this.errorMessage = 'Error loading level data';
        this.showErrorDialog();
      }
    );
  }

  private fetchTopLevelStatus(): void {
    this.pointsNeededToMaintain = 150 - this.currentMonthlyPoints;

    if (this.pointsNeededToMaintain <= 0) {
      this.achievedMonthlyPointsMessage =
        "You already achieved the monthly's points! Total monthly points: " +
        this.currentMonthlyPoints;
    } else {
      this.achievedMonthlyPointsMessage = null;
    }
  }


  async fetchRewards() {
    if (!this.levelId) {
      this.loadingRewards = false;
      return;
    }

    this.loadingRewards = true;

    this.userService.getRewards(this.levelId).subscribe(
      (rewardsData) => {
        this.rewards = rewardsData;
        this.loadingRewards = false;
      },
      () => (this.loadingRewards = false)
    );
  }



  async fetchRankingData() {
    this.loading = true;

    this.userService.getRanking().subscribe(
      (rankingData) => {
        this.ranking = rankingData;
        this.loading = false;
      },
      () => (this.loading = false)
    );
  }

  async onDeleteAccount() {
    this.deleting = true;
    this.closeConfirmDeleteDialog();

    try {
      await this.userService.deleteCurrentUser();
      
      this.deleting = false;
      this.redirecting = true;
      
      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 1500);
      
    } catch (err: any) {
      this.deleting = false;

      if (err?.error?.detail) {
        this.errorMessage = err.error.detail;
      } 
      else if (err?.message) {
        this.errorMessage = err.message;
      } 
      else {
        this.errorMessage = "An error occurred. Please try again.";
      }

      this.showErrorDialog();
    }
  }

  async changePassword() {
    this.closeChangePasswordDialog();
    this.redirecting = true;

    try {
      await this.userService.resetPassword(this.email ?? '');
      
      await this.userService.logOut();
      localStorage.removeItem('token');
      
      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 1500);
      
    } catch (error) {
      this.redirecting = false;
      this.errorMessage = 'Error sending password reset email. Please try again.';
      this.showErrorDialog();
    }
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
  
  closeConfirmDeleteDialog() { 
    this.displayConfirmDeleteDialog = false; 
  }

  showInfoPointsDialog() { 
    this.displayInfoPointsDialog = true; 
  }

  showErrorDialog() {
    this.displayConfirmDeleteDialog = false;
    this.displayErrorDialog = true;
  }

  closeErrorDialog() {
    this.displayErrorDialog = false;
    this.errorMessage = null;
  }

  showDiscountCode(reward: any) {
    this.selectedReward = reward;
    this.displayDiscountDialog = true;
  }

  get isLoading(): boolean {
    return this.deleting || this.redirecting;
  }

  get loadingMessage(): string {
    if (this.deleting) return 'Deleting account...';
    if (this.redirecting) return 'Redirecting to login...';
    return '';
  }
}