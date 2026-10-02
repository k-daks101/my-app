import { Component, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Theme } from './page/theme/theme';
import { Method } from './page/method/method';
import { Feedbacktype } from './page/feedbacktype/feedbacktype';
import { Review } from './page/review/review';
import {
  EditSection,
  FeedbackData,
  FeedbackUpload,
  ShareMode,
  Step,
} from './shared/models/app.model';
import {
  FeedbackApiService,
  FeedbackRequest,
} from './shared/services/feedback-api.service';

@Component({
  selector: 'app-root',
  imports: [Theme, Method, Feedbacktype, Review],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly feedbackApi = inject(FeedbackApiService);
  protected readonly title = signal('my-app');
  private readonly themePage = viewChild(Theme);
  private readonly methodPage = viewChild(Method);
  private readonly feedbackTypePage = viewChild(Feedbacktype);
  list : Step[] = [
    { id: 1, label: 'Theme', completed:false },
    { id: 2, label: 'Method', completed:false },
    { id: 3, label: 'Feedback Type', completed:false },
    { id: 4, label: 'Review', completed:false }
  ]
  protected currentStep = signal<Step>(this.list[0]);
  protected feedback = signal<FeedbackData>({
    themes: [],
    method: '',
    message: '',
    uploads: [],
    shareMode: 'anonymous',
    name: '',
    email: '',
    phone: '',
  });
  protected isSubmitting = signal(false);
  protected submissionError = signal('');
  protected submissionComplete = signal(false);
  protected showThankYou = signal(false);

  saveThemes(theme: string): void {
    this.feedback.update((feedback) => ({ ...feedback, themes: [theme] }));
    this.nextStep();
  }

  saveMethod(method: string, message: string, uploads: FeedbackUpload[]): void {
    this.feedback.update((feedback) => ({ ...feedback, method, message, uploads }));
    this.nextStep();
  }

  saveShareDetails(shareMode: ShareMode, name: string, email: string, phone: string): void {
    this.feedback.update((feedback) => ({ ...feedback, shareMode, name, email, phone }));
    this.nextStep();
  }

  async submitFeedback(): Promise<void> {
    if (this.isSubmitting() || this.submissionComplete()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submissionError.set('');

    try {
      const feedback = this.feedback();
      let attachmentKey: string | undefined;
      let attachmentContentType: string | undefined;

      for (const upload of feedback.uploads) {
        if (!upload.file) {
          continue;
        }
        const uploaded = await firstValueFrom(this.feedbackApi.upload(upload.file));
        attachmentKey ??= uploaded.attachmentKey;
        attachmentContentType ??= uploaded.contentType ?? upload.file.type;
      }

      const request: FeedbackRequest = {
        type: this.mapFeedbackType(feedback.themes[0]),
        inputMethod: this.mapInputMethod(feedback.method),
        message: feedback.message,
        attachmentKey,
        attachmentContentType,
        anonymityLevel: feedback.shareMode === 'anonymous' ? 'ANONYMOUS' : 'IDENTIFIED',
        contactName: feedback.shareMode === 'named' ? feedback.name : undefined,
        contactEmail: feedback.shareMode === 'named' ? feedback.email : undefined,
        contactPhone: feedback.shareMode === 'named' ? feedback.phone : undefined,
      };

      await firstValueFrom(this.feedbackApi.submitFeedback(request));
      this.resetWizard();
      this.showThankYou.set(true);
    } catch {
      this.submissionError.set('We could not submit your feedback. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private mapFeedbackType(theme: string): FeedbackRequest['type'] {
    if (theme.startsWith('Other:')) {
      return 'Other';
    }
    return theme.replace(/ /g, '_') as FeedbackRequest['type'];
  }

  private mapInputMethod(method: string): FeedbackRequest['inputMethod'] {
    if (method === 'Voice to text') {
      return 'VOICE';
    }
    if (method === 'Attach file') {
      return 'FILE';
    }
    return 'TEXT';
  }

  private resetWizard(): void {
    this.themePage()?.reset();
    this.methodPage()?.reset();
    this.feedbackTypePage()?.reset();
    this.feedback.set({
      themes: [],
      method: '',
      message: '',
      uploads: [],
      shareMode: 'anonymous',
      name: '',
      email: '',
      phone: '',
    });
    this.submissionComplete.set(false);
    this.currentStep.set(this.list[0]);
  }

  startNewFeedback(): void {
    this.resetWizard();
    this.showThankYou.set(false);
  }

  nextStep(): void {
    const currentIndex = this.list.findIndex(step => step.id === this.currentStep().id);
    if (currentIndex < this.list.length - 1) {
      const nextStep = this.list[currentIndex + 1];
      this.currentStep.set(nextStep);
    }
  }

  previousStep(): void {
    const currentIndex = this.list.findIndex(step => step.id === this.currentStep().id);
    if (currentIndex > 0) {
      const previousStep = this.list[currentIndex - 1];
      this.currentStep.set(previousStep);
    }
  }

  editStep(section: EditSection): void {
    const stepId: Record<EditSection, number> = {
      theme: 1,
      method: 2,
      feedbacktype: 3,
    };
    const step = this.list.find((item) => item.id === stepId[section]);
    if (step) {
      this.currentStep.set(step);
    }
  }
}
