import { useContext } from 'react';

import { CoupleContext } from '@/context/CoupleContext';

export const useCouple = () => {
  const context = useContext(CoupleContext);
  if (!context) {
    throw new Error('useCouple must be used within a CoupleProvider');
  }
  return context;
};

