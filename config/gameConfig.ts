export const GAME_CONFIG = {
  width: 800,
  height: 600,
  player: {
    speed: 300,
    size: { width: 32, height: 32 },
    bulletSpeed: 600,
  },
  enemies: {
    baseSpeed: 120,
    speedIncreasePerWave: 10,
    rows: 3,
    columns: 8,
    padding: 60,
    size: { width: 32, height: 32 },
    shootingInterval: 1000,
    bulletSpeed: 600,
    baseShootingProb: 0.02,
    shootingProbIncrease: 0.01,
    specialTypes: {
      sniper: {
        spawnRate: 0.015,
        color: 0xffff00, // Yellow
        health: 2,
        bulletHealth: 2,
      },
      gunner: {
        spawnRate: 0.015,
        color: 0x0000ff, // Blue
      },
    },
  },
  barriers: {
    count: 4,
    width: 60,
    height: 40,
    segments: { rows: 4, cols: 6 },
    position: { y: 450 },
    spacing: 160,
  },
  scoring: {
    pointsPerKill: 100,
    bonusPerWave: 1000,
  },
} as const;
