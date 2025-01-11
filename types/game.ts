import * as PIXI from 'pixi.js';

export interface Vector2D {
  x: number;
  y: number;
}

export type EnemyType = 'normal' | 'sniper' | 'gunner';

export interface GameObject {
  sprite: PIXI.Sprite;
  velocity: Vector2D;
  health?: number;
  type?: EnemyType;
  bulletHealth?: number;
  bulletCount?: number;
}

export interface Barrier extends GameObject {
  health: number;
  segments: PIXI.Sprite[];
}

export interface GameState {
  player: GameObject;
  bullets: GameObject[];
  enemyBullets: GameObject[];
  enemies: GameObject[];
  barriers: Barrier[];
  score: number;
  wave: number;
  gameOver: boolean;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameOver';
