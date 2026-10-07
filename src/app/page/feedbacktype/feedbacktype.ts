import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ShareMode } from '../../shared/models/app.model';

@Component({
  selector: 'app-feedbacktype',
  imports: [ReactiveFormsModule, MatButtonModule],
  templateUrl: './feedbacktype.html',
  styleUrl: './feedbacktype.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Feedbacktype {
  next = output<{ shareMode: ShareMode; name: string; email: string; phone: string }>();
  back = output<void>();
  readonly shareForm = new FormGroup({
    shareMode: new FormControl<ShareMode>('anonymous', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\+?[0-9()\s-]{7,20}$/)],
    }),
  });

  readonly shareOptions = [
    {
      value: 'anonymous' as const,
      title: 'Share anonymously',
      description: 'Your name, profile and identifying metadata are not included.',
    },
    {
      value: 'named' as const,
      title: 'Share with my name',
      description: 'Name, email and contact details can be used for follow-up.',
    },
  ];

  reset(): void {
    this.shareForm.reset({ shareMode: 'anonymous', name: '', email: '', phone: '' });
    this.shareForm.markAsPristine();
    this.shareForm.markAsUntouched();
  }

  submit(): void {
    if (this.shareForm.controls.shareMode.value === 'named') {
      const contactFields = [
        this.shareForm.controls.name,
        this.shareForm.controls.email,
        this.shareForm.controls.phone,
      ];
      contactFields.forEach((field) => field.markAsTouched());

      if (contactFields.some((field) => field.invalid)) {
        return;
      }
    }

    this.next.emit({
      shareMode: this.shareForm.controls.shareMode.value,
      name: this.shareForm.controls.name.value,
      email: this.shareForm.controls.email.value,
      phone: this.shareForm.controls.phone.value,
    });
  }
}
