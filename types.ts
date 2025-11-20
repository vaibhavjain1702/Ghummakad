
export type Pace = 'Relaxed' | 'Moderate' | 'Fast-paced';
export type TripType = 'activitiesOnly' | 'fullTrip';

export interface UserPreferences {
  destination: string;
  origin: string;
  startLocation: string;
  budget: string;
  startDate: string;
  endDate: string;
  interests: string[];
  mustVisit: string; // Comma separated list of places
  pace: Pace;
  tripType: TripType;
  inspirationImage?: string; // Base64 string for Computer Vision
}

export interface Activity {
  time: string;
  name:string;
  description: string;
  estimated_cost: number;
  category: string;
  location: {
    latitude: number;
    longitude: number;
  };
  transportation: {
    mode: string;
    details: string;
    travel_time: string;
  };
  booking_recommendation?: string;
}

export interface DayPlan {
  day: number;
  date: string;
  theme: string;
  weather_forecast: string;
  map_url: string;
  activities: Activity[];
  daily_summary: string;
}

export interface FlightRecommendation {
  airline: string;
  price: number;
  duration: string;
  booking_url: string;
  details: string;
}

export interface HotelRecommendation {
  name: string;
  price_per_night: number;
  rating: number;
  booking_url: string;
  details: string;
}

export interface AgentReasoning {
  constraints_analysis: string[];
  state_space_search_strategy: string;
  utility_maximization_logic: string;
  knowledge_base_source: string;
  genetic_algorithm_status?: string;
  state_vector_kb_signature?: string; // Represents the potential to create a KB entry from this state
  fuzzy_logic_analysis?: string; // Details on how fuzzy inputs were mapped to crisp constraints
}

export interface Itinerary {
  flightRecommendation?: FlightRecommendation;
  hotelRecommendation?: HotelRecommendation;
  itinerary: DayPlan[];
  agentReasoning: AgentReasoning;
}

export const INTEREST_OPTIONS = ['Museums', 'Food', 'Outdoors', 'History', 'Art', 'Shopping', 'Nightlife', 'Technology'];
