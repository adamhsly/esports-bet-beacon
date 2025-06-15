
import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetTime: string | Date;
  className?: string;
}

const pad = (n: number) => n.toString().padStart(2, "0");

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  className = "",
}) => {
  const getDiff = () => {
    const now = new Date();
    const target = typeof targetTime === "string" ? new Date(targetTime) : targetTime;
    const diffMs = target.getTime() - now.getTime();
    return diffMs;
  };

  const [diff, setDiff] = useState(getDiff());

  useEffect(() => {
    const interval = setInterval(() => setDiff(getDiff()), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [targetTime]);

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
