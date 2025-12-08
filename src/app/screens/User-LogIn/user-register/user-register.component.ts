import { Component, OnInit, HostListener } from '@angular/core';
import { UserData } from 'src/app/models/user';
import { ConfirmationService } from 'primeng/api';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user_service';
import { MessageService } from 'primeng/api';
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

  // --- LOADING STATES ---
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

      console.log(this.formattedBirthDate);
                
      const response = await this.userService.onRegister(this.email, this.password, this.name, this.formattedBirthDate, this.imageUrl);
      console.log(response);
      if(response){
        await this.userService.login(this.email, this.password);
        this.router.navigate(['/home']);
      }
    
    } catch (error: any) {
      console.error('Register failed', error);
      if(error.code === 'auth/email-already-in-use'){
        this.showErrorDialog(); 
      } else {
        this.showErrorDialog();
      } 
    } finally {
      this.registering = false;
    }
  }

  // 🔥 NUEVA FUNCIÓN: Comprimir imagen
  async onImageSelect(event: any) {
    const file = event.files[0];
    this.fileName = file.name;
    
    this.compressingImage = true;

    try {
      // Comprimir la imagen antes de convertirla a base64
      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      this.imageUrl = compressedBase64;
      
      console.log('Imagen comprimida. Tamaño:', Math.round(compressedBase64.length / 1024), 'KB');
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      // Fallback: usar imagen original (puede fallar en backend)
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } finally {
      this.compressingImage = false;
    }
  }

  // 🔥 FUNCIÓN DE COMPRESIÓN
  private compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo aspect ratio
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

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 con compresión
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Validar tamaño (máximo ~500KB en base64)
          const sizeInKB = Math.round(compressedBase64.length / 1024);
          if (sizeInKB > 800) {
            console.warn(`Imagen todavía grande (${sizeInKB}KB). Recomprimiendo...`);
            // Recomprimir con menor calidad
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

  areAllFieldsFilled(): boolean {
    return this.name.trim() !== '' &&
          this.isEmailValid() &&
          this.password.trim() !== '' &&
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