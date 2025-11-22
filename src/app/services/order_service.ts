import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/order';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class OrderService {

  //private baseUrl = 'https://candv-back.onrender.com';
  private baseUrl = 'http://127.0.0.1:8000';
  constructor(private http: HttpClient) { }

  async onRegister(order: Order): Promise<any | null> {
    try {
        const response = await this.http.post(`${this.baseUrl}/register-order`, order).toPromise();
        return response;
    } catch (error: any) {
        console.error('Error durante el registro:', error);
        return null;
    }
  }

  async addOrderItems(orderId: string, newItems: any[], total: string): Promise<boolean> {
    try {
      const body = { new_order_items: newItems, new_order_total: total };
      await this.http.put(`${this.baseUrl}/orders/order-items/${orderId}`, body).toPromise();
      
      return true;
    } catch (error: any) {
      console.error('Error adding order items:', error);
      return false;
    }
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}`);
  }

  getOrders(): Observable<Order>{
    return this.http.get<Order>(`${this.baseUrl}/orders`);
  }

  finalizeOrder(orderId: string): Observable<Order> {
    const updatedOrder = { status: 'FINALIZED' };
    return this.http.put<Order>(`${this.baseUrl}/orders-finalize/${orderId}`, updatedOrder);
  }

  getInactiveOrders(): Observable<Order>{
    return this.http.get<Order>(`${this.baseUrl}/orders`);
  }
  
  assignOrderToTable(orderId: number, tableId: number): Observable<any> {
    console.log(`Assigning order ${orderId} to table ${tableId}`);
  
    return this.http.put<any>(`${this.baseUrl}/asign-order-table/${orderId}/${tableId}`, null).pipe(
      tap(response => console.log('Response from API:', response)),
      catchError(error => {
        console.error('Error assigning order to table:', error);
        return throwError(error);
      })
    );
  }

  assignEmployeeToOrder(orderId: number, uid: string){
    return this.http.put<any>(`${this.baseUrl}/assign-order-employee/${orderId}/${uid}`, {});
  }
  deleteOrderItems(orderId: string, orderItems: string[]) {
    return this.http.delete(`${this.baseUrl}/delete-order-item/${orderId}`, {
      body: orderItems 
    });
  }

  serveOrderItem(orderId: string, itemId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/orders/serve-item/${orderId}/${itemId}`, {});
  }

}