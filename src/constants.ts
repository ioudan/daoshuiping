import { Color } from "./types";

// High contrast, color-blind friendly palette with associated symbols
export const COLOR_DATA: { color: string; icon: string; name: string; zhName: string }[] = [
  { color: "#FF595E", icon: "🍎", name: "Red", zhName: "红色" },
  { color: "#FFCA3A", icon: "☀️", name: "Yellow", zhName: "黄色" },
  { color: "#8AC926", icon: "🍀", name: "Green", zhName: "绿色" },
  { color: "#1982C4", icon: "💧", name: "Blue", zhName: "蓝色" },
  { color: "#6A4C93", icon: "🍇", name: "Purple", zhName: "紫色" },
  { color: "#FF924C", icon: "🍊", name: "Orange", zhName: "橙色" },
  { color: "#FF69B4", icon: "🌸", name: "Pink", zhName: "粉色" },
  { color: "#52B2BF", icon: "❄️", name: "Cyan", zhName: "青色" },
  { color: "#FFD700", icon: "😊", name: "Smile", zhName: "笑脸" },
  { color: "#4CAF50", icon: "🌵", name: "Cactus", zhName: "仙人掌" },
  { color: "#FF9800", icon: "🐱", name: "Cat", zhName: "小猫" },
  { color: "#2196F3", icon: "🐳", name: "Whale", zhName: "鲸鱼" },
  { color: "#9C27B0", icon: "🦄", name: "Unicorn", zhName: "独角兽" },
  { color: "#795548", icon: "🐻", name: "Bear", zhName: "小熊" },
  { color: "#607D8B", icon: "🐘", name: "Elephant", zhName: "大象" },
];

export const COLORS = COLOR_DATA.map(d => d.color);

export const GAME_CONFIG = {
  initialMoves: 15,
  movesPerLevel: 5,
  pointsPerPour: 10,
  pointsPerLevel: 100,
  maxHighScores: 5,
};

export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "简单 (3-5岁)",
    minColors: 2,
    maxColors: 4,
    capacity: 3,
    baseMoves: 20,
  },
  medium: {
    label: "中等 (6-8岁)",
    minColors: 3,
    maxColors: 6,
    capacity: 4,
    baseMoves: 30,
  },
  hard: {
    label: "困难 (9-14岁)",
    minColors: 4,
    maxColors: 8,
    capacity: 5,
    baseMoves: 40,
  }
};

export interface ContentPair {
  primary: string;
  secondary: string;
}

export const SCENE_CONTENT: Record<string, Record<string, ContentPair[]>> = {
  math: {
    easy: [
      { primary: "1", secondary: "数字一" }, { primary: "2", secondary: "数字二" }, 
      { primary: "3", secondary: "数字三" }, { primary: "4", secondary: "数字四" }, 
      { primary: "5", secondary: "数字五" }, { primary: "6", secondary: "数字六" }
    ],
    medium: [
      { primary: "2+3", secondary: "等于五" }, { primary: "1+4", secondary: "等于五" }, 
      { primary: "6-2", secondary: "等于四" }, { primary: "5+1", secondary: "等于六" }, 
      { primary: "8-3", secondary: "等于五" }, { primary: "4+4", secondary: "等于八" }
    ],
    hard: [
      { primary: "12+5", secondary: "等于十七" }, { primary: "20-8", secondary: "等于十二" }, 
      { primary: "15+3", secondary: "等于十八" }, { primary: "25-10", secondary: "等于十五" },
      { primary: "30-5", secondary: "等于二十五" }, { primary: "18+2", secondary: "等于二十" }
    ]
  },
  english: {
    easy: [
      { primary: "A", secondary: "Apple" }, { primary: "B", secondary: "Bear" }, 
      { primary: "C", secondary: "Cat" }, { primary: "D", secondary: "Dog" }, 
      { primary: "E", secondary: "Elephant" }, { primary: "F", secondary: "Fish" }
    ],
    medium: [
      { primary: "Apple", secondary: "苹果" }, { primary: "Banana", secondary: "香蕉" }, 
      { primary: "Orange", secondary: "橙子" }, { primary: "Grape", secondary: "葡萄" }, 
      { primary: "Peach", secondary: "桃子" }, { primary: "Pear", secondary: "梨子" }
    ],
    hard: [
      { primary: "Computer", secondary: "电脑" }, { primary: "Backpack", secondary: "书包" }, 
      { primary: "Notebook", secondary: "笔记本" }, { primary: "Keyboard", secondary: "键盘" },
      { primary: "Monitor", secondary: "显示器" }, { primary: "Internet", secondary: "互联网" }
    ]
  },
  literacy: {
    easy: [
      { primary: "人", secondary: "rén" }, { primary: "口", secondary: "kǒu" }, 
      { primary: "手", secondary: "shǒu" }, { primary: "山", secondary: "shān" }, 
      { primary: "水", secondary: "shuǐ" }, { primary: "火", secondary: "huǒ" }
    ],
    medium: [
      { primary: "爸爸", secondary: "bà ba" }, { primary: "妈妈", secondary: "mā ma" }, 
      { primary: "老师", secondary: "lǎo shī" }, { primary: "同学", secondary: "tóng xué" },
      { primary: "朋友", secondary: "péng yǒu" }, { primary: "学校", secondary: "xué xiào" }
    ],
    hard: [
      { primary: "一心一意", secondary: "yī xīn yī yì" }, { primary: "五颜六色", secondary: "wǔ yán liù sè" }, 
      { primary: "七上八下", secondary: "qī shàng bā xià" }, { primary: "九牛一毛", secondary: "jiǔ niú yī máo" },
      { primary: "自强不息", secondary: "zì qiáng bù xī" }, { primary: "厚德载物", secondary: "hòu dé zài wù" }
    ]
  }
};
