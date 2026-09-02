"""
gemini_service.py — Faithful Python port of services/geminiService.ts
(Gemini calls + main itinerary generation / mutation pipeline).

The pure algorithms (fuzzy logic, CSP solver, A* search, state vector,
genetic mutation) live in planner.py; data shapes live in models.py.
Only the AI-facing orchestration is implemented here.
"""

import copy
import json
import math
import os
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv
from google.genai import Client, types

from models import GeminiResponse, RawActivity, UserPreferences
from planner import (
    CSPSolver,
    StateSpaceSearch,
    apply_fuzzy_logic,
    generate_state_vector,
    mutate_activities,
)

load_dotenv()

# NOTE: gemini-2.5-flash was retired by Google for new API keys (404 NOT_FOUND
# directs users to gemini-3.6-flash), so we follow the current model.
MODEL_NAME = "gemini-3.6-flash"


def _make_client() -> Client:
    api_key = os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY") or ""
    return Client(api_key=api_key)


# ============================================================================
# RESPONSE SCHEMA (mirrors itinerarySchema in geminiService.ts EXACTLY)
# ============================================================================

ITINERARY_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "flightRecommendation": types.Schema(
            type=types.Type.OBJECT,
            properties={
                "airline": types.Schema(type=types.Type.STRING),
                "price": types.Schema(type=types.Type.NUMBER),
                "duration": types.Schema(type=types.Type.STRING),
                "booking_url": types.Schema(type=types.Type.STRING),
                "details": types.Schema(type=types.Type.STRING),
            },
        ),
        "hotelRecommendation": types.Schema(
            type=types.Type.OBJECT,
            properties={
                "name": types.Schema(type=types.Type.STRING),
                "price_per_night": types.Schema(type=types.Type.NUMBER),
                "rating": types.Schema(type=types.Type.NUMBER),
                "booking_url": types.Schema(type=types.Type.STRING),
                "details": types.Schema(type=types.Type.STRING),
            },
        ),
        "rawActivities": types.Schema(
            type=types.Type.ARRAY,
            description="List of all available activities in the destination with their properties",
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "name": types.Schema(type=types.Type.STRING),
                    "category": types.Schema(type=types.Type.STRING),
                    "cost": types.Schema(type=types.Type.NUMBER),
                    "duration": types.Schema(type=types.Type.NUMBER),
                    "lat": types.Schema(type=types.Type.NUMBER),
                    "lng": types.Schema(type=types.Type.NUMBER),
                    "openingHour": types.Schema(type=types.Type.NUMBER),
                    "closingHour": types.Schema(type=types.Type.NUMBER),
                    "popularity": types.Schema(type=types.Type.NUMBER),
                    "description": types.Schema(type=types.Type.STRING),
                    "booking_recommendation": types.Schema(type=types.Type.STRING),
                },
            ),
        ),
    },
    required=["rawActivities"],
)


# ============================================================================
# HELPERS
# ============================================================================

def _preferences_view(preferences: Union[UserPreferences, Dict[str, Any]]) -> Dict[str, Any]:
    """camelCase dict view of preferences (TS code reads camelCase fields)."""
    if isinstance(preferences, UserPreferences):
        return preferences.to_internal_dict()
    return preferences


def _parse_ai_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text.strip())
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError(
            f"Malformed AI response: could not parse JSON returned by the model. ({exc})"
        ) from exc


# ============================================================================
# MAIN ITINERARY GENERATION
# ============================================================================

