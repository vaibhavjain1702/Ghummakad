"""Data layer models — 1:1 faithful port of types.ts (Pydantic v2)."""

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Type aliases (types.ts top-level unions)
# ---------------------------------------------------------------------------

Pace = Literal['Relaxed', 'Moderate', 'Fast-paced']
TripType = Literal['activitiesOnly', 'fullTrip']


# ---------------------------------------------------------------------------
# User input (accepts both snake_case and camelCase from the frontend JSON)
# ---------------------------------------------------------------------------

class UserPreferences(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    destination: str
    origin: str
    start_location: str = Field(alias='startLocation')
    budget: str  # STRING — preserved quirk from the TS source
    start_date: str = Field(alias='startDate')
    end_date: str = Field(alias='endDate')
    interests: List[str]
    must_visit: str = Field(default='', alias='mustVisit')
    pace: Pace = 'Moderate'
    trip_type: TripType = Field(default='activitiesOnly', alias='tripType')
    inspiration_image: Optional[str] = Field(default=None, alias='inspirationImage')  # Base64 for Computer Vision

    def to_internal_dict(self) -> dict:
        """Return the camelCase dict form the rest of the pipeline keys off."""
        return self.model_dump(by_alias=True)

    def model_dump_camel(self) -> dict:
        """Alias of to_internal_dict() for API responses."""
        return self.to_internal_dict()


# ---------------------------------------------------------------------------
# Itinerary output shapes
# ---------------------------------------------------------------------------

class ActivityLocation(BaseModel):
    latitude: float
    longitude: float


class Transportation(BaseModel):
    mode: str
    details: str
    travel_time: str


class Activity(BaseModel):
    time: str
    name: str
    description: str
    estimated_cost: float
    category: str
    location: ActivityLocation
    transportation: Transportation
    booking_recommendation: Optional[str] = ''


class DayPlan(BaseModel):
    day: int
    date: str
    theme: str
    weather_forecast: str
    map_url: str
    activities: List[Activity]
    daily_summary: str


class FlightRecommendation(BaseModel):
    airline: str
    price: float
    duration: str
    booking_url: str
    details: str


class HotelRecommendation(BaseModel):
    name: str
    price_per_night: float
    rating: float
    booking_url: str
    details: str


class AgentReasoning(BaseModel):
    constraints_analysis: List[str]
    state_space_search_strategy: str
    utility_maximization_logic: str
    knowledge_base_source: str
    genetic_algorithm_status: Optional[str] = None
    state_vector_kb_signature: Optional[str] = None  # Potential to create a KB entry from this state
    fuzzy_logic_analysis: Optional[str] = None  # How fuzzy inputs were mapped to crisp constraints


class Itinerary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    flight_recommendation: Optional[FlightRecommendation] = Field(default=None, alias='flightRecommendation')
    hotel_recommendation: Optional[HotelRecommendation] = Field(default=None, alias='hotelRecommendation')
    itinerary: List[DayPlan]
    agent_reasoning: AgentReasoning = Field(alias='agentReasoning')

    def model_dump_camel(self) -> dict:
        """camelCase dict (exclude_none=False) for API responses."""
        return self.model_dump(by_alias=True, exclude_none=False)


# ---------------------------------------------------------------------------
# Internal RAW activity model used mid-pipeline (from geminiService.ts)
# ---------------------------------------------------------------------------

class RawActivity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    category: str
    cost: float = 0
    duration: float = 2
    lat: float = 0
    lng: float = 0
    # FLOAT, not int: the Gemini response schema declares these as NUMBER and
    # the model really does return fractional hours (e.g. 9.5 for 9:30 AM).
    # Declaring them int caused int_from_float validation errors on live calls.
    opening_hour: float = Field(default=9, alias='openingHour')
    closing_hour: float = Field(default=18, alias='closingHour')
    popularity: float = 0.7
    description: str = ''
    booking_recommendation: str = ''


class GeminiResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    flight_recommendation: Optional[FlightRecommendation] = Field(default=None, alias='flightRecommendation')
    hotel_recommendation: Optional[HotelRecommendation] = Field(default=None, alias='hotelRecommendation')
    raw_activities: List[RawActivity] = Field(default=[], alias='rawActivities')


# ---------------------------------------------------------------------------
# Constants (types.ts export const INTEREST_OPTIONS)
# ---------------------------------------------------------------------------

INTEREST_OPTIONS: List[str] = [
    'Museums',
    'Food',
    'Outdoors',
    'History',
    'Art',
    'Shopping',
    'Nightlife',
    'Technology',
]
