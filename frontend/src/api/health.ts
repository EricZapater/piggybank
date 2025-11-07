import { apiFetch } from '@/api/client';

type HealthResponse = {
  status: string;
  timestamp: string;
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiFetch<HealthResponse>({ path: '/health' });
    return response.status === 'ok';
  } catch (error) {
    console.warn('health check error', error);
    return false;
  }
};

