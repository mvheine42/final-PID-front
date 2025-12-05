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

  // Horarios base → la “fuente de verdad”
  private baseTimes = ['12:00', '13:00', '21:00', '22:00'];

  // Lo que consume el p-dropdown (label, value, disabled)
  timesForUI: Array<{ label: string; value: string; disabled?: boolean }> =
    this.baseTimes.map(t => ({ label: t, value: t }));

  // Rango de fechas (desde mañana hasta +30 días)
  tomorrowLocal: Date = new Date(new Date().setDate(new Date().getDate() + 1));
  maxDateLocal: Date = new Date(new Date().setDate(new Date().getDate() + 30));

  // Estados visuales
  isLoading: boolean = false;
  isNoticeVisible: boolean = false;
  noticeMessage: string = '';

  constructor(private reservationService: ReservationService) {
    emailjs.init('LdaNOsGUxAfLITT4i');
  }

  // === Helpers ===
  private toISODateOnly(d: Date): string {
    return new Date(d).toISOString().split('T')[0];
  }

  // Validar email
  validateEmail() {
    const emailRegex = /\S+@\S+\.\S+/;
    this.emailValid = emailRegex.test(this.userEmail);
  }

  // Cargar disponibilidad al elegir fecha
  async onDateChange(date: Date) {
    this.reservationTime = ''; // limpiar hora seleccionada
    if (!date) {
      this.timesForUI = this.baseTimes.map(t => ({ label: t, value: t }));
      return;
    }

    const iso = this.toISODateOnly(date);
    const slots = await this.reservationService.getAvailableSlots(iso);
    // Map de disponibilidad: true = hay lugar, false = completo
    const availability = new Map<string, boolean>(
      this.baseTimes.map(t => [t, true])
    );
    for (const s of slots) {
      if (this.baseTimes.includes(s.time)) {
        availability.set(s.time, (s.remaining ?? 0) > 0);
      }
    }

    // Armar opciones con disabled y etiqueta “(completo)”
    this.timesForUI = this.baseTimes.map(t => ({
      label: availability.get(t) ? t : `${t} (completo)`,
      value: t,
      disabled: !availability.get(t),
    }));
  }

  // Validación del form
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

  // Enviar la reserva
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

    try {
      this.isLoading = true;
      const response = await this.reservationService.registerReservation(newReservation);
      if(response && response.id) {
        await this.sendReservationEmail(this.userEmail, response.id);
      }
      console.log('Respuesta backend:', response);
      this.noticeMessage = 'Reserva registrada con éxito.';
    } catch (err: any) {
      console.error('Error al registrar reserva:', err);
      const detail = err?.error?.detail || err?.message || '';
      if (typeof detail === 'string' && detail.toLowerCase().includes('horario completo')) {
        this.noticeMessage = 'Ese horario se completó recién. Elegí otro, por favor.';
        if (this.reservationDate) {
          await this.onDateChange(this.reservationDate); // refrescar disponibilidad
        }
      } else {
        this.noticeMessage = 'Ocurrió un error al registrar la reserva.';
      }
    } finally {
      this.isLoading = false;
      this.isNoticeVisible = true;
    }
  }

    async sendReservationEmail(userEmail: string, reservationId: number) {
    const templateParams = {
      reservation_id: reservationId,
      user_email: userEmail
    };  
    try {
      const response = await emailjs.send("service_w1k54me", "template_bt1ked7", templateParams);
      console.log('Correo de reserva enviado:', response);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
    }
  }
  

  // Cerrar diálogo
  closeDialog() {
    this.isNoticeVisible = false;
  }
}
