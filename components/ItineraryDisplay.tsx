
import React from 'react';
import type { Itinerary } from '../types';
import { 
  MuseumIcon, FoodIcon, OutdoorIcon, HistoryIcon, ArtIcon, ShoppingIcon, 
  NightlifeIcon, TechnologyIcon, DefaultIcon, WeatherIcon, MapPinIcon, 
  TransportIcon, FlightIcon, HotelIcon, StarIcon 
} from './icons';

interface ItineraryDisplayProps {
  itinerary: Itinerary;
  onRemix: () => void;
  isRemixing: boolean;
}

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const cat = category.toLowerCase();
  if (cat.includes('museum')) return <MuseumIcon />;
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe')) return <FoodIcon />;
  if (cat.includes('outdoor') || cat.includes('park') || cat.includes('nature')) return <OutdoorIcon />;
  if (cat.includes('history') || cat.includes('historic')) return <HistoryIcon />;
  if (cat.includes('art') || cat.includes('gallery')) return <ArtIcon />;
  if (cat.includes('shop')) return <ShoppingIcon />;
  if (cat.includes('night') || cat.includes('bar')) return <NightlifeIcon />;
  if (cat.includes('tech')) return <TechnologyIcon />;
  return <DefaultIcon />;
};

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary, onRemix, isRemixing }) => {
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Agent Reasoning Section */}
      <div className="bg-slate-900/50 border border-indigo-500/30 rounded-lg p-4 mb-6">
        <h3 className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Agent Internal Reasoning
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <strong className="text-slate-300 block mb-1">Constraint Satisfaction (CSP):</strong>
            <ul className="list-disc list-inside space-y-0.5">
              {itinerary.agentReasoning.constraints_analysis.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
          <div>
            <strong className="text-slate-300 block mb-1">State Space Strategy:</strong>
            <p>{itinerary.agentReasoning.state_space_search_strategy}</p>
          </div>
          <div>
            <strong className="text-slate-300 block mb-1">Utility Function (Philosophy):</strong>
            <p>{itinerary.agentReasoning.utility_maximization_logic}</p>
          </div>
          <div>
             <strong className="text-slate-300 block mb-1">Fuzzy Logic Interpretation:</strong>
             <p className="text-amber-200/80">{itinerary.agentReasoning.fuzzy_logic_analysis || "Applied standard fuzzy rules for pace and interest matching."}</p>
          </div>
          
          {/* Knowledge Base & Vector Sig */}
          <div className="md:col-span-2 bg-emerald-900/20 p-2 rounded border border-emerald-500/20">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                 <strong className="text-emerald-300">KB Construction (State Vector):</strong>
                 <span className="text-xs text-emerald-400/60">{itinerary.agentReasoning.knowledge_base_source}</span>
               </div>
               <p>Serialized State Vector for RAG: <span className="font-mono text-emerald-200 break-all">{itinerary.agentReasoning.state_vector_kb_signature}</span></p>
          </div>

          {itinerary.agentReasoning.genetic_algorithm_status && (
             <div className="md:col-span-2 bg-indigo-900/20 p-2 rounded border border-indigo-500/20">
                <strong className="text-indigo-300 block mb-1">Genetic Algorithm Status:</strong>
                <p>{itinerary.agentReasoning.genetic_algorithm_status}</p>
             </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
          <button 
            onClick={onRemix} 
            disabled={isRemixing}
            className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-fuchsia-900/50"
          >
            {isRemixing ? (
               <span className="animate-pulse">Mutating Genotypes...</span>
            ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                 </svg>
                 Remix Itinerary (Genetic Mutation)
               </>
            )}
          </button>
      </div>

      {(itinerary.flightRecommendation || itinerary.hotelRecommendation) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {itinerary.flightRecommendation && (
            <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700 flex items-start gap-4">
              <FlightIcon />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-sky-300">Flight Recommendation</h3>
                <p className="text-slate-400 mt-1 text-sm">{itinerary.flightRecommendation.details}</p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
                  <span><strong>Airline:</strong> {itinerary.flightRecommendation.airline}</span>
                  <span><strong>Duration:</strong> {itinerary.flightRecommendation.duration}</span>
                  <span><strong>Price:</strong> ${itinerary.flightRecommendation.price.toFixed(2)}</span>
                </div>
                <a href={itinerary.flightRecommendation.booking_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                  Check Flights
                </a>
              </div>
            </div>
          )}
          {itinerary.hotelRecommendation && (
            <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700 flex items-start gap-4">
              <HotelIcon />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-rose-300">Hotel Recommendation</h3>
                <p className="text-slate-400 mt-1 text-sm">{itinerary.hotelRecommendation.details}</p>
                 <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
                  <span><strong>Hotel:</strong> {itinerary.hotelRecommendation.name}</span>
                  <span><strong>Rating:</strong> <StarIcon rating={itinerary.hotelRecommendation.rating} /></span>
                  <span><strong>Price:</strong> ${itinerary.hotelRecommendation.price_per_night.toFixed(2)}/night</span>
                </div>
                <a href={itinerary.hotelRecommendation.booking_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                  Book Hotel
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {itinerary.itinerary.map((dayPlan) => (
        <div key={dayPlan.day} className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
          <div className="border-b border-slate-600 pb-4 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-indigo-300">Day {dayPlan.day}: {dayPlan.theme}</h2>
                <p className="text-slate-400">{formatDate(dayPlan.date)}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm">
                  <WeatherIcon forecast={dayPlan.weather_forecast} />
                  <span className="text-slate-300">{dayPlan.weather_forecast}</span>
                </div>
                <a href={dayPlan.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold text-slate-200 transition-colors">
                  <MapPinIcon />
                  View Route on Map
                </a>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {dayPlan.activities.map((activity, index) => (
              <React.Fragment key={index}>
                {/* Transportation Leg */}
                <div className="flex items-center">
                  <TransportIcon mode={activity.transportation.mode} />
                  <div className="flex-1 border-t-2 border-dashed border-slate-600"></div>
                  <div className="mx-4 text-center">
                    <p className="text-sm font-semibold text-cyan-300">{activity.transportation.mode} &middot; {activity.transportation.travel_time}</p>
                    <p className="text-xs text-slate-400">{activity.transportation.details}</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-slate-600"></div>
                </div>

                {/* Activity Card */}
                <div className="flex items-start">
                   <div className="mr-4">
                    <CategoryIcon category={activity.category} />
                   </div>
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-100">{activity.name}</h3>
                        <p className="text-sm text-cyan-300">{activity.time}</p>
                      </div>
                      <span className="text-sm font-medium bg-slate-600 text-slate-200 px-2 py-1 rounded-md">
                        ${activity.estimated_cost.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-300">{activity.description}</p>
                    {activity.booking_recommendation && (
                      <p className="mt-3 text-xs text-amber-300 bg-amber-900/20 p-2 rounded-lg border border-amber-800/50">
                        <strong className="font-semibold">Tip:</strong> {activity.booking_recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-600">
             <p className="text-slate-400 italic">{dayPlan.daily_summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItineraryDisplay;
