import React from 'react';

const SharedTitle: React.FC = () => {
  return (
    <header className="w-full max-w-md text-white text-center">
      <h1 className="text-3xl font-bold mb-2 flex items-center justify-center">
        SatsQueue
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 ml-2" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </h1>
    </header>
  );
};

export default SharedTitle;
