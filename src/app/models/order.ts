import { OrderItem } from "./orderItem";

export class Order {
  id?: number;
  status: string = ''; 
  amountOfPeople: number = 0;
  tableNumber: number = 0;
  date: string = '';
  time: string = '';
  total: string = '';
  orderItems: OrderItem[] = [];
  employee: string = '';
  employee_name?: string

  constructor(
    status: string,
    tableNumber: number,
    date: string,
    time: string,
    total: string,
    orderItems: OrderItem[],
    amountOfPeople: number,
    employee: string,
    id?: number,
  ) {
    this.id = id;
    this.status = status;
    this.tableNumber = tableNumber;
    this.date = date;
    this.time = time;
    this.total = total;
    this.orderItems = orderItems;
    this.amountOfPeople = amountOfPeople;
    this.employee = employee;
  }
}