import React, { useEffect, useRef, useState } from 'react';

interface HandTrackerProps {
  debug?: boolean;
  onHandUpdate?: (results: HandData) => void;
  width?: number;
  height?: number;
  showVisualization?: boolean;
}

interface HandData {
  averageX: number;
  isPinching: boolean;
  landmarks: any[];
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
  const [frameCount, setFrameCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!isInitialized) {
      initializeHandTracking();
    }
    return () => {
      // Cleanup
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [isInitialized]);

  const initializeHandTracking = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Dynamically import MediaPipe modules
    const [{ Hands, HAND_CONNECTIONS }, { Camera }, { drawConnectors, drawLandmarks }] = await Promise.all([
      import('@mediapipe/hands'),
      import('@mediapipe/camera_utils'),
      import('@mediapipe/drawing_utils'),
    ]);

    // Initialize MediaPipe Hands
    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const onResults = (results: any) => {
      if (!canvasRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);

      // Only draw the video feed if in debug mode
      if (debug && videoRef.current) {
        canvasCtx.drawImage(results.image, 0, 0, width, height);
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Mirror the landmarks
        const mirroredLandmarks = results.multiHandLandmarks[0].map((landmark: { x: number; y: number; z: number }) => ({
          ...landmark,
          x: 1 - landmark.x,
        }));

        // Process the first detected hand with mirrored landmarks
        const handData = calculateHandData(mirroredLandmarks);

        // Draw hand landmarks using mirrored data if visualization is enabled
        if (showVisualization) {
          drawConnectors(canvasCtx, mirroredLandmarks, HAND_CONNECTIONS, {
            color: handData.isPinching ? 'rgba(255, 255, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)',
            lineWidth: 2,
          });
          drawLandmarks(canvasCtx, mirroredLandmarks, {
            color: 'rgba(255, 0, 0, 0.2)',
            lineWidth: 1,
            radius: 3,
          });
        }

        // Call the callback with the hand data
        if (onHandUpdate) {
          onHandUpdate({
            ...handData,
          });
        }
      }

      canvasCtx.restore();
      setFrameCount((prev) => prev + 1);
    };

    hands.onResults(onResults);
    handsRef.current = hands;

    // Initialize camera
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width,
      height,
    });

    cameraRef.current = camera;
    await camera.start();
    setIsInitialized(true);
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
            display: debug ? 'block' : 'none',
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
        {debug && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '5px',
              fontSize: '14px',
            }}
          >
            Frame: {frameCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default HandTracker;
