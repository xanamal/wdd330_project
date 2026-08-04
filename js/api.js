// api.js — all National Park Service API requests live here, separate
// from DOM rendering. Every function returns the parsed JSON response
// (or throws), so calling code handles its own try/catch and messaging.

import { NPS_API_KEY } from "../../../../Library/Mobile Documents/.Trash/js/config.js";

const NPS_BASE_URL = "https://developer.nps.gov/api/v1";

function buildCacheKey(endpoint, params) {
  return `nps:${endpoint}:${new URLSearchParams(params).toString()}`;
}

// Shared request helper: builds the URL, checks sessionStorage for a
// cached response first, and only calls the network when needed.
async function npsRequest(endpoint, params = {}) {
  const cacheKey = buildCacheKey(endpoint, params);
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Corrupt cache entry — fall through and re-fetch from the network.
    }
  }

  const url = new URL(`${NPS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  url.searchParams.set("api_key", NPS_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`National Park Service API request failed (status ${response.status}).`);
  }

  const data = await response.json();

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // sessionStorage may be full or unavailable (e.g. private browsing) — safe to ignore.
  }

  return data;
}

// General park search/listing. `q` searches across park name and description.
export async function fetchParks({ q = "", limit = 400, start = 0 } = {}) {
  return npsRequest("/parks", { q, limit, start });
}

// A single park by its NPS park code (e.g. "yell"). Returns the park
// object directly (or null if not found) instead of the raw envelope.
export async function fetchParkByCode(parkCode) {
  const data = await npsRequest("/parks", { parkCode });
  return data?.data?.[0] ?? null;
}

// Parks located in a given two-letter state code (e.g. "WY").
export async function fetchParksByState(stateCode) {
  return npsRequest("/parks", { stateCode, limit: 400 });
}

// Current alerts, optionally scoped to one park code.
export async function fetchParkAlerts(parkCode = "", limit = 20) {
  return npsRequest("/alerts", { parkCode, limit });
}

// The full list of activity types the NPS tracks (used to populate filters).
export async function fetchActivities() {
  return npsRequest("/activities", { limit: 50 });
}
