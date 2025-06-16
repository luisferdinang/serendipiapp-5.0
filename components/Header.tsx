
import React from 'react';
import { APP_TITLE } from '../constants';

const ShootingStarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth="1.5" 
    stroke="currentColor" 
    className={`w-8 h-8 text-yellow-300 ${className || ''}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L18 14.25l-.25-2.25a3.375 3.375 0 00-2.25-2.25L13.5 9l1.75-.25a3.375 3.375 0 002.25-2.25L18 4.5l.25 2.25a3.375 3.375 0 002.25 2.25L22.5 9l-2.25.25a3.375 3.375 0 00-2.25 2.25z" />
  </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-black p-6 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShootingStarIcon />
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-pink-400 to-yellow-400" style={{fontFamily: "'Orbitron', sans-serif"}}>
            {APP_TITLE}
          </h1>
        </div>
      </div>
    </header>
  );
};
