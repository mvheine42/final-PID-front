import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { OrderService } from 'src/app/services/order_service';
import emailjs from 'emailjs-com';

@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.css']
})
export class CreateOrderComponent {
  @Input() isVisible: boolean = false;
  @Output() orderCreated = new EventEmitter<Order>();
  @Output() closeModal = new EventEmitter<void>();

  @Input() orderItems: OrderItem[] = [];
  @Input() total: number = 1;

  // Datos de la orden / reserva
  amountOfPeople: number = 1;
  userEmail: string = '';
  emailValid: boolean = false;

  // Campos de reserva nuevos
  customerName: string = '';
  reservationDate: string = '';   // YYYY-MM-DD
  reservationTime: string = '';   // HH:mm

  // UI (loader + notice)
  isLoading: boolean = false;
  isNoticeVisible: boolean = false;
  noticeMessage: string = '';

  constructor(private orderService: OrderService) {
    emailjs.init('LdaNOsGUxAfLITT4i');
  }

  // ====== Helpers de fecha/hora ======
  get todayLocal(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Límites visibles (también conviene setearlos en el HTML)
  get openingHoursMin(): string { return '07:00'; }
  get openingHoursMax(): string { return '23:00'; }

  private get isToday(): boolean {
    return (this.reservationDate || '') === this.todayLocal;
  }

  private buildLocalDate(dateStr: string, timeStr: string): Date {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  }

  private isAtLeastOneHourAhead(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr) return false;

    // Si la fecha es futura (mayor a hoy), NO exigimos +1h
    if (dateStr > this.todayLocal) return true;

    // Si la fecha es hoy, pedimos +1h
    const now = new Date();
    const selected = this.buildLocalDate(dateStr, timeStr);
    const diffMs = selected.getTime() - now.getTime();
    return diffMs >= 60 * 60 * 1000;
  }

   isWithinOpeningHours(timeStr: string): boolean {
    if (!timeStr) return false;
    const [hh, mm] = timeStr.split(':').map(Number);
    const minutes = (hh ?? 0) * 60 + (mm ?? 0);
    const open = 7 * 60;   // 07:00
    const close = 23 * 60; // 23:00
    return minutes >= open && minutes <= close;
  }

  // ====== Validaciones ======
  validateEmail(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    this.emailValid = emailRegex.test((this.userEmail || '').trim());
  }

  private isFormValid(): boolean {
    const hasItems = (this.orderItems?.length ?? 0) > 0;
    const peopleOk = this.amountOfPeople >= 1;
    const nameOk = (this.customerName || '').trim().length > 0;

    // Desde hoy en adelante
    const dateOk = !!this.reservationDate && this.reservationDate >= this.todayLocal;

    // Dentro del horario del local
    const timeOk = !!this.reservationTime && this.isWithinOpeningHours(this.reservationTime);

    // +1h si es hoy; sin restricción si es futura
    const timeAheadOk = this.isAtLeastOneHourAhead(this.reservationDate, this.reservationTime);

    const emailOk = this.emailValid;

    return hasItems && peopleOk && nameOk && dateOk && timeOk && timeAheadOk && emailOk;
  }

  // ====== Crear orden ======
  async createOrder(): Promise<void> {
    // Validación previa con mensajes claros
    if (!this.isFormValid()) {
      if (!this.reservationDate || this.reservationDate < this.todayLocal) {
        this.noticeMessage = 'Please choose today or a future date.';
      } else if (!this.isWithinOpeningHours(this.reservationTime)) {
        this.noticeMessage = 'Reservations are only available from 07:00 to 23:00.';
      } else if (!this.isAtLeastOneHourAhead(this.reservationDate, this.reservationTime)) {
        this.noticeMessage = this.isToday
          ? 'Same-day reservations must be made at least 1 hour in advance.'
          : 'Please complete all required fields (name, email, date & time, people).';
      } else {
        this.noticeMessage = 'Please complete all required fields (name, email, date & time, people).';
      }
      this.isNoticeVisible = true;
      return;
    }

    this.isVisible = false;
    this.isLoading = true;

    const newOrder: Order = {
      status: 'INACTIVE',
      amountOfPeople: this.amountOfPeople,
      tableNumber: 0,
      // Guardamos la fecha/hora de la *reserva* (no el "ahora")
      date: this.reservationDate,
      time: this.reservationTime,
      total: this.total.toString(),
      orderItems: this.orderItems,
      // Usamos customerName en employee (ajustá si tu API espera otro campo)
      employee: (this.customerName || '').trim()
    };

    try {
      const response = await this.orderService.onRegister(newOrder);
      if (response && response.order_id) {
        const orderId = response.order_id;
        await this.sendOrderEmail(orderId, this.userEmail);
        this.orderCreated.emit(newOrder);
        this.noticeMessage = 'Order successfully created. We sent you an email with your order ID.';
      } else {
        this.noticeMessage = 'Could not create the order. Please try again.';
      }
      this.isNoticeVisible = true;
    } catch (error) {
      console.error('Error creating order:', error);
      this.noticeMessage = 'An error has occurred. Please try again later.';
      this.isNoticeVisible = true;
    } finally {
      this.isLoading = false;
    }
  }

  private async sendOrderEmail(orderId: number, userEmail: string) {
    const templateParams = { order_id: orderId, user_email: userEmail };
    try {
      await emailjs.send('service_w1k54me', 'template_kt0eloo', templateParams);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  // ====== Cierres ======
  closeDialog(): void {
    this.closeModal.emit();
  }
}
