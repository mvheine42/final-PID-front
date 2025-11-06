import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reservation } from '../models/reservation';

@Injectable({
  providedIn: 'root'
})

export class ReservationService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  async registerReservation(reservation: Reservation): Promise<any | null> {
  try {
    const body = {
      customerName: reservation.customerName,
      userEmail: reservation.userEmail,
      amountOfPeople: reservation.amountOfPeople,
      // 🔧 Asegura que la fecha se mande como "YYYY-MM-DD"
      reservationDate: reservation.reservationDate
        ? new Date(reservation.reservationDate).toISOString().split('T')[0]
        : null,
      reservationTime: reservation.reservationTime,
    };

    const response = await this.http.post(`${this.baseUrl}/make-reservation`, body).toPromise();
    return response;
  } catch (error: any) {
    console.error('Error durante el registro:', error);
    return null;
  }
}

}