async def generate_itinerary(
    preferences: Union[UserPreferences, Dict[str, Any]],
) -> Dict[str, Any]:
    client = _make_client()
    p = _preferences_view(preferences)

    # Step 1: Apply Fuzzy Logic
    fuzzy_rules = apply_fuzzy_logic(p["pace"])

    # Step 2: Get raw data from AI (just activities, flights, hotels)
    content_parts: List[Dict[str, Any]] = []

    image_context = ""
    if p.get("inspirationImage"):
        image_context = (
            "\n\nThe user has provided an inspiration image. Analyze it to determine "
            "architectural style, vibe, or specific landmarks and use this to refine "
            "activity selection."
        )
        content_parts.append({
            "inline_data": {
                "mime_type": "image/png",
                "data": p["inspirationImage"],
            }
        })

    full_trip_section = (
        f"""1. ONE flight recommendation from {p['origin']} to {p['destination']}
   - Use real airlines and realistic prices
   - Include booking URL (can be generic like "https://www.google.com/flights")
   
2. ONE hotel recommendation in {p['destination']}
   - Use a real hotel name
   - Provide realistic price per night
   - Include actual coordinates of the hotel
   - Include booking URL (can be "https://www.booking.com")"""
        if p["tripType"] == "fullTrip"
        else ""
    )

    data_prompt = f"""
You are a travel data provider. For the destination "{p['destination']}", provide:

{full_trip_section}

3. A comprehensive list of 25-35 tourist activities/attractions in {p['destination']} with COMPLETE data for each:
   - name: Full attraction name
   - category: Must be one of: {', '.join(p['interests'])}
   - cost: Estimated cost in USD (use realistic prices, can be 0 for free attractions)
   - duration: Hours needed (1-4 hours typically)
   - lat: Actual latitude coordinate for {p['destination']}
   - lng: Actual longitude coordinate for {p['destination']}
   - openingHour: Opening time in 24h format (e.g., 9 for 9 AM)
   - closingHour: Closing time in 24h format (e.g., 18 for 6 PM)
   - popularity: Score between 0.1 and 1.0
   - description: Brief engaging description (1-2 sentences)
   - booking_recommendation: Where to book tickets (if applicable)

CRITICAL: Ensure ALL numeric fields (lat, lng, cost, duration, openingHour, closingHour, popularity) are actual numbers, not strings.
CRITICAL: Provide REAL coordinates for {p['destination']}. Do not use 0,0 or placeholder values.
CRITICAL: Include a diverse mix of activities across all interest categories.

Travel dates: {p['startDate']} to {p['endDate']}
{image_context}

Return ONLY valid JSON matching the schema with NO markdown formatting.
"""

    content_parts.append({"text": data_prompt})

    # Retry on 503 UN AVAILABLE (rate limit) with exponential backoff
    import asyncio
    response = None
    last_error = None
    for attempt in range(4):
        try:
            response = await client.aio.models.generate_content(
                model=MODEL_NAME,
                contents=[{"parts": content_parts}],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ITINERARY_SCHEMA,
                    temperature=0.7,
                ),
            )
            break
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "503" in err_str or "UNAVAILABLE" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = 2 ** attempt  # 1s, 2s, 4s, 8s
                print(f"Gemini rate-limited (attempt {attempt + 1}/4), retrying in {wait}s...")
                await asyncio.sleep(wait)
                continue
            raise
    if response is None:
        raise last_error

    raw_data = _parse_ai_json(response.text or "")
    parsed = GeminiResponse.model_validate(raw_data)
    activities: List[RawActivity] = parsed.raw_activities

    print(f"Received {len(activities)} activities from AI")

    if len(activities) == 0:
        raise ValueError("No activities returned from AI. Please try again.")

    # Step 3: Calculate trip parameters
    # NOTE: TS computes ceil((endMs - startMs) / 86400000), which equals whole
    # days between the dates (end date EXCLUSIVE). Same-day trips yield 0.
    # Preserved verbatim — do NOT "fix" to inclusive counting.
    trip_days = math.ceil((date.fromisoformat(p["endDate"]) - date.fromisoformat(p["startDate"])).days)

    # Step 4: Setup CSP Constraints
    must_visit_str = p.get("mustVisit", "")
    csp_constraints: Dict[str, Any] = {
        "budget": float(p["budget"]),
        "budget_type": "total" if p["tripType"] == "fullTrip" else "daily",
        "max_activities_per_day": fuzzy_rules["max_activities_per_day"],
        "must_visit_places": [s.strip() for s in must_visit_str.split(",")] if must_visit_str else [],
        "interests": p["interests"],
        "trip_days": trip_days,
        "flight_cost": parsed.flight_recommendation.price if parsed.flight_recommendation else None,
        "hotel_cost_per_night": parsed.hotel_recommendation.price_per_night if parsed.hotel_recommendation else None,
    }

    # Step 5: Initialize CSP Solver
    csp_solver = CSPSolver(csp_constraints, activities)
    filtered_activities = csp_solver.filter_activities_by_interests()

    print(f"Filtered to {len(filtered_activities)} activities matching interests")

    # If filtering is too strict, relax it
    if len(filtered_activities) < 10:
        print("Not enough matching activities, using all activities")
        filtered_activities = activities

    # Ensure must-visit places are included
    must_visit_activities = [
        a for a in activities
        if any(mv.lower() in a.name.lower() for mv in csp_constraints["must_visit_places"])
    ]

    print(f"Found {len(must_visit_activities)} must-visit activities")

    # Step 6: State Space Search for each day
    # Both TS branches are identical: use first activity location as proxy
    # for city center.
    start_loc = (activities[0].lat or 0, activities[0].lng or 0)

    print(f"Starting location: {start_loc[0]}, {start_loc[1]}")

    daily_itinerary: List[Dict[str, Any]] = []
    used_activities = set()

    # Calculate available budget per day for activities
    daily_activity_budget = float(p["budget"])
    if p["tripType"] == "fullTrip":
        flight_cost = csp_constraints["flight_cost"] or 0
        hotel_total_cost = (csp_constraints["hotel_cost_per_night"] or 0) * trip_days
        remaining_budget = float(p["budget"]) - flight_cost - hotel_total_cost
        daily_activity_budget = max(remaining_budget / trip_days, 20)  # Minimum $20/day
        print(f"Daily activity budget: {daily_activity_budget:.2f} (after flight: {flight_cost}, hotel: {hotel_total_cost})")

    max_acts = fuzzy_rules["max_activities_per_day"]

    for day in range(trip_days):
        current_date = date.fromisoformat(p["startDate"]) + timedelta(days=day)

        print(f"\nPlanning Day {day + 1}...")

        # Ensure must-visit activities are distributed across days
        day_must_visit = [a for a in must_visit_activities if a.name not in used_activities][:1]

        available_for_day = [a for a in filtered_activities if a.name not in used_activities]
        print(f"Available activities for day {day + 1}: {len(available_for_day)}")

        # Combine must-visit with available activities
        all_day_activities = [*day_must_visit, *available_for_day]

        if len(all_day_activities) == 0:
            print(f"No activities available for day {day + 1}, using fallback")
            # Fallback: reuse some activities if we've run out
            all_day_activities.extend(filtered_activities[:max_acts])

        search_space = StateSpaceSearch(
            start_loc,
            all_day_activities,
            max_acts,
            daily_activity_budget,
        )

        optimal_activities = search_space.find_optimal_route()
        print(f"Found {len(optimal_activities)} optimal activities for day {day + 1}")

        # If no activities found, use simple selection
        if len(optimal_activities) == 0:
            print("Search returned no results, using simple selection")
            simple_selection = [
                a for a in all_day_activities[: min(max_acts, len(all_day_activities))]
                if a.cost <= daily_activity_budget * 0.4  # Each activity max 40% of daily budget
            ]
            optimal_activities.extend(simple_selection)

        for a in optimal_activities:
            used_activities.add(a.name)

        # Build day structure
        day_activities = [
            {
                "time": f"{9 + (idx * 2)}:00 - {11 + (idx * 2)}:00",
                "name": activity.name,
                "description": activity.description or f"Visit {activity.name}",
                "estimated_cost": activity.cost,
                "category": activity.category,
                "location": {"latitude": activity.lat, "longitude": activity.lng},
                "transportation": {
                    "mode": "Walk" if idx == 0 else "Metro",
                    "details": "Start from hotel" if idx == 0 else "Take local transport",
                    "travel_time": "15-20 minutes",
                },
                "booking_recommendation": activity.booking_recommendation or "",
            }
            for idx, activity in enumerate(optimal_activities)
        ]

        daily_itinerary.append({
            "day": day + 1,
            "date": current_date.isoformat(),
            "theme": f"Day {day + 1} Exploration",
            "weather_forecast": "Partly cloudy, 20-25°C",
            "map_url": "https://www.google.com/maps/dir/" + "/".join(
                f"{a['location']['latitude']},{a['location']['longitude']}" for a in day_activities
            ),
            "activities": day_activities,
            "daily_summary": f"An exciting day with {len(day_activities)} activities!",
        })

    # Step 7: Validate CSP (results recorded in solver violations, not enforced)
    selected_activities_array: List[List[RawActivity]] = []
    for day_plan in daily_itinerary:
        mapped: List[RawActivity] = []
        for a in day_plan["activities"]:
            orig = next((act for act in activities if act.name == a["name"]), None)
            if orig is None:
                continue  # TS `orig!` would crash here; we guard instead
            mapped.append(orig)
        selected_activities_array.append(mapped)

    csp_solver.validate_budget_constraint(selected_activities_array)
    csp_solver.validate_must_visit_constraint(selected_activities_array)

    # Step 8: Build final itinerary with reasoning
    final_itinerary: Dict[str, Any] = {
        **({"flightRecommendation": raw_data.get("flightRecommendation")} if p["tripType"] == "fullTrip" else {}),
        **({"hotelRecommendation": raw_data.get("hotelRecommendation")} if p["tripType"] == "fullTrip" else {}),
        "itinerary": daily_itinerary,
        "agentReasoning": {
            "constraints_analysis": [
                f'Budget constraint: {"Total" if p["tripType"] == "fullTrip" else "Daily"} ${p["budget"]}',
                f'Activities filtered by interests: {", ".join(p["interests"])}',
                *csp_solver.get_constraint_violations(),
                f'Must-visit places: {", ".join(csp_constraints["must_visit_places"]) or "None"}',
            ],
            "state_space_search_strategy": f"Applied A* search algorithm to minimize travel distance while maximizing utility. Pruned {len(activities) - len(filtered_activities)} activities not matching interests. Geographic clustering optimized to reduce transition costs.",
            "utility_maximization_logic": "Utility function: U = (Popularity × 100) - (Cost × 0.1). Selected activities with highest interest alignment relative to cost.",
            "knowledge_base_source": "Real-world travel data synthesized from training data (2024 cutoff)",
            "genetic_algorithm_status": "Initial Generation",
            "state_vector_kb_signature": generate_state_vector(p, {"itinerary": daily_itinerary}),
            "fuzzy_logic_analysis": (
                f'Pace "{p["pace"]}" mapped to: Max {fuzzy_rules["max_activities_per_day"]} '
                f'activities/day, {fuzzy_rules["downtime_percentage"]}% downtime, '
                f'{fuzzy_rules["activity_duration"]}hr average duration, '
                f'{fuzzy_rules["travel_time_buffer"]}x travel buffer.'
            ),
        },
    }

    return final_itinerary


