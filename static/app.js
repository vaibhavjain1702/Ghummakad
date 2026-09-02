/**
 * Intelligent Travel Planner — frontend shell & logic.
 * Vanilla JS (ES2020). Rendering is delegated to window.UI (ui.js).
 */
(function () {
  'use strict';

  var INTEREST_OPTIONS = ['Museums', 'Food', 'Outdoors', 'History', 'Art', 'Shopping', 'Nightlife', 'Technology'];

  var ACTIVE_CLASS = 'bg-indigo-500 text-white';
  var INACTIVE_CLASS = 'bg-slate-700 hover:bg-slate-600 text-slate-300';

  function toISODate(date) {
    return date.toISOString().split('T')[0];
  }

  var today = new Date();
  var tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ---- State -------------------------------------------------------------
  var preferences = {
    destination: 'Paris, France',
    origin: 'New York, USA',
    startLocation: 'Near the Louvre Museum',
    budget: '150',
    startDate: toISODate(today),
    endDate: toISODate(tomorrow),
    interests: ['Museums', 'Food', 'History'],
    mustVisit: '',
    pace: 'Moderate',
    tripType: 'activitiesOnly',
    inspirationImage: undefined,
  };

  var itinerary = null;
  var isLoading = false;
  var isRemixing = false;
  var error = null;

  // ---- DOM refs ----------------------------------------------------------
  var form = document.getElementById('preferences-form');
  var submitBtn = document.getElementById('submit-btn');
  var tripTypeToggle = document.getElementById('trip-type-toggle');
  var paceToggle = document.getElementById('pace-toggle');
  var interestsGrid = document.getElementById('interests-grid');
  var originField = document.getElementById('origin-field');
  var budgetLabel = document.getElementById('budget-label');
  var startDateInput = document.getElementById('startDate');
  var endDateInput = document.getElementById('endDate');
  var imageInput = document.getElementById('inspirationImage');
  var imageStatus = document.getElementById('image-status');

  function setButtonActive(btn, active) {
    btn.classList.remove('bg-indigo-500', 'text-white', 'bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
    if (active) {
      btn.classList.add('bg-indigo-500', 'text-white');
    } else {
      btn.classList.add('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
    }
  }

  // ---- Trip type ---------------------------------------------------------
  function syncTripTypeUI() {
    Array.prototype.forEach.call(tripTypeToggle.querySelectorAll('button[data-trip-type]'), function (btn) {
      setButtonActive(btn, btn.getAttribute('data-trip-type') === preferences.tripType);
    });
    if (preferences.tripType === 'fullTrip') {
      originField.classList.remove('hidden');
    } else {
      originField.classList.add('hidden');
    }
    budgetLabel.textContent =
      preferences.tripType === 'fullTrip' ? 'Total Trip Budget (USD)' : 'Daily Budget (USD per person)';
  }

  tripTypeToggle.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-trip-type]');
    if (!btn) return;
    preferences.tripType = btn.getAttribute('data-trip-type');
    syncTripTypeUI();
  });

  // ---- Pace --------------------------------------------------------------
  function syncPaceUI() {
    Array.prototype.forEach.call(paceToggle.querySelectorAll('button[data-pace]'), function (btn) {
      setButtonActive(btn, btn.getAttribute('data-pace') === preferences.pace);
    });
  }

  paceToggle.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-pace]');
    if (!btn) return;
    preferences.pace = btn.getAttribute('data-pace');
    syncPaceUI();
  });

  // ---- Interests ---------------------------------------------------------
  function buildInterestsGrid() {
    interestsGrid.innerHTML = '';
    INTEREST_OPTIONS.forEach(function (interest) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = interest;
      btn.setAttribute('data-interest', interest);
      btn.className = 'px-3 py-2 text-sm rounded-md transition-colors duration-200';
      btn.addEventListener('click', function () {
        var idx = preferences.interests.indexOf(interest);
        if (idx !== -1) {
          preferences.interests.splice(idx, 1);
        } else {
          preferences.interests.push(interest);
        }
        syncInterestsUI();
      });
      interestsGrid.appendChild(btn);
    });
  }

  function syncInterestsUI() {
    Array.prototype.forEach.call(interestsGrid.querySelectorAll('button[data-interest]'), function (btn) {
      setButtonActive(btn, preferences.interests.indexOf(btn.getAttribute('data-interest')) !== -1);
    });
  }

  // ---- Text / date / number inputs ---------------------------------------
  form.querySelectorAll('input[name]').forEach(function (input) {
    var handler = function () {
      preferences[input.name] = input.value;
      if (input.name === 'startDate') {
        endDateInput.min = input.value;
      }
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
  });

  // ---- Inspiration image upload -------------------------------------------
  imageInput.addEventListener('change', function () {
    var file = imageInput.files && imageInput.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onloadend = function () {
        var base64String = String(reader.result);
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        preferences.inspirationImage = base64String.split(',')[1];
        imageStatus.textContent = 'Image loaded and ready for analysis.';
        imageStatus.classList.remove('hidden', 'text-red-400');
        imageStatus.classList.add('text-green-400');
      };
      reader.readAsDataURL(file);
    } else {
      // Upload cancelled / cleared
      preferences.inspirationImage = undefined;
      imageStatus.textContent = '';
      imageStatus.classList.add('hidden');
    }
  });

  // ---- Submit button state -------------------------------------------------
  function setLoading(loading) {
    isLoading = loading;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Crafting Your Trip...' : 'Generate Itinerary';
  }

  // ---- Generate itinerary ---------------------------------------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setLoading(true);
    error = null;
    itinerary = null;

    window.UI.clear();
    window.UI.showSpinner();

    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (result) {
        itinerary = result;
        window.UI.renderItinerary(itinerary, { onRemix: handleRemix });
      })
      .catch(function (err) {
        console.error(err);
        error = 'Failed to generate itinerary. The AI model may be busy or an error occurred. Please try again.';
        window.UI.showError(error, { keepItinerary: false });
        window.UI.showEmptyState();
      })
      .finally(function () {
        setLoading(false);
      });
  });

  // ---- Remix -----------------------------------------------------------------
  function handleRemix() {
    if (!itinerary) return;
    isRemixing = true;
    window.UI.setRemixing(true);

    fetch('/api/remix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itinerary),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (newItinerary) {
        itinerary = newItinerary;
        window.UI.renderItinerary(itinerary, { onRemix: handleRemix });
      })
      .catch(function (err) {
        console.error(err);
        error = 'Failed to remix itinerary. Please try again.';
        window.UI.showError(error, { keepItinerary: true }); // old itinerary stays visible
      })
      .finally(function () {
        isRemixing = false;
        window.UI.setRemixing(false);
      });
  }

  // ---- Init --------------------------------------------------------------------
  buildInterestsGrid();

  form.querySelectorAll('input[name]').forEach(function (input) {
    if (Object.prototype.hasOwnProperty.call(preferences, input.name)) {
      input.value = preferences[input.name] != null ? String(preferences[input.name]) : '';
    }
  });

  endDateInput.min = preferences.startDate;
  syncTripTypeUI();
  syncPaceUI();
  syncInterestsUI();

  window.UI.showEmptyState();
})();
