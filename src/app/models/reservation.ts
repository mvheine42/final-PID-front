export class Reservation {
  id?: number;  // el back te devuelve IDs numéricos
  customerName: string = '';
  userEmail: string = '';
  amountOfPeople: number = 1;
  reservationDate: Date = new Date();       // en el front lo manejás como Date
  reservationTime: string = '';
  table_id: string | number | '' = '';      // siempre lo inicializamos en ''

  constructor(
    customerName: string,
    userEmail: string,
    amountOfPeople: number,
    reservationDate: Date,
    reservationTime: string,
    id?: number,
    table_id: string | number | '' = ''
  ) {
    this.customerName = customerName;
    this.userEmail = userEmail;
    this.amountOfPeople = amountOfPeople;
    this.reservationDate = reservationDate;
    this.reservationTime = reservationTime;
    this.id = id;
    this.table_id = table_id;
  }
}
