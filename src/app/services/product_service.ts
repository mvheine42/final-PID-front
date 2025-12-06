import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';
  constructor(private http: HttpClient) { }

  async onRegister(product: Product): Promise<boolean> {
    try {
      // Simplemente pasa el objeto `product` directamente en el post request
      await this.http.post(`${this.baseUrl}/register-product`, product).toPromise();
      return true;
    } catch (error: any) {
      console.error('Error durante el registro:', error);
      return false;
    }
  }
  getProducts(): Observable<{ products: Product[]; message: string }> {
    return this.http.get<{ products: Product[]; message: string }>(`${this.baseUrl}/products`);
  }

  async updateProductPrice(productId: string, newPrice: string): Promise<boolean> {
    try {
      await this.http.put(`${this.baseUrl}/products/price/${productId}/${newPrice}`, { new_price: newPrice }).toPromise();
      return true;
    } catch (error: any) {
      console.error('Error durante la actualización del precio:', error);
      return false;
    }
  }

  // Actualizar descripción de un producto
  async updateProductDescription(productId: string, newDescription: string): Promise<boolean> {
    try {
      await this.http.put(`${this.baseUrl}/products/description/${productId}/${newDescription}`, { new_description: newDescription }).toPromise();
      return true;
    } catch (error: any) {
      console.error('Error durante la actualización de la descripción:', error);
      return false;
    }
  }

  // Inside ProductService
  async updateProductCategories(productId: string, newCategories: string): Promise<boolean> {
    try {
      await this.http.put(`${this.baseUrl}/products/categories/${productId}/${newCategories}`, { categories: newCategories }).toPromise();
      return true;
    } catch (error: any) {
      console.error('Error updating categories:', error);
      return false;
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      // Send DELETE request to backend to remove the product by productId
      await this.http.delete(`${this.baseUrl}/products/${productId}`).toPromise();
      return true;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  getProductById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${productId}`);
  }

  async updateNewStock(productId: string, newStock: string): Promise<boolean> {
  try {
    await this.http.put(`${this.baseUrl}/update-stock/${productId}/${newStock}`, { stock: newStock }).toPromise();
    return true;
  } catch (error: any) {
    console.error('Error durante la actualización del stock:', error);
    return false;
  }
}
  async updateLowerStock(productId: string, consumed: string): Promise<boolean> {
  try {
    await this.http.put(`${this.baseUrl}/lower-stock/${productId}/${consumed}`, { stock: consumed }).toPromise();
    return true;
  } catch (error: any) {
    console.error('Error durante la actualización del stock:', error);
    return false;
  }
}

}