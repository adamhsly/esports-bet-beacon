
import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetTime: string | Date | null | undefined;
  className?: string;
}

const pad = (n: number) => n.toString().padStart(2, "0");

function getTime(targetTime: CountdownTimerProps["targetTime"]): Date | null {
  if (!targetTime) return null;
  if (typeof targetTime === "string") {
    // Attempt to parse even if string is nullish
    const d = new Date(targetTime);
    return isNaN(d.getTime()) ? null : d;
  }
  if (targetTime instanceof Date) return targetTime;
  return null;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  className = "",
}) => {
  const [diff, setDiff] = useState<number>(() => {
    const validTarget = getTime(targetTime);
    if (!validTarget) {
      console.warn("[CountdownTimer] Invalid or missing targetTime:", targetTime);
      return 0;
    }
    return validTarget.getTime() - Date.now();
  });

  useEffect(() => {
    const validTarget = getTime(targetTime);
    if (!validTarget) {
      setDiff(0);
      console.warn("[CountdownTimer] Invalid or missing targetTime:", targetTime);
      return;
    }
    const interval = setInterval(() => {
      setDiff(validTarget.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!targetTime) return null;
  const validTarget = getTime(targetTime);
  if (!validTarget) return null; // Can't show

  if (diff <= 0) {
    // Already started, don't show timer
    return null;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  let text = "";
  if (hours > 0) {
    text = `Starts in: ${hours}h ${mins}m`;
  } else if (mins > 0) {
    text = `Starts in: ${mins}m ${pad(secs)}s`;
  } else {
    text = `Starts in: ${secs}s`;
  }

  return (
    <div
      className={
        `flex items-center justify-center font-bold text-lg md:text-xl text-orange-400 mb-4 mt-1 ${className}`
      }
      data-testid="countdown-timer"
    >
      {text}
    </div>
  );
};

export default CountdownTimer;
