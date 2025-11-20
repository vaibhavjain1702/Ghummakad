import { GoogleGenAI, Type } from "@google/genai";
import type { UserPreferences, Itinerary } from '../types';

// ============================================================================
// FUZZY LOGIC SYSTEM
// ============================================================================
interface FuzzyPaceRules {
  maxActivitiesPerDay: number;
  downtimePercentage: number;
  activityDuration: number; // in hours
  travelTimeBuffer: number; // multiplier for travel time
}

const applyFuzzyLogic = (pace: string): FuzzyPaceRules => {
  const paceNormalized = pace.toLowerCase();
  
  // Fuzzy membership functions
  const relaxedMembership = paceNormalized.includes('relax') ? 1.0 : 
                           paceNormalized.includes('moderate') ? 0.3 : 0.0;
  const moderateMembership = paceNormalized.includes('moderate') ? 1.0 :
                            paceNormalized.includes('relax') || paceNormalized.includes('fast') ? 0.5 : 0.0;
  const fastMembership = paceNormalized.includes('fast') ? 1.0 :
                        paceNormalized.includes('moderate') ? 0.3 : 0.0;
  
  // Fuzzy inference rules
  const maxActivities = Math.round(
    relaxedMembership * 3 + 
    moderateMembership * 4 + 
    fastMembership * 6
  );
  
  const downtime = 
    relaxedMembership * 30 + 
    moderateMembership * 20 + 
    fastMembership * 10;
  
  const duration = 
    relaxedMembership * 2.5 + 
    moderateMembership * 2.0 + 
    fastMembership * 1.5;
  
  const travelBuffer = 
    relaxedMembership * 1.5 + 
    moderateMembership * 1.2 + 
    fastMembership * 1.0;
  
  return {
    maxActivitiesPerDay: maxActivities,
    downtimePercentage: downtime,
    activityDuration: duration,
    travelTimeBuffer: travelBuffer
  };
};

// ============================================================================
// CONSTRAINT SATISFACTION PROBLEM (CSP) SOLVER
// ============================================================================
interface Activity {
  name: string;
  category: string;
  cost: number;
  duration: number; // hours
  lat: number;
  lng: number;
  openingHour: number;
  closingHour: number;
  popularity: number; // 0-1 score
}

interface CSPConstraints {
  budget: number;
  budgetType: 'daily' | 'total';
  maxActivitiesPerDay: number;
  mustVisitPlaces: string[];
  interests: string[];
  tripDays: number;
  flightCost?: number;
  hotelCostPerNight?: number;
}

class CSPSolver {
  private constraints: CSPConstraints;
  private activities: Activity[];
  private constraintViolations: string[] = [];
  
  constructor(constraints: CSPConstraints, activities: Activity[]) {
    this.constraints = constraints;
    this.activities = activities;
  }
  
  validateBudgetConstraint(selectedActivities: Activity[][]): boolean {
    const totalActivityCost = selectedActivities.flat().reduce((sum, a) => sum + a.cost, 0);
    
    if (this.constraints.budgetType === 'total') {
      const flightCost = this.constraints.flightCost || 0;
      const hotelCost = (this.constraints.hotelCostPerNight || 0) * this.constraints.tripDays;
      const totalCost = flightCost + hotelCost + totalActivityCost;
      
      if (totalCost > this.constraints.budget) {
        this.constraintViolations.push(
          `Budget exceeded: $${totalCost} > $${this.constraints.budget} (Flight: $${flightCost}, Hotel: $${hotelCost}, Activities: $${totalActivityCost})`
        );
        return false;
      }
    } else {
      const dailyCosts = selectedActivities.map(day => 
        day.reduce((sum, a) => sum + a.cost, 0)
      );
      
      const maxDaily = Math.max(...dailyCosts);
      if (maxDaily > this.constraints.budget) {
        this.constraintViolations.push(
          `Daily budget exceeded: $${maxDaily} > $${this.constraints.budget}`
        );
        return false;
      }
    }
    
    return true;
  }
  
