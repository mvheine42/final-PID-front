import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { auth } from '../services/firebaseconfig';
import { AuthService } from '../services/auth_service';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, User, confirmPasswordReset, deleteUser } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  currentUser: User | null = null;
  currentUserData: any = null;
  currentData: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient, private authService: AuthService) {}

  async onRegister(email: string, password: string, name: string, birthday: string, imageUrl: string): Promise<boolean> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();
      
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
    } catch (error: any) {
      throw error;
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string) {
    return confirmPasswordReset(auth, oobCode, newPassword);
  }

  async deleteCurrentUser(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No user is currently logged in');
    }

    const email = user.email!;
    const uid = user.uid;

    try {

      const password = prompt("Por seguridad, ingresá tu contraseña para eliminar tu cuenta:");

      if (!password) {
        throw new Error("Password is required to delete account.");
      }

      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);

      await this.http.delete(`${this.baseUrl}/users/${uid}`).toPromise();

      localStorage.clear();
    
      sessionStorage.clear();
    
      this.currentUser = null;
      this.currentUserData = null;
      this.currentData.next(null);
      
      await auth.signOut();
      
      console.log("Session cleared completely");

    } catch (error: any) {
      console.error("Error deleting user:", error);

      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        throw new Error('Incorrect password. Please try again.');
      }

      if (error?.code === 'auth/requires-recent-login') {
        throw new Error('Please log in again before deleting your account.');
      }

      if (error?.error?.detail) {
        throw error; 
      }
      throw error;
    }
  }

  async logOut(): Promise<void> {
    this.currentUser = null;
    this.currentUserData = null;
    this.currentData.next(null);
    
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
    return this.http.get(`${this.baseUrl}/check-level-user/${uid}`);
  }

  getTopLevelStatus(levelId: string): Observable<{ isTopLevel: boolean }> {
    return this.http.get<{ isTopLevel: boolean }>(`${this.baseUrl}/top-level-status/${levelId}`);
  }
  
  resetMonthlyPoints() {
    const url = `${this.baseUrl}/reset-monthly-points`; 
    return this.http.get(url); 
  }
}