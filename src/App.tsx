/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Undo2, Trophy, Play, ChevronRight, Info, Sparkles, AlertCircle, ListOrdered, History, ShoppingBag, CheckCircle2, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Color, BottleData, GameState, ScoreEntry, GameStatus, GameView, UserProfile, Difficulty, Scene } from './types';
import { DIFFICULTY_SETTINGS, SCENE_CONTENT, COLOR_DATA, GAME_CONFIG } from './constants';
import { Home, Lock, User, Award, ArrowLeft, Star } from 'lucide-react';

// --- Sound Engine ---
const playSound = (type: 'pour' | 'win' | 'fail' | 'select' | 'clear') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'select':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'pour':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'clear':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.3);
      });
      break;
    case 'fail':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
  }
};

const speak = (text: string, secondaryText?: string, forceLang?: 'zh-CN' | 'en-US') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utter = (t: string, langOverride?: string) => {
      const utterance = new SpeechSynthesisUtterance(t);
      const isChinese = /[\u4e00-\u9fa5]/.test(t);
      utterance.lang = langOverride || (isChinese ? 'zh-CN' : 'en-US');
      utterance.rate = 0.85; // Slightly slower for better clarity
      utterance.pitch = 1.1;
      return utterance;
    };

    const first = utter(text, forceLang);
    if (secondaryText) {
      first.onend = () => {
        const second = utter(secondaryText, forceLang);
        window.speechSynthesis.speak(second);
      };
    }
    window.speechSynthesis.speak(first);
  }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    bottles: [],
    selectedBottleId: null,
    moveHistory: [],
    level: 1,
    difficulty: 'easy',
    scene: 'colors',
    status: 'playing',
    movesLeft: GAME_CONFIG.initialMoves,
    score: 0,
    highScores: [],
    clearedColors: [],
    view: 'home',
    unlockedLevels: 1,
    hasAddedBottle: false,
    capacity: DIFFICULTY_SETTINGS.easy.capacity,
    levelColors: [],
    userProfile: {
      name: `小水滴 ${Math.floor(Math.random() * 1000)}`,
      avatar: '💧',
      totalScore: 0,
      levelsCleared: 0,
      joinDate: new Date().toLocaleDateString(),
    }
  });

  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load State
  useEffect(() => {
    const savedScores = localStorage.getItem('water_sort_scores');
    const savedUnlocked = localStorage.getItem('water_sort_unlocked');
    const savedProfile = localStorage.getItem('water_sort_profile');
    
    setGameState(prev => ({
      ...prev,
      highScores: savedScores ? JSON.parse(savedScores) : [],
      unlockedLevels: savedUnlocked ? parseInt(savedUnlocked) : 1,
      userProfile: savedProfile ? JSON.parse(savedProfile) : prev.userProfile,
    }));
  }, []);

  // Save High Scores
  const saveScore = useCallback((score: number, level: number) => {
    const newEntry: ScoreEntry = {
      name: `玩家 ${Math.floor(Math.random() * 1000)}`,
      score,
      level,
      date: new Date().toLocaleDateString(),
    };
    
    setGameState(prev => {
      const updated = [...prev.highScores, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, GAME_CONFIG.maxHighScores);
      localStorage.setItem('water_sort_scores', JSON.stringify(updated));
      return { ...prev, highScores: updated };
    });
  }, []);

  // Initialize Level
  const initLevel = useCallback((level: number, currentScore: number = 0, difficulty?: Difficulty, scene?: Scene) => {
    const activeDifficulty = difficulty || gameState.difficulty;
    const activeScene = scene || gameState.scene;
    
    const settings = DIFFICULTY_SETTINGS[activeDifficulty];
    
    // Scale colors with level
    const colorsCount = Math.min(
      settings.maxColors,
      settings.minColors + Math.floor((level - 1) / 2)
    );
    
    const emptyBottles = 2;
    
    // Pick random colors from COLOR_DATA
    const shuffledColorData = [...COLOR_DATA].sort(() => Math.random() - 0.5);
    const selectedColorData = shuffledColorData.slice(0, colorsCount);
    const selectedColors = selectedColorData.map(d => d.color);
    
    let pool: Color[] = [];
    for (let i = 0; i < colorsCount; i++) {
      for (let j = 0; j < settings.capacity; j++) {
        pool.push(selectedColors[i]);
      }
    }

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const newBottles: BottleData[] = [];
    for (let i = 0; i < colorsCount; i++) {
      newBottles.push({
        id: i,
        colors: pool.slice(i * settings.capacity, (i + 1) * settings.capacity),
      });
    }

    for (let i = 0; i < emptyBottles; i++) {
      newBottles.push({
        id: colorsCount + i,
        colors: [],
      });
    }

    setGameState(prev => ({
      ...prev,
      bottles: newBottles,
      selectedBottleId: null,
      moveHistory: [],
      level,
      difficulty: activeDifficulty,
      scene: activeScene,
      capacity: settings.capacity,
      levelColors: selectedColors,
      status: 'playing',
      movesLeft: settings.baseMoves + (level - 1) * GAME_CONFIG.movesPerLevel,
      score: currentScore,
      clearedColors: [],
      view: 'game',
      hasAddedBottle: false,
    }));
    setShowWinModal(false);
    setShowLoseModal(false);
  }, [gameState.difficulty, gameState.scene]);

  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  // Check Win/Loss Condition
  useEffect(() => {
    if (gameState.bottles.length === 0 || gameState.status !== 'playing') return;

    // Win condition: All colors present in the level are cleared into bags
    const isWon = gameState.levelColors.length > 0 && gameState.clearedColors.length === gameState.levelColors.length;

    if (isWon) {
      playSound('win');
      speak('太棒了！你赢了！', 'Excellent! You won!');
      
      // Fireworks effect
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: COLOR_DATA.map(d => d.color)
      });
      setGameState(prev => {
        const nextUnlocked = Math.max(prev.unlockedLevels, prev.level + 1);
        localStorage.setItem('water_sort_unlocked', nextUnlocked.toString());
        
        const updatedProfile = {
          ...prev.userProfile,
          totalScore: prev.userProfile.totalScore + GAME_CONFIG.pointsPerLevel,
          levelsCleared: Math.max(prev.userProfile.levelsCleared, prev.level),
        };
        localStorage.setItem('water_sort_profile', JSON.stringify(updatedProfile));

        return { 
          ...prev, 
          status: 'won', 
          score: prev.score + GAME_CONFIG.pointsPerLevel,
          unlockedLevels: nextUnlocked,
          userProfile: updatedProfile
        };
      });
      setTimeout(() => setShowWinModal(true), 800);
    } else if (gameState.movesLeft <= 0) {
      playSound('fail');
      setGameState(prev => ({ ...prev, status: 'lost' }));
      saveScore(gameState.score, gameState.level);
      setTimeout(() => setShowLoseModal(true), 500);
    }
  }, [gameState.bottles, gameState.movesLeft, gameState.status, gameState.score, gameState.level, gameState.clearedColors, saveScore]);

  const handleBottleClick = (id: number) => {
    if (gameState.status !== 'playing') return;

    if (gameState.selectedBottleId === null) {
      if (gameState.bottles[id].colors.length > 0) {
        playSound('select');
        const topColor = gameState.bottles[id].colors[gameState.bottles[id].colors.length - 1];
        const { first, second } = getVoiceContentForColor(topColor);
        const forceLang = gameState.scene === 'literacy' ? 'zh-CN' : undefined;
        speak(first, second, forceLang);
        setGameState(prev => ({ ...prev, selectedBottleId: id }));
      } else {
        speak('空瓶子', 'Empty bottle');
      }
    } else if (gameState.selectedBottleId === id) {
      setGameState(prev => ({ ...prev, selectedBottleId: null }));
    } else {
      pourWater(gameState.selectedBottleId, id);
    }
  };

  const handleBagClick = (color: string) => {
    if (gameState.status !== 'playing' || gameState.selectedBottleId === null) return;

    const source = gameState.bottles[gameState.selectedBottleId];
    
    // Check if bottle is full and has only one color
    const isFullAndUniform = source.colors.length === gameState.capacity && 
                             source.colors.every(c => c === color);

    if (isFullAndUniform) {
      // Check if this color is already cleared
      if (gameState.clearedColors.includes(color)) {
        playSound('fail');
        setGameState(prev => ({ ...prev, selectedBottleId: null }));
        return;
      }

      // Clear the bottle and add to clearedColors
      playSound('clear');
      const { first, second } = getVoiceContentForColor(color);
      const forceLang = gameState.scene === 'literacy' ? 'zh-CN' : undefined;
      speak(first, second, forceLang);
      
      const newBottles = gameState.bottles.map(b => {
        if (b.id === gameState.selectedBottleId) {
          return { ...b, colors: [] };
        }
        return b;
      });

      setGameState(prev => ({
        ...prev,
        bottles: newBottles,
        selectedBottleId: null,
        clearedColors: [...prev.clearedColors, color],
        score: prev.score + 50, // Bonus for clearing a bag
        moveHistory: [...prev.moveHistory, {
          bottles: prev.bottles,
          clearedColors: prev.clearedColors,
          movesLeft: prev.movesLeft,
          score: prev.score,
          hasAddedBottle: prev.hasAddedBottle
        }],
      }));

      // Add local confetti
      const rect = document.getElementById(`bag-${color}`)?.getBoundingClientRect();
      if (rect) {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { 
            x: (rect.left + rect.width / 2) / window.innerWidth, 
            y: (rect.top + rect.height / 2) / window.innerHeight 
          },
          colors: [color, '#ffffff'],
          ticks: 100,
          gravity: 1.2
        });
      }
    } else {
      playSound('fail');
      setGameState(prev => ({ ...prev, selectedBottleId: null }));
    }
  };

  const pourWater = (sourceId: number, targetId: number) => {
    const source = gameState.bottles[sourceId];
    const target = gameState.bottles[targetId];

    if (source.colors.length === 0) return;
    if (target.colors.length === gameState.capacity) {
      speak('瓶子满了');
      return;
    }

    const sourceTopColor = source.colors[source.colors.length - 1];
    const targetTopColor = target.colors.length > 0 ? target.colors[target.colors.length - 1] : null;

    let unitsToPour = 0;
    for (let i = source.colors.length - 1; i >= 0; i--) {
      if (source.colors[i] === sourceTopColor) {
        unitsToPour++;
      } else {
        break;
      }
    }

    const spaceInTarget = gameState.capacity - target.colors.length;
    const actualPour = Math.min(unitsToPour, spaceInTarget);

    if (actualPour > 0) {
      playSound('pour');
      const { first, second } = getVoiceContentForColor(sourceTopColor);
      const forceLang = gameState.scene === 'literacy' ? 'zh-CN' : undefined;
      speak(first, second, forceLang);

      const newBottles = gameState.bottles.map(b => {
        if (b.id === sourceId) {
          return { ...b, colors: b.colors.slice(0, b.colors.length - actualPour) };
        }
        if (b.id === targetId) {
          const addedColors = Array(actualPour).fill(sourceTopColor);
          return { ...b, colors: [...b.colors, ...addedColors] };
        }
        return b;
      });

      setGameState(prev => ({
        ...prev,
        bottles: newBottles,
        selectedBottleId: null,
        movesLeft: prev.movesLeft - 1,
        score: prev.score + GAME_CONFIG.pointsPerPour,
        moveHistory: [...prev.moveHistory, {
          bottles: prev.bottles,
          clearedColors: prev.clearedColors,
          movesLeft: prev.movesLeft,
          score: prev.score,
          hasAddedBottle: prev.hasAddedBottle
        }],
      }));
    } else {
      setGameState(prev => ({ ...prev, selectedBottleId: null }));
    }
  };

  const undoMove = () => {
    if (gameState.moveHistory.length === 0 || gameState.status !== 'playing') return;
    const lastEntry = gameState.moveHistory[gameState.moveHistory.length - 1];
    setGameState(prev => ({
      ...prev,
      bottles: lastEntry.bottles,
      clearedColors: lastEntry.clearedColors,
      movesLeft: lastEntry.movesLeft,
      score: lastEntry.score,
      hasAddedBottle: lastEntry.hasAddedBottle,
      moveHistory: prev.moveHistory.slice(0, -1),
      selectedBottleId: null,
    }));
  };

  const addExtraBottle = () => {
    if (gameState.hasAddedBottle || gameState.status !== 'playing') return;
    
    playSound('select');
    const newBottle: BottleData = {
      id: gameState.bottles.length,
      colors: [],
    };

    setGameState(prev => ({
      ...prev,
      bottles: [...prev.bottles, newBottle],
      hasAddedBottle: true,
      moveHistory: [...prev.moveHistory, {
        bottles: prev.bottles,
        clearedColors: prev.clearedColors,
        movesLeft: prev.movesLeft,
        score: prev.score,
        hasAddedBottle: prev.hasAddedBottle
      }],
    }));
  };

  const resetLevel = () => {
    initLevel(gameState.level, gameState.score);
  };

  const nextLevel = () => {
    initLevel(gameState.level + 1, gameState.score);
  };

  const restartGame = () => {
    initLevel(1, 0);
  };

  const getIconForColor = (color: string) => {
    return COLOR_DATA.find(d => d.color === color)?.icon || '';
  };

  const colorsInLevel = gameState.levelColors.map(color => {
    return COLOR_DATA.find(d => d.color === color)!;
  });

  const getContentForColor = (color: string) => {
    const colorData = COLOR_DATA.find(d => d.color === color);
    if (!colorData) return '';

    if (gameState.scene === 'colors') return colorData.zhName;

    const sceneData = SCENE_CONTENT[gameState.scene]?.[gameState.difficulty];
    if (!sceneData) return '';

    const colorIndex = gameState.levelColors.indexOf(color);
    if (colorIndex === -1) return '';

    const item = sceneData[colorIndex % sceneData.length];
    return item.primary;
  };

  const getVoiceContentForColor = (color: string) => {
    const colorData = COLOR_DATA.find(d => d.color === color);
    if (!colorData) return { first: '', second: '' };

    if (gameState.scene === 'colors') {
      return { first: colorData.zhName, second: colorData.name };
    }

    const sceneData = SCENE_CONTENT[gameState.scene]?.[gameState.difficulty];
    if (!sceneData) return { first: '', second: '' };

    const colorIndex = gameState.levelColors.indexOf(color);
    if (colorIndex === -1) return { first: '', second: '' };

    const item = sceneData[colorIndex % sceneData.length];
    
    // For literacy, primary is character, secondary is pinyin
    // For others, primary is English/Math, secondary is Chinese explanation
    return { first: item.primary, second: item.secondary };
  };

  const HomeView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFBEB] to-white overflow-y-auto">
      <motion.div 
        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6 sm:mb-8"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-400 rounded-[24px] sm:rounded-[28px] flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl shadow-pink-200">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 sm:mb-2 tracking-tight">开心倒水水</h1>
        <p className="text-slate-500 font-bold text-xs sm:text-sm">色彩缤纷的益智挑战</p>
      </motion.div>

      <div className="w-full max-w-md space-y-6">
        {/* Difficulty Selection */}
        <div className="space-y-3">
          <p className="text-center font-black text-slate-700 text-sm uppercase tracking-wider">选择难度</p>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  speak(DIFFICULTY_SETTINGS[d].label, d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard');
                  setGameState(prev => ({ ...prev, difficulty: d }));
                }}
                className={`py-3 rounded-xl font-black text-xs transition-all border-2 ${
                  gameState.difficulty === d 
                    ? 'bg-pink-500 border-pink-600 text-white shadow-md scale-105' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {DIFFICULTY_SETTINGS[d].label.split(' ')[0]}
                <br />
                <span className="text-[9px] opacity-80">{DIFFICULTY_SETTINGS[d].label.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scene Selection */}
        <div className="space-y-3">
          <p className="text-center font-black text-slate-700 text-sm uppercase tracking-wider">选择场景</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'colors', label: '缤纷色彩', icon: '🎨' },
              { id: 'math', label: '趣味数学', icon: '🔢' },
              { id: 'english', label: '快乐英语', icon: '🔤' },
              { id: 'literacy', label: '儿童识字', icon: '🏮' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  speak(s.label, s.id === 'colors' ? 'Colors' : s.id === 'math' ? 'Math' : s.id === 'english' ? 'English' : 'Literacy');
                  setGameState(prev => ({ ...prev, scene: s.id as Scene }));
                }}
                className={`py-3 rounded-xl font-black text-xs transition-all border-2 flex flex-col items-center gap-1 ${
                  gameState.scene === s.id 
                    ? 'bg-blue-500 border-blue-600 text-white shadow-md scale-105' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => {
              speak('开始挑战', 'Start Challenge');
              initLevel(gameState.unlockedLevels);
            }}
            className="py-4 bg-pink-500 hover:bg-pink-400 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-pink-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" /> 开始挑战
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                speak('选择关卡', 'Select Level');
                setGameState(prev => ({ ...prev, view: 'levels' }));
              }}
              className="py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl font-black text-sm transition-all border-4 border-amber-200 shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-500" /> 选择关卡
            </button>
            <button 
              onClick={() => {
                speak('个人中心', 'Profile Center');
                setGameState(prev => ({ ...prev, view: 'profile' }));
              }}
              className="py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl font-black text-sm transition-all border-4 border-blue-200 shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4 text-blue-500" /> 个人中心
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const LevelsView = () => (
    <div className="min-h-screen bg-[#FFFBEB] p-4 sm:p-6">
      <header className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <button 
          onClick={() => {
            speak('返回首页', 'Back to Home');
            setGameState(prev => ({ ...prev, view: 'home' }));
          }}
          className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border-2 border-slate-200 shadow-sm active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">选择关卡</h2>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {Array.from({ length: 24 }).map((_, i) => {
          const levelNum = i + 1;
          const isUnlocked = levelNum <= gameState.unlockedLevels;
          return (
            <motion.button
              key={levelNum}
              whileHover={isUnlocked ? { scale: 1.05 } : {}}
              whileTap={isUnlocked ? { scale: 0.95 } : {}}
              onClick={() => {
                if (isUnlocked) {
                  speak(`第 ${levelNum} 关`);
                  initLevel(levelNum);
                } else {
                  speak('关卡未解锁');
                }
              }}
              className={`
                aspect-square rounded-2xl sm:rounded-3xl border-2 sm:border-4 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all
                ${isUnlocked 
                  ? 'bg-white border-amber-200 shadow-lg text-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}
              `}
            >
              {isUnlocked ? (
                <>
                  <span className="text-xl sm:text-2xl font-black">{levelNum}</span>
                  <div className="flex gap-0.5">
                    <Star className="w-2 h-2 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                    <Star className="w-2 h-2 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                    <Star className="w-2 h-2 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                  </div>
                </>
              ) : (
                <Lock className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="min-h-screen bg-[#FFFBEB] p-4 sm:p-6">
      <header className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <button 
          onClick={() => {
            speak('返回首页', 'Back to Home');
            setGameState(prev => ({ ...prev, view: 'home' }));
          }}
          className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border-2 border-slate-200 shadow-sm active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">个人中心</h2>
      </header>

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border-4 border-blue-200 shadow-xl flex flex-col items-center text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4">
            {gameState.userProfile.avatar}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">{gameState.userProfile.name}</h3>
          <p className="text-slate-400 font-bold text-xs sm:text-sm">加入时间: {gameState.userProfile.joinDate}</p>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mt-6 sm:mt-8">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-blue-100">
              <p className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase mb-1">总得分</p>
              <p className="text-xl sm:text-2xl font-black text-blue-600">{gameState.userProfile.totalScore}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-green-100">
              <p className="text-[10px] sm:text-xs font-bold text-green-400 uppercase mb-1">通关数</p>
              <p className="text-xl sm:text-2xl font-black text-green-600">{gameState.userProfile.levelsCleared}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border-4 border-amber-200 shadow-xl">
          <h4 className="text-lg sm:text-xl font-black text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Award className="text-amber-500" /> 我的战绩
          </h4>
          <div className="space-y-2 sm:space-y-3">
            {gameState.highScores.length === 0 ? (
              <p className="text-center py-6 sm:py-8 text-slate-400 font-bold italic">暂无战绩，快去挑战吧！</p>
            ) : (
              gameState.highScores.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border-2 border-slate-100">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black text-sm sm:text-base">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-black text-slate-800 text-sm sm:text-base">Level {entry.level}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-bold">{entry.date}</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-pink-500">{entry.score}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const Buntings = () => (
    <div className="absolute top-0 left-0 w-full flex justify-around pointer-events-none overflow-hidden h-16 z-10">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, rotate: -10 }}
          animate={{ y: 0, rotate: 10 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 1 + Math.random(),
            delay: Math.random()
          }}
          className="w-8 h-10"
          style={{
            backgroundColor: COLOR_DATA[i % COLOR_DATA.length].color,
            clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
            opacity: 0.8
          }}
        />
      ))}
    </div>
  );

  if (gameState.view === 'home') return <HomeView />;
  if (gameState.view === 'levels') return <LevelsView />;
  if (gameState.view === 'profile') return <ProfileView />;

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 font-sans selection:bg-pink-200 overflow-x-hidden flex flex-col relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <Buntings />

      {/* Playful Header */}
      <header className="p-3 sm:p-4 md:p-6 flex justify-between items-center border-b-4 border-blue-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <button 
            onClick={() => {
              speak('返回首页');
              setGameState(prev => ({ ...prev, view: 'home' }));
            }}
            className="p-2 bg-slate-50 rounded-xl border border-slate-200 active:scale-90"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-tight">开心倒水水</h1>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-1.5 py-0.5 bg-amber-400 text-white text-[8px] sm:text-[10px] md:text-xs font-bold rounded-full uppercase">第 {gameState.level} 关</span>
              <span className="px-1.5 py-0.5 bg-blue-400 text-white text-[8px] sm:text-[10px] md:text-xs font-bold rounded-full uppercase">得分: {gameState.score}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1.5 sm:gap-2 md:gap-3">
          <button 
            onClick={() => {
              speak('排行榜');
              setShowLeaderboard(true);
            }}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 transition-all active:scale-90 border-2 border-slate-200 shadow-sm"
            title="排行榜"
          >
            <ListOrdered className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
          </button>
          <button 
            onClick={() => {
              speak('增加瓶子', 'Add Bottle');
              addExtraBottle();
            }}
            disabled={gameState.hasAddedBottle || gameState.status !== 'playing'}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-90 border-2 border-slate-200 shadow-sm flex items-center gap-2"
            title="增加瓶子"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
            <span className="hidden sm:inline text-xs font-bold text-slate-500">增加瓶子</span>
          </button>
          <button 
            onClick={() => {
              speak('撤销', 'Undo');
              undoMove();
            }}
            disabled={gameState.moveHistory.length === 0 || gameState.status !== 'playing'}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-90 border-2 border-slate-200 shadow-sm"
          >
            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
          </button>
          <button 
            onClick={() => {
              speak('重新开始', 'Restart Level');
              resetLevel();
            }}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 transition-all active:scale-90 border-2 border-slate-200 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Bags Section */}
      <div className="bg-amber-50/50 p-2 sm:p-4 border-b-2 border-amber-100 overflow-x-auto no-scrollbar">
        <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 sm:gap-4 min-w-max sm:min-w-0 px-2">
          {colorsInLevel.map((data) => {
            const isCleared = gameState.clearedColors.includes(data.color);
            return (
              <motion.div
                key={data.color}
                id={`bag-${data.color}`}
                onClick={() => {
                  const { first, second } = getVoiceContentForColor(data.color);
                  const forceLang = gameState.scene === 'literacy' ? 'zh-CN' : undefined;
                  speak(first, second, forceLang);
                  handleBagClick(data.color);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[80px]
                  ${isCleared ? 'bg-green-100 border-green-300 opacity-60' : 'bg-white border-amber-200 shadow-sm'}
                  ${gameState.selectedBottleId !== null && !isCleared ? 'ring-2 sm:ring-4 ring-pink-200 ring-offset-1 sm:ring-offset-2' : ''}
                `}
              >
                <div 
                  className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl shadow-inner overflow-hidden"
                  style={{ backgroundColor: data.color }}
                >
                  {isCleared ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  ) : (
                    gameState.scene === 'colors' ? (
                      <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    ) : (
                      <span className="text-[10px] sm:text-xs font-black text-white px-1 text-center leading-tight">
                        {getContentForColor(data.color)}
                      </span>
                    )
                  )}
                </div>
                <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">
                  {gameState.scene === 'colors' ? `${data.icon} ${data.zhName}` : `收集袋 ${colorsInLevel.indexOf(data) + 1}`}
                </span>
                {isCleared && <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5"><CheckCircle2 className="w-3 h-3" /></div>}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white/50 backdrop-blur-sm px-4 py-1.5 sm:py-2 flex justify-center gap-4 sm:gap-8 border-b border-amber-100">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <History className="w-3.5 h-3.5 sm:w-4 h-4 text-pink-500" />
          <span className="font-black text-slate-700 text-xs sm:text-sm">剩余步数: </span>
          <motion.span 
            key={gameState.movesLeft}
            initial={{ scale: 1.5, color: '#ef4444' }}
            animate={{ scale: 1, color: gameState.movesLeft < 5 ? '#ef4444' : '#334155' }}
            className="text-sm sm:text-lg font-black"
          >
            {gameState.movesLeft}
          </motion.span>
        </div>
      </div>

      {/* Game Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 sm:gap-x-10 md:gap-x-12 gap-y-8 sm:gap-y-12 md:gap-y-16 justify-items-center w-full max-w-5xl mx-auto">
          {gameState.bottles.map((bottle) => (
            <div key={bottle.id} className="relative">
              <motion.div
                onClick={() => handleBottleClick(bottle.id)}
                animate={{
                  y: gameState.selectedBottleId === bottle.id ? -20 : 0,
                  scale: gameState.selectedBottleId === bottle.id ? 1.05 : 1,
                }}
                className={`
                  relative w-14 h-40 sm:w-16 sm:h-48 md:w-20 md:h-56 rounded-b-[24px] sm:rounded-b-[30px] md:rounded-b-[40px] rounded-t-lg sm:rounded-t-xl md:rounded-t-2xl border-[3px] sm:border-4 cursor-pointer overflow-hidden transition-all
                  ${gameState.selectedBottleId === bottle.id ? 'border-pink-400 shadow-2xl ring-4 sm:ring-8 ring-pink-100' : 'border-slate-300 bg-white/80'}
                `}
              >
                <div className="absolute bottom-0 left-0 w-full flex flex-col-reverse h-full">
                  {bottle.colors.map((color, idx) => (
                    <motion.div
                      key={`${bottle.id}-${idx}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${100 / gameState.capacity}%` }}
                      style={{ backgroundColor: color }}
                      className="w-full flex items-center justify-center border-t border-white/20 relative"
                    >
                      {gameState.scene !== 'colors' && (
                        <span className="text-[10px] sm:text-xs md:text-sm font-black text-white/90 drop-shadow-md text-center px-1 leading-tight">
                          {getContentForColor(color)}
                        </span>
                      )}
                      {gameState.scene === 'colors' && (
                        <span className="text-base sm:text-xl md:text-2xl drop-shadow-md select-none">
                          {getIconForColor(color)}
                        </span>
                      )}
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-white rounded-full" />
                        <div className="absolute bottom-1.5 right-2 w-1 h-1 bg-white rounded-full" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="absolute top-0 left-1.5 w-3 h-full bg-white/20 rounded-full pointer-events-none" />
              </motion.div>
              <div className="mt-3 sm:mt-4 md:mt-6 w-10 sm:w-12 md:w-16 h-1.5 sm:h-2 bg-slate-200 rounded-full blur-sm mx-auto" />
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 md:mt-20 flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 text-slate-600 font-bold bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-amber-200 shadow-sm">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-400 rounded-full flex items-center justify-center text-white">
              <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
            </div>
            <span className="text-[10px] sm:text-sm md:text-base">集齐4个相同颜色后，点击对应的手提袋消除它！</span>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Win Modal */}
        {showWinModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-pink-500/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
              className="bg-white border-4 border-pink-200 p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2">太棒啦！</h2>
              <p className="text-slate-500 font-bold mb-8">你真聪明，成功完成了挑战！</p>
              <button onClick={nextLevel} className="w-full py-5 bg-pink-500 hover:bg-pink-400 text-white rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-pink-200 active:scale-95">
                继续玩 <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Lose Modal */}
        {showLoseModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              className="bg-white border-4 border-slate-200 p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-12 h-12 text-slate-400" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">哎呀，没步数了</h2>
              <p className="text-slate-500 font-bold mb-4">别灰心，再试一次吧！</p>
              <div className="bg-slate-50 p-4 rounded-2xl mb-8">
                <p className="text-sm font-bold text-slate-400 uppercase">最终得分</p>
                <p className="text-3xl font-black text-slate-800">{gameState.score}</p>
              </div>
              <button onClick={restartGame} className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 active:scale-95">
                重新开始 <RefreshCw className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div 
              initial={{ y: 50 }} animate={{ y: 0 }}
              className="bg-white border-4 border-amber-200 p-8 rounded-[40px] shadow-2xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ListOrdered className="text-amber-500" /> 排行榜
                </h2>
                <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-slate-600 font-bold">关闭</button>
              </div>
              
              <div className="space-y-3">
                {gameState.highScores.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 font-bold italic">还没有记录哦，快去挑战吧！</p>
                ) : (
                  gameState.highScores.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-300'}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-black text-slate-800">{entry.name}</p>
                          <p className="text-xs text-slate-400 font-bold">Level {entry.level} • {entry.date}</p>
                        </div>
                      </div>
                      <p className="text-xl font-black text-pink-500">{entry.score}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
