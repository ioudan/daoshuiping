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
  hasAddedBottle: boolean;
}

export type GameView = 'home' | 'game' | 'levels' | 'profile';

export interface UserProfile {
  name: string;
  avatar: string;
  totalScore: number;
  levelsCleared: number;
  joinDate: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Scene = 'colors' | 'math' | 'english' | 'literacy';

export interface GameState {
  bottles: BottleData[];
  selectedBottleId: number | null;
  moveHistory: HistoryEntry[];
  level: number;
  difficulty: Difficulty;
  scene: Scene;
  status: GameStatus;
  movesLeft: number;
  score: number;
  highScores: ScoreEntry[];
  clearedColors: Color[];
  view: GameView;
  unlockedLevels: number;
  userProfile: UserProfile;
  hasAddedBottle: boolean;
  capacity: number;
  levelColors: Color[];
}
