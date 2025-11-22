export class OrderItem {
  item_id?: string;
  created_at?: string;
  served_at?: string;
  product_id: number;
  product_name: string;
  product_price: string;
  amount: number;
  product_imageUrl?: string;

  constructor(product: number, amount: number, product_name: string, product_price: string, product_imageUrl?:string) {
    this.product_id = product;
    this.amount = amount;
    this.product_name = product_name;
    this.product_price = product_price;
    this.product_imageUrl = product_imageUrl;
  }
}