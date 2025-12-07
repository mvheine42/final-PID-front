import { Component, OnInit, HostListener } from '@angular/core';
import { UserService } from 'src/app/services/user_service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from 'src/app/services/firebaseconfig';


@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.css'
})
export class LogInComponent implements OnInit {
  email: string = '';
  password: string = '';
  isMobile: boolean = window.innerWidth <= 800;
  displayForgotPasswordDialog: boolean = false;
  animateForm: boolean = false;
  loading: boolean = false; 
  displayErrorDialog: boolean = false;
  displayEmailDialog: boolean = false;
  message: string = '';

  constructor(
    private userService: UserService, 
    private router: Router, 
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(auth, user => {
      if (user) {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    });
  }

  async onLogin() {
    this.loading = true;
    const loginSuccess = await this.userService.login(this.email, this.password);
    
    setTimeout(async () => {
      this.loading = false;
    }, 1000);

    if (loginSuccess) {
      this.router.navigate(['/home']);
      this.loading = false;
    } else {
      this.showErrorDialog();    
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isMobile = window.innerWidth <= 800;
  }

  showForgotPasswordDialog() {
    this.displayForgotPasswordDialog = true;
  }

  closeForgotPasswordDialog() {
    this.displayForgotPasswordDialog = false;
  }

  onSignUpClick() {
    this.animateForm = true;
    this.router.navigate(['/user-register']);
  }

  showErrorDialog() {
    this.displayErrorDialog = true;
  }

  closeErrorDialog() {
    this.displayErrorDialog = false;
  }

  showEmailDialog(message: string) {
    this.message = message;
    this.displayEmailDialog = true;
  }

  closeEmailDialog() {
    this.displayEmailDialog = false;
  }
}