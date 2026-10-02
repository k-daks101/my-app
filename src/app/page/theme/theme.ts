import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

const themeOptions = [
  'Improvement',
  'Report a problem',
  'Idea to consider',
  'New ways of working',
  'Suggestion',
  'Personal concern',
  'Other',
] as const;

type ThemeOption = (typeof themeOptions)[number];

@Component({
  selector: 'app-theme',
  imports: [MatButtonModule, MatChipsModule, NgOptimizedImage, ReactiveFormsModule],
  templateUrl: './theme.html',
  styleUrl: './theme.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Theme {
  next = output<string>();
  readonly themeOptions = themeOptions;
  readonly themeForm = new FormGroup({
    themes: new FormControl<ThemeOption>('New ways of working', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    otherTheme: new FormControl('', { nonNullable: true }),
  });

  reset(): void {
    this.themeForm.reset({ themes: 'New ways of working', otherTheme: '' });
    this.themeForm.markAsPristine();
    this.themeForm.markAsUntouched();
  }

  submit(): void {
    if (this.themeForm.invalid) {
      this.themeForm.markAllAsTouched();
      return;
    }

    const theme = this.themeForm.controls.themes.value;
    const otherTheme = this.themeForm.controls.otherTheme.value.trim();
    if (theme === 'Other' && !otherTheme) {
      this.themeForm.controls.otherTheme.markAsTouched();
      return;
    }

    const selectedTheme = theme === 'Other' ? `Other: ${otherTheme}` : theme;
    this.next.emit(selectedTheme);
    console.log('Selected theme:', selectedTheme);
  }
}
