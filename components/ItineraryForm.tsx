
import React from 'react';
import type { UserPreferences, Pace, TripType } from '../types';
import { INTEREST_OPTIONS } from '../types';

interface ItineraryFormProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ItineraryForm: React.FC<ItineraryFormProps> = ({ preferences, setPreferences, onSubmit, isLoading }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.value });
  };

  const handleInterestChange = (interest: string) => {
    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter((i) => i !== interest)
      : [...preferences.interests, interest];
    setPreferences({ ...preferences, interests: newInterests });
  };

  const handlePaceChange = (pace: Pace) => {
    setPreferences({ ...preferences, pace });
  };
  
  const handleTripTypeChange = (tripType: TripType) => {
    setPreferences({ ...preferences, tripType });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        setPreferences({ ...preferences, inspirationImage: base64Data });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-slate-800/50 rounded-xl shadow-lg p-6 space-y-6 border border-slate-700 sticky top-8">
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Trip Type</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => handleTripTypeChange('activitiesOnly')} className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 ${preferences.tripType === 'activitiesOnly' ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
            Activities Only
          </button>
          <button type="button" onClick={() => handleTripTypeChange('fullTrip')} className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 ${preferences.tripType === 'fullTrip' ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
            Full Trip
          </button>
        </div>
      </div>

      {preferences.tripType === 'fullTrip' && (
        <div className="animate-fade-in">
          <label htmlFor="origin" className="block text-sm font-medium text-slate-300 mb-1">Origin</label>
          <input type="text" name="origin" id="origin" value={preferences.origin} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., London, UK" required />
        </div>
      )}

      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-slate-300 mb-1">Destination</label>
        <input type="text" name="destination" id="destination" value={preferences.destination} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Tokyo, Japan" required />
      </div>
      
      <div>
        <label htmlFor="startLocation" className="block text-sm font-medium text-slate-300 mb-1">Accommodation Area</label>
        <input type="text" name="startLocation" id="startLocation" value={preferences.startLocation} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Hotel name or area" required />
         <p className="text-xs text-slate-500 mt-1">For 'Full Trip', the AI will recommend a hotel and use it as the starting point.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
          <input type="date" name="startDate" id="startDate" value={preferences.startDate} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" required />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
          <input type="date" name="endDate" id="endDate" value={preferences.endDate} onChange={handleChange} min={preferences.startDate} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" required />
        </div>
      </div>
      
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-slate-300 mb-1">{preferences.tripType === 'fullTrip' ? 'Total Trip Budget (USD)' : 'Daily Budget (USD per person)'}</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">$</div>
          <input type="number" name="budget" id="budget" value={preferences.budget} onChange={handleChange} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 pl-7 focus:ring-indigo-500 focus:border-indigo-500" placeholder="100" required min="0" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Interests</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button type="button" key={interest} onClick={() => handleInterestChange(interest)} className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 ${preferences.interests.includes(interest) ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="mustVisit" className="block text-sm font-medium text-slate-300 mb-1">Must-Visit Places <span className="text-xs text-slate-500">(Optional)</span></label>
        <input 
          type="text" 
          name="mustVisit" 
          id="mustVisit" 
          value={preferences.mustVisit} 
          onChange={handleChange} 
          className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-slate-100 focus:ring-indigo-500 focus:border-indigo-500" 
          placeholder="e.g., Tokyo Tower, Shibuya Crossing" 
        />
        <p className="text-xs text-slate-500 mt-1">Prioritized constraints for State Space Search.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Pace</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['Relaxed', 'Moderate', 'Fast-paced'] as Pace[]).map((pace) => (
            <button type="button" key={pace} onClick={() => handlePaceChange(pace)} className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 ${preferences.pace === pace ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
              {pace}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Computer Vision: Inspiration Image
          <span className="block text-xs text-slate-500 font-normal">Upload an image of a place you love, and the AI will analyze its vibe.</span>
        </label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          className="block w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-900/50 file:text-indigo-300
            hover:file:bg-indigo-900/70
          "
        />
        {preferences.inspirationImage && (
          <p className="mt-2 text-xs text-green-400">Image loaded and ready for analysis.</p>
        )}
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300 ease-in-out">
        {isLoading ? 'Crafting Your Trip...' : 'Generate Itinerary'}
      </button>
    </form>
  );
};

export default ItineraryForm;
