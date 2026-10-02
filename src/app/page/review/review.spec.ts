import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Review } from './review';

describe('Review', () => {
  let component: Review;
  let fixture: ComponentFixture<Review>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Review],
    }).compileComponents();

    fixture = TestBed.createComponent(Review);
    fixture.componentRef.setInput('feedback', {
      themes: ['New ways of working'],
      method: 'Type out',
      message: 'A sample message',
      uploads: [],
      shareMode: 'anonymous',
      name: '',
      email: '',
      phone: '',
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
