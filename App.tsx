
import React, { useState, useCallback } from 'react';
import ItineraryForm from './components/ItineraryForm';
import ItineraryDisplay from './components/ItineraryDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { generateItinerary, mutateItinerary } from './services/geminiService';
import type { UserPreferences, Itinerary } from './types';
import { BotIcon, CalendarIcon } from './components/icons';


const App: React.FC = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [preferences, setPreferences] = useState<UserPreferences>({
    destination: 'Paris, France',
    origin: 'New York, USA',
    startLocation: 'Near the Louvre Museum',
    budget: '150',
    startDate: today.toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    interests: ['Museums', 'Food', 'History'],
    mustVisit: '',
    pace: 'Moderate',
    tripType: 'activitiesOnly',
  });
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRemixing, setIsRemixing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateItinerary = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    try {
      const result = await generateItinerary(preferences);
      setItinerary(result);
    } catch (err) {
      console.error(err);
      setError('Failed to generate itinerary. The AI model may be busy or an error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const handleRemixItinerary = useCallback(async () => {
    if (!itinerary) return;
    setIsRemixing(true);
    try {
        const newItinerary = await mutateItinerary(itinerary);
        setItinerary(newItinerary);
    } catch (err) {
        console.error(err);
        setError('Failed to remix itinerary. Please try again.');
    } finally {
        setIsRemixing(false);
    }
  }, [itinerary]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-4">
            <BotIcon />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">
              Intelligent Travel Planner
            </h1>
          </div>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Your personal AI agent for crafting perfect, optimized travel itineraries.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <ItineraryForm
              preferences={preferences}
              setPreferences={setPreferences}
              onSubmit={handleGenerateItinerary}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-slate-800/50 rounded-xl shadow-lg p-6 min-h-full border border-slate-700">
              {isLoading && <LoadingSpinner />}
              {error && <div className="text-center p-8 text-red-400 bg-red-900/20 rounded-lg">{error}</div>}
              {!isLoading && !error && !itinerary && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
                  <CalendarIcon />
                  <h2 className="text-2xl font-semibold mt-4 text-slate-200">Your Journey Awaits</h2>
                  <p className="mt-2 max-w-md">Fill in your travel details on the left and let our AI craft a personalized itinerary just for you.</p>
                </div>
              )}
              {itinerary && (
                <ItineraryDisplay 
                    itinerary={itinerary} 
                    onRemix={handleRemixItinerary}
                    isRemixing={isRemixing}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
