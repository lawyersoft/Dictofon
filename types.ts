export enum TranscriptionStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface Recording {
  id: string;
  blob: Blob;
  url: string;
  timestamp: number;
  duration: number; // in seconds
  transcript: string | null;
  status: TranscriptionStatus;
  error?: string;
  name?: string;
}

export interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}