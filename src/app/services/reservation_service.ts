import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Reservation } from '../models/reservation';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  // Crea la reserva
  async registerReservation(reservation: Reservation): Promise<any | null> {
    try {
      const body = {
        customerName: reservation.customerName,
        userEmail: reservation.userEmail,
        amountOfPeople: reservation.amountOfPeople,
        reservationDate: reservation.reservationDate
          ? new Date(reservation.reservationDate).toISOString().split('T')[0]
          : null,
        reservationTime: reservation.reservationTime,
      };

      const response = await this.http
        .post(`${this.baseUrl}/make-reservation`, body)
        .toPromise();
      return response;
    } catch (error: any) {
      console.error('Error durante el registro:', error);
      throw error; 
    }
  }

  // Obtiene disponibilidad de un día
  async getAvailableSlots(dateISO: string): Promise<Array<{ time: string; remaining: number }>> {
    try {
      const resp = await this.http
        .get<Array<{ time: string; remaining: number }>>(
          `${this.baseUrl}/available-slots/${dateISO}`
        )
        .toPromise();
      return resp ?? [];
    } catch (e) {
      console.error('Error obteniendo slots:', e);
      return [];
    }
  }

  getReservationsByDay(dateISO: string): Promise<Reservation[]> {
    return this.http
      .get<Reservation[]>(`${this.baseUrl}/reservations/day/${dateISO}`)
      .toPromise()
      .then(res => res ?? [])
      .catch(err => {
        console.error('Error obteniendo reservas del día:', err);
        return [];
      });
  }

  // --- ¡ESTA ES LA QUE FALTABA! ---
  cancelReservation(reservationId: number | string): Promise<any> {
    // Llama a tu endpoint POST /cancel-reservation/{id}
    const url = `${this.baseUrl}/cancel-reservation/${reservationId}`;
    // Enviamos un body vacío {} porque es un POST
    return this.http.post(url, {}).toPromise();
  }

}