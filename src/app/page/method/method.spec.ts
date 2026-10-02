import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Method } from './method';

describe('Method', () => {
  let component: Method;
  let fixture: ComponentFixture<Method>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Method],
    }).compileComponents();

    fixture = TestBed.createComponent(Method);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require at least one uploaded file when method is attach file', async () => {
    component.methodForm.controls.method.setValue('Attach file');
    await component.submit();
    expect(component.showValidation()).toBe(true);
  });
});
