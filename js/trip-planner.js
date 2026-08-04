// trip-planner.js
// - Local Storage functions for the trip itinerary (exported so
//   park-details.js can add a park to the trip from its own page).
// - Page rendering for trip-planner.html, which also displays the
//   favorites list (favorites.js owns that data; this file just renders
//   it alongside the trip so users have one "my saved parks" page).

import { getAllFavorites, refreshFavoriteButtonStates } from "./favorites.js";

const TRIP_KEY = "npap:trip";

function getTrip() {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrip(trip) {
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify(trip));
  } catch (error) {
    console.error("Could not save trip:", error);
  }
}

export function isInTrip(parkCode) {
  return getTrip().some((item) => item.parkCode === parkCode);
}

export function addParkToTrip(park) {
  const trip = getTrip();
  if (trip.some((item) => item.parkCode === park.parkCode)) return trip;

  trip.push({
    parkCode: park.parkCode,
    fullName: park.fullName || "",
    image: park.image || "",
    states: park.states || "",
    arrival: "",
    departure: "",
    notes: "",
  });

  saveTrip(trip);
  return trip;
}

function removeFromTrip(parkCode) {
  const trip = getTrip().filter((item) => item.parkCode !== parkCode);
  saveTrip(trip);
  return trip;
}

function updateTripItem(parkCode, updates) {
  const trip = getTrip().map((item) => (item.parkCode === parkCode ? { ...item, ...updates } : item));
  saveTrip(trip);
  return trip;
}

function moveTripItem(parkCode, direction) {
  const trip = getTrip();
  const index = trip.findIndex((item) => item.parkCode === parkCode);
  if (index === -1) return trip;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= trip.length) return trip;

  [trip[index], trip[targetIndex]] = [trip[targetIndex], trip[index]];
  saveTrip(trip);
  return trip;
}

function clearTrip() {
  saveTrip([]);
}

