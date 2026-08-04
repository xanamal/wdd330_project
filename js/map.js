// map.js — Mapbox GL map setup shared by the Explore Parks map view and
// the Park Details page. If no Mapbox token is configured, every function
// here falls back to a plain list of coordinates with a directions link
// instead of leaving a broken map on the page.

import { MAPBOX_TOKEN } from "./config.js";

// Keeps track of one Mapbox map (and its markers) per container element,
// so calling render again just updates markers instead of creating a
// second map on top of the first one.
const mapsByContainer = new WeakMap();
const markersByContainer = new WeakMap();

function hasValidMapboxToken() {
  return typeof MAPBOX_TOKEN === "string" && MAPBOX_TOKEN.length > 0 && !MAPBOX_TOKEN.startsWith("YOUR_");
}

// The NPS API returns coordinates as a string like "lat:44.59, long:-110.54".
function parseLatLong(latLongString) {
  if (!latLongString) return null;

  const match = latLongString.match(/lat:\s*(-?\d+(\.\d+)?)\s*,\s*long:\s*(-?\d+(\.\d+)?)/i);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[3]);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };
}

function renderCoordinateFallback(container, parks) {
  container.innerHTML = "";

  const intro = document.createElement("p");
  intro.textContent = "An interactive map isn't available right now, but here are the park locations:";
  container.appendChild(intro);

  const list = document.createElement("ul");
  list.className = "map-fallback-list";

  parks.forEach((park) => {
    const name = park.fullName || park.name || "Unnamed Park";
    const coords = parseLatLong(park.latLong);
    const item = document.createElement("li");

    if (!coords) {
      item.innerHTML = `<strong>${name}</strong> — location not available.`;
    } else {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
      item.innerHTML = `
        <strong>${name}</strong> (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})
        — <a href="${directionsUrl}" target="_blank" rel="noopener">Get Directions</a>
      `;
    }

    list.appendChild(item);
  });

  container.appendChild(list);
}

function getOrCreateMap(container, centerCoords) {
  const existing = mapsByContainer.get(container);
  if (existing) return existing;

  window.mapboxgl.accessToken = MAPBOX_TOKEN;
  const map = new window.mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [centerCoords.lng, centerCoords.lat],
    zoom: 4,
  });

  map.addControl(new window.mapboxgl.NavigationControl());
  mapsByContainer.set(container, map);
  return map;
}

function clearMarkers(container) {
  const existingMarkers = markersByContainer.get(container) || [];
  existingMarkers.forEach((marker) => marker.remove());
  markersByContainer.set(container, []);
}

// Renders one marker per park (with coordinates) into `container`, reusing
// the same map instance on repeat calls. Falls back to a text list when no
// Mapbox token is configured or when nothing has usable coordinates.
export function renderParksMap(container, parks) {
  if (!container) return;

  if (!hasValidMapboxToken()) {
    renderCoordinateFallback(container, parks);
    return;
  }

  const parksWithCoords = parks
    .map((park) => ({ park, coords: parseLatLong(park.latLong) }))
    .filter((entry) => entry.coords !== null);

  if (parksWithCoords.length === 0) {
    container.innerHTML = "<p>No park locations are available to show on the map.</p>";
    return;
  }

  const map = getOrCreateMap(container, parksWithCoords[0].coords);
  clearMarkers(container);

  const newMarkers = parksWithCoords.map(({ park, coords }) => {
    const name = park.fullName || park.name || "Unnamed Park";
    const popup = new window.mapboxgl.Popup({ offset: 24 }).setHTML(
      `<strong>${name}</strong><br><a href="park-details.html?parkCode=${encodeURIComponent(park.parkCode)}">View Details</a>`
    );

    return new window.mapboxgl.Marker({ color: "#B6532A" })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(popup)
      .addTo(map);
  });

  markersByContainer.set(container, newMarkers);

  // The container may have just become visible (e.g. switching from grid
  // to map view), so Mapbox needs a nudge to pick up its real size.
  requestAnimationFrame(() => map.resize());
}

export function renderSingleParkMap(container, park) {
  renderParksMap(container, [park]);
}

window.addEventListener("resize", () => {
  document.querySelectorAll(".map-container").forEach((container) => {
    const map = mapsByContainer.get(container);
    if (map) map.resize();
  });
});
