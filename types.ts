export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  STOP = 'STOP',
  HOVER = 'HOVER'
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface HandTrackingResult {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  isDetected: boolean;
  gesture: string; // 'OPEN', 'FIST', 'POINTING'
  handSpread?: number; // Normalized spread factor (relative to palm size)
}

export interface GameState {
  position: Coordinates;
  velocity: Coordinates;
  activeAction: Direction; // Keep for backward compatibility if needed, or remove
  handPosition: Coordinates | null;
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}