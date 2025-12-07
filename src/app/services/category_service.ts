import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from 'src/app/models/category';
import { Observable } from 'rxjs';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private baseUrl = 'https://final-pid-back.onrender.com';
  //private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<{ categories: Category[]; message: string }> {
    return this.http.get<{ categories: Category[]; message: string }>(`${this.baseUrl}/categories`);
  }

  getCategoryById(categoryId: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/categories/${categoryId}`);
  }

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(`${this.baseUrl}/register-category`, category);
  }  

  updateCategoryName(categoryId: string, newName: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/categories/name/${categoryId}/${newName}`, {});
  }

  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${categoryId}`);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const products = await this.http.get<Product[]>(`${this.baseUrl}/categories/products/${categoryId}`).toPromise();
      return products || [];
    } catch (error: any) {
      console.error('Error fetching products:', error);
      return [];
    }
  }
}
