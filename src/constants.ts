/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WordList {
  easy: string[];
  medium: string[];
  hard: string[];
}

export const WORD_LISTS: WordList = {
  easy: [
    'cat', 'dog', 'sun', 'run', 'map', 'pen', 'box', 'sky', 'sea', 'red',
    'blue', 'tree', 'fish', 'bird', 'book', 'fire', 'wind', 'gold', 'ship', 'fast',
    'cake', 'milk', 'jump', 'duck', 'frog', 'star', 'moon', 'leaf', 'snow', 'rain'
  ],
  medium: [
    'ocean', 'forest', 'planet', 'rocket', 'bridge', 'castle', 'dragon', 'knight', 'island', 'jungle',
    'mountain', 'silver', 'winter', 'summer', 'spring', 'autumn', 'camera', 'guitar', 'laptop', 'mobile',
    'keyboard', 'monitor', 'diamond', 'crystal', 'volcano', 'thunder', 'rainbow', 'vampire', 'wizard', 'phoenix'
  ],
  hard: [
    'adventure', 'beautiful', 'challenge', 'discovery', 'education', 'fantastic', 'happiness', 'knowledge', 'lightning', 'mysterious',
    'navigation', 'opportunity', 'philosophy', 'reflection', 'scientific', 'technology', 'understand', 'vocabulary', 'wonderful', 'experience',
    'architecture', 'civilization', 'environment', 'imagination', 'intelligence', 'mathematics', 'organization', 'perspective', 'relationship', 'university'
  ]
};

export const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 10, scoreMult: 1 },
  medium: { timeLimit: 6, scoreMult: 2 },
  hard: { timeLimit: 3, scoreMult: 5 }
};

export interface ScoreEntry {
  name: string;
  score: number;
  difficulty: Difficulty;
  date: string;
}

export const AVATARS = [
  { id: 'pixel1', name: 'Captain Blue', color: '#3b82f6' },
  { id: 'pixel2', name: 'Commander Red', color: '#ef4444' },
  { id: 'pixel3', name: 'Admiral Green', color: '#22c55e' },
  { id: 'pixel4', name: 'Officer Gold', color: '#eab308' },
];
