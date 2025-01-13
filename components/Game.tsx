import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameObject, GameState, Barrier, EnemyType } from '../types/game';
import { GAME_CONFIG as CONFIG } from '@/config/gameConfig';
import HandTracker from './HandTracker';
interface GameProps {
  onGameOver: (score: number, wave: number) => void;
  onGameQuit: () => void;
}

export function Game({ onGameOver, onGameQuit }: GameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application>(null);
  const gameStateRef = useRef<GameState>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isHandReady, setIsHandReady] = useState(false);
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const [showHandVisualization, setShowHandVisualization] = useState(true);
  const texturesRef = useRef<{ [key: string]: PIXI.Texture }>({});
  const gameLoopTickerRef = useRef<PIXI.Ticker>(null);
  const enemyShootingIntervalRef = useRef<NodeJS.Timeout>(null);

  const createBarriers = useCallback(() => {
    const barriers: Barrier[] = [];
    const startX = (CONFIG.width - (CONFIG.barriers.count - 1) * CONFIG.barriers.spacing) / 2;

    // Create a custom texture for barrier segments
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0x55cc55); // More vibrant outer border
    graphics.drawRect(0, 0, 32, 32);
    graphics.beginFill(0x226622); // More vibrant dark green for depth
    graphics.drawRect(2, 2, 28, 28);
    graphics.beginFill(0x66dd66); // More vibrant inner fill
    graphics.drawRect(4, 4, 24, 24);

    // Add some metallic highlights with slightly more vibrant colors
    graphics.lineStyle(1, 0x99dd99, 0.6); // Lighter highlight
    graphics.moveTo(4, 4);
    graphics.lineTo(28, 4);
    graphics.lineStyle(1, 0x336633, 0.4); // Darker shadow
    graphics.moveTo(4, 28);
    graphics.lineTo(28, 28);

    const barrierTexture = appRef.current?.renderer.generateTexture(graphics);

    for (let i = 0; i < CONFIG.barriers.count; i++) {
      const barrierContainer = new PIXI.Container();
      const segments: PIXI.Sprite[] = [];
      const segmentWidth = CONFIG.barriers.width / CONFIG.barriers.segments.cols;
      const segmentHeight = CONFIG.barriers.height / CONFIG.barriers.segments.rows;

      for (let row = 0; row < CONFIG.barriers.segments.rows; row++) {
        for (let col = 0; col < CONFIG.barriers.segments.cols; col++) {
          const segment = new PIXI.Sprite(barrierTexture);
          segment.width = segmentWidth;
          segment.height = segmentHeight;
          segment.alpha = 0.9 - row * 0.1; // Gradual transparency from top to bottom
          segment.position.set(col * segmentWidth, row * segmentHeight);
          barrierContainer.addChild(segment);
          segments.push(segment);
        }
      }

      barrierContainer.position.set(
        startX + i * CONFIG.barriers.spacing - CONFIG.barriers.width / 2,
        CONFIG.barriers.position.y
      );
      appRef.current?.stage.addChild(barrierContainer);

      barriers.push({
        sprite: barrierContainer as unknown as PIXI.Sprite,
        velocity: { x: 0, y: 0 },
        health: segments.length,
        segments,
      });
    }

    return barriers;
  }, []);

  const createEnemies = useCallback((wave: number) => {
    const enemies: GameObject[] = [];
    const speed = CONFIG.enemies.baseSpeed + CONFIG.enemies.speedIncreasePerWave * (wave - 1);

    for (let row = 0; row < CONFIG.enemies.rows; row++) {
      for (let col = 0; col < CONFIG.enemies.columns; col++) {
        let enemyType: EnemyType = 'normal';
        const rand = Math.random();
        if (rand < CONFIG.enemies.specialTypes.sniper.spawnRate) {
          enemyType = 'sniper';
        } else if (rand < CONFIG.enemies.specialTypes.sniper.spawnRate + CONFIG.enemies.specialTypes.gunner.spawnRate) {
          enemyType = 'gunner';
        }

        // Use appropriate texture based on enemy type
        let texture;
        switch (enemyType) {
          case 'sniper':
            texture = texturesRef.current.sniper;
            break;
          case 'gunner':
            texture = texturesRef.current.gunner;
            break;
          default:
            texture = texturesRef.current.enemy;
        }

        const enemy = new PIXI.Sprite(texture);
        enemy.width = CONFIG.enemies.size.width;
        enemy.height = CONFIG.enemies.size.height;
        enemy.anchor.set(0.5);
        enemy.position.set(
          CONFIG.enemies.padding + col * CONFIG.enemies.padding,
          CONFIG.enemies.padding + row * CONFIG.enemies.padding
        );
        appRef.current?.stage.addChild(enemy);

        const enemyObj: GameObject = {
          sprite: enemy,
          velocity: { x: speed, y: 0 },
          type: enemyType,
        };

        if (enemyType === 'sniper') {
          enemyObj.health = CONFIG.enemies.specialTypes.sniper.health;
        }

        enemies.push(enemyObj);
      }
    }
    return enemies;
  }, []);

  const shoot = useCallback((isEnemy: boolean, position: { x: number; y: number }, bulletHealth: number = 1) => {
    const bullet = new PIXI.Sprite(texturesRef.current.bullet);
    bullet.width = 6;
    bullet.height = 12;
    bullet.anchor.set(0.5);
    bullet.position.set(position.x, position.y);
    bullet.rotation = isEnemy ? Math.PI : 0;

    appRef.current?.stage.addChild(bullet);

    const bulletObj: GameObject = {
      sprite: bullet,
      velocity: {
        x: 0,
        y: isEnemy ? CONFIG.enemies.bulletSpeed : -CONFIG.player.bulletSpeed,
      },
      health: bulletHealth,
    };

    if (isEnemy) {
      gameStateRef.current?.enemyBullets.push(bulletObj);
    } else {
      gameStateRef.current?.bullets.push(bulletObj);
    }
  }, []);

  const handleEnemyShooting = useCallback(() => {
    const gameState = gameStateRef.current;
    if (!gameState?.enemies.length) return;

    // Calculate base shooting probability that increases with wave
    const baseProb = CONFIG.enemies.baseShootingProb + (gameState.wave - 1) * CONFIG.enemies.shootingProbIncrease;

    // For each enemy, chance to shoot increases as fewer enemies remain
    const enemyCount = gameState.enemies.length;
    const scalingFactor = (CONFIG.enemies.rows * CONFIG.enemies.columns) / enemyCount;

    const shootingEnemies = gameState.enemies.filter(() => Math.random() < baseProb * scalingFactor);

    shootingEnemies.forEach((enemy) => {
      const bulletHealth = enemy.type === 'sniper' ? CONFIG.enemies.specialTypes.sniper.bulletHealth : 1;
      shoot(true, { x: enemy.sprite.x, y: enemy.sprite.y }, bulletHealth);
    });
  }, [shoot]);

  const startNewWave = useCallback(() => {
    const gameState = gameStateRef.current;
    if (!gameState) return;

    // Clean up all existing bullets
    [...gameState.bullets, ...gameState.enemyBullets].forEach((bullet) => {
      appRef.current?.stage.removeChild(bullet.sprite);
    });
    gameState.bullets = [];
    gameState.enemyBullets = [];

    // Clean up existing barriers
    gameState.barriers.forEach((barrier) => {
      // Remove all segments from the stage
      barrier.segments.forEach((segment) => {
        if (segment.parent) {
          segment.parent.removeChild(segment);
        }
      });
      // Remove the barrier container
      if (barrier.sprite.parent) {
        barrier.sprite.parent.removeChild(barrier.sprite);
      }
    });
    gameState.barriers = [];

    // Start new wave
    gameState.wave++;
    gameState.score += CONFIG.scoring.bonusPerWave;
    gameState.enemies = createEnemies(gameState.wave);
    gameState.barriers = createBarriers();
  }, [createEnemies, createBarriers]);

  const checkCollision = (a: PIXI.Sprite, b: PIXI.Sprite) => {
    // Skip collision check if either sprite is invisible
    if (!a.visible || !b.visible) return false;

    const bounds1 = a.getBounds();
    const bounds2 = b.getBounds();

    return (
      bounds1.x < bounds2.x + bounds2.width &&
      bounds1.x + bounds1.width > bounds2.x &&
      bounds1.y < bounds2.y + bounds2.height &&
      bounds1.y + bounds1.height > bounds2.y
    );
  };

  const handleGameOver = useCallback(() => {
    if (!gameStateRef.current || gameStateRef.current.gameOver) return;

    // Set game over flag first to prevent any further updates
    gameStateRef.current.gameOver = true;

    // Store final scores before cleanup
    const finalScore = gameStateRef.current.score;
    const finalWave = gameStateRef.current.wave;

    // Stop the game loop and enemy shooting first
    if (gameLoopTickerRef.current && appRef.current) {
      const ticker = appRef.current.ticker;
      const tickerCallback = gameLoopTickerRef.current as unknown as PIXI.TickerCallback<any>;
      ticker.remove(tickerCallback);
      (gameLoopTickerRef as any).current = undefined;
    }

    if (enemyShootingIntervalRef.current) {
      clearInterval(enemyShootingIntervalRef.current);
      (enemyShootingIntervalRef as any).current = undefined;
    }

    // Call the onGameOver callback
    onGameOver(finalScore, finalWave);
  }, [onGameOver]);

  const gameLoop = useCallback(() => {
    const gameState = gameStateRef.current;
    if (!gameState || gameState.gameOver || isPaused) return;

    // Get delta time in seconds, with a fallback value and maximum value to prevent large jumps
    const deltaTime = Math.min((appRef.current?.ticker?.deltaMS ?? 16.67) / 1000, 0.1);

    if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
      gameState.player.sprite.x -= CONFIG.player.speed * deltaTime;
    }
    if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
      gameState.player.sprite.x += CONFIG.player.speed * deltaTime;
    }

    // Keep player in bounds
    gameState.player.sprite.x = Math.max(15, Math.min(CONFIG.width - 15, gameState.player.sprite.x));

    // Update bullets
    [...gameState.bullets, ...gameState.enemyBullets].forEach((bullet, _bulletIndex) => {
      bullet.sprite.y += bullet.velocity.y * deltaTime;

      // Remove bullets that are off screen
      if (bullet.sprite.y < 0 || bullet.sprite.y > CONFIG.height) {
        appRef.current?.stage.removeChild(bullet.sprite);
        const array = gameState.bullets.includes(bullet) ? gameState.bullets : gameState.enemyBullets;
        array.splice(array.indexOf(bullet), 1);
      }
    });

    // Check bullet collisions
    gameState.bullets.forEach((bullet, bulletIndex) => {
      // Check enemy collisions
      gameState.enemies.forEach((enemy, enemyIndex) => {
        if (checkCollision(bullet.sprite, enemy.sprite)) {
          // Make bullet invisible immediately
          bullet.sprite.visible = false;

          // Handle enemy hit
          if (enemy.type === 'sniper' && enemy.health && enemy.health > 1) {
            enemy.health--;
          } else {
            appRef.current?.stage.removeChild(enemy.sprite);
            gameState.enemies.splice(enemyIndex, 1);
            gameState.score += CONFIG.scoring.pointsPerKill;

            // Handle special enemy death effects
            if (enemy.type === 'sniper') {
              gameStateRef.current!.player.bulletHealth = (gameStateRef.current!.player.bulletHealth || 1) + 1;
            } else if (enemy.type === 'gunner') {
              const currentBulletCount = gameStateRef.current!.player.bulletCount || 1;
              gameStateRef.current!.player.bulletCount = currentBulletCount + 1;
            }
          }

          // Only remove bullet if its health is depleted
          if (!bullet.health || bullet.health <= 1) {
            appRef.current?.stage.removeChild(bullet.sprite);
            gameState.bullets.splice(bulletIndex, 1);
          } else {
            bullet.health--;
            bullet.sprite.visible = true;
          }
        }
      });

      // Check barrier collisions for player bullets
      gameState.barriers.forEach((barrier) => {
        barrier.segments.forEach((segment, _segmentIndex) => {
          if (segment.visible && checkCollision(bullet.sprite, segment)) {
            // Make bullet invisible immediately
            bullet.sprite.visible = false;

            // Only remove bullet if its health is depleted
            if (!bullet.health || bullet.health <= 1) {
              appRef.current?.stage.removeChild(bullet.sprite);
              gameState.bullets.splice(bulletIndex, 1);
            } else {
              bullet.health--;
              bullet.sprite.visible = true; // Make bullet visible again if it still has health
            }
            segment.visible = false;
            barrier.health--;
          }
        });
      });
    });

    // Check enemy bullet collisions
    gameState.enemyBullets.forEach((bullet, bulletIndex) => {
      // Check player collision
      if (checkCollision(bullet.sprite, gameState.player.sprite)) {
        // Make bullet invisible immediately
        bullet.sprite.visible = false;

        if (bullet.health && bullet.health > 1) {
          bullet.health--;
        } else {
          handleGameOver();
          return; // Exit the game loop immediately
        }
        appRef.current?.stage.removeChild(bullet.sprite);
        gameState.enemyBullets.splice(bulletIndex, 1);
      }

      // Check barrier collisions for enemy bullets
      gameState.barriers.forEach((barrier) => {
        barrier.segments.forEach((segment, _segmentIndex) => {
          if (segment.visible && checkCollision(bullet.sprite, segment)) {
            // Make bullet invisible immediately
            bullet.sprite.visible = false;

            if (bullet.health && bullet.health > 1) {
              bullet.health--;
            } else {
              appRef.current?.stage.removeChild(bullet.sprite);
              gameState.enemyBullets.splice(bulletIndex, 1);
            }
            segment.visible = false;
            barrier.health--;
          }
        });
      });
    });

    // Update enemies
    let shouldChangeDirection = false;
    gameState.enemies.forEach((enemy) => {
      // Apply horizontal movement with capped deltaTime
      enemy.sprite.x += enemy.velocity.x * deltaTime;

      if (enemy.sprite.x > CONFIG.width - 30 || enemy.sprite.x < 30) {
        shouldChangeDirection = true;
      }
    });

    if (shouldChangeDirection) {
      gameState.enemies.forEach((enemy) => {
        enemy.velocity.x *= -1;
        // Keep vertical movement as a fixed value
        enemy.sprite.y += 20;

        if (enemy.sprite.y > CONFIG.height - 100) {
          handleGameOver();
          return;
        }
      });
    }

    // Start new wave if all enemies are destroyed
    if (gameState.enemies.length === 0) {
      startNewWave();
    }
  }, [handleGameOver, startNewWave, isPaused]);

  const createNoiseTexture = (app: PIXI.Application) => {
    const noiseTexture = PIXI.RenderTexture.create({
      width: CONFIG.width,
      height: CONFIG.height,
    });
    const sprite = new PIXI.Sprite(noiseTexture);
    const graphics = new PIXI.Graphics();

    const updateNoise = () => {
      graphics.clear();
      graphics.beginFill(0x000011); // Deep purple base
      graphics.drawRect(0, 0, CONFIG.width, CONFIG.height);

      // Add noise particles
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * CONFIG.width;
        const y = Math.random() * CONFIG.height;
        const alpha = Math.random() * 0.0833; // Very subtle noise
        graphics.beginFill(0xffffff, alpha);
        graphics.drawRect(x, y, 1, 1);
      }

      app.renderer.render(graphics, { renderTexture: noiseTexture });
    };

    // Update noise every frame
    app.ticker.add(updateNoise);
    return sprite;
  };

  useEffect(() => {
    if (!gameRef.current) return;

    const app = new PIXI.Application({
      width: CONFIG.width,
      height: CONFIG.height,
      backgroundColor: 0x1a0033, // Deep purple background
      antialias: true,
    });

    gameRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Load textures
    const loadTextures = async () => {
      try {
        texturesRef.current = {
          ship: await PIXI.Texture.from('./assets/ship.png'),
          enemy: await PIXI.Texture.from('./assets/enemy.png'),
          sniper: await PIXI.Texture.from('./assets/sniper.png'),
          gunner: await PIXI.Texture.from('./assets/gunner.png'),
          bullet: await PIXI.Texture.from('./assets/bullet.png'),
        };

        // Create player with ship texture
        const player = new PIXI.Sprite(texturesRef.current.ship);
        player.width = CONFIG.player.size.width;
        player.height = CONFIG.player.size.height;
        player.anchor.set(0.5);
        player.position.set(CONFIG.width / 2, CONFIG.height - 50);
        app.stage.addChild(player);

        // Initialize game state
        gameStateRef.current = {
          player: { sprite: player, velocity: { x: 0, y: 0 } },
          bullets: [],
          enemyBullets: [],
          enemies: [],
          barriers: [],
          score: 0,
          wave: 0,
          gameOver: false,
        };

        // Start first wave
        startNewWave();
        setIsGameInitialized(true);
      } catch (error) {
        console.error('Error loading game assets:', error);
      }
    };

    loadTextures();

    const noiseSprite = createNoiseTexture(app);
    app.stage.addChild(noiseSprite);

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      /* if (e.key === 'Escape') {
        setIsPaused((prev) => !prev);
        return;
      } */

      if (isPaused || !isHandReady || !isGameInitialized) return;

      if (e.key === ' ' && Date.now() - lastShotRef.current > 250) {
        const bulletCount = Math.min(gameStateRef.current?.player.bulletCount || 1, 4);
        const bulletHealth = gameStateRef.current?.player.bulletHealth || 1;
        const spacing = 10;

        for (let i = 0; i < bulletCount; i++) {
          const offset = (i - (bulletCount - 1) / 2) * spacing;
          shoot(
            false,
            {
              x: (gameStateRef.current?.player.sprite.x || 0) + offset,
              y: gameStateRef.current?.player.sprite.y || 0,
            },
            bulletHealth
          );
        }
        lastShotRef.current = Date.now();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      // Stop all game loops and intervals first
      if (enemyShootingIntervalRef.current) {
        clearInterval(enemyShootingIntervalRef.current);
        (enemyShootingIntervalRef as any).current = undefined;
      }

      if (gameLoopTickerRef.current && appRef.current) {
        const ticker = appRef.current.ticker;
        const tickerCallback = gameLoopTickerRef.current as unknown as PIXI.TickerCallback<any>;
        ticker.remove(tickerCallback);
        (gameLoopTickerRef as any).current = undefined;
      }

      // Clean up game objects if they exist
      if (gameStateRef.current && appRef.current) {
        // Clean up bullets
        [...gameStateRef.current.bullets, ...gameStateRef.current.enemyBullets].forEach((bullet) => {
          if (bullet.sprite.parent) {
            bullet.sprite.parent.removeChild(bullet.sprite);
          }
        });

        // Clean up enemies
        gameStateRef.current.enemies.forEach((enemy) => {
          if (enemy.sprite.parent) {
            enemy.sprite.parent.removeChild(enemy.sprite);
          }
        });

        // Clean up barriers
        gameStateRef.current.barriers.forEach((barrier) => {
          barrier.segments.forEach((segment) => {
            if (segment.parent) {
              segment.parent.removeChild(segment);
            }
          });
          if (barrier.sprite.parent) {
            barrier.sprite.parent.removeChild(barrier.sprite);
          }
        });

        // Clean up player
        if (gameStateRef.current.player.sprite.parent) {
          gameStateRef.current.player.sprite.parent.removeChild(gameStateRef.current.player.sprite);
        }
      }

      // Clear game state
      (gameStateRef as any).current = undefined;

      // Finally destroy the PIXI application
      if (appRef.current) {
        try {
          if (appRef.current.view.parentNode) {
            appRef.current.view.parentNode.removeChild(appRef.current.view);
          }
          appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
        } catch (error) {
          console.error('Error during PIXI cleanup:', error);
        }
        (appRef as any).current = undefined;
      }

      setIsGameInitialized(false);
      setIsHandReady(false);
    };
  }, [gameLoop, handleEnemyShooting, shoot, startNewWave]);

  // Start game loop and enemy shooting only when hand is ready and game is initialized
  useEffect(() => {
    if (!isHandReady || !isGameInitialized || !appRef.current) return;

    // Reset the ticker's deltaMS when starting the game
    appRef.current.ticker.deltaMS = 16.67; // Reset to default frame time (60 FPS)

    // Set up game loop
    gameLoopTickerRef.current = appRef.current.ticker.add(() => {
      if (gameStateRef.current?.gameOver) {
        handleGameOver();
        return;
      }

      gameLoop();
      if (gameStateRef.current) {
        setScore(gameStateRef.current.score);
        setWave(gameStateRef.current.wave);
      }
    });

    // Set up enemy shooting interval
    enemyShootingIntervalRef.current = setInterval(handleEnemyShooting, CONFIG.enemies.shootingInterval);

    return () => {
      if (enemyShootingIntervalRef.current) {
        clearInterval(enemyShootingIntervalRef.current);
        (enemyShootingIntervalRef as any).current = undefined;
      }
      if (gameLoopTickerRef.current) {
        gameLoopTickerRef.current.destroy();
        (gameLoopTickerRef as any).current = undefined;
      }
    };
  }, [isHandReady, isGameInitialized, gameLoop, handleEnemyShooting, handleGameOver]);

  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='flex justify-between w-full max-w-[800px] px-4'>
        <div className='text-white text-xl'>Score: {score}</div>
        <div className='text-white text-xl'>Wave: {wave}</div>
      </div>
      <div ref={gameRef} className='rounded-lg overflow-hidden shadow-2xl relative'>
        {(!isHandReady || !isGameInitialized) && (
          <div className='absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center'>
            <div className='bg-gray-800 p-8 rounded-lg shadow-xl'>
              <h2 className='text-4xl font-bold text-white mb-4 text-center'>Waiting for a hand...</h2>
              <p className='text-gray-300 text-center'>Please show your hand to the camera</p>
            </div>
          </div>
        )}
        {isPaused && (
          <div className='absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center'>
            <div className='bg-gray-800 p-8 rounded-lg shadow-xl'>
              <h2 className='text-4xl font-bold text-white mb-8 text-center'>PAUSED</h2>
              <div className='flex flex-col space-y-4 w-64'>
                <button
                  onClick={() => setIsPaused(false)}
                  className='flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
                >
                  <span>Resume</span>
                </button>
                <button
                  onClick={onGameQuit}
                  className='flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors'
                >
                  <span>Exit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className='text-gray-300 text-sm flex items-center justify-center space-x-4'>
        <span>Use 🤚 to move • 🤏 to shoot •</span>
        <button
          onClick={() => setShowHandVisualization((prev) => !prev)}
          className='px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm'
        >
          {showHandVisualization ? 'Hide' : 'Show'} Hand Tracking
        </button>
      </div>
      <HandTracker
        height={600}
        width={800}
        debug={false}
        showVisualization={showHandVisualization}
        onHandUpdate={(results: any) => {
          if (!isHandReady) {
            setIsHandReady(true);
          }

          const gameState = gameStateRef.current;
          if (!gameState || gameState.gameOver || isPaused) return;

          // Map 0.2-0.8 range to 0-1 range
          const mappedX = results.averageX < 0.2 ? 0 : results.averageX > 0.8 ? 1 : (results.averageX - 0.2) / (0.8 - 0.2);
          const targetX = mappedX * CONFIG.width;
          gameState.player.sprite.x = Math.max(15, Math.min(CONFIG.width - 15, targetX));

          if (results.isPinching && Date.now() - lastShotRef.current > 250) {
            const bulletCount = Math.min(gameStateRef.current?.player.bulletCount || 1, 4);
            const bulletHealth = gameStateRef.current?.player.bulletHealth || 1;
            const spacing = 10;

            for (let i = 0; i < bulletCount; i++) {
              const offset = (i - (bulletCount - 1) / 2) * spacing;
              shoot(
                false,
                {
                  x: gameState.player.sprite.x + offset,
                  y: gameState.player.sprite.y,
                },
                bulletHealth
              );
            }
            lastShotRef.current = Date.now();
          }
        }}
      />
    </div>
  );
}
