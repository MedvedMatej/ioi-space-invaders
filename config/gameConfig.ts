export const GAME_CONFIG = {
  width: 800,
  height: 600,
  player: {
    speed: 5,
    size: { width: 32, height: 32 },
    bulletSpeed: 7,
  },
  enemies: {
    baseSpeed: 1,
    speedIncreasePerWave: 0.2,
    rows: 3,
    columns: 8,
    padding: 60,
    size: { width: 32, height: 32 },
    shootingInterval: 1000,
    bulletSpeed: 4,
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
