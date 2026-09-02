"""
planner.py — Faithful Python port of the client-side AI algorithms from
services/geminiService.ts (applyFuzzyLogic, CSPSolver, StateSpaceSearch,
generateStateVector, mutateActivities).

Behavioral parity with the TypeScript original matters more than elegance.
Types are imported from the sibling `models` module (Agent A); a local
fallback RawActivity dataclass is defined only if that module is unavailable,
so this file works standalone.
"""

import json
import math
import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

try:
    from models import RawActivity
except ImportError:  # Agent A's models module not finished yet — standalone fallback
    @dataclass
    class RawActivity:  # type: ignore[no-redef]
        name: str
        category: str
        cost: float
        duration: float  # hours
        lat: float
        lng: float
        opening_hour: int
        closing_hour: int
        popularity: float  # 0-1 score
        description: str = ""
        booking_recommendation: str = ""


# ============================================================================
# FUZZY LOGIC SYSTEM
# ============================================================================

def apply_fuzzy_logic(pace: str) -> Dict[str, float]:
    """Exact port of applyFuzzyLogic(pace: string): FuzzyPaceRules."""
    pace_normalized = pace.lower()

    # Fuzzy membership functions
    relaxed_membership = (
        1.0 if 'relax' in pace_normalized
        else (0.3 if 'moderate' in pace_normalized else 0.0)
    )
    moderate_membership = (
        1.0 if 'moderate' in pace_normalized
        else (0.5 if ('relax' in pace_normalized or 'fast' in pace_normalized) else 0.0)
    )
    fast_membership = (
        1.0 if 'fast' in pace_normalized
        else (0.3 if 'moderate' in pace_normalized else 0.0)
    )

    # Fuzzy inference rules
    max_activities = round(
        relaxed_membership * 3 +
        moderate_membership * 4 +
        fast_membership * 6
    )

    downtime = (
        relaxed_membership * 30 +
        moderate_membership * 20 +
        fast_membership * 10
    )

    duration = (
        relaxed_membership * 2.5 +
        moderate_membership * 2.0 +
        fast_membership * 1.5
    )

    travel_buffer = (
        relaxed_membership * 1.5 +
        moderate_membership * 1.2 +
        fast_membership * 1.0
    )

    rules = {
        'max_activities_per_day': max_activities,
        'downtime_percentage': downtime,
        'activity_duration': duration,
        'travel_time_buffer': travel_buffer,
    }
    print('Fuzzy Logic Applied:', rules)
    return rules


# ============================================================================
# CONSTRAINT SATISFACTION PROBLEM (CSP) SOLVER
# ============================================================================

class CSPSolver:
    def __init__(self, constraints: Dict[str, Any], activities: List[RawActivity]):
        self.constraints = constraints
        self.activities = activities
        self.constraint_violations: List[str] = []

    def validate_budget_constraint(self, selected_activities: List[List[RawActivity]]) -> bool:
        total_activity_cost = sum(a.cost for day in selected_activities for a in day)

        if self.constraints.get('budget_type') == 'total':
            flight_cost = self.constraints.get('flight_cost') or 0
            hotel_cost = (self.constraints.get('hotel_cost_per_night') or 0) * self.constraints['trip_days']
            total_cost = flight_cost + hotel_cost + total_activity_cost

            if total_cost > self.constraints['budget']:
                self.constraint_violations.append(
                    f"Budget exceeded: ${total_cost} > ${self.constraints['budget']} "
                    f"(Flight: ${flight_cost}, Hotel: ${hotel_cost}, Activities: ${total_activity_cost})"
                )
                return False
        else:
            daily_costs = [sum(a.cost for a in day) for day in selected_activities]

            max_daily = max(daily_costs)
            if max_daily > self.constraints['budget']:
                self.constraint_violations.append(
                    f"Daily budget exceeded: ${max_daily} > ${self.constraints['budget']}"
                )
                return False

        return True

    def validate_time_constraints(self, day_activities: List[RawActivity]) -> bool:
        for i in range(len(day_activities)):
            activity = day_activities[i]
            start_time = activity.opening_hour + (i * activity.duration)
            end_time = start_time + activity.duration

            if end_time > activity.closing_hour:
                self.constraint_violations.append(
                    f"Time constraint violated: {activity.name} closes at {activity.closing_hour}:00"
                )
                return False

            # Check overlap with next activity
            if i < len(day_activities) - 1:
                next_activity = day_activities[i + 1]
                next_start = next_activity.opening_hour + ((i + 1) * next_activity.duration)

                if end_time > next_start:
                    self.constraint_violations.append(
                        f"Activities overlap: {activity.name} and {next_activity.name}"
                    )
                    return False

        return True

    def validate_must_visit_constraint(self, selected_activities: List[List[RawActivity]]) -> bool:
        all_selected = [a.name.lower() for day in selected_activities for a in day]

        for must_visit in self.constraints['must_visit_places']:
            found = any(
                must_visit.lower() in name or name in must_visit.lower()
                for name in all_selected
            )

            if not found:
                self.constraint_violations.append(
                    f"Must-visit place not included: {must_visit}"
                )
                return False

        return True

    def filter_activities_by_interests(self) -> List[RawActivity]:
        return [
            activity for activity in self.activities
            if any(
                interest.lower() in activity.category.lower()
                for interest in self.constraints['interests']
            )
        ]

    def get_constraint_violations(self) -> List[str]:
        return self.constraint_violations


