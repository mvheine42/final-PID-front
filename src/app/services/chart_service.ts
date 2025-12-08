import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';
  constructor(private http: HttpClient) { }

  getCategoryRevenue(): Observable<any> {
    const endpoint = `${this.baseUrl}/category-revenue`;
    console.log(`Fetching category revenue from: ${endpoint}`);
    return this.http.get<any>(endpoint);
  }
  getMonthlyRevenue(): Observable<any>{
    const endpoint = `${this.baseUrl}/monthly-revenue`;
    console.log(`Fetching category revenue from: ${endpoint}`);
    return this.http.get<any>(endpoint);
  }
  getAveragePerPerson(year: string, month: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/average-per-person/${year}/${month}`);
}

  getAveragePerTicket(year: string, month: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/average-per-order/${year}/${month}`);
}
}
