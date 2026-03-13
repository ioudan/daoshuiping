import { Color } from "./types";

export const BOTTLE_CAPACITY = 4;

// High contrast, color-blind friendly palette with associated symbols
export const COLOR_DATA: { color: string; icon: string; name: string }[] = [
  { color: "#FF595E", icon: "❤️", name: "Red" },    // Red
  { color: "#FFCA3A", icon: "☀️", name: "Yellow" }, // Yellow
  { color: "#8AC926", icon: "🍀", name: "Green" },  // Green
  { color: "#1982C4", icon: "💧", name: "Blue" },   // Blue
  { color: "#6A4C93", icon: "🍇", name: "Purple" }, // Purple
  { color: "#FF924C", icon: "🍊", name: "Orange" }, // Orange
  { color: "#FF69B4", icon: "🌸", name: "Pink" },   // Pink
  { color: "#52B2BF", icon: "❄️", name: "Cyan" },   // Cyan
];

export const COLORS = COLOR_DATA.map(d => d.color);

export const GAME_CONFIG = {
  initialMoves: 15,
  movesPerLevel: 5,
  pointsPerPour: 10,
  pointsPerLevel: 100,
  maxHighScores: 5,
};
