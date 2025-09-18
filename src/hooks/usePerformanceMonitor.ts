import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  networkRequests: number;
  realtimeConnections: number;
  memoryUsage: number;
  renderTime: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    networkRequests: 0,
    realtimeConnections: 0,
    memoryUsage: 0,
    renderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor network requests
    const originalFetch = window.fetch;
    let requestCount = 0;
    
    window.fetch = async (...args) => {
      requestCount++;
      return originalFetch.apply(window, args);
    };

    // Monitor memory usage (if available)
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
          networkRequests: requestCount
        }));
      }
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMemoryUsage, 5000);

    // Calculate render time
    const endTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime
    }));

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, []);

  return metrics;
};