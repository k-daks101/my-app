import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const apiBaseUrl = ['localhost', '127.0.0.1'].includes(globalThis.location.hostname)
  ? '/api'
  : 'https://promotion-stopping-contented.ngrok-free.dev/api';

export interface UploadResponse {
  attachmentKey?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface FeedbackRequest {
  type: 'Improvement' | 'Report_a_problem' | 'Suggestion' | 'Personal_concern' | 'Idea_to_consider' | 'New_ways_of_working' | 'Other';
  inputMethod: 'TEXT' | 'VOICE' | 'FILE';
  message: string;
  attachmentKey?: string;
  attachmentContentType?: string;
  anonymityLevel: 'ANONYMOUS' | 'IDENTIFIED';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface FeedbackResponse {
  id?: string;
  type?: string;
  inputMethod?: string;
  anonymityLevel?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly http = inject(HttpClient);

  upload(file: File): Observable<UploadResponse> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${apiBaseUrl}/uploads`, body);
  }

  submitFeedback(request: FeedbackRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${apiBaseUrl}/feedback`, request);
  }
}
