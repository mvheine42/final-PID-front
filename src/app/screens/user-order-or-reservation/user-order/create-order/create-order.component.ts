import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { OrderService } from 'src/app/services/order_service';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';



@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.css']
})
export class CreateOrderComponent {
  @Input() isVisible: boolean = false;
  @Output() orderCreated = new EventEmitter<Order>(); 
  @Output() closeModal = new EventEmitter(); 
  @Input() orderItems: OrderItem[] = [];
  @Input() total: number = 1;
  amountOfPeople: number = 1; 
  userEmail: string = '';
  emailValid: boolean = false;

  // Nuevas propiedades
  isLoading: boolean = false; // Estado de carga
  isNoticeVisible: boolean = false; // Estado del diálogo de notificación
  noticeMessage: string = ''; // Mensaje para el diálogo de notificación

  constructor(private orderService: OrderService) {
    emailjs.init("LdaNOsGUxAfLITT4i"); 
   } 

  validateEmail() {
    const emailRegex = /\S+@\S+\.\S+/;
    this.emailValid = emailRegex.test(this.userEmail);
  }

  async createOrder() {
    this.isVisible = false;
    this.isLoading = true; // Iniciar carga
  
    const newOrder: Order = {
      status: 'INACTIVE',
      amountOfPeople: this.amountOfPeople,
      tableNumber: 0, 
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(), 
      total: this.total.toString(), 
      orderItems: this.orderItems,
      employee: ''
    };
  
    try {
      const response = await this.orderService.onRegister(newOrder); 
      if (response && response.order_id) {
        const orderId = response.order_id; 

        await this.sendOrderEmail(orderId, this.userEmail);
      }
      this.noticeMessage = 'Order Successfully created. An email was sent to you with your id order.';
      this.isNoticeVisible = true; 
    } catch (error) {
      console.error('Error al crear la orden:', error);
      this.noticeMessage = 'An error has occurred. Please try again later.';
      this.isNoticeVisible = true;
    } finally {
      this.isLoading = false; 
    }
  }
  
  async sendOrderEmail(orderId: number, userEmail: string) {
    const templateParams = {
      order_id: orderId,
      user_email: userEmail
    };
  
    try {
      const response = await emailjs.send("service_w1k54me", "template_kt0eloo", templateParams);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
    }
  }
  
  


  closeDialog() {
    this.closeModal.emit();
  }
}