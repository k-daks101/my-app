export interface Step {
  id: number;
  label: string;
  completed: boolean;
}

export type ShareMode = 'anonymous' | 'named';
export type EditSection = 'theme' | 'method' | 'feedbacktype';

export interface FeedbackUpload {
  name: string;
  size: string;
  status: 'Uploaded' | 'Uploading';
  progress?: number;
  file?: File;
  attachmentKey?: string;
  contentType?: string;
}

export interface FeedbackData {
  themes: string[];
  method: string;
  message: string;
  uploads: FeedbackUpload[];
  shareMode: ShareMode;
  name: string;
  email: string;
  phone: string;
}