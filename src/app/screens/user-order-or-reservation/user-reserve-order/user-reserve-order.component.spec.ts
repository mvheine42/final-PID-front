import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserReserveOrderComponent } from './user-reserve-order.component';

describe('UserReserveOrderComponent', () => {
  let component: UserReserveOrderComponent;
  let fixture: ComponentFixture<UserReserveOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserReserveOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserReserveOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
