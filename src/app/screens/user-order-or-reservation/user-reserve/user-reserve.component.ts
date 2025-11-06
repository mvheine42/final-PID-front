import { Component } from '@angular/core';
import { ReservationService } from 'src/app/services/reservation_service';
import { Reservation } from 'src/app/models/reservation';
import emailjs from 'emailjs-com';

@Component({
  selector: 'app-user-reserve',
  templateUrl: './user-reserve.component.html',
  styleUrls: ['./user-reserve.component.css']
})
export class UserReserveComponent {
  // Datos del formulario
  customerName: string = '';
  userEmail: string = '';
  emailValid: boolean = false;
  amountOfPeople: number = 1;
  reservationDate: Date | null = null;
  reservationTime: string = '';

  // Auxiliares
  allowedTimes = [
    { label: '12:00', value: '12:00' },
    { label: '13:00', value: '13:00' },
    { label: '21:00', value: '21:00' },
    { label: '22:00', value: '22:00' }
  ];
  // todayLocal no, Tomorrow local as min date
  tomorrowLocal: Date = new Date(new Date().setDate(new Date().getDate() + 1));
  maxDateLocal: Date = new Date(new Date().setDate(new Date().getDate() + 30));

  // Estados visuales
  isLoading: boolean = false;
  isNoticeVisible: boolean = false;
  noticeMessage: string = '';

  constructor(private reservationService: ReservationService) {
    emailjs.init("LdaNOsGUxAfLITT4i"); 
  }

  // Validar email
  validateEmail() {
    const emailRegex = /\S+@\S+\.\S+/;
    this.emailValid = emailRegex.test(this.userEmail);
  }

  // Verificar si el formulario está completo
  isFormValid(): boolean {
    return (
      this.customerName.trim() !== '' &&
      this.emailValid &&
      this.amountOfPeople >= 1 &&
      this.amountOfPeople <= 4 &&
      this.reservationDate !== null &&
      this.reservationTime !== ''
    );
  }

  // Enviar la reserva (versión básica)
  async createReservation() {
    if (!this.isFormValid()) {
      this.noticeMessage = 'Completá todos los campos correctamente.';
      this.isNoticeVisible = true;
      return;
    }

    const newReservation = new Reservation(
      this.customerName,
      this.userEmail,
      this.amountOfPeople,
      this.reservationDate!,
      this.reservationTime
    );

    console.log('Reserva creada:', newReservation);
    
    try {
      this.isLoading = true;
      const response = await this.reservationService.registerReservation(newReservation);
      console.log('Respuesta backend:', response);
      this.noticeMessage = 'Reserva registrada con éxito.';
    } catch (err) {
      console.error('Error al registrar reserva:', err);
      this.noticeMessage = 'Ocurrió un error al registrar la reserva.';
    } finally {
      this.isLoading = false;
      this.isNoticeVisible = true;
    }
  }

  // Cerrar diálogo
  closeDialog() {
    this.isNoticeVisible = false;
  }
}
