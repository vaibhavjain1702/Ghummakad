
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
      <h2 className="text-xl font-semibold mt-6 text-slate-300">Generating Your Itinerary...</h2>
      <p className="mt-2 text-slate-400 max-w-sm">Our AI agent is reasoning about constraints, searching for the optimal path, and crafting the perfect trip for you. This might take a moment.</p>
    </div>
  );
};

export default LoadingSpinner;
