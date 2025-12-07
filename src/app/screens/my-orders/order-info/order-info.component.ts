import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Order } from 'src/app/models/order';
import { OrderItem } from 'src/app/models/orderItem';
import { Product } from 'src/app/models/product';
import { ProductService } from 'src/app/services/product_service';


@Component({
  selector: 'app-order-info',
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.css'
})
export class OrderInfoComponent implements OnInit  {
  @Input() order: Order = new Order('',0,'','','', [], 1, '');
  products : Product[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() onSend = new EventEmitter<void>();

  // --- LOADING STATE ---
  loading: boolean = true;

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.loading = true;
    this.loadProducts();
  }


  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        console.log('Products fetched:', data);
        if (data && Array.isArray(data.products)) {
          this.products = data.products;
        } else {
          console.error('Unexpected data format:', data);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loading = false;
      }
      
    });
  }

  getProductById(productId: number): Product | undefined {
    return this.products.find(product => product.id === productId);
  }
  


  sendConfirmation() {
    this.onSend.emit();
  }

  closeDialog() {
    this.onClose.emit();
  }

}