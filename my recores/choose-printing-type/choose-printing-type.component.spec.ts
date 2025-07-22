import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoosePrintingTypeComponent } from './choose-printing-type.component';

describe('ChoosePrintingTypeComponent', () => {
  let component: ChoosePrintingTypeComponent;
  let fixture: ComponentFixture<ChoosePrintingTypeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChoosePrintingTypeComponent]
    });
    fixture = TestBed.createComponent(ChoosePrintingTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