// Approximate trip length: the span from the earliest arrival date to the
// latest departure date among items that have both dates set.
function getTripDayCount(trip) {
  const datedItems = trip.filter((item) => item.arrival && item.departure);
  if (datedItems.length === 0) return 0;

  const earliestArrival = datedItems.reduce(
    (earliest, item) => (item.arrival < earliest ? item.arrival : earliest),
    datedItems[0].arrival
  );
  const latestDeparture = datedItems.reduce(
    (latest, item) => (item.departure > latest ? item.departure : latest),
    datedItems[0].departure
  );

  const oneDayMs = 1000 * 60 * 60 * 24;
  const days = Math.round((new Date(latestDeparture) - new Date(earliestArrival)) / oneDayMs) + 1;
  return days > 0 ? days : 0;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Page rendering (trip-planner.html only) ----------

const tripListEl = document.getElementById("trip-list");

if (tripListEl) {
  const tripSummaryEl = document.getElementById("trip-summary");
  const clearTripBtn = document.getElementById("clear-trip-btn");
  const favoritesGridEl = document.getElementById("favorites-grid");
  const favoritesStatusEl = document.getElementById("favorites-status");

  function renderTripList() {
    const trip = getTrip();
    tripListEl.innerHTML = "";

    if (trip.length === 0) {
      tripListEl.innerHTML =
        '<p>You haven\'t added any parks to your trip yet. Visit a park\'s details page and select "Add to Trip."</p>';
      tripSummaryEl.textContent = "";
      clearTripBtn.hidden = true;
      return;
    }

    clearTripBtn.hidden = false;

    trip.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "card trip-item";
      card.innerHTML = `
        <img src="${item.image || "images/hero-mountains.svg"}" alt="" />
        <div class="park-card-body">
          <h3>${item.fullName || "Unnamed Park"}</h3>
          <p class="park-card-state">${item.states || "Not specified"}</p>

          <div class="trip-dates">
            <div>
              <label for="arrival-${item.parkCode}">Arrival Date</label>
              <input
                type="date"
                id="arrival-${item.parkCode}"
                value="${escapeAttr(item.arrival)}"
                data-park-code="${item.parkCode}"
                data-field="arrival"
              />
            </div>
            <div>
              <label for="departure-${item.parkCode}">Departure Date</label>
              <input
                type="date"
                id="departure-${item.parkCode}"
                value="${escapeAttr(item.departure)}"
                data-park-code="${item.parkCode}"
                data-field="departure"
              />
            </div>
          </div>

          <label for="notes-${item.parkCode}">Notes</label>
          <textarea id="notes-${item.parkCode}" data-park-code="${item.parkCode}" data-field="notes" rows="2">${item.notes || ""}</textarea>

          <div class="trip-item-actions">
            <button type="button" class="btn btn-secondary move-up-btn" data-park-code="${item.parkCode}" ${index === 0 ? "disabled" : ""}>Move Up</button>
            <button type="button" class="btn btn-secondary move-down-btn" data-park-code="${item.parkCode}" ${index === trip.length - 1 ? "disabled" : ""}>Move Down</button>
            <button type="button" class="btn btn-primary remove-trip-btn" data-park-code="${item.parkCode}">Remove</button>
          </div>
        </div>
      `;
      tripListEl.appendChild(card);
    });

    const dayCount = getTripDayCount(trip);
    const parkWord = trip.length === 1 ? "park" : "parks";
    const dayText = dayCount > 0 ? ` — approximately ${dayCount} day${dayCount === 1 ? "" : "s"}.` : ".";
    tripSummaryEl.textContent = `${trip.length} ${parkWord} planned${dayText}`;
  }

  function renderFavoritesSection() {
    if (!favoritesGridEl) return;

    const favorites = getAllFavorites();
    favoritesGridEl.innerHTML = "";

    if (favorites.length === 0) {
      favoritesStatusEl.textContent = "You haven't saved any favorite parks yet.";
      return;
    }

    const favWord = favorites.length === 1 ? "park" : "parks";
    favoritesStatusEl.textContent = `You have ${favorites.length} favorite ${favWord}.`;

    favorites.forEach((fav) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <img src="${fav.image || "images/hero-mountains.svg"}" alt="" />
        <div class="park-card-body">
          <h3>${fav.fullName || "Unnamed Park"}</h3>
          <p class="park-card-state">${fav.states || "Not specified"}</p>
          <p>${fav.description || "No description available."}</p>
          <div class="park-card-actions">
            <a class="btn btn-secondary" href="park-details.html?parkCode=${encodeURIComponent(fav.parkCode)}">Details</a>
            <button type="button" class="btn btn-primary add-to-trip-from-favorites-btn" data-park-code="${fav.parkCode}">Add to Trip</button>
            <button
              type="button"
              class="favorite-btn"
              data-park-code="${fav.parkCode}"
              data-park-name="${escapeAttr(fav.fullName)}"
              data-park-image="${escapeAttr(fav.image)}"
              data-park-states="${escapeAttr(fav.states)}"
              data-park-description="${escapeAttr(fav.description)}"
              aria-pressed="true"
              aria-label="Remove ${fav.fullName} from favorites"
            ><span class="favorite-icon" aria-hidden="true">&hearts;</span></button>
          </div>
        </div>
      `;
      favoritesGridEl.appendChild(card);
    });

    refreshFavoriteButtonStates(favoritesGridEl);
  }

  function setupEventListeners() {
    tripListEl.addEventListener("click", (event) => {
      const moveUpBtn = event.target.closest(".move-up-btn");
      const moveDownBtn = event.target.closest(".move-down-btn");
      const removeBtn = event.target.closest(".remove-trip-btn");

      if (moveUpBtn) {
        moveTripItem(moveUpBtn.dataset.parkCode, "up");
        renderTripList();
      } else if (moveDownBtn) {
        moveTripItem(moveDownBtn.dataset.parkCode, "down");
        renderTripList();
      } else if (removeBtn) {
        removeFromTrip(removeBtn.dataset.parkCode);
        renderTripList();
      }
    });

    tripListEl.addEventListener("change", (event) => {
      const { field, parkCode } = event.target.dataset;
      if (!field || !parkCode) return;
      updateTripItem(parkCode, { [field]: event.target.value });
      if (field === "arrival" || field === "departure") {
        renderTripList();
      }
    });

    clearTripBtn.addEventListener("click", () => {
      const confirmed = window.confirm("Are you sure you want to clear your entire trip? This cannot be undone.");
      if (confirmed) {
        clearTrip();
        renderTripList();
      }
    });

    if (favoritesGridEl) {
      favoritesGridEl.addEventListener("click", (event) => {
        const addBtn = event.target.closest(".add-to-trip-from-favorites-btn");
        if (!addBtn) return;

        const favorites = getAllFavorites();
        const favorite = favorites.find((fav) => fav.parkCode === addBtn.dataset.parkCode);
        if (favorite) {
          addParkToTrip(favorite);
          renderTripList();
          addBtn.textContent = "Added to Trip ✓";
          addBtn.disabled = true;
        }
      });
    }

    // Favorites can change from any page (including this one); re-render
    // this section whenever that happens.
    document.addEventListener("favorites:changed", renderFavoritesSection);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTripList();
    renderFavoritesSection();
    setupEventListeners();
  });
}

