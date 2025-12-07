import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { auth } from '../services/firebaseconfig'; 
import { signInWithEmailAndPassword, sendPasswordResetEmail, deleteUser, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, UserCredential, User, onAuthStateChanged, setPersistence, browserSessionPersistence, signOut, confirmPasswordReset } from 'firebase/auth';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})

export class LevelService {
  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';
  constructor(private http: HttpClient) { }

  getLevel(levelId: string):Observable<string>{
    const endpoint = `${this.baseUrl}/level/${levelId}`; 
    return this.http.get<string>(endpoint);
  }
}