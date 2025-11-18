import React from 'react';
import LiveDriverMap from '@/components/Maps/LiveDriverMap';

const DriverTracking: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <LiveDriverMap />
    </div>
  );
};

export default DriverTracking;