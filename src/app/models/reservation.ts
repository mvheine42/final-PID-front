export class Reservation {
    customerName: string = '';
    userEmail: string = '';
    amountOfPeople: number = 1;
    reservationDate: Date = new Date();
    reservationTime: string = '';
    id?: number;
    constructor(customerName: string, userEmail: string, amountOfPeople: number, reservationDate: Date, reservationTime: string, id?: number) {
    this.id = id;
    this.customerName = customerName;
    this.userEmail = userEmail;
    this.amountOfPeople = amountOfPeople;
    this.reservationDate = reservationDate;
    this.reservationTime = reservationTime;
    }
}