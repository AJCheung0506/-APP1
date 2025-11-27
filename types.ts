export interface Sentence {
  text: string;
  startTime: number;
  endTime: number;
  translation?: string;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export enum Difficulty {
  EASY = 'easy',     // Hide 20%
  MEDIUM = 'medium', // Hide 40%
  HARD = 'hard',     // Hide 60%
}
