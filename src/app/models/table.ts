// models/table.ts
export class Table {
  status: string = '';
  capacity: number = 1;
  order_id: number = 0;
  id?: number | string;
  current_reservation_id: number | '' = '';

  constructor(
    status: string,
    capacity: number,
    id?: number | string,
    order_id: number = 0,
    current_reservation_id: number | '' = ''
  ) {
    this.status = status;
    this.capacity = capacity;
    this.id = id;
    this.order_id = order_id;
    this.current_reservation_id = current_reservation_id;
  }
}
