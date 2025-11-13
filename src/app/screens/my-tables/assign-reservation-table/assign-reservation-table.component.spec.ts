import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignReservationTableComponent } from './assign-reservation-table.component';

describe('AssignReservationTableComponent', () => {
  let component: AssignReservationTableComponent;
  let fixture: ComponentFixture<AssignReservationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignReservationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignReservationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
