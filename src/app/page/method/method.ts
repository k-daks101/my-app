import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { FeedbackUpload } from '../../shared/models/app.model';

const methodOptions = ['Type out', 'Voice to text', 'Attach file'] as const;
type MethodOption = (typeof methodOptions)[number];
type Upload = FeedbackUpload;

interface SpeechRecognitionResultEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

@Component({
  selector: 'app-method',
  imports: [MatButtonModule, MatChipsModule, ReactiveFormsModule],
  templateUrl: './method.html',
  styleUrl: './method.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Method {
  next = output<{ method: string; message: string; uploads: FeedbackUpload[] }>();
  back = output<void>();
  readonly methodOptions = methodOptions;
  readonly waveform = [22, 34, 48, 30, 58, 38, 50, 28, 62, 40, 52, 32, 48, 26, 38];
  readonly isRecording = signal(false);
  readonly showValidation = signal(false);
  readonly transcriptionAvailable = signal(true);
  readonly transcriptionError = signal('');
  readonly hasRecordingStarted = signal(false);
  readonly isStartingRecording = signal(false);
  readonly recordingSeconds = signal(0);
  readonly showCamera = signal(false);
  readonly cameraError = signal('');
  readonly recordingTime = computed(() => {
    const minutes = Math.floor(this.recordingSeconds() / 60);
    const seconds = this.recordingSeconds() % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
  readonly uploads = signal<Upload[]>([]);
  readonly methodForm = new FormGroup({
    method: new FormControl<MethodOption>('Attach file', { nonNullable: true }),
    message: new FormControl('', { nonNullable: true }),
  });
  private recognition: SpeechRecognitionLike | null = null;
  private finalTranscript = '';
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private audioStream: MediaStream | null = null;
  private audioRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private readonly cameraPreview = viewChild<ElementRef<HTMLVideoElement>>('cameraPreview');
  private cameraStream: MediaStream | null = null;

  reset(): void {
    void this.finalizeRecording();
    this.closeCamera();
    this.revokeUploadPreviews();
    this.methodForm.reset({ method: 'Attach file', message: '' });
    this.methodForm.markAsPristine();
    this.methodForm.markAsUntouched();
    this.uploads.set([]);
    this.showValidation.set(false);
    this.transcriptionAvailable.set(true);
    this.transcriptionError.set('');
    this.hasRecordingStarted.set(false);
    this.recordingSeconds.set(0);
    this.finalTranscript = '';
  }

  onMethodChange(method: string): void {
    if (method === 'Voice to text') {
      void this.finalizeRecording();
      this.recordingSeconds.set(0);
      this.hasRecordingStarted.set(false);
      this.finalTranscript = '';
      this.methodForm.controls.message.setValue('');
    } else {
      void this.finalizeRecording();
      this.recordingSeconds.set(0);
      this.hasRecordingStarted.set(false);
    }
  }

  toggleRecording(): void {
    if (this.isStartingRecording()) {
      return;
    }

    if (this.isRecording()) {
      this.pauseTranscription();
    } else {
      void this.startTranscription();
    }
  }

  async restartRecording(): Promise<void> {
    if (this.isStartingRecording()) {
      return;
    }

    await this.finalizeRecording();
    this.recordingSeconds.set(0);
    this.hasRecordingStarted.set(false);
    this.finalTranscript = '';
    this.methodForm.controls.message.setValue('');
    void this.startTranscription();
  }

  private async startTranscription(): Promise<void> {
    const SpeechRecognitionConstructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      this.transcriptionAvailable.set(false);
      this.isRecording.set(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.transcriptionError.set('Microphone access is not supported in this browser.');
      return;
    }

    this.isStartingRecording.set(true);
    this.transcriptionError.set('');

    try {
      if (!this.audioStream) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.startAudioRecording();

      this.finalTranscript = this.methodForm.controls.message.value;
      const recognition = new SpeechRecognitionConstructor();
      this.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) {
            this.finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        this.methodForm.controls.message.setValue(
          `${this.finalTranscript}${interimTranscript}`.trim(),
        );
      };
      recognition.onerror = () => {
        if (this.recognition !== recognition) {
          return;
        }
        void this.finalizeRecording();
        this.transcriptionError.set('Microphone access was unavailable. Check your browser permissions and try again.');
      };
      recognition.onend = () => {
        if (this.recognition === recognition && this.isRecording()) {
          void this.startTranscription();
        }
      };
      this.isRecording.set(true);
      this.hasRecordingStarted.set(true);
      this.transcriptionAvailable.set(true);
      if (!this.recordingTimer) {
        this.recordingTimer = setInterval(() => {
          this.recordingSeconds.update((seconds) => seconds + 1);
        }, 1000);
      }
      recognition.start();
    } catch {
      void this.finalizeRecording();
      this.transcriptionError.set('Microphone access was denied. Allow microphone access and try again.');
    } finally {
      this.isStartingRecording.set(false);
    }
  }

  private startAudioRecording(): void {
    if (!this.audioStream) {
      throw new Error('Microphone stream is unavailable.');
    }

    if (!this.audioRecorder) {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const recorder = new MediaRecorder(this.audioStream);
      this.audioRecorder = recorder;
      this.audioChunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const contentType = recorder.mimeType || 'audio/webm';
          const extension = contentType.includes('mp4') ? 'm4a' : 'webm';
          const file = new File(this.audioChunks, `recording-${Date.now()}.${extension}`, {
            type: contentType,
          });
          this.addFiles([file]);
        }
        this.audioChunks = [];
        this.audioRecorder = null;
      };
      recorder.start();
    } else if (this.audioRecorder.state === 'paused') {
      this.audioRecorder.resume();
    }
  }

  private pauseTranscription(): void {
    this.isRecording.set(false);
    const recognition = this.recognition;
    this.recognition = null;
    recognition?.stop();
    if (this.audioRecorder?.state === 'recording') {
      this.audioRecorder.pause();
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private async finalizeRecording(): Promise<void> {
    this.pauseTranscription();
    const recorder = this.audioRecorder;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const onStop = recorder.onstop;
        recorder.onstop = (event) => {
          onStop?.call(recorder, event);
          resolve();
        };
        recorder.stop();
      });
    }
    this.audioStream?.getTracks().forEach((track) => track.stop());
    this.audioStream = null;
  }

  async openCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access is not supported in this browser. Choose a file instead.');
      return;
    }

    this.cameraError.set('');
    this.showCamera.set(true);

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      await new Promise<void>((resolve) => setTimeout(resolve));
      const video = this.cameraPreview()?.nativeElement;
      if (!video) {
        this.closeCamera();
        return;
      }
      video.srcObject = this.cameraStream;
      await video.play();
    } catch {
      this.showCamera.set(false);
      this.cameraStream = null;
      this.cameraError.set('Camera access was denied or unavailable. Check browser permissions.');
    }
  }

  capturePhoto(): void {
    const video = this.cameraPreview()?.nativeElement;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      this.addFiles([new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
      this.closeCamera();
    }, 'image/jpeg', 0.9);
  }

  closeCamera(): void {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    this.showCamera.set(false);
  }

  selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      return;
    }

    this.addFiles(files);
    input.value = '';
  }

  private addFiles(files: File[]): void {
    this.uploads.update((uploads) => [
      ...uploads,
      ...files.map((file) => ({
        name: file.name,
        size: this.formatFileSize(file.size),
        status: 'Uploaded' as const,
        file,
        previewUrl:
          file.type.startsWith('image/') && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : undefined,
      })),
    ]);
  }

  private revokeUploadPreviews(): void {
    for (const upload of this.uploads()) {
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    }
  }

  onTranscriptEdit(value: string): void {
    this.finalTranscript = value;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return '<1 KB';
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async submit(): Promise<void> {
    const method = this.methodForm.controls.method.value;
    const hasMessage = this.methodForm.controls.message.value.trim().length > 0;

    if (method === 'Voice to text' && hasMessage && (this.isRecording() || this.audioRecorder)) {
      await this.finalizeRecording();
    }

    const isInvalid = method === 'Attach file'
      ? this.uploads().length === 0
      : method === 'Voice to text'
        ? !hasMessage || this.uploads().length === 0
        : !hasMessage;

    if (isInvalid) {
      this.showValidation.set(true);
      return;
    }

    await this.finalizeRecording();
    this.next.emit({
      method,
      message: this.methodForm.controls.message.value,
      uploads: this.uploads(),
    });
  }
}