# ============================================================================
# GENETIC ALGORITHM MUTATION ENTRY POINT
# ============================================================================

async def mutate_itinerary(current_itinerary: Dict[str, Any]) -> Dict[str, Any]:
    client = _make_client()

    # Get fresh activity pool from AI
    first_day = (current_itinerary.get("itinerary") or [{}])[0]
    first_activity = (first_day.get("activities") or [{}])[0]
    destination = first_activity.get("name") or "Unknown"

    data_prompt = (
        f"Provide 30 alternative tourist activities for a destination similar to "
        f"where these activities are: {destination}. Return raw activities data only."
    )

    # Retry on 503/UNAVAILABLE (rate limit) with exponential backoff
    import asyncio
    response = None
    last_error = None
    for attempt in range(4):
        try:
            response = await client.aio.models.generate_content(
                model=MODEL_NAME,
                contents=data_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ITINERARY_SCHEMA,
                    temperature=0.9,
                ),
            )
            break
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "503" in err_str or "UNAVAILABLE" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = 2 ** attempt
                print(f"Gemini rate-limited (attempt {attempt + 1}/4), retrying in {wait}s...")
                await asyncio.sleep(wait)
                continue
            raise
    if response is None:
        raise last_error

    raw_data = _parse_ai_json(response.text or "")
    parsed = GeminiResponse.model_validate(raw_data)
    all_activities: List[RawActivity] = parsed.raw_activities

    # Apply genetic mutation
    mutated_itinerary = copy.deepcopy(current_itinerary)
    mutated_reasons: List[str] = []

    for day in mutated_itinerary["itinerary"]:
        current_activities = [
            RawActivity(
                name=a["name"],
                category=a["category"],
                cost=a["estimated_cost"],
                duration=2,
                lat=a["location"]["latitude"],
                lng=a["location"]["longitude"],
                opening_hour=9,
                closing_hour=18,
                popularity=0.7,
                description=a["description"],
                booking_recommendation=a.get("booking_recommendation") or "",
            )
            for a in day["activities"]
        ]

        mutated_activities = mutate_activities(current_activities, all_activities, 0.4)
        replaced_count = sum(
            1 for i, a in enumerate(mutated_activities)
            if a.name != current_activities[i].name
        )
        mutated_reasons.append(f"Day {day['day']}: Replaced {replaced_count} activities")

        day["activities"] = [
            {
                "time": day["activities"][idx]["time"],  # keep ORIGINAL time slot
                "name": a.name,
                "description": a.description,
                "estimated_cost": a.cost,
                "category": a.category,
                "location": {"latitude": a.lat, "longitude": a.lng},
                "transportation": day["activities"][idx]["transportation"],  # keep ORIGINAL transport
                "booking_recommendation": a.booking_recommendation,
            }
            for idx, a in enumerate(mutated_activities)
        ]

    # Update reasoning (preserve other fields)
    agent_reasoning = dict(mutated_itinerary.get("agentReasoning") or {})
    agent_reasoning["genetic_algorithm_status"] = f"Mutation Applied: {'; '.join(mutated_reasons)}"
    # NOTE: TS passes an empty preferences object here (a bug) — preserved;
    # planner.generate_state_vector handles it safely.
    agent_reasoning["state_vector_kb_signature"] = generate_state_vector({}, mutated_itinerary)
    mutated_itinerary["agentReasoning"] = agent_reasoning

    return mutated_itinerary