# ============================================================================
# STATE SPACE SEARCH (A* Algorithm)
# ============================================================================

@dataclass
class SearchNode:
    activities: List[RawActivity]
    cost: float          # g(n): actual cost so far
    heuristic: float     # h(n): estimated cost to goal
    total_cost: float    # f(n) = g(n) + h(n)
    current_location: Tuple[float, float]
    time_elapsed: float


class StateSpaceSearch:
    def __init__(
        self,
        start_location: Tuple[float, float],
        activities: List[RawActivity],
        max_activities: int,
        budget: float,
    ):
        self.start_location = start_location
        self.available_activities = activities
        self.max_activities = max_activities
        self.budget = budget

    # Calculate Haversine distance between two coordinates
    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = 6371  # Earth's radius in km
        d_lat = (lat2 - lat1) * math.pi / 180
        d_lng = (lng2 - lng1) * math.pi / 180

        a = (
            math.sin(d_lat / 2) * math.sin(d_lat / 2) +
            math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
            math.sin(d_lng / 2) * math.sin(d_lng / 2)
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # Heuristic: estimated cost to complete the tour
    def _calculate_heuristic(
        self, current_loc: Tuple[float, float], remaining_activities: List[RawActivity]
    ) -> float:
        if len(remaining_activities) == 0:
            return 0

        # Estimate: average distance to remaining activities
        avg_distance = sum(
            self._calculate_distance(current_loc[0], current_loc[1], activity.lat, activity.lng)
            for activity in remaining_activities
        ) / len(remaining_activities)

        return avg_distance * 0.5  # Assuming 0.5 hour per km travel time

    # A* Search to find optimal activity sequence
    def find_optimal_route(self) -> List[RawActivity]:
        open_set: List[SearchNode] = [
            SearchNode(
                activities=[],
                cost=0,
                heuristic=self._calculate_heuristic(self.start_location, self.available_activities),
                total_cost=0,
                current_location=self.start_location,
                time_elapsed=0,
            )
        ]

        closed_set = set()
        best_node: Optional[SearchNode] = None
        max_utility = -math.inf

        iterations = 0
        max_iterations = 1000  # Prevent infinite loops

        while open_set and iterations < max_iterations:
            iterations += 1

            # Sort by totalCost (f = g + h), then take lowest (stable sort matches TS behavior)
            open_set.sort(key=lambda n: n.total_cost)
            current_node = open_set.pop(0)

            # Create state signature
            state_key = ','.join(a.name for a in current_node.activities)
            if state_key in closed_set:
                continue
            closed_set.add(state_key)

            # Goal test: reached max activities or exhausted budget/time
            if (
                len(current_node.activities) >= self.max_activities or
                current_node.cost >= self.budget * 0.8 or  # Use 80% of budget threshold
                current_node.time_elapsed >= 8  # Max 8 hours per day
            ):
                utility = self._calculate_utility(current_node)
                if utility > max_utility or best_node is None:
                    max_utility = utility
                    best_node = current_node
                continue

            # Expand: try adding each remaining activity (identity/name comparison, like TS includes())
            remaining = [
                a for a in self.available_activities
                if all(not (existing is a or existing.name == a.name) for existing in current_node.activities)
            ]

            for activity in remaining:
                travel_time = self._calculate_distance(
                    current_node.current_location[0],
                    current_node.current_location[1],
                    activity.lat,
                    activity.lng,
                ) * 0.5  # 0.5 hour per km

                new_cost = current_node.cost + activity.cost
                new_time = current_node.time_elapsed + activity.duration + travel_time

                # Prune: budget or time exceeded
                if new_cost > self.budget or new_time > 10:
                    continue

                new_activities = [*current_node.activities, activity]
                new_location = (activity.lat, activity.lng)
                heuristic = self._calculate_heuristic(
                    new_location,
                    [a for a in remaining if not (a is activity or a.name == activity.name)],
                )

                open_set.append(
                    SearchNode(
                        activities=new_activities,
                        cost=new_cost,
                        heuristic=heuristic,
                        total_cost=new_cost + heuristic,
                        current_location=new_location,
                        time_elapsed=new_time,
                    )
                )

        print(f"A* completed in {iterations} iterations, found {len(best_node.activities) if best_node else 0} activities")

        return best_node.activities if best_node else []

    # Utility function: Interest alignment + Popularity - Cost
    def _calculate_utility(self, node: SearchNode) -> float:
        total_popularity = sum(a.popularity for a in node.activities)
        avg_popularity = total_popularity / max(len(node.activities), 1)

        return (avg_popularity * 100) - (node.cost * 0.1)


# ============================================================================
# KNOWLEDGE BASE & STATE VECTOR
# ============================================================================

def _js_stringify(obj: Dict[str, Any]) -> str:
    """Approximate JS JSON.stringify: compact separators, insertion key order."""
    return json.dumps(obj, separators=(',', ':'), ensure_ascii=False)


def generate_state_vector(preferences: Dict[str, Any], itinerary: Dict[str, Any]) -> str:
    """Exact port of generateStateVector(preferences, itinerary): string."""
    vector = {
        'destination': preferences.get('destination', ''),
        'dates': f"{preferences.get('startDate', '')}_{preferences.get('endDate', '')}",
        'budget': preferences.get('budget', ''),
        'interests': '_'.join(sorted(preferences.get('interests') or [])),
        'pace': preferences.get('pace', ''),
        'tripType': preferences.get('tripType', ''),
        'activityCount': sum(
            len(day.get('activities', []) or [])
            for day in (itinerary.get('itinerary') or [])
        ),
    }

    # Simple hash function — JS 32-bit signed integer semantics
    s = _js_stringify(vector)
    h = 0
    for ch in s:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
        # Replicate `hash = hash & hash` (signed 32-bit conversion)
        if h >= 2 ** 31:
            h -= 2 ** 32

    return f"STATE_VECTOR_{abs(h):X}"


# ============================================================================
# GENETIC ALGORITHM MUTATION
# ============================================================================

def mutate_activities(
    activities: List[RawActivity],
    all_activities: List[RawActivity],
    mutation_rate: float = 0.4,
) -> List[RawActivity]:
    """Exact port of mutateActivities(activities, allActivities, mutationRate = 0.4)."""
    mutated = list(activities)
    num_to_mutate = math.floor(len(activities) * mutation_rate)

    for _ in range(num_to_mutate):
        random_index = random.randrange(len(mutated))
        current_activity = mutated[random_index]

        # Find similar activities (same category), not already in mutated (identity comparison)
        alternatives = [
            a for a in all_activities
            if a.category == current_activity.category and
            all(not (m is a or m.name == a.name) for m in mutated)
        ]

        if alternatives:
            replacement = random.choice(alternatives)
            mutated[random_index] = replacement

    return mutated


# ============================================================================
# SELF-TEST
# ============================================================================

if __name__ == '__main__':
    print('=' * 70)
    print('planner.py self-test')
    print('=' * 70)

    # --- 1. Fuzzy logic rules ---
    # NOTE on expected values: the TS membership functions CROSS-FIRE.
    # 'Relaxed' contains 'relax' -> relaxed=1.0 AND moderate=0.5, hence
    #   max = round(3*1.0 + 4*0.5) = 5, downtime = 30 + 10 = 40,
    #   duration = 2.5 + 1.0 = 3.5, buffer = 1.5 + 0.6 = 2.1.
    # These assertions encode the EXACT outputs of the original
    # applyFuzzyLogic('Relaxed'|'Moderate'|'Fast-paced') in geminiService.ts.
    relaxed = apply_fuzzy_logic('Relaxed')
    assert relaxed['max_activities_per_day'] == 5, relaxed
    assert relaxed['downtime_percentage'] == 40, relaxed
    assert relaxed['activity_duration'] == 3.5, relaxed
    assert relaxed['travel_time_buffer'] == 2.1, relaxed

    # 'Moderate': relaxed=0.3, moderate=1.0, fast=0.3 ->
    #   max = round(0.9 + 4 + 1.8) = 7, downtime = 9 + 20 + 3 = 32,
    #   duration = 0.75 + 2 + 0.45 = 3.2, buffer = 0.45 + 1.2 + 0.3 = 1.95
    moderate = apply_fuzzy_logic('Moderate')
    assert moderate['max_activities_per_day'] == 7, moderate
    assert moderate['downtime_percentage'] == 32, moderate
    assert moderate['activity_duration'] == 3.2, moderate
    assert moderate['travel_time_buffer'] == 1.95, moderate

    # 'Fast-paced': relaxed=0, moderate=0.5, fast=1.0 ->
    #   max = round(2 + 6) = 8, downtime = 10 + 10 = 20,
    #   duration = 1.0 + 1.5 = 2.5, buffer = 0.6 + 1.0 = 1.6
    fast = apply_fuzzy_logic('Fast-paced')
    assert fast['max_activities_per_day'] == 8, fast
    assert fast['downtime_percentage'] == 20, fast
    assert fast['activity_duration'] == 2.5, fast
    assert fast['travel_time_buffer'] == 1.6, fast
    print('[OK] apply_fuzzy_logic: Relaxed/Moderate/Fast-paced match TS outputs exactly')

    # --- 2. State vector determinism & empty-prefs safety ---
    prefs = {
        'destination': 'Paris',
        'startDate': '2026-08-25',
        'endDate': '2026-08-28',
        'budget': 1500,
        'interests': ['Museums', 'Food'],
        'pace': 'Moderate',
        'tripType': 'fullTrip',
    }
    sv1 = generate_state_vector(prefs, {'itinerary': [{'activities': [1, 2]}, {'activities': [3]}]})
    sv2 = generate_state_vector(dict(prefs), {'itinerary': [{'activities': [1, 2]}, {'activities': [3]}]})
    assert sv1 == sv2, (sv1, sv2)
    assert sv1.startswith('STATE_VECTOR_'), sv1
    print(f'[OK] generate_state_vector deterministic: {sv1}')

    empty_sv = generate_state_vector({}, {})
    assert empty_sv.startswith('STATE_VECTOR_'), empty_sv
    print(f'[OK] generate_state_vector handles {{}} prefs without crashing: {empty_sv}')

    # --- 3. A* search over fake activities ---
    fake_activities = [
        RawActivity(name='Louvre Museum', category='Museums', cost=20, duration=3,
                    lat=48.8606, lng=2.3376, opening_hour=9, closing_hour=18,
                    popularity=0.95, description='World-famous art museum'),
        RawActivity(name='Eiffel Tower', category='Landmarks', cost=25, duration=2,
                    lat=48.8584, lng=2.2945, opening_hour=9, closing_hour=23,
                    popularity=0.98, description='Iconic iron tower'),
        RawActivity(name='Seine Cruise', category='Outdoors', cost=15, duration=1.5,
                    lat=48.8600, lng=2.3016, opening_hour=10, closing_hour=22,
                    popularity=0.8, description='River cruise'),
    ]
    search = StateSpaceSearch(start_location=(48.8566, 2.3522),
                              activities=fake_activities, max_activities=3, budget=100)
    route = search.find_optimal_route()
    assert len(route) <= 3, route
    assert all(isinstance(a, RawActivity) for a in route)
    names = [a.name for a in route]
    assert len(names) == len(set(names)), 'route should contain no duplicates'
    print(f'[OK] StateSpaceSearch.find_optimal_route returned {len(route)} activities: {names}')

    # --- Extra sanity: CSP solver ---
    solver = CSPSolver(
        constraints={'budget': 50, 'budget_type': 'daily', 'max_activities_per_day': 3,
                     'must_visit_places': ['Eiffel'], 'interests': ['Museums', 'land'],
                     'trip_days': 3},
        activities=fake_activities,
    )
    filtered = solver.filter_activities_by_interests()
    assert {a.name for a in filtered} == {'Louvre Museum', 'Eiffel Tower'}, filtered
    assert solver.validate_must_visit_constraint([[fake_activities[1]]]) is True
    assert solver.validate_time_constraints([fake_activities[0]]) is True
    assert solver.validate_budget_constraint([[fake_activities[0], fake_activities[1]]]) is True
    # One day costing $20+$25+$15=$60 exceeds the $50 daily budget
    assert solver.validate_budget_constraint([[fake_activities[0], fake_activities[1], fake_activities[2]]]) is False
    assert 'Daily budget exceeded' in solver.get_constraint_violations()[0]
    print('[OK] CSPSolver: filtering, budget/time/must-visit validation')

    # --- Extra sanity: mutation ---
    random.seed(42)
    pool = fake_activities + [
        RawActivity(name='Orsay Museum', category='Museums', cost=16, duration=2.5,
                    lat=48.86, lng=2.3266, opening_hour=9, closing_hour=18, popularity=0.9),
        RawActivity(name='Arc de Triomphe', category='Landmarks', cost=13, duration=1,
                    lat=48.8738, lng=2.2950, opening_hour=10, closing_hour=23, popularity=0.85),
    ]
    mutated = mutate_activities(fake_activities, pool, 0.4)
    assert len(mutated) == len(fake_activities)
    print('[OK] mutate_activities preserves length:', [a.name for a in mutated])

    print('=' * 70)
    print('ALL TESTS PASSED')
    print('=' * 70)