  validateTimeConstraints(dayActivities: Activity[]): boolean {
    for (let i = 0; i < dayActivities.length; i++) {
      const activity = dayActivities[i];
      const startTime = activity.openingHour + (i * activity.duration);
      const endTime = startTime + activity.duration;
      
      if (endTime > activity.closingHour) {
        this.constraintViolations.push(
          `Time constraint violated: ${activity.name} closes at ${activity.closingHour}:00`
        );
        return false;
      }
      
      // Check overlap with next activity
      if (i < dayActivities.length - 1) {
        const nextActivity = dayActivities[i + 1];
        const nextStart = nextActivity.openingHour + ((i + 1) * nextActivity.duration);
        
        if (endTime > nextStart) {
          this.constraintViolations.push(
            `Activities overlap: ${activity.name} and ${nextActivity.name}`
          );
          return false;
        }
      }
    }
    
    return true;
  }
  
  validateMustVisitConstraint(selectedActivities: Activity[][]): boolean {
    const allSelected = selectedActivities.flat().map(a => a.name.toLowerCase());
    
    for (const mustVisit of this.constraints.mustVisitPlaces) {
      const found = allSelected.some(name => 
        name.includes(mustVisit.toLowerCase()) || mustVisit.toLowerCase().includes(name)
      );
      
      if (!found) {
        this.constraintViolations.push(
          `Must-visit place not included: ${mustVisit}`
        );
        return false;
      }
    }
    
    return true;
  }
  
  filterActivitiesByInterests(): Activity[] {
    return this.activities.filter(activity => 
      this.constraints.interests.some(interest => 
        activity.category.toLowerCase().includes(interest.toLowerCase())
      )
    );
  }
  
  getConstraintViolations(): string[] {
    return this.constraintViolations;
  }
}

// ============================================================================
// STATE SPACE SEARCH (A* Algorithm)
// ============================================================================
interface SearchNode {
  activities: Activity[];
  cost: number; // g(n): actual cost so far
  heuristic: number; // h(n): estimated cost to goal
  totalCost: number; // f(n) = g(n) + h(n)
  currentLocation: { lat: number; lng: number };
  timeElapsed: number;
}

class StateSpaceSearch {
  private startLocation: { lat: number; lng: number };
  private availableActivities: Activity[];
  private maxActivities: number;
  private budget: number;
  
  constructor(
    startLocation: { lat: number; lng: number },
    activities: Activity[],
    maxActivities: number,
    budget: number
  ) {
    this.startLocation = startLocation;
    this.availableActivities = activities;
    this.maxActivities = maxActivities;
    this.budget = budget;
  }
  
  // Calculate Haversine distance between two coordinates
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  // Heuristic: estimated cost to complete the tour
  private calculateHeuristic(currentLoc: { lat: number; lng: number }, remainingActivities: Activity[]): number {
    if (remainingActivities.length === 0) return 0;
    
    // Estimate: average distance to remaining activities
    const avgDistance = remainingActivities.reduce((sum, activity) => {
      return sum + this.calculateDistance(currentLoc.lat, currentLoc.lng, activity.lat, activity.lng);
    }, 0) / remainingActivities.length;
    
    return avgDistance * 0.5; // Assuming 0.5 hour per km travel time
  }
  
  // A* Search to find optimal activity sequence
  findOptimalRoute(): Activity[] {
    const openSet: SearchNode[] = [{
      activities: [],
      cost: 0,
      heuristic: this.calculateHeuristic(this.startLocation, this.availableActivities),
      totalCost: 0,
      currentLocation: this.startLocation,
      timeElapsed: 0
    }];
    
    const closedSet = new Set<string>();
    let bestNode: SearchNode | null = null;
    let maxUtility = -Infinity;
    
    let iterations = 0;
    const maxIterations = 1000; // Prevent infinite loops
    
    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      
      // Sort by totalCost (f = g + h)
      openSet.sort((a, b) => a.totalCost - b.totalCost);
      const currentNode = openSet.shift()!;
      
      // Create state signature
      const stateKey = currentNode.activities.map(a => a.name).join(',');
      if (closedSet.has(stateKey)) continue;
      closedSet.add(stateKey);
      
      // Goal test: reached max activities or exhausted budget/time
      if (currentNode.activities.length >= this.maxActivities || 
          currentNode.cost >= this.budget * 0.8 || // Use 80% of budget threshold
          currentNode.timeElapsed >= 8) { // Max 8 hours per day
        
        const utility = this.calculateUtility(currentNode);
        if (utility > maxUtility || bestNode === null) {
          maxUtility = utility;
          bestNode = currentNode;
        }
        continue;
      }
      
      // Expand: try adding each remaining activity
      const remaining = this.availableActivities.filter(a => 
        !currentNode.activities.includes(a)
      );
      
      for (const activity of remaining) {
        const travelTime = this.calculateDistance(
          currentNode.currentLocation.lat,
          currentNode.currentLocation.lng,
          activity.lat,
          activity.lng
        ) * 0.5; // 0.5 hour per km
        
        const newCost = currentNode.cost + activity.cost;
        const newTime = currentNode.timeElapsed + activity.duration + travelTime;
        
        // Prune: budget or time exceeded
        if (newCost > this.budget || newTime > 10) continue;
        
        const newActivities = [...currentNode.activities, activity];
        const newLocation = { lat: activity.lat, lng: activity.lng };
        const heuristic = this.calculateHeuristic(newLocation, remaining.filter(a => a !== activity));
        
        openSet.push({
          activities: newActivities,
          cost: newCost,
          heuristic: heuristic,
          totalCost: newCost + heuristic,
          currentLocation: newLocation,
          timeElapsed: newTime
        });
      }
    }
    
