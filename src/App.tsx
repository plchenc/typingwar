/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Heart, Zap, Ship, Target, RefreshCw, ChevronRight, User } from 'lucide-react';
import { Difficulty, WORD_LISTS, DIFFICULTY_CONFIG, ScoreEntry, AVATARS } from './constants';
import { soundManager } from './sounds';

type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER' | 'LEADERBOARD';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [currentWord, setCurrentWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [projectiles, setProjectiles] = useState<{ id: number; from: 'player' | 'enemy' }[]>([]);
  const [explosions, setExplosions] = useState<{ id: number; x: number; y: number }[]>([]);
  const [enemyDistance, setEnemyDistance] = useState(20); // 20% from right
  const [enemyHits, setEnemyHits] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const movementRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load leaderboard
  useEffect(() => {
    const saved = localStorage.getItem('typing_leaderboard');
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    }
  }, []);

  const saveScore = useCallback(() => {
    const newEntry: ScoreEntry = {
      name: avatar.name,
      score,
      difficulty,
      date: new Date().toLocaleDateString()
    };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem('typing_leaderboard', JSON.stringify(updated));
  }, [avatar.name, score, difficulty, leaderboard]);

  const spawnWord = useCallback(() => {
    const list = WORD_LISTS[difficulty];
    const word = list[Math.floor(Math.random() * list.length)];
    setCurrentWord(word);
    setUserInput('');
    setTimeLeft(DIFFICULTY_CONFIG[difficulty].timeLimit);
  }, [difficulty]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setScore(0);
    setHealth(100);
    setGameState('PLAYING');
    setProjectiles([]);
    setExplosions([]);
    setEnemyDistance(20);
    setEnemyHits(0);
    setConsecutiveCorrect(0);
    spawnWord();
  };

  const handleEnemyAttack = useCallback(() => {
    soundManager.playHit();
    setConsecutiveCorrect(0); // Reset streak
    setHealth(prev => {
      const next = prev - 20;
      if (next <= 0) {
        setGameState('GAME_OVER');
        return 0;
      }
      return next;
    });
    
    // Enemy projectile animation
    const id = Date.now();
    setProjectiles(prev => [...prev, { id, from: 'enemy' }]);
    setTimeout(() => {
      setProjectiles(prev => prev.filter(p => p.id !== id));
      setExplosions(prev => [...prev, { id, x: 20, y: 50 }]); // Player side
      setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 500);
    }, 600);
    
    spawnWord();
  }, [spawnWord]);

  // Enemy movement logic
  useEffect(() => {
    if (gameState === 'PLAYING') {
      movementRef.current = setInterval(() => {
        setEnemyDistance(prev => {
          const next = prev + 0.5;
          if (next >= 85) { // Too close!
            handleEnemyAttack();
            return prev;
          }
          return next;
        });
      }, 200);
    }
    return () => {
      if (movementRef.current) clearInterval(movementRef.current);
    };
  }, [gameState, handleEnemyAttack]);

  useEffect(() => {
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            handleEnemyAttack();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft, handleEnemyAttack]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);

    if (val.toLowerCase() === currentWord.toLowerCase()) {
      // Success!
      soundManager.playShoot();
      const points = currentWord.length * DIFFICULTY_CONFIG[difficulty].scoreMult;
      setScore(prev => prev + points);
      
      const newStreak = consecutiveCorrect + 1;
      setConsecutiveCorrect(newStreak);

      // Win condition
      if (newStreak >= 20) {
        setGameState('WIN');
        return;
      }

      // Enemy hit logic
      setEnemyHits(prev => {
        const next = prev + 1;
        if (next % 2 === 0) {
          setEnemyDistance(d => Math.max(10, d - 10)); // Push back
        }
        return next;
      });
      
      // Player projectile animation
      const id = Date.now();
      setProjectiles(prev => [...prev, { id, from: 'player' }]);
      setTimeout(() => {
        setProjectiles(prev => prev.filter(p => p.id !== id));
        soundManager.playExplosion();
        setExplosions(prev => [...prev, { id, x: 100 - enemyDistance, y: 50 }]); // Enemy side
        setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 500);
      }, 600);

      spawnWord();
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      if (gameState === 'PLAYING' && inputRef.current) {
        inputRef.current.focus();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'PLAYING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  const handleBlur = () => {
    // Attempt to refocus if lost during play
    if (gameState === 'PLAYING') {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
    }
  };

  useEffect(() => {
    if (gameState === 'GAME_OVER' || gameState === 'WIN') {
      saveScore();
    }
  }, [gameState, saveScore]);

  const renderPixelAvatar = (color: string, size = 64) => (
    <div 
      className="grid grid-cols-8 grid-rows-8" 
      style={{ width: size, height: size, backgroundColor: '#1a1a1a', padding: size/16 }}
    >
      {[...Array(64)].map((_, i) => {
        const isFace = [18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37, 42, 43, 44, 45].includes(i);
        const isEye = [27, 28].includes(i);
        return (
          <div 
            key={i} 
            style={{ 
              backgroundColor: isEye ? '#fff' : isFace ? color : 'transparent',
              borderRadius: isEye ? '1px' : '0'
            }} 
          />
        );
      })}
    </div>
  );

  const Fireworks = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, x: Math.random() * 100 + '%', y: '100%' }}
          animate={{ 
            y: Math.random() * 50 + '%',
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: 1.5, 
            delay: i * 0.2,
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute w-4 h-4 rounded-full"
          style={{ 
            backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i % 5],
            boxShadow: '0 0 20px currentColor'
          }}
        >
          {[...Array(8)].map((_, j) => (
            <motion.div
              key={j}
              animate={{ x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 }}
              className="absolute w-1 h-1 bg-white rounded-full"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <AnimatePresence mode="wait">
        {gameState === 'MENU' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 w-full max-w-md bg-[#151515] border-2 border-blue-500/30 p-8 rounded-xl shadow-2xl shadow-blue-500/10"
          >
            <h1 className="text-4xl font-black text-center mb-8 tracking-tighter italic text-blue-400">
              TYPING<span className="text-white">WAR</span>
            </h1>

            <div className="mb-8">
              <label className="text-xs uppercase tracking-widest text-gray-500 mb-4 block font-bold">Select Avatar</label>
              <div className="grid grid-cols-4 gap-4">
                {AVATARS.map(av => (
                  <button
                    key={av.id}
                    onClick={() => setAvatar(av)}
                    className={`p-2 rounded-lg border-2 transition-all ${avatar.id === av.id ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-gray-700'}`}
                  >
                    {renderPixelAvatar(av.color, 48)}
                  </button>
                ))}
              </div>
              <p className="text-center mt-2 text-sm font-bold text-blue-300">{avatar.name}</p>
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest text-gray-500 block font-bold">Select Difficulty</label>
              <button onClick={() => startGame('easy')} className="w-full group flex items-center justify-between p-4 bg-green-500/10 border-2 border-green-500/30 hover:bg-green-500/20 rounded-lg transition-all">
                <span className="font-bold text-green-400">EASY</span>
                <span className="text-xs text-green-500/60 italic">Beginner Words • 10s</span>
                <ChevronRight className="w-4 h-4 text-green-500" />
              </button>
              <button onClick={() => startGame('medium')} className="w-full group flex items-center justify-between p-4 bg-yellow-500/10 border-2 border-yellow-500/30 hover:bg-yellow-500/20 rounded-lg transition-all">
                <span className="font-bold text-yellow-400">MEDIUM</span>
                <span className="text-xs text-yellow-500/60 italic">Intermediate • 6s</span>
                <ChevronRight className="w-4 h-4 text-yellow-500" />
              </button>
              <button onClick={() => startGame('hard')} className="w-full group flex items-center justify-between p-4 bg-red-500/10 border-2 border-red-500/30 hover:bg-red-500/20 rounded-lg transition-all">
                <span className="font-bold text-red-400">HARD</span>
                <span className="text-xs text-red-500/60 italic">Advanced • 3s</span>
                <ChevronRight className="w-4 h-4 text-red-500" />
              </button>
            </div>

            <button 
              onClick={() => setGameState('LEADERBOARD')}
              className="mt-8 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"
            >
              <Trophy className="w-4 h-4" /> Leaderboard
            </button>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 w-full max-w-4xl h-full flex flex-col"
          >
            {/* HUD */}
            <div className="flex justify-between items-center mb-12 bg-[#151515] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-4">
                {renderPixelAvatar(avatar.color, 40)}
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Pilot</div>
                  <div className="font-bold">{avatar.name}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Score</div>
                <div className="text-3xl font-black text-blue-400 tabular-nums">{score.toString().padStart(6, '0')}</div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Streak</div>
                <div className="text-3xl font-black text-yellow-400 tabular-nums">{consecutiveCorrect}/20</div>
              </div>

              <div className="w-48">
                <div className="flex justify-between text-xs font-bold uppercase mb-1">
                  <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3 fill-current" /> Hull</span>
                  <span>{health}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-red-500"
                    animate={{ width: `${health}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Battlefield */}
            <div className="relative flex-1 min-h-[400px] border-x-2 border-dashed border-white/5 flex items-center justify-between px-20">
              {/* Player Ship */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="relative z-20"
              >
                <div className="w-24 h-16 bg-blue-600 rounded-lg relative border-b-4 border-blue-900">
                  <div className="absolute -top-4 left-4 w-8 h-8 bg-blue-400 rounded-sm" />
                  <div className="absolute top-4 -right-4 w-8 h-4 bg-gray-700" />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.2 }} className="w-2 h-4 bg-orange-500 rounded-full blur-sm" />
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.2 }} className="w-2 h-4 bg-orange-500 rounded-full blur-sm" />
                </div>
              </motion.div>

              {/* Enemy Ship */}
              <motion.div 
                animate={{ 
                  y: [0, 10, 0],
                  right: `${enemyDistance}%`
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 3 },
                  right: { duration: 0.2 }
                }}
                className="absolute z-20"
              >
                <div className="w-32 h-20 bg-red-600 rounded-lg relative border-b-4 border-red-900">
                  <div className="absolute -top-6 right-6 w-12 h-10 bg-red-400 rounded-sm" />
                  <div className="absolute top-6 -left-6 w-10 h-6 bg-gray-700" />
                  <div className="absolute top-2 left-2 w-4 h-4 bg-yellow-400/50 animate-pulse" />
                </div>
                <div className="absolute -top-8 left-0 w-full text-center text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  Danger Zone
                </div>
              </motion.div>

              {/* Projectiles */}
              <AnimatePresence>
                {projectiles.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ x: p.from === 'player' ? 100 : (800 - (enemyDistance * 8)), opacity: 1 }}
                    animate={{ x: p.from === 'player' ? (800 - (enemyDistance * 8)) : 100 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "linear" }}
                    className={`absolute w-8 h-2 rounded-full ${p.from === 'player' ? 'bg-blue-400 shadow-[0_0_10px_#3b82f6]' : 'bg-red-400 shadow-[0_0_10px_#ef4444]'}`}
                    style={{ top: '50%' }}
                  />
                ))}
              </AnimatePresence>

              {/* Explosions */}
              <AnimatePresence>
                {explosions.map(e => (
                  <motion.div
                    key={e.id}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute w-12 h-12 bg-orange-500 rounded-full blur-md"
                    style={{ left: `${e.x}%`, top: `${e.y}%` }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Typing Area */}
            <div className="mt-12 flex flex-col items-center">
              <div className="relative mb-8">
                <div className="text-6xl font-black tracking-tighter flex gap-1">
                  {currentWord.split('').map((char, i) => (
                    <span key={i} className={i < userInput.length ? (userInput[i].toLowerCase() === char.toLowerCase() ? 'text-blue-400' : 'text-red-500') : 'text-gray-700'}>
                      {char}
                    </span>
                  ))}
                </div>
                {/* Timer Bar */}
                <div className="absolute -bottom-4 left-0 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    animate={{ width: `${(timeLeft / DIFFICULTY_CONFIG[difficulty].timeLimit) * 100}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </div>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInput}
                onBlur={handleBlur}
                className="fixed top-0 left-0 opacity-0 pointer-events-none w-1 h-1"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                autoFocus
              />
              
              <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                <Zap className="w-3 h-3 text-yellow-500" /> Type the word to fire
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAME_OVER' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 w-full max-w-md bg-[#151515] border-2 border-red-500/30 p-8 rounded-xl text-center"
          >
            <h2 className="text-5xl font-black text-red-500 mb-2 italic">MISSION FAILED</h2>
            <p className="text-gray-500 mb-8 font-bold uppercase tracking-widest">Your fleet has been destroyed</p>
            
            <div className="bg-black/40 p-6 rounded-lg mb-8 border border-white/5">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Final Score</div>
              <div className="text-5xl font-black text-white">{score}</div>
              <div className="text-xs text-blue-400 mt-2 font-bold uppercase tracking-tighter">{difficulty} mode</div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => startGame(difficulty)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-all"
              >
                <RefreshCw className="w-5 h-5" /> RETRY
              </button>
              <button 
                onClick={() => setGameState('MENU')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-lg transition-all"
              >
                MENU
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'WIN' && (
          <motion.div 
            key="win"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 w-full max-w-md bg-[#151515] border-2 border-yellow-500/30 p-8 rounded-xl text-center"
          >
            <Fireworks />
            <h2 className="text-5xl font-black text-yellow-500 mb-2 italic">VICTORY!</h2>
            <p className="text-gray-500 mb-8 font-bold uppercase tracking-widest">The enemy fleet is retreating</p>
            
            <div className="bg-black/40 p-6 rounded-lg mb-8 border border-white/5">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Final Score</div>
              <div className="text-5xl font-black text-white">{score}</div>
              <div className="text-xs text-yellow-400 mt-2 font-bold uppercase tracking-tighter">Legendary Performance</div>
            </div>

            <button 
              onClick={() => setGameState('MENU')}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-lg transition-all"
            >
              RETURN TO BASE
            </button>
          </motion.div>
        )}

        {gameState === 'LEADERBOARD' && (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="z-10 w-full max-w-md bg-[#151515] border-2 border-blue-500/30 p-8 rounded-xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black italic flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> TOP GUNS
              </h2>
              <button onClick={() => setGameState('MENU')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest">Back</button>
            </div>

            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-600 italic">No records found yet...</div>
              ) : (
                leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-500 font-black w-6">#{i + 1}</span>
                      <div>
                        <div className="font-bold text-sm">{entry.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">{entry.difficulty} • {entry.date}</div>
                      </div>
                    </div>
                    <div className="text-xl font-black text-white">{entry.score}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Decoration */}
      <div className="fixed bottom-4 left-4 text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em] pointer-events-none">
        System Status: Operational // Sector 7G
      </div>
    </div>
  );
}
