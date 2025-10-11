import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { OrderService } from 'src/app/services/order_service';
import emailjs from 'emailjs-com';

@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.css']
})
export class CreateOrderComponent implements OnInit {
  // Visibilidad y eventos
  @Input() isVisible: boolean = false;
  @Output() orderCreated = new EventEmitter<Order>();
  @Output() closeModal = new EventEmitter<void>();

  // Datos del carrito
  @Input() orderItems: OrderItem[] = [];
  @Input() total: number = 1;

  // ====== Form ======
  amountOfPeople = 1;
  userEmail = '';
  emailValid = false;
  customerName = '';

  // p-calendar usa Date; dropdown de hora mantiene 'HH:mm'
  reservationDate: Date | null = null;
  reservationTime: string = ''; // 'HH:mm'

  // Horarios permitidos (tu set fijo)
  allowedTimeOptions = [
    { label: '12:00', value: '12:00' },
    { label: '13:00', value: '13:00' },
    { label: '14:00', value: '14:00' },
    { label: '15:00', value: '15:00' },
    { label: '20:00', value: '20:00' },
    { label: '21:00', value: '21:00' },
    { label: '22:00', value: '22:00' },
    { label: '23:00', value: '23:00' },
  ];

  // ====== UI ======
  isLoading = false;
  isNoticeVisible = false;
  noticeMessage = '';

  // Límites de fecha para p-calendar
  today = new Date();
  maxDate = new Date();

  constructor(private orderService: OrderService) {
    // Inicializá EmailJS con tu user/public key
    emailjs.init('LdaNOsGUxAfLITT4i');
  }

  ngOnInit(): void {
    // Normalizar "today" (00:00 local) y calcular maxDate = hoy + 30 días
    this.today = this.atStartOfDay(new Date());
    this.maxDate = this.atStartOfDay(new Date());
    this.maxDate.setDate(this.maxDate.getDate() + 30);
  }

  // ====== Helpers de fecha ======
  private atStartOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private isDateWithinNext30Days(dateObj: Date | null): boolean {
    if (!dateObj) return false;
    const sel = this.atStartOfDay(dateObj);
    return sel >= this.today && sel <= this.maxDate;
  }

  /** Formatea Date (local) a 'YYYY-MM-DD' sin offset de TZ */
  private formatDateYYYYMMDD(dateObj: Date): string {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ====== Email ======
  validateEmail(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    this.emailValid = emailRegex.test((this.userEmail || '').trim());
  }

  // ====== Validación del formulario ======
  private isFormValid(): boolean {
    const hasItems = (this.orderItems?.length ?? 0) > 0;
    const peopleOk = this.amountOfPeople >= 1 && this.amountOfPeople <= 4;
    const nameOk = (this.customerName || '').trim().length > 0;
    const dateOk = this.isDateWithinNext30Days(this.reservationDate);
    const timeOk = !!this.reservationTime && this.allowedTimeOptions.some(o => o.value === this.reservationTime);
    const emailOk = this.emailValid;
    return hasItems && peopleOk && nameOk && dateOk && timeOk && emailOk;
  }

  // ====== Crear orden ======
  async createOrder(): Promise<void> {
    if (!this.isFormValid()) {
      if (!this.reservationDate || !this.isDateWithinNext30Days(this.reservationDate)) {
        this.noticeMessage = 'Elegí una fecha entre hoy y los próximos 30 días.';
      } else if (!this.reservationTime || !this.allowedTimeOptions.some(o => o.value === this.reservationTime)) {
        this.noticeMessage = 'Seleccioná un horario válido (12-15 o 20-23 hs).';
      } else if (!this.emailValid) {
        this.noticeMessage = 'Ingresá un email válido.';
      } else if ((this.customerName || '').trim().length < 1) {
        this.noticeMessage = 'Completá el nombre para la reserva.';
      } else if ((this.orderItems?.length ?? 0) === 0) {
        this.noticeMessage = 'El carrito está vacío.';
      } else {
        this.noticeMessage = 'Completá todos los campos requeridos.';
      }
      this.isNoticeVisible = true;
      return;
    }

    this.isLoading = true;

    // Normalizar fecha a 'YYYY-MM-DD' y dejar hora como 'HH:mm'
    const dateStr = this.formatDateYYYYMMDD(this.reservationDate!);
    const timeStr = this.reservationTime;

    const newOrder: Order = {
      status: 'INACTIVE',
      amountOfPeople: this.amountOfPeople,
      tableNumber: 0,
      date: dateStr,
      time: timeStr,
      total: this.total.toString(),
      orderItems: this.orderItems,
      employee: ''
    };

    try {
      const response = await this.orderService.onRegister(newOrder);

      if (response && response.order_id) {
        const orderId = response.order_id;

        // Enviar email (no bloquear la UI si falla)
        try {
          await this.sendOrderEmail(orderId, this.userEmail);
        } catch (e) {
          console.error('Error enviando email:', e);
        }

        this.isLoading = false;

        // ===== Mostrar el notice =====
        this.noticeMessage = 'Tu orden fue creada exitosamente. Te enviamos el ID por email.';
        this.isNoticeVisible = true;
        
        // Notificar al padre para vaciar el carrito
        this.orderCreated.emit(newOrder);

      } else {
        this.isLoading = false;
        this.noticeMessage = 'No se pudo crear la orden. Intentá nuevamente.';
        this.isNoticeVisible = true;
      }
    } catch (error) {
      console.error('Error creando la orden:', error);
      this.isLoading = false;
      this.noticeMessage = 'Ocurrió un error. Intentá más tarde.';
      this.isNoticeVisible = true;
    }
  }

  private async sendOrderEmail(orderId: number, userEmail: string) {
    const templateParams = { order_id: orderId, user_email: userEmail };
    return emailjs.send('service_w1k54me', 'template_kt0eloo', templateParams);
  }

  // Cierre manual del notice
  closeNotice(): void {
    this.isNoticeVisible = false;
    // Cerrar el diálogo principal
    this.isVisible = false;
    // Cerrar todo completamente
    this.closeModal.emit();
  }

  // Cierre del modal principal
  closeDialog(): void {
    this.closeModal.emit();
  }
}