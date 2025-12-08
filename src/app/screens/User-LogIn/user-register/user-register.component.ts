import { Component, OnInit, HostListener } from '@angular/core';
import { UserData } from 'src/app/models/user';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user_service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-register',
  templateUrl: './user-register.component.html',
  styleUrls: ['./user-register.component.css']
})
export class UserRegisterComponent implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  birthDate!: Date;
  minDate: Date = new Date(1925, 0, 1);
  maxDate: Date = new Date(2009, 11, 31);
  defaultDate: Date = new Date(2000, 0, 1);
  user: UserData | undefined;
  fileName: string = '';
  imageUrl: string = '';
  isMobile: boolean = window.innerWidth <= 800;
  loading: boolean = false;
  animateForm: boolean = false;
  passwordValid = {
    lowercase: false,
    uppercase: false,
    numeric: false,
    minLength: false
  };
  formattedBirthDate: string = '';
  displayConfirmDialog: boolean = false;
  displayErrorDialog: boolean = false;
  errorMessage: string = '';

  compressingImage: boolean = false;
  registering: boolean = false;

  ngOnInit(): void {
    localStorage.removeItem("token");
  }

  constructor(
    private userService: UserService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  async onRegister() {
    try {
      this.closeConfirmDialog();
      this.registering = true;
      this.formattedBirthDate = this.datePipe.transform(this.birthDate, 'dd/MM/yyyy') || '';
                
      const response = await this.userService.onRegister(this.email, this.password, this.name, this.formattedBirthDate, this.imageUrl);
      
      if(response){
        await this.userService.login(this.email, this.password);
        this.router.navigate(['/home']);
      }
    
    } catch (error: any) {
      console.error('Register failed:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'This email is already registered. Please use a different email or log in.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'Invalid email format. Please check your email address.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/operation-not-allowed') {
        this.errorMessage = 'Email/password accounts are not enabled. Please contact support.';
      } else if (error.message) {
        this.errorMessage = `Registration error: ${error.message}`;
      } else {
        this.errorMessage = 'An unexpected error occurred during registration. Please try again.';
      }
      
      this.showErrorDialog(); 
    } finally {
      this.registering = false;
    }
  }

  async onImageSelect(event: any) {
    const file = event.files[0];
    this.fileName = file.name;
    
    this.compressingImage = true;

    try {
      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      this.imageUrl = compressedBase64;
    } catch (error) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } finally {
      this.compressingImage = false;
    }
  }

  private compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          const sizeInKB = Math.round(compressedBase64.length / 1024);
          if (sizeInKB > 800) {
            const recompressed = canvas.toDataURL('image/jpeg', 0.5);
            resolve(recompressed);
          } else {
            resolve(compressedBase64);
          }
        };

        img.onerror = () => reject(new Error('Error cargando la imagen'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsDataURL(file);
    });
  }

  onImageClear(fileUpload: any) {
    this.fileName = ''; 
    this.imageUrl = ''; 
    fileUpload.clear(); 
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isMobile = window.innerWidth <= 800;
  } 

  onLogInClick() {
    this.router.navigate(['/']);
  }

  isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email.trim());
  }

  validatePassword() {
    const password = this.password || '';

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

  doPasswordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.trim() !== '';
  }

  areAllFieldsFilled(): boolean {
    return this.name.trim() !== '' &&
          this.isEmailValid() &&
          this.password.trim() !== '' &&
          this.confirmPassword.trim() !== '' &&
          this.doPasswordsMatch() &&
          this.birthDate !== undefined &&
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

  get isLoading(): boolean {
    return this.loading || this.compressingImage || this.registering;
  }
}