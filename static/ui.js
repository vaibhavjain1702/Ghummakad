/**
 * ui.js — Vanilla JS port of the rendering half of the React TravelPlanner app.
 *
 * Ported from:
 *   components/ItineraryDisplay.tsx
 *   components/LoadingSpinner.tsx
 *   components/icons.tsx
 *   App.tsx (empty state / error markup)
 *
 * Exposes window.UI with:
 *   showSpinner()
 *   showError(message, {keepItinerary})
 *   showEmptyState()
 *   clear()
 *   renderItinerary(itinerary, {onRemix})
 *   setRemixing(isRemixing)
 */
(function () {
  'use strict';

  var PANEL_ID = 'results-panel';

  // Module-level state so setRemixing can re-render in place.
  var lastItinerary = null;
  var lastOnRemix = null;
  var isRemixing = false;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
  }

  function formatDate(dateString) {
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
  }

  function money(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  /* ------------------------------------------------------------------ */
  /* Icons — SVG path data copied verbatim from icons.tsx                */
  /* ------------------------------------------------------------------ */

  function iconWrapper(innerSvg, extraClasses) {
    return (
      '<div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border-2 border-slate-600 ' +
      esc(extraClasses || '') +
      '">' +
      innerSvg +
      '</div>'
    );
  }

  function largeIconWrapper(innerSvg) {
    return (
      '<div class="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4">' +
      innerSvg +
      '</div>'
    );
  }

  function svgOpen(classes, strokeWidth) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="' + classes + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="' +
      (strokeWidth === undefined ? 2 : strokeWidth) +
      '">'
    );
  }

  function BotIcon() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 8V4H8" />' +
      '<rect x="4" y="12" width="16" height="8" rx="2" />' +
      '<path d="M2 12h2" />' +
      '<path d="M20 12h2" />' +
      '<path d="M12 18v2" />' +
      '<path d="M12 2v2" />' +
      '</svg>'
    );
  }

  function CalendarIcon() {
    return largeIconWrapper(
      svgOpen('h-8 w-8 text-slate-400') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />' +
        '</svg>'
    );
  }

  function MapPinIcon() {
    return (
      svgOpen('h-5 w-5 mr-2') +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />' +
      '</svg>'
    );
  }

  function WeatherIcon(forecast) {
    var f = String(forecast || '').toLowerCase();
    var icon;
    if (f.indexOf('sun') !== -1 || f.indexOf('sunny') !== -1 || f.indexOf('clear') !== -1) {
      // Sunny
      icon =
        svgOpen('h-5 w-5 text-yellow-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />' +
        '</svg>';
    } else if (f.indexOf('rain') !== -1 || f.indexOf('rainy') !== -1 || f.indexOf('shower') !== -1 || f.indexOf('drizzle') !== -1) {
      // Rainy
      icon =
        svgOpen('h-5 w-5 text-blue-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm0 0l-1 .5m1-.5l1 .5m9-3l1 .5m-1-.5l-1 .5" />' +
        '</svg>';
    } else {
      // Default: cloudy
      icon =
        svgOpen('h-5 w-5 text-slate-400') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />' +
        '</svg>';
    }
    return '<div class="mr-2 flex-shrink-0">' + icon + '</div>';
  }

  function TransportIcon(mode) {
    var m = String(mode || '').toLowerCase();
    var iconPath = '';

    if (m.indexOf('walk') !== -1) {
      iconPath =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M9.5 3.75a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75h-.01a.75.75 0 01-.75-.75V3.75zm0 0v1.5M10.125 6.375v11.25m-3.375-6.375v6.375m-3.375-3.375v3.375m-3.375 0v-1.125a1.125 1.125 0 011.125-1.125h1.5a1.125 1.125 0 011.125 1.125v1.125m-3.375 0h3.375m0 0v-1.125a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v1.125m6.75-3.375v1.125a1.125 1.125 0 01-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.125m3.375 0h-3.375" />';
    } else if (m.indexOf('metro') !== -1 || m.indexOf('train') !== -1 || m.indexOf('subway') !== -1) {
      iconPath =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h12.75m0 0v-4.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v4.25" />';
    } else if (m.indexOf('bus') !== -1) {
      iconPath =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M15 6.375a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25a.75.75 0 01.75-.75zM9 6.375a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25A.75.75 0 019 6.375z" />' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 7.5h16.5c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 18.375V8.625c0-.621.504-1.125 1.125-1.125zM12 18.75a.375.375 0 100-.75.375.375 0 000 .75z" />';
    } else {
      // car / taxi (default)
      iconPath =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V9.75c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v7.875c0 .621-.504 1.125-1.125 1.125H12.875" />' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3.375 9.75h17.25M13.5 9.75l-4.5-4.5-4.5 4.5" />';
    }

    return (
      '<div class="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center mr-3 flex-shrink-0 border-2 border-slate-500">' +
      svgOpen('h-5 w-5 text-cyan-300', 1.5) +
      iconPath +
      '</svg>' +
      '</div>'
    );
  }

  function FlightIcon() {
    return iconWrapper(
      svgOpen('h-5 w-5 text-sky-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />' +
        '</svg>',
      'bg-sky-900/50 border-sky-700'
    );
  }

  function HotelIcon() {
    return iconWrapper(
      svgOpen('h-5 w-5 text-rose-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />' +
        '</svg>',
      'bg-rose-900/50 border-rose-700'
    );
  }

  function StarIcon(rating) {
    return (
      '<span class="inline-flex items-center">' +
      '<span class="mr-1">' + Number(rating || 0).toFixed(1) + '</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-300" viewBox="0 0 20 20" fill="currentColor">' +
      '<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />' +
      '</svg>' +
      '</span>'
    );
  }

  function FlaskIcon() {
    // Flask SVG used by the Remix button (from ItineraryDisplay.tsx).
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />' +
      '</svg>'
    );
  }

  function CategoryIcon(category) {
    var cat = String(category || '').toLowerCase();
    var inner;

    if (cat.indexOf('museum') !== -1) {
      // Museum — indigo landmark
      inner =
        svgOpen('h-5 w-5 text-indigo-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 18v-9a2 2 0 012-2h10a2 2 0 012 2v9M4 21h16M12 3l4 4H8l4-4z" />' +
        '</svg>';
    } else if (cat.indexOf('food') !== -1 || cat.indexOf('restaurant') !== -1 || cat.indexOf('cafe') !== -1) {
      // Food — emerald utensils
      inner =
        svgOpen('h-5 w-5 text-emerald-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M21 15.5a2.5 2.5 0 01-2.5 2.5h-10a2.5 2.5 0 01-2.5-2.5V8.5a2.5 2.5 0 012.5-2.5h10a2.5 2.5 0 012.5 2.5v7zM6 8.5V6a2 2 0 012-2h8a2 2 0 012 2v2.5" />' +
        '</svg>';
    } else if (cat.indexOf('outdoor') !== -1 || cat.indexOf('park') !== -1 || cat.indexOf('nature') !== -1) {
      // Outdoor — green tree/mountain
      inner =
        svgOpen('h-5 w-5 text-green-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.8 11.25l4.2-4.2m0 0l4.2 4.2M12 7.05V18" />' +
        '</svg>';
    } else if (cat.indexOf('history') !== -1 || cat.indexOf('historic') !== -1) {
      // History — amber clock
      inner =
        svgOpen('h-5 w-5 text-amber-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />' +
        '</svg>';
    } else if (cat.indexOf('art') !== -1 || cat.indexOf('gallery') !== -1) {
      // Art — rose pencil
      inner =
        svgOpen('h-5 w-5 text-rose-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />' +
        '</svg>';
    } else if (cat.indexOf('shop') !== -1) {
      // Shopping — sky shopping bag
      inner =
        svgOpen('h-5 w-5 text-sky-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />' +
        '</svg>';
    } else if (cat.indexOf('night') !== -1 || cat.indexOf('bar') !== -1) {
      // Nightlife — fuchsia sparkles/sun-rays
      inner =
        svgOpen('h-5 w-5 text-fuchsia-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />' +
        '</svg>';
    } else if (cat.indexOf('tech') !== -1) {
      // Technology — cyan chip
      inner =
        svgOpen('h-5 w-5 text-cyan-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />' +
        '</svg>';
    } else {
      // Default — slate map-pin
      inner =
        svgOpen('h-5 w-5 text-slate-300') +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />' +
        '</svg>';
    }

    return iconWrapper(inner);
  }

  /* ------------------------------------------------------------------ */
  /* Section renderers                                                   */
  /* ------------------------------------------------------------------ */

  function renderAgentReasoning(itinerary) {
    var ar = itinerary.agentReasoning || {};
    var constraints = Array.isArray(ar.constraints_analysis) ? ar.constraints_analysis : [];
    var constraintItems = constraints.map(function (c) {
      return '<li>' + esc(c) + '</li>';
    }).join('');

    var html =
      '<div class="bg-slate-900/50 border border-indigo-500/30 rounded-xl p-6">' +
      '<h3 class="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />' +
      '</svg>' +
      'AI Agent Internal Reasoning' +
      '</h3>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">';

    // Constraint Satisfaction (CSP)
    html +=
      '<div>' +
      '<strong class="text-slate-300 block mb-1">Constraint Satisfaction (CSP):</strong>' +
      '<ul class="list-disc list-inside space-y-0.5">' + constraintItems + '</ul>' +
      '</div>';

    // State Space Strategy
    html +=
      '<div>' +
      '<strong class="text-slate-300 block mb-1">State Space Strategy:</strong>' +
      '<p>' + esc(ar.state_space_search_strategy) + '</p>' +
      '</div>';

    // Utility Function (Philosophy)
    html +=
      '<div>' +
      '<strong class="text-slate-300 block mb-1">Utility Function (Philosophy):</strong>' +
      '<p>' + esc(ar.utility_maximization_logic) + '</p>' +
      '</div>';

    // Fuzzy Logic Interpretation
    html +=
      '<div>' +
      '<strong class="text-slate-300 block mb-1">Fuzzy Logic Interpretation:</strong>' +
      '<p class="text-amber-200/80">' +
      esc(ar.fuzzy_logic_analysis || 'Applied standard fuzzy rules for pace and interest matching.') +
      '</p>' +
      '</div>';

    // KB Construction (State Vector)
    html +=
      '<div class="md:col-span-2 bg-emerald-900/20 p-2 rounded border border-emerald-500/20">' +
      '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">' +
      '<strong class="text-emerald-300">KB Construction (State Vector):</strong>' +
      '<span class="text-xs text-emerald-400/60">' + esc(ar.knowledge_base_source) + '</span>' +
      '</div>' +
      '<p>Serialized State Vector for RAG: <span class="font-mono text-emerald-200 break-all">' +
      esc(ar.state_vector_kb_signature) +
      '</span></p>' +
      '</div>';

    // Conditional Genetic Algorithm Status
    if (ar.genetic_algorithm_status) {
      html +=
        '<div class="md:col-span-2 bg-indigo-900/20 p-2 rounded border border-indigo-500/20">' +
        '<strong class="text-indigo-300 block mb-1">Genetic Algorithm Status:</strong>' +
        '<p>' + esc(ar.genetic_algorithm_status) + '</p>' +
        '</div>';
    }

    html += '</div></div>';
    return html;
  }

  function renderRemixRow() {
    var buttonInner;
    if (isRemixing) {
      buttonInner = '<span class="animate-pulse">Mutating Genotypes...</span>';
    } else {
      buttonInner = FlaskIcon() + 'Remix Itinerary (Genetic Mutation)';
    }
    return (
      '<div class="flex justify-end">' +
      '<button type="button" data-ui-role="remix-button"' +
      (isRemixing ? ' disabled' : '') +
      ' class="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-fuchsia-900/50">' +
      buttonInner +
      '</button>' +
      '</div>'
    );
  }

  function bindRemixButton(panel) {
    var btn = panel.querySelector('[data-ui-role="remix-button"]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (typeof lastOnRemix === 'function') {
        lastOnRemix();
      }
    });
  }

  function renderFlightCard(fr) {
    return (
      '<div class="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700 flex items-start gap-4">' +
      FlightIcon() +
      '<div class="flex-1">' +
      '<h3 class="text-xl font-bold text-sky-300">Flight Recommendation</h3>' +
      '<p class="text-slate-400 mt-1 text-sm">' + esc(fr.details) + '</p>' +
      '<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">' +
      '<span><strong>Airline:</strong> ' + esc(fr.airline) + '</span>' +
      '<span><strong>Duration:</strong> ' + esc(fr.duration) + '</span>' +
      '<span><strong>Price:</strong> ' + money(fr.price) + '</span>' +
      '</div>' +
      '<a href="' + esc(fr.booking_url) + '" target="_blank" rel="noopener noreferrer" class="inline-block mt-4 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">Check Flights</a>' +
      '</div>' +
      '</div>'
    );
  }

  function renderHotelCard(hr) {
    return (
      '<div class="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700 flex items-start gap-4">' +
      HotelIcon() +
      '<div class="flex-1">' +
      '<h3 class="text-xl font-bold text-rose-300">Hotel Recommendation</h3>' +
      '<p class="text-slate-400 mt-1 text-sm">' + esc(hr.details) + '</p>' +
      '<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">' +
      '<span><strong>Hotel:</strong> ' + esc(hr.name) + '</span>' +
      '<span><strong>Rating:</strong> ' + StarIcon(hr.rating) + '</span>' +
      '<span><strong>Price:</strong> ' + money(hr.price_per_night) + '/night</span>' +
      '</div>' +
      '<a href="' + esc(hr.booking_url) + '" target="_blank" rel="noopener noreferrer" class="inline-block mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">Book Hotel</a>' +
      '</div>' +
      '</div>'
    );
  }

  function renderDayCard(dayPlan) {
    var activitiesHtml = '';
    var activities = Array.isArray(dayPlan.activities) ? dayPlan.activities : [];

    activities.forEach(function (activity) {
      var transport = activity.transportation || {};

      // Transportation Leg divider
      activitiesHtml +=
        '<div class="flex items-center">' +
        TransportIcon(transport.mode) +
        '<div class="flex-1 border-t-2 border-dashed border-slate-600"></div>' +
        '<div class="mx-4 text-center">' +
        '<p class="text-sm font-semibold text-cyan-300">' + esc(transport.mode) + ' &middot; ' + esc(transport.travel_time) + '</p>' +
        '<p class="text-xs text-slate-400">' + esc(transport.details) + '</p>' +
        '</div>' +
        '<div class="flex-1 border-t-2 border-dashed border-slate-600"></div>' +
        '</div>';

      // Activity Card
      var tipHtml = '';
      if (activity.booking_recommendation) {
        tipHtml =
          '<p class="mt-3 text-xs text-amber-300 bg-amber-900/20 p-2 rounded-lg border border-amber-800/50">' +
          '<strong class="font-semibold">Tip:</strong> ' + esc(activity.booking_recommendation) +
          '</p>';
      }

      activitiesHtml +=
        '<div class="flex items-start">' +
        '<div class="mr-4">' + CategoryIcon(activity.category) + '</div>' +
        '<div class="flex-1 bg-slate-700/50 rounded-lg p-4">' +
        '<div class="flex justify-between items-start">' +
        '<div>' +
        '<h3 class="font-semibold text-lg text-slate-100">' + esc(activity.name) + '</h3>' +
        '<p class="text-sm text-cyan-300">' + esc(activity.time) + '</p>' +
        '</div>' +
        '<span class="text-sm font-medium bg-slate-600 text-slate-200 px-2 py-1 rounded-md">' + money(activity.estimated_cost) + '</span>' +
        '</div>' +
        '<p class="mt-2 text-slate-300">' + esc(activity.description) + '</p>' +
        tipHtml +
        '</div>' +
        '</div>';
    });

    return (
      '<div class="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">' +
      '<div class="border-b border-slate-600 pb-4 mb-6">' +
      '<div class="flex justify-between items-start flex-wrap gap-4">' +
      '<div>' +
      '<h2 class="text-2xl font-bold text-indigo-300">Day ' + esc(dayPlan.day) + ': ' + esc(dayPlan.theme) + '</h2>' +
      '<p class="text-slate-400">' + esc(formatDate(dayPlan.date)) + '</p>' +
      '</div>' +
      '<div class="flex flex-col sm:flex-row sm:items-center gap-4">' +
      '<div class="flex items-center bg-slate-700/50 px-3 py-1.5 rounded-lg text-sm">' +
      WeatherIcon(dayPlan.weather_forecast) +
      '<span class="text-slate-300">' + esc(dayPlan.weather_forecast) + '</span>' +
      '</div>' +
      '<a href="' + esc(dayPlan.map_url) + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold text-slate-200 transition-colors">' +
      MapPinIcon() +
      'View Route on Map' +
      '</a>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="space-y-4">' + activitiesHtml + '</div>' +
      '<div class="mt-6 pt-4 border-t border-slate-600">' +
      '<p class="text-slate-400 italic">' + esc(dayPlan.daily_summary) + '</p>' +
      '</div>' +
      '</div>'
    );
  }

  function renderItineraryHtml(itinerary) {
    var html = '<div class="space-y-8 animate-fade-in">';

    html += renderAgentReasoning(itinerary);
    html += renderRemixRow();

    if (itinerary.flightRecommendation || itinerary.hotelRecommendation) {
      html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
      if (itinerary.flightRecommendation) {
        html += renderFlightCard(itinerary.flightRecommendation);
      }
      if (itinerary.hotelRecommendation) {
        html += renderHotelCard(itinerary.hotelRecommendation);
      }
      html += '</div>';
    }

    var days = Array.isArray(itinerary.itinerary) ? itinerary.itinerary : [];
    days.forEach(function (dayPlan) {
      html += renderDayCard(dayPlan);
    });

    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  window.UI = {
    /** Port of LoadingSpinner.tsx */
    showSpinner: function () {
      var panel = getPanel();
      if (!panel) return;
      panel.innerHTML =
        '<div class="flex flex-col items-center justify-center p-8 text-center h-full">' +
        '<div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>' +
        '<h2 class="text-xl font-semibold mt-6 text-slate-300">Generating Your Itinerary...</h2>' +
        '<p class="mt-2 text-slate-400 max-w-sm">Our AI agent is reasoning about constraints, searching for the optimal path, and crafting the perfect trip for you. This might take a moment.</p>' +
        '</div>';
    },

    /**
     * Red error banner. With {keepItinerary:true}, prepends the banner above
     * the already-rendered itinerary instead of wiping it.
     */
    showError: function (message, options) {
      options = options || {};
      var panel = getPanel();
      if (!panel) return;
      var banner =
        '<div class="text-center p-8 text-red-400 bg-red-900/20 rounded-lg">' +
        esc(message) +
        '</div>';

      if (options.keepItinerary && lastItinerary) {
        // Prepend banner above existing itinerary content.
        panel.insertAdjacentHTML('afterbegin', banner);
      } else {
        lastItinerary = null;
        lastOnRemix = null;
        panel.innerHTML = banner;
      }
    },

    /** Empty state markup from App.tsx */
    showEmptyState: function () {
      var panel = getPanel();
      if (!panel) return;
      lastItinerary = null;
      lastOnRemix = null;
      panel.innerHTML =
        '<div class="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">' +
        CalendarIcon() +
        '<h2 class="text-2xl font-semibold mt-4 text-slate-200">Your Journey Awaits</h2>' +
        '<p class="mt-2 max-w-md">Fill in your travel details on the left and let our AI craft a personalized itinerary just for you.</p>' +
        '</div>';
    },

    /** Clears the results panel and internal state. */
    clear: function () {
      lastItinerary = null;
      lastOnRemix = null;
      isRemixing = false;
      var panel = getPanel();
      if (panel) {
        panel.innerHTML = '';
      }
    },

    /** Renders the full itinerary display (port of ItineraryDisplay.tsx). */
    renderItinerary: function (itinerary, options) {
      options = options || {};
      var panel = getPanel();
      if (!panel) return;

      lastItinerary = itinerary;
      lastOnRemix = typeof options.onRemix === 'function' ? options.onRemix : null;

      panel.innerHTML = renderItineraryHtml(itinerary);
      bindRemixButton(panel);
    },

    /** Re-renders the stored itinerary with an updated remix state. */
    setRemixing: function (value) {
      isRemixing = !!value;
      var panel = getPanel();
      if (!panel || !lastItinerary) return;

      // Update remix button in place when possible.
      var btn = panel.querySelector('[data-ui-role="remix-button"]');
      if (btn) {
        btn.disabled = isRemixing;
        btn.innerHTML = isRemixing
          ? '<span class="animate-pulse">Mutating Genotypes...</span>'
          : FlaskIcon() + 'Remix Itinerary (Genetic Mutation)';
      }
    }
  };

  // Mount the header bot icon into #header-icon (port of App.tsx header).
  var headerIconHost = document.getElementById('header-icon');
  if (headerIconHost) {
    headerIconHost.innerHTML = BotIcon();
  }
})();
