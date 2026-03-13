/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Undo2, Trophy, Play, ChevronRight, Info, Sparkles, AlertCircle, ListOrdered, History, ShoppingBag, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Color, BottleData, GameState, ScoreEntry, GameStatus, GameView, UserProfile } from './types';
import { COLOR_DATA, BOTTLE_CAPACITY, GAME_CONFIG } from './constants';
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

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    bottles: [],
    selectedBottleId: null,
    moveHistory: [],
    level: 1,
    status: 'playing',
    movesLeft: GAME_CONFIG.initialMoves,
    score: 0,
    highScores: [],
    clearedColors: [],
    view: 'home',
    unlockedLevels: 1,
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
  const initLevel = useCallback((level: number, currentScore: number = 0) => {
    const colorsCount = Math.min(level + 1, COLOR_DATA.length);
    const emptyBottles = 2;
    
    let pool: Color[] = [];
    for (let i = 0; i < colorsCount; i++) {
      for (let j = 0; j < BOTTLE_CAPACITY; j++) {
        pool.push(COLOR_DATA[i].color);
      }
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const newBottles: BottleData[] = [];
    for (let i = 0; i < colorsCount; i++) {
      newBottles.push({
        id: i,
        colors: pool.slice(i * BOTTLE_CAPACITY, (i + 1) * BOTTLE_CAPACITY),
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
      status: 'playing',
      movesLeft: GAME_CONFIG.initialMoves + (level - 1) * GAME_CONFIG.movesPerLevel,
      score: currentScore,
      clearedColors: [],
      view: 'game',
    }));
    setShowWinModal(false);
    setShowLoseModal(false);
  }, []);

  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  // Check Win/Loss Condition
  useEffect(() => {
    if (gameState.bottles.length === 0 || gameState.status !== 'playing') return;

    // Win condition: All colors present in the level are cleared into bags
    const colorsInLevel = Math.min(gameState.level + 1, COLOR_DATA.length);
    const isWon = gameState.clearedColors.length === colorsInLevel;

    if (isWon) {
      playSound('win');
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
        setGameState(prev => ({ ...prev, selectedBottleId: id }));
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
    const isFullAndUniform = source.colors.length === BOTTLE_CAPACITY && 
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
          score: prev.score
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
    if (target.colors.length === BOTTLE_CAPACITY) return;

    const sourceTopColor = source.colors[source.colors.length - 1];
    const targetTopColor = target.colors.length > 0 ? target.colors[target.colors.length - 1] : null;

    if (targetTopColor !== null && sourceTopColor !== targetTopColor) {
      playSound('fail');
      setGameState(prev => ({ ...prev, selectedBottleId: null }));
      return;
    }

    let unitsToPour = 0;
    for (let i = source.colors.length - 1; i >= 0; i--) {
      if (source.colors[i] === sourceTopColor) {
        unitsToPour++;
      } else {
        break;
      }
    }

    const spaceInTarget = BOTTLE_CAPACITY - target.colors.length;
    const actualPour = Math.min(unitsToPour, spaceInTarget);

    if (actualPour > 0) {
      playSound('pour');
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
          score: prev.score
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
      moveHistory: prev.moveHistory.slice(0, -1),
      selectedBottleId: null,
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

  const colorsInLevel = COLOR_DATA.slice(0, Math.min(gameState.level + 1, COLOR_DATA.length));

  const HomeView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFBEB] to-white overflow-hidden">
      <motion.div 
        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 sm:mb-12"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-pink-400 rounded-[28px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-pink-200">
          <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-2 sm:mb-4 tracking-tight">开心倒水水</h1>
        <p className="text-slate-500 font-bold text-sm sm:text-base">色彩缤纷的益智挑战</p>
      </motion.div>

      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-xs">
        <button 
          onClick={() => initLevel(gameState.unlockedLevels)}
          className="py-4 sm:py-5 bg-pink-500 hover:bg-pink-400 text-white rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl transition-all shadow-xl shadow-pink-200 active:scale-95 flex items-center justify-center gap-3"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> 继续游戏
        </button>
        <button 
          onClick={() => setGameState(prev => ({ ...prev, view: 'levels' }))}
          className="py-4 sm:py-5 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl transition-all border-4 border-amber-200 shadow-lg active:scale-95 flex items-center justify-center gap-3"
        >
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> 选择关卡
        </button>
        <button 
          onClick={() => setGameState(prev => ({ ...prev, view: 'profile' }))}
          className="py-4 sm:py-5 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl transition-all border-4 border-blue-200 shadow-lg active:scale-95 flex items-center justify-center gap-3"
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" /> 个人中心
        </button>
      </div>
    </div>
  );

  const LevelsView = () => (
    <div className="min-h-screen bg-[#FFFBEB] p-4 sm:p-6">
      <header className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <button 
          onClick={() => setGameState(prev => ({ ...prev, view: 'home' }))}
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
              onClick={() => isUnlocked && initLevel(levelNum)}
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
          onClick={() => setGameState(prev => ({ ...prev, view: 'home' }))}
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

  if (gameState.view === 'home') return <HomeView />;
  if (gameState.view === 'levels') return <LevelsView />;
  if (gameState.view === 'profile') return <ProfileView />;

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-slate-800 font-sans selection:bg-pink-200 overflow-x-hidden flex flex-col">
      {/* Playful Header */}
      <header className="p-3 sm:p-4 md:p-6 flex justify-between items-center border-b-4 border-amber-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <button 
            onClick={() => setGameState(prev => ({ ...prev, view: 'home' }))}
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
            onClick={() => setShowLeaderboard(true)}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 transition-all active:scale-90 border-2 border-slate-200 shadow-sm"
            title="排行榜"
          >
            <ListOrdered className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
          </button>
          <button 
            onClick={undoMove}
            disabled={gameState.moveHistory.length === 0 || gameState.status !== 'playing'}
            className="p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-90 border-2 border-slate-200 shadow-sm"
          >
            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600" />
          </button>
          <button 
            onClick={resetLevel}
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
                onClick={() => handleBagClick(data.color)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[80px]
                  ${isCleared ? 'bg-green-100 border-green-300 opacity-60' : 'bg-white border-amber-200 shadow-sm'}
                  ${gameState.selectedBottleId !== null && !isCleared ? 'ring-2 sm:ring-4 ring-pink-200 ring-offset-1 sm:ring-offset-2' : ''}
                `}
              >
                <div 
                  className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl shadow-inner"
                  style={{ backgroundColor: data.color }}
                >
                  {isCleared ? <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" /> : <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                </div>
                <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">{data.icon} {data.name}</span>
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
                      animate={{ height: '25%' }}
                      style={{ backgroundColor: color }}
                      className="w-full flex items-center justify-center border-t border-white/20 relative"
                    >
                      <span className="text-base sm:text-xl md:text-2xl drop-shadow-md select-none">
                        {getIconForColor(color)}
                      </span>
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
