import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { EditSection, FeedbackData } from '../../shared/models/app.model';

@Component({
  selector: 'app-review',
  imports: [MatButtonModule],
  templateUrl: './review.html',
  styleUrl: './review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {
  back = output<void>();
  edit = output<EditSection>();
  submitFeedback = output<void>();
  readonly feedback = input.required<FeedbackData>();
  readonly isSubmitting = input(false);
  readonly submissionError = input('');
  readonly submissionComplete = input(false);
  readonly reviewItems = computed(() => [
    { label: 'Category', value: this.feedback().themes.join(', ') || 'No themes selected' },
    { label: 'Feedback', value: this.feedback().message || 'No written feedback provided' },
    { label: 'Method', value: this.feedback().method || 'No method selected' },
    {
      label: 'Attachment',
      value: this.feedback().uploads.length
        ? this.feedback()
            .uploads.map((upload) => `${upload.name} (${upload.size}) · ${upload.status}`)
            .join(', ')
        : 'No attachments',
    },
    ...(this.feedback().shareMode === 'named'
      ? [
          {
            label: 'Contact',
            value: [this.feedback().name, this.feedback().email, this.feedback().phone]
              .filter(Boolean)
              .join(' · '),
          },
        ]
      : []),
  ]);

  editItem(label: string): void {
    const section: EditSection = label === 'Category'
      ? 'theme'
      : label === 'Contact'
        ? 'feedbacktype'
        : 'method';
    this.edit.emit(section);
  }

}
