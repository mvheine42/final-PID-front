import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Goal } from '../models/goal';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  //private baseUrl = 'https://final-pid-back.onrender.com';
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}
  async createGoal(goal: Goal): Promise<any | null> {
    try {
        const response = await this.http.post(`${this.baseUrl}/create-goal`, goal).toPromise();
        return response;
    } catch (error: any) {
        console.error('Error durante el registro:', error);
        return null;
    }
  }

  getGoals(month: string, year: string): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${this.baseUrl}/goals/${month}/${year}`);
}
}
