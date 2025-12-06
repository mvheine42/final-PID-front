import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { auth } from '../services/firebaseconfig';
import { AuthService } from '../services/auth_service';
import { signInWithEmailAndPassword, sendPasswordResetEmail, deleteUser, createUserWithEmailAndPassword, User, confirmPasswordReset } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  currentUser: User | null = null;
  currentUserData: any = null;
  currentData: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient, private authService: AuthService) {}

  async onRegister(email: string, password: string, name: string, birthday: string, imageUrl: string): Promise<boolean> {
    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();
      
      // Preparar los datos adicionales para enviar al backend
      const data = {
        uid: firebaseUser.uid,
        name: name,
        birthday: birthday,
        imageUrl: imageUrl
      };
      
      console.log('Registering user in backend:', data);
      await this.http.post(`${this.baseUrl}/register/`, data, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).toPromise();
      
      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        const token = await user.getIdToken();
        const data = {
          uid: user.uid,
          name: name,
          birthday: birthday,
          imageUrl: imageUrl
        };
        await this.http.post(`${this.baseUrl}/register/`, data, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).toPromise();
        return true;
      }
      throw error;
    }
  }
  
  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user?.uid;
      this.currentUser = userCredential.user;
      const user = userCredential.user;
      
      if (uid) {
        const userData = await this.getUserData(uid);
        userData.uid = uid;
        this.currentUserData = userData;
        this.currentData.next(userData);
      }
      
      // ✅ Inactivity detection now handled by AuthService automatically
      return true;  
    } catch (error) {
      console.error('Error al iniciar sesión', error);
      return false;
    }
  }

  async getUserData(uid: string): Promise<any> { 
    const url = `${this.baseUrl}/users/${uid}`;
    return this.http.get(url).toPromise();
  }

  async getUserDataFromFirestore(uid: string): Promise<Observable<any>> { 
    const url = `${this.baseUrl}/users/${uid}`; 
    return this.http.get(url);
  }
  
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent!');
    } catch (error: any) {
      console.error('Error sending password reset email:', error.message);
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string) {
    return confirmPasswordReset(auth, oobCode, newPassword);
  }

async deleteCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      // Delete from backend (sin await - fire and forget)
      this.http.delete(`${this.baseUrl}/users/${user.uid}`).toPromise();
      
      // Delete from Firebase (CON await - esperar esto)
      await deleteUser(user);
      
      console.log('User deleted successfully');
      
      // Limpiar datos locales
      this.currentUser = null;
      this.currentUserData = null;
      this.currentData.next(null);
      
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  } else {
    return Promise.reject('No user is currently logged in');
  }
}

  async logOut(): Promise<void> {
    this.currentUser = null;
    this.currentUserData = null;
    this.currentData.next(null);
    
    // ✅ Delegate logout to AuthService (handles cleanup)
    return this.authService.logout();
  }

  getRanking(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ranking/`);
  }

  getRewards(levelId: string): Observable<any> {
    const url = `${this.baseUrl}/rewards/${levelId}`;
    return this.http.get(url); 
  }

  checkUserLevel(uid: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/check-level/${uid}`);
  }

  getTopLevelStatus(levelId: string): Observable<{ isTopLevel: boolean }> {
    return this.http.get<{ isTopLevel: boolean }>(`${this.baseUrl}/top-level-status/${levelId}`);
  }
  
  resetMonthlyPoints() {
    const url = `${this.baseUrl}/reset-monthly-points`; 
    return this.http.get(url); 
  }
}