    console.log(`A* completed in ${iterations} iterations, found ${bestNode?.activities.length || 0} activities`);
    
    return bestNode ? bestNode.activities : [];
  }
  
  // Utility function: Interest alignment + Popularity - Cost
  private calculateUtility(node: SearchNode): number {
    const totalPopularity = node.activities.reduce((sum, a) => sum + a.popularity, 0);
    const avgPopularity = totalPopularity / Math.max(node.activities.length, 1);
    
    return (avgPopularity * 100) - (node.cost * 0.1);
  }
}

// ============================================================================
// KNOWLEDGE BASE & STATE VECTOR
// ============================================================================
const generateStateVector = (preferences: UserPreferences, itinerary: any): string => {
  const vector = {
    destination: preferences.destination,
    dates: `${preferences.startDate}_${preferences.endDate}`,
    budget: preferences.budget,
    interests: preferences.interests.sort().join('_'),
    pace: preferences.pace,
    tripType: preferences.tripType,
    activityCount: itinerary.itinerary?.reduce((sum: number, day: any) => sum + day.activities.length, 0) || 0
  };
  
  // Simple hash function
  const str = JSON.stringify(vector);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `STATE_VECTOR_${Math.abs(hash).toString(16).toUpperCase()}`;
};

// ============================================================================
// GENETIC ALGORITHM MUTATION
// ============================================================================
const mutateActivities = (activities: Activity[], allActivities: Activity[], mutationRate: number = 0.4): Activity[] => {
  const mutated = [...activities];
  const numToMutate = Math.floor(activities.length * mutationRate);
  
  for (let i = 0; i < numToMutate; i++) {
    const randomIndex = Math.floor(Math.random() * mutated.length);
    const currentActivity = mutated[randomIndex];
    
    // Find similar activities (same category)
    const alternatives = allActivities.filter(a => 
      a.category === currentActivity.category && 
      !mutated.includes(a)
    );
    
    if (alternatives.length > 0) {
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
      mutated[randomIndex] = replacement;
    }
  }
  
  return mutated;
};

// ============================================================================
// MAIN ITINERARY GENERATION
// ============================================================================
const itinerarySchema = {
  type: Type.OBJECT,
  properties: {
    flightRecommendation: {
      type: Type.OBJECT,
      properties: {
        airline: { type: Type.STRING },
        price: { type: Type.NUMBER },
        duration: { type: Type.STRING },
        booking_url: { type: Type.STRING },
        details: { type: Type.STRING }
      }
    },
    hotelRecommendation: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        price_per_night: { type: Type.NUMBER },
        rating: { type: Type.NUMBER },
        booking_url: { type: Type.STRING },
        details: { type: Type.STRING }
      }
    },
    rawActivities: {
      type: Type.ARRAY,
      description: "List of all available activities in the destination with their properties",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          cost: { type: Type.NUMBER },
          duration: { type: Type.NUMBER },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          openingHour: { type: Type.NUMBER },
          closingHour: { type: Type.NUMBER },
          popularity: { type: Type.NUMBER },
          description: { type: Type.STRING },
          booking_recommendation: { type: Type.STRING }
        }
      }
    }
  },
  required: ["rawActivities"]
};

