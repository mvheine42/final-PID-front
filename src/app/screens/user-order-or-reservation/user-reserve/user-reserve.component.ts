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
  customerName: string = '';
  userEmail: string = '';
  emailValid: boolean = false;
  amountOfPeople: number = 1;
  reservationDate: Date | null = null;
  reservationTime: string = '';

  readonly MAX_NAME_LENGTH = 20;

  private baseTimes = ["12:00", "18:00", "20:00", "22:00"];

  timesForUI: Array<{ label: string; value: string; disabled?: boolean }> =
    this.baseTimes.map(t => ({ label: t, value: t }));

  tomorrowLocal: Date = new Date(new Date().setDate(new Date().getDate() + 1));
  maxDateLocal: Date = new Date(new Date().setDate(new Date().getDate() + 30));

  loadingAvailability: boolean = false;
  creatingReservation: boolean = false;
  sendingEmail: boolean = false;

  isNoticeVisible: boolean = false;
  noticeMessage: string = '';
  isSuccessReservation: boolean = false;

  createdReservationInfo: {
    name: string;
    date: string;
    time: string;
  } | null = null;

  constructor(private reservationService: ReservationService) {
    emailjs.init('LdaNOsGUxAfLITT4i');
  }

  private toISODateOnly(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  validateEmail() {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.emailValid = emailRegex.test(this.userEmail.trim());
  }

  async onDateChange(date: Date) {
    this.reservationTime = '';
    if (!date) {
      this.timesForUI = this.baseTimes.map(t => ({ label: t, value: t }));
      return;
    }

    this.loadingAvailability = true;
    const iso = this.toISODateOnly(date);
    
    try {
      const slots = await this.reservationService.getAvailableSlots(iso);
      const availability = new Map<string, boolean>(
        this.baseTimes.map(t => [t, true])
      );
      
      for (const s of slots) {
        if (this.baseTimes.includes(s.time)) {
          availability.set(s.time, (s.remaining ?? 0) > 0);
        }
      }

      this.timesForUI = this.baseTimes.map(t => ({
        label: availability.get(t) ? t : `${t} (completo)`,
        value: t,
        disabled: !availability.get(t),
      }));
    } catch (error) {
      this.timesForUI = this.baseTimes.map(t => ({ label: t, value: t }));
    } finally {
      this.loadingAvailability = false;
    }
  }

  isFormValid(): boolean {
    return (
      this.customerName.trim() !== '' &&
      this.customerName.length <= this.MAX_NAME_LENGTH &&
      this.emailValid &&
      this.amountOfPeople >= 1 &&
      this.amountOfPeople <= 4 &&
      this.reservationDate !== null &&
      this.reservationTime !== ''
    );
  }

  async createReservation() {

    if (!this.isFormValid()) {
      this.noticeMessage = 'Please fill in all the required fields.';
      this.isSuccessReservation = false;
      this.isNoticeVisible = true;
      return;
    }

    const reservationDateBA = this.toISODateOnly(this.reservationDate!);

    const newReservation = new Reservation(
      this.customerName.trim(),
      this.userEmail.trim(),
      this.amountOfPeople,
      reservationDateBA as any,
      this.reservationTime
    );

    try {
      this.creatingReservation = true;
      const response = await this.reservationService.registerReservation(newReservation);
      
      if (!response || !response.id) {
        throw new Error('No confirmation from server');
      }


      this.createdReservationInfo = {
        name: this.customerName.trim(),
        date: this.formatDateForDisplay(this.reservationDate!),
        time: this.reservationTime
      };

      this.creatingReservation = false;

      try {
        await this.sendReservationEmail(this.userEmail.trim(), response.id, this.customerName.trim(), this.reservationDate!, this.reservationTime, this.amountOfPeople);
        this.noticeMessage = this.buildSuccessMessage();
        this.isSuccessReservation = true;
      } catch (emailError: any) {
        if (emailError.message === 'EMAIL_INVALID') {
          this.noticeMessage = 'The email is not valid. The reservation was created successfully, but the email could not be sent, please check your email.';
          this.isSuccessReservation = false;
        } else {
          this.noticeMessage = this.buildSuccessMessage() + '\n\n⚠️ Note: The email could not be sent, but the reservation was created successfully.';
          this.isSuccessReservation = true;
        }
      }
      
    } catch (err: any) {
      const detail = err?.error?.detail || err?.message || '';
      
      if (typeof detail === 'string' && detail.toLowerCase().includes('complete')) {
        this.noticeMessage = 'The time for this date is full. Please choose another date or time.';
        if (this.reservationDate) {
          await this.onDateChange(this.reservationDate);
        }
      } else {
        this.noticeMessage = 'There was an error creating your reservation. Please try again.';
      }
      
      this.isSuccessReservation = false;
      this.creatingReservation = false;
      this.sendingEmail = false;
      
    } finally {
      this.isNoticeVisible = true;
    }
  }

  async sendReservationEmail(userEmail: string, reservationId: number, customerName: string, reservationDate: Date, reservationTime: string, amountOfPeople: number) {
    this.sendingEmail = true;
    
    const templateParams = {
      reservation_id: reservationId,
      user_email: userEmail,
      customer_name: customerName,
      reservation_date: this.formatDateForDisplay(reservationDate),
      reservation_time: reservationTime,
      amount_of_people: amountOfPeople
    };
    
    try {
      const response = await emailjs.send("service_w1k54me", "template_bt1ked7", templateParams);
      return true;
    } catch (error: any) {
      if (error?.status === 422 || error?.text?.includes('corrupted')) {
        throw new Error('EMAIL_INVALID');
      }
      return false;
    } finally {
      this.sendingEmail = false;
    }
  }

  private formatDateForDisplay(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private buildSuccessMessage(): string {
    if (!this.createdReservationInfo) return 'Reservation successful.';

    return `¡Reservation successful!

📅 Date: ${this.createdReservationInfo.date}
🕐 Time: ${this.createdReservationInfo.time}
👤 Name: ${this.createdReservationInfo.name}

Please, announce yourserlf with you name: "${this.createdReservationInfo.name}" in the bar at the indicated time.

⚠️ IMPORTANT:
• You have 15 minutes of tolerance.
• Passed that time, the reservation will be canceled.

To cancel your reservation, contact the bar staff at: cvbar08@gmail.com

¡Can't wait to have a good time! 🍺`;
  }

  closeDialog() {
    this.isNoticeVisible = false;
    if (this.isSuccessReservation) {
      this.resetForm();
    }
  }
  private resetForm() {
    this.customerName = '';
    this.userEmail = '';
    this.emailValid = false;
    this.amountOfPeople = 1;
    this.reservationDate = null;
    this.reservationTime = '';
    this.timesForUI = this.baseTimes.map(t => ({ label: t, value: t }));
    this.createdReservationInfo = null;
    this.isSuccessReservation = false;
  }

  get isLoading(): boolean {
    return this.loadingAvailability || this.creatingReservation || this.sendingEmail;
  }
}