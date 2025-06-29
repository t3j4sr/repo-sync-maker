
import React from 'react';
import ScratchPage from './ScratchPage';
import { useScratchCardNotifications } from '@/hooks/useScratchCardNotifications';

const Index = () => {
  // Listen for new eligible customers and send SMS
  useScratchCardNotifications();
  
  return <ScratchPage />;
};

export default Index;
