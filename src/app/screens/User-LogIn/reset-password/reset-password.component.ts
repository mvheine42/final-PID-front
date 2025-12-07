import { Component } from '@angular/core';
import { getAuth, confirmPasswordReset } from 'firebase/auth';
import { Router } from '@angular/router';


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  email: string = '';
  newPassword: string = '';  
  oobCode: string = '';      
  errorMessage: string = '';  
  successMessage: string = '';
  passwordValid = {
    lowercase: false,
    uppercase: false,
    numeric: false,
    minLength: false
  };
  displayConfirmDialog: boolean = false;
  displayErrorDialog: boolean = false;
  constructor(private router: Router) {
    const urlParams = new URLSearchParams(window.location.search);
    this.oobCode = urlParams.get('oobCode') || '';
  }

  async confirmPasswordReset() {
    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, this.oobCode, this.newPassword);
      this.successMessage = 'Password reset successful!';
      this.errorMessage = '';
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.errorMessage = 'Error resetting password: ' + error.message;
      this.successMessage = '';
    }
  }
  validatePassword() {
    const password = this.newPassword || '';

    // Validaciones
    this.passwordValid.lowercase = /[a-z]/.test(password);
    this.passwordValid.uppercase = /[A-Z]/.test(password);
    this.passwordValid.numeric = /[0-9]/.test(password);
    this.passwordValid.minLength = password.length >= 8;
  }

  isPasswordValid(): boolean {
    return this.passwordValid.lowercase && 
           this.passwordValid.uppercase && 
           this.passwordValid.numeric && 
           this.passwordValid.minLength;
  }
  areAllFieldsFilled(): boolean {
    return this.newPassword.trim() !== '' && 
           this.isPasswordValid();
  }
  
  showConfirmDialog() {
    this.displayConfirmDialog = true;
  }

  closeConfirmDialog() {
    this.displayConfirmDialog = false;
  }

  showErrorDialog() {
    this.displayErrorDialog = true;
  }

  closeErrorDialog() {
    this.displayErrorDialog = false;
  }
}
