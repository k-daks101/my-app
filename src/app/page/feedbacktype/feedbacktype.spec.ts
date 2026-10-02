import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Feedbacktype } from './feedbacktype';

describe('Feedbacktype', () => {
  let component: Feedbacktype;
  let fixture: ComponentFixture<Feedbacktype>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Feedbacktype],
    }).compileComponents();

    fixture = TestBed.createComponent(Feedbacktype);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
