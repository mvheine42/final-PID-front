import { Component, Output, EventEmitter } from '@angular/core';
import { UserService } from 'src/app/services/user_service';

@Component({
  selector: 'app-user-forgot-password',
  templateUrl: './user-forgot-password.component.html',
  styleUrl: './user-forgot-password.component.css'
})
export class UserForgotPasswordComponent {
  email: string = '';
  visible: boolean = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onFailed = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<void>();


  constructor(private userService: UserService) {}

loading: boolean = false;

  async onForgotPassword() {
    try {
      this.loading = true;
      const response = await this.userService.resetPassword(this.email);
      console.log('Reset successful', response);
      this.closeDialog();
      this.success();
    } catch (error: any) {
      console.error('Reset failed', error);
      this.failed();
    } finally {
      this.loading = false;
    }
  }

  closeDialog() {
    this.onClose.emit();
  }

  success(){
    this.onSuccess.emit();
  }

  failed(){
    this.onFailed.emit();
  }

}
