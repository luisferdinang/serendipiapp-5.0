import React, { useState, useEffect } from 'react';

interface VenezuelaTimeProps {
  getCurrentVenezuelaTime: () => string;
}

export const VenezuelaTime: React.FC<VenezuelaTimeProps> = ({ getCurrentVenezuelaTime }) => {
  const [currentTime, setCurrentTime] = useState<string>(getCurrentVenezuelaTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentVenezuelaTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [getCurrentVenezuelaTime]);

  return (
    <div className="text-center text-sm text-gray-500 py-2">
      <p>Hora actual en Venezuela: {currentTime}</p>
    </div>
  );
};
