// parks.js — Park Explorer page: search, filters, sorting, view switching,
// and pagination. All NPS network calls go through api.js.

import { fetchParks, fetchParksByState, fetchActivities } from "./api.js";
import { renderParksMap } from "./map.js";
import { refreshFavoriteButtonStates } from "./favorites.js";

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PAGE_SIZE = 9;

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
  { code: "PR", name: "Puerto Rico" }, { code: "VI", name: "U.S. Virgin Islands" }, { code: "GU", name: "Guam" },
  { code: "AS", name: "American Samoa" }, { code: "MP", name: "Northern Mariana Islands" },
];

const searchForm = document.getElementById("parks-search-form");
const searchInput = document.getElementById("parks-search-input");
const stateSelect = document.getElementById("state-filter");
const activitySelect = document.getElementById("activity-filter");
const sortSelect = document.getElementById("sort-filter");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const statusEl = document.getElementById("parks-status");
const gridEl = document.getElementById("parks-grid");
const mapEl = document.getElementById("parks-map");
const gridViewBtn = document.getElementById("grid-view-btn");
const mapViewBtn = document.getElementById("map-view-btn");
const loadMoreBtn = document.getElementById("load-more-btn");

// Bail out quietly if this script somehow loads on a page without these elements.
if (!searchForm || !gridEl) {
  // Nothing to do on this page.
} else {
  let currentParks = [];
  let filteredParks = [];
  let visibleCount = PAGE_SIZE;
  let currentView = "grid";

  function populateStateOptions() {
    US_STATES.forEach((state) => {
      const option = document.createElement("option");
      option.value = state.code;
      option.textContent = state.name;
      stateSelect.appendChild(option);
    });
  }

  async function populateActivityOptions() {
    try {
      const data = await fetchActivities();
      const activities = (data?.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
      activities.forEach((activity) => {
        const option = document.createElement("option");
        option.value = activity.name;
        option.textContent = activity.name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Could not load the activity list:", error);
    }
  }

  function readFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("search")) searchInput.value = params.get("search");
    if (params.has("state")) stateSelect.value = params.get("state");
    if (params.has("activity")) activitySelect.value = params.get("activity");
    if (params.has("sort")) sortSelect.value = params.get("sort");
  }

  function updateURLFromFilters() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (stateSelect.value) params.set("state", stateSelect.value);
    if (activitySelect.value) params.set("activity", activitySelect.value);
    if (sortSelect.value !== "az") params.set("sort", sortSelect.value);

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }

  function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}…`;
  }

  function createParkCard(park) {
    const card = document.createElement("article");
    card.className = "card";

    const imageUrl = park.images?.[0]?.url || "images/hero-mountains.svg";
    const imageAlt = park.images?.[0]?.altText || "";
    const states = park.states || "Not specified";
    const description = park.description ? truncate(park.description, 160) : "No description available.";
    const activityNames = park.activities?.slice(0, 3).map((activity) => activity.name).join(", ");
    const parkName = park.fullName || "Unnamed Park";

    card.innerHTML = `
      <img src="${imageUrl}" alt="${escapeAttr(imageAlt)}" loading="lazy" />
      <div class="park-card-body">
        <h3>${parkName}</h3>
        <p class="park-card-state">${states}</p>
        <p>${description}</p>
        ${activityNames ? `<p class="park-card-activities">Activities: ${activityNames}</p>` : ""}
        <div class="park-card-actions">
          <a class="btn btn-secondary" href="park-details.html?parkCode=${encodeURIComponent(park.parkCode)}">Details</a>
          <button
            type="button"
            class="favorite-btn"
            data-park-code="${park.parkCode}"
            data-park-name="${escapeAttr(parkName)}"
            data-park-image="${escapeAttr(imageUrl)}"
            data-park-states="${escapeAttr(states)}"
            data-park-description="${escapeAttr(description)}"
            aria-pressed="false"
            aria-label="Save ${parkName} to favorites"
          ><span class="favorite-icon" aria-hidden="true">&hearts;</span></button>
        </div>
      </div>
    `;

    return card;
  }

  function renderResults() {
    gridEl.innerHTML = "";

    if (filteredParks.length === 0) {
      statusEl.textContent = "No parks match your search or filters.";
      loadMoreBtn.hidden = true;
      return;
    }

    const visibleParks = filteredParks.slice(0, visibleCount);
    visibleParks.forEach((park) => gridEl.appendChild(createParkCard(park)));
    refreshFavoriteButtonStates(gridEl);

    statusEl.textContent = `Showing ${visibleParks.length} of ${filteredParks.length} parks.`;
    loadMoreBtn.hidden = currentView !== "grid" || visibleCount >= filteredParks.length;
  }

  function applyFiltersSortAndRender() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const activity = activitySelect.value;

    filteredParks = currentParks.filter((park) => {
      const matchesSearch =
        !searchTerm ||
        park.fullName?.toLowerCase().includes(searchTerm) ||
        park.states?.toLowerCase().includes(searchTerm);
      const matchesActivity = !activity || park.activities?.some((a) => a.name === activity);
      return matchesSearch && matchesActivity;
    });

    const sortDirection = sortSelect.value === "za" ? -1 : 1;
    filteredParks.sort((a, b) => sortDirection * (a.fullName || "").localeCompare(b.fullName || ""));

    visibleCount = PAGE_SIZE;
    renderResults();

    if (currentView === "map") {
      renderParksMap(mapEl, filteredParks);
    }
  }

  async function loadAndRenderParks() {
    statusEl.textContent = "Loading parks…";
    gridEl.innerHTML = "";
    loadMoreBtn.hidden = true;

    try {
      const stateCode = stateSelect.value;
      const data = stateCode ? await fetchParksByState(stateCode) : await fetchParks({ limit: 400 });
      currentParks = data?.data ?? [];
      applyFiltersSortAndRender();
    } catch (error) {
      console.error(error);
      statusEl.textContent =
        "Sorry, parks could not be loaded right now. Please check the NPS API key in js/config.js and try again.";
    }
  }

  function setView(view) {
    currentView = view;
    gridEl.hidden = view !== "grid";
    mapEl.hidden = view !== "map";
    gridViewBtn.setAttribute("aria-pressed", String(view === "grid"));
    mapViewBtn.setAttribute("aria-pressed", String(view === "map"));
    loadMoreBtn.hidden = view !== "grid" || visibleCount >= filteredParks.length;

    if (view === "map") {
      renderParksMap(mapEl, filteredParks);
    }
  }

  function setupEventListeners() {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateURLFromFilters();
      applyFiltersSortAndRender();
    });

    stateSelect.addEventListener("change", () => {
      updateURLFromFilters();
      loadAndRenderParks();
    });

    activitySelect.addEventListener("change", () => {
      updateURLFromFilters();
      applyFiltersSortAndRender();
    });

    sortSelect.addEventListener("change", () => {
      updateURLFromFilters();
      applyFiltersSortAndRender();
    });

    clearFiltersBtn.addEventListener("click", () => {
      searchInput.value = "";
      stateSelect.value = "";
      activitySelect.value = "";
      sortSelect.value = "az";
      updateURLFromFilters();
      loadAndRenderParks();
    });

    loadMoreBtn.addEventListener("click", () => {
      visibleCount += PAGE_SIZE;
      renderResults();
    });

    gridViewBtn.addEventListener("click", () => setView("grid"));
    mapViewBtn.addEventListener("click", () => setView("map"));
  }

  async function init() {
    populateStateOptions();
    await populateActivityOptions();
    readFiltersFromURL();
    setupEventListeners();
    await loadAndRenderParks();
  }

  document.addEventListener("DOMContentLoaded", init);
}

