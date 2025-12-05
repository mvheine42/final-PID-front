import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableReservedComponent } from './table-reserved.component';

describe('TableReservedComponent', () => {
  let component: TableReservedComponent;
  let fixture: ComponentFixture<TableReservedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableReservedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableReservedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
