import { useEffect, useState } from 'react';

import { healthCheck } from '@/api/health';

type Status = 'unknown' | 'online' | 'offline';

export const useBackendStatus = () => {
  const [status, setStatus] = useState<Status>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const healthy = await healthCheck();
        setStatus(healthy ? 'online' : 'offline');
      } catch (error) {
        setStatus('offline');
        console.error('health check failed', error);
      } finally {
        setLastChecked(new Date());
      }
    };

    run();
    const interval = setInterval(run, 1000 * 60);

    return () => clearInterval(interval);
  }, []);

  return { status, lastChecked };
};

