export type Color = string;

export interface BottleData {
  id: number;
  colors: Color[]; // Bottom to top
}

export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface HistoryEntry {
  bottles: BottleData[];
  clearedColors: Color[];
  movesLeft: number;
  score: number;
}

export type GameView = 'home' | 'game' | 'levels' | 'profile';

export interface UserProfile {
  name: string;
  avatar: string;
  totalScore: number;
  levelsCleared: number;
  joinDate: string;
}

export interface GameState {
  bottles: BottleData[];
  selectedBottleId: number | null;
  moveHistory: HistoryEntry[];
  level: number;
  status: GameStatus;
  movesLeft: number;
  score: number;
  highScores: ScoreEntry[];
  clearedColors: Color[];
  view: GameView;
  unlockedLevels: number;
  userProfile: UserProfile;
}
