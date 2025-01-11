'use client';
import { useEffect, useRef } from 'react';

interface HandData {
  averageX: number;
  isPinching: boolean;
  landmarks: any[];
}

interface HandTrackerProps {
  debug?: boolean;
  onHandUpdate?: (results: HandData) => void;
  width?: number;
  height?: number;
  showVisualization?: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({
  debug = false,
  onHandUpdate,
  width = 640,
  height = 480,
  showVisualization = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let hands: any;
    let camera: any;

    const initializeHands = async () => {
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');

      hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const onResults = (results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) return;

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the video frame
        if (debug) ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Draw hand landmarks and connections
        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            // Mirror the landmarks
            const mirroredLandmarks = results.multiHandLandmarks[0].map((landmark: { x: number; y: number; z: number }) => ({
              ...landmark,
              x: 1 - landmark.x,
            }));

            // Process the first detected hand with mirrored landmarks
            const handData = calculateHandData(mirroredLandmarks);
            if (onHandUpdate) {
              onHandUpdate({
                ...handData,
              });
            }

            drawLandmarks(ctx, mirroredLandmarks);
            drawConnections(ctx, mirroredLandmarks);
          }
        }
      };

      hands.onResults(onResults);

      camera = new Camera(videoRef.current!, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    };

    initializeHands();

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, []);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any) => {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    for (const landmark of landmarks) {
      const x = landmark.x * canvasRef.current!.width;
      const y = landmark.y * canvasRef.current!.height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawConnections = (ctx: CanvasRenderingContext2D, landmarks: any) => {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index finger
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle finger
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring finger
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
    ];
    for (const [start, end] of connections) {
      const startX = landmarks[start].x * canvasRef.current!.width;
      const startY = landmarks[start].y * canvasRef.current!.height;
      const endX = landmarks[end].x * canvasRef.current!.width;
      const endY = landmarks[end].y * canvasRef.current!.height;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  };

  const calculateHandData = (landmarks: any[]): HandData => {
    // Calculate average X coordinate
    const averageX = landmarks.reduce((sum, landmark) => sum + landmark.x, 0) / landmarks.length;

    // Calculate pinch gesture (distance between thumb tip and index finger tip)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2) + Math.pow(thumbTip.z - indexTip.z, 2)
    );

    // If distance is less than 0.1 (10% of hand width), consider it a pinch
    const isPinching = distance < 0.1;

    return {
      averageX,
      isPinching,
      landmarks,
    };
  };

  return (
    <div
      className='fixed'
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width, height }}>
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'none',
          }}
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: showVisualization ? 'block' : 'none',
          }}
        />
      </div>
    </div>
  );
};

export default HandTracker;