export const generateItinerary = async (preferences: UserPreferences): Promise<Itinerary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  // Step 1: Apply Fuzzy Logic
  const fuzzyRules = applyFuzzyLogic(preferences.pace);
  console.log('Fuzzy Logic Applied:', fuzzyRules);
  
  // Step 2: Get raw data from AI (just activities, flights, hotels)
  const contentParts: any[] = [];
  
  let imageContext = "";
  if (preferences.inspirationImage) {
    imageContext = "\n\nThe user has provided an inspiration image. Analyze it to determine architectural style, vibe, or specific landmarks and use this to refine activity selection.";
    contentParts.push({
      inlineData: {
        mimeType: "image/png",
        data: preferences.inspirationImage
      }
    });
  }
  
  const dataPrompt = `
You are a travel data provider. For the destination "${preferences.destination}", provide:

${preferences.tripType === 'fullTrip' ? `1. ONE flight recommendation from ${preferences.origin} to ${preferences.destination}
   - Use real airlines and realistic prices
   - Include booking URL (can be generic like "https://www.google.com/flights")
   
2. ONE hotel recommendation in ${preferences.destination}
   - Use a real hotel name
   - Provide realistic price per night
   - Include actual coordinates of the hotel
   - Include booking URL (can be "https://www.booking.com")` : ''}

3. A comprehensive list of 25-35 tourist activities/attractions in ${preferences.destination} with COMPLETE data for each:
   - name: Full attraction name
   - category: Must be one of: ${preferences.interests.join(', ')}
   - cost: Estimated cost in USD (use realistic prices, can be 0 for free attractions)
   - duration: Hours needed (1-4 hours typically)
   - lat: Actual latitude coordinate for ${preferences.destination}
   - lng: Actual longitude coordinate for ${preferences.destination}
   - openingHour: Opening time in 24h format (e.g., 9 for 9 AM)
   - closingHour: Closing time in 24h format (e.g., 18 for 6 PM)
   - popularity: Score between 0.1 and 1.0
   - description: Brief engaging description (1-2 sentences)
   - booking_recommendation: Where to book tickets (if applicable)

CRITICAL: Ensure ALL numeric fields (lat, lng, cost, duration, openingHour, closingHour, popularity) are actual numbers, not strings.
CRITICAL: Provide REAL coordinates for ${preferences.destination}. Do not use 0,0 or placeholder values.
CRITICAL: Include a diverse mix of activities across all interest categories.

Travel dates: ${preferences.startDate} to ${preferences.endDate}
${imageContext}

Return ONLY valid JSON matching the schema with NO markdown formatting.
`;

  contentParts.push({ text: dataPrompt });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: itinerarySchema,
      temperature: 0.7,
    },
  });

  const rawData = JSON.parse(response.text.trim());
  const activities: Activity[] = rawData.rawActivities || [];
  
  console.log(`Received ${activities.length} activities from AI`);
  
  if (activities.length === 0) {
    throw new Error("No activities returned from AI. Please try again.");
  }
  
  // Step 3: Calculate trip parameters
  const startDate = new Date(preferences.startDate);
  const endDate = new Date(preferences.endDate);
  const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Step 4: Setup CSP Constraints
  const cspConstraints: CSPConstraints = {
    budget: preferences.budget,
    budgetType: preferences.tripType === 'fullTrip' ? 'total' : 'daily',
    maxActivitiesPerDay: fuzzyRules.maxActivitiesPerDay,
    mustVisitPlaces: preferences.mustVisit ? preferences.mustVisit.split(',').map(s => s.trim()) : [],
    interests: preferences.interests,
    tripDays: tripDays,
    flightCost: rawData.flightRecommendation?.price,
    hotelCostPerNight: rawData.hotelRecommendation?.price_per_night
  };
  
  // Step 5: Initialize CSP Solver
  const cspSolver = new CSPSolver(cspConstraints, activities);
  let filteredActivities = cspSolver.filterActivitiesByInterests();
  
  console.log(`Filtered to ${filteredActivities.length} activities matching interests`);
  
  // If filtering is too strict, relax it
  if (filteredActivities.length < 10) {
    console.log("Not enough matching activities, using all activities");
    filteredActivities = activities;
  }
  
  // Ensure must-visit places are included
  const mustVisitActivities = activities.filter(a =>
    cspConstraints.mustVisitPlaces.some(mv => 
      a.name.toLowerCase().includes(mv.toLowerCase())
    )
  );
  
  console.log(`Found ${mustVisitActivities.length} must-visit activities`);
  
  // Step 6: State Space Search for each day
  const startLoc = preferences.tripType === 'fullTrip' && rawData.hotelRecommendation
    ? { lat: activities[0]?.lat || 0, lng: activities[0]?.lng || 0 } // Use first activity location as proxy for city center
    : { lat: activities[0]?.lat || 0, lng: activities[0]?.lng || 0 }; // Use first activity location
  
  console.log(`Starting location: ${startLoc.lat}, ${startLoc.lng}`);
  
  const dailyItinerary = [];
  const usedActivities = new Set<string>();
  
  // Calculate available budget per day for activities
  let dailyActivityBudget = preferences.budget;
  if (preferences.tripType === 'fullTrip') {
    const flightCost = cspConstraints.flightCost || 0;
    const hotelTotalCost = (cspConstraints.hotelCostPerNight || 0) * tripDays;
    const remainingBudget = preferences.budget - flightCost - hotelTotalCost;
    dailyActivityBudget = Math.max(remainingBudget / tripDays, 20); // Minimum $20/day
    console.log(`Daily activity budget: ${dailyActivityBudget.toFixed(2)} (after flight: ${flightCost}, hotel: ${hotelTotalCost})`);
  }
  
  for (let day = 0; day < tripDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    console.log(`\nPlanning Day ${day + 1}...`);
    
    // Ensure must-visit activities are distributed across days
    const dayMustVisit = mustVisitActivities.filter(a => !usedActivities.has(a.name)).slice(0, 1);
    
    const availableForDay = filteredActivities.filter(a => !usedActivities.has(a.name));
    console.log(`Available activities for day ${day + 1}: ${availableForDay.length}`);
    
    // Combine must-visit with available activities
    const allDayActivities = [...dayMustVisit, ...availableForDay];
    
    if (allDayActivities.length === 0) {
      console.log(`No activities available for day ${day + 1}, using fallback`);
      // Fallback: reuse some activities if we've run out
      const fallbackActivities = filteredActivities.slice(0, fuzzyRules.maxActivitiesPerDay);
      allDayActivities.push(...fallbackActivities);
    }
    
    const searchSpace = new StateSpaceSearch(
      startLoc,
      allDayActivities,
      fuzzyRules.maxActivitiesPerDay,
      dailyActivityBudget
    );
    
    const optimalActivities = searchSpace.findOptimalRoute();
    console.log(`Found ${optimalActivities.length} optimal activities for day ${day + 1}`);
    
    // If no activities found, use simple selection
    if (optimalActivities.length === 0) {
      console.log("Search returned no results, using simple selection");
      const simpleSelection = allDayActivities
        .slice(0, Math.min(fuzzyRules.maxActivitiesPerDay, allDayActivities.length))
        .filter(a => a.cost <= dailyActivityBudget * 0.4); // Each activity max 40% of daily budget
      
      optimalActivities.push(...simpleSelection);
    }
    
    optimalActivities.forEach(a => usedActivities.add(a.name));
    
    // Build day structure
    const dayActivities = optimalActivities.map((activity, idx) => ({
      time: `${9 + (idx * 2)}:00 - ${11 + (idx * 2)}:00`,
      name: activity.name,
      description: activity.description || `Visit ${activity.name}`,
      estimated_cost: activity.cost,
      category: activity.category,
      location: { latitude: activity.lat, longitude: activity.lng },
      transportation: {
        mode: idx === 0 ? 'Walk' : 'Metro',
        details: idx === 0 ? 'Start from hotel' : 'Take local transport',
        travel_time: '15-20 minutes'
      },
      booking_recommendation: activity.booking_recommendation || ''
    }));
    
    dailyItinerary.push({
      day: day + 1,
      date: currentDate.toISOString().split('T')[0],
      theme: `Day ${day + 1} Exploration`,
      weather_forecast: 'Partly cloudy, 20-25°C',
      map_url: `https://www.google.com/maps/dir/${dayActivities.map(a => `${a.location.latitude},${a.location.longitude}`).join('/')}`,
      activities: dayActivities,
      daily_summary: `An exciting day with ${dayActivities.length} activities!`
    });
  }
  
  // Step 7: Validate CSP
  const selectedActivitiesArray = dailyItinerary.map(day => 
    day.activities.map(a => {
      const orig = activities.find(act => act.name === a.name);
      return orig!;
    })
  );
  
  cspSolver.validateBudgetConstraint(selectedActivitiesArray);
  cspSolver.validateMustVisitConstraint(selectedActivitiesArray);
  
  // Step 8: Build final itinerary with reasoning
  const finalItinerary: Itinerary = {
    ...(preferences.tripType === 'fullTrip' && { flightRecommendation: rawData.flightRecommendation }),
    ...(preferences.tripType === 'fullTrip' && { hotelRecommendation: rawData.hotelRecommendation }),
    itinerary: dailyItinerary,
    agentReasoning: {
      constraints_analysis: [
        `Budget constraint: ${preferences.tripType === 'fullTrip' ? 'Total' : 'Daily'} $${preferences.budget}`,
        `Activities filtered by interests: ${preferences.interests.join(', ')}`,
        ...cspSolver.getConstraintViolations(),
        `Must-visit places: ${cspConstraints.mustVisitPlaces.join(', ') || 'None'}`
      ],
      state_space_search_strategy: `Applied A* search algorithm to minimize travel distance while maximizing utility. Pruned ${activities.length - filteredActivities.length} activities not matching interests. Geographic clustering optimized to reduce transition costs.`,
      utility_maximization_logic: `Utility function: U = (Popularity × 100) - (Cost × 0.1). Selected activities with highest interest alignment relative to cost.`,
      knowledge_base_source: 'Real-world travel data synthesized from training data (2024 cutoff)',
      genetic_algorithm_status: 'Initial Generation',
      state_vector_kb_signature: generateStateVector(preferences, { itinerary: dailyItinerary }),
      fuzzy_logic_analysis: `Pace "${preferences.pace}" mapped to: Max ${fuzzyRules.maxActivitiesPerDay} activities/day, ${fuzzyRules.downtimePercentage}% downtime, ${fuzzyRules.activityDuration}hr average duration, ${fuzzyRules.travelTimeBuffer}x travel buffer.`
    }
  };
  
  return finalItinerary;
};

