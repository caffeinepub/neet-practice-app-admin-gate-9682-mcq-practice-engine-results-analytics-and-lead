import { useState, useEffect, useRef } from 'react';

export function usePracticeTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - elapsedMs;
      setIsRunning(true);
    }
  };

  const stop = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    stop();
    setElapsedMs(0);
    startTimeRef.current = null;
  };

  const getElapsedSeconds = () => Math.floor(elapsedMs / 1000);
  const getElapsedMicroseconds = () => BigInt(elapsedMs * 1000);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return {
    elapsedMs,
    elapsedSeconds: getElapsedSeconds(),
    elapsedMicroseconds: getElapsedMicroseconds(),
    isRunning,
    start,
    stop,
    reset,
  };
}