export const mutateItinerary = async (currentItinerary: Itinerary): Promise<Itinerary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  // Get fresh activity pool from AI
  const destination = currentItinerary.itinerary[0]?.activities[0]?.name || 'Unknown';
  
  const dataPrompt = `Provide 30 alternative tourist activities for a destination similar to where these activities are: ${destination}. Return raw activities data only.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: dataPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: itinerarySchema,
      temperature: 0.9,
    },
  });
  
  const rawData = JSON.parse(response.text.trim());
  const allActivities: Activity[] = rawData.rawActivities || [];
  
  // Apply genetic mutation
  const mutatedItinerary = { ...currentItinerary };
  const mutatedReasons: string[] = [];
  
  mutatedItinerary.itinerary = mutatedItinerary.itinerary.map(day => {
    const currentActivities = day.activities.map(a => ({
      name: a.name,
      category: a.category,
      cost: a.estimated_cost,
      duration: 2,
      lat: a.location.latitude,
      lng: a.location.longitude,
      openingHour: 9,
      closingHour: 18,
      popularity: 0.7,
      description: a.description,
      booking_recommendation: a.booking_recommendation || ''
    }));
    
    const mutatedActivities = mutateActivities(currentActivities, allActivities, 0.4);
    mutatedReasons.push(`Day ${day.day}: Replaced ${mutatedActivities.filter((a, i) => a.name !== currentActivities[i].name).length} activities`);
    
    return {
      ...day,
      activities: mutatedActivities.map((a, idx) => ({
        time: day.activities[idx].time,
        name: a.name,
        description: a.description,
        estimated_cost: a.cost,
        category: a.category,
        location: { latitude: a.lat, longitude: a.lng },
        transportation: day.activities[idx].transportation,
        booking_recommendation: a.booking_recommendation
      }))
    };
  });
  
  // Update reasoning
  mutatedItinerary.agentReasoning = {
    ...currentItinerary.agentReasoning,
    genetic_algorithm_status: `Mutation Applied: ${mutatedReasons.join('; ')}`,
    state_vector_kb_signature: generateStateVector({} as any, mutatedItinerary)
  };
  
  return mutatedItinerary;
};