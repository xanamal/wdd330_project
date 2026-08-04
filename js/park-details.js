// park-details.js — reads ?parkCode= from the URL, loads that park (plus
// its alerts) from the NPS API, and renders every section. Every value
// pulled from the API is passed through a fallback so nothing ever prints
// "undefined" when a field is missing.

import { fetchParkByCode, fetchParkAlerts } from "./api.js";
import { renderSingleParkMap } from "./map.js";
import { refreshFavoriteButtonStates } from "./favorites.js";
import { addParkToTrip, isInTrip } from "./trip-planner.js";

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const statusEl = document.getElementById("park-details-status");
const contentEl = document.getElementById("park-details-content");

function getParkCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("parkCode")?.trim().toLowerCase() || "";
}

function safeText(value, fallback) {
  return value && String(value).trim() ? value : fallback;
}

function renderHours(operatingHours) {
  const entry = operatingHours?.[0];
  if (!entry) {
    return "<p>Operating hours are not listed for this park.</p>";
  }

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const rows = days
    .map((day) => {
      const label = day.charAt(0).toUpperCase() + day.slice(1);
      const hours = safeText(entry.standardHours?.[day], "Not listed");
      return `<li><strong>${label}:</strong> ${hours}</li>`;
    })
    .join("");

  return `
    ${entry.description ? `<p>${entry.description}</p>` : ""}
    <ul class="hours-list">${rows}</ul>
  `;
}

function renderFees(entranceFees) {
  if (!entranceFees || entranceFees.length === 0) {
    return "<p>Entrance fee information is not listed for this park.</p>";
  }

  return `<ul class="fees-list">${entranceFees
    .map((fee) => {
      const title = safeText(fee.title, "Entrance Fee");
      const cost = safeText(fee.cost, "0");
      const description = safeText(fee.description, "");
      return `<li><strong>${title}:</strong> $${cost}${description ? ` — ${description}` : ""}</li>`;
    })
    .join("")}</ul>`;
}

function renderActivities(activities) {
  if (!activities || activities.length === 0) {
    return "<p>No activities are listed for this park.</p>";
  }
  return `<ul class="activities-list">${activities.map((a) => `<li>${a.name}</li>`).join("")}</ul>`;
}

function renderAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    return "<p>There are no current alerts for this park.</p>";
  }

  return `<ul class="alerts-list">${alerts
    .map((alert) => {
      const title = safeText(alert.title, "Alert");
      const description = safeText(alert.description, "");
      return `<li><strong>${title}:</strong> ${description}</li>`;
    })
    .join("")}</ul>`;
}

function renderContact(contacts, websiteUrl) {
  const phone = contacts?.phoneNumbers?.find((p) => p.phoneNumber)?.phoneNumber;
  const email = contacts?.emailAddresses?.find((e) => e.emailAddress)?.emailAddress;

  const rows = [];
  if (phone) rows.push(`<li><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></li>`);
  if (email) rows.push(`<li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li>`);
  if (websiteUrl) {
    rows.push(`<li><strong>Website:</strong> <a href="${websiteUrl}" target="_blank" rel="noopener">Official NPS Page</a></li>`);
  }

  if (rows.length === 0) {
    return "<p>Contact information is not listed for this park.</p>";
  }

  return `<ul class="contact-list">${rows.join("")}</ul>`;
}

function renderGallery(images, parkName) {
  const extraImages = images?.slice(1, 7) ?? [];
  if (extraImages.length === 0) return "";

  const items = extraImages
    .map((img) => `<img src="${img.url}" alt="${safeText(img.altText, `${parkName} photo`)}" loading="lazy" />`)
    .join("");

  return `
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading">More Photos</h2>
      <div class="gallery-grid">${items}</div>
    </section>
  `;
}

function renderPark(park, alerts) {
  const parkName = safeText(park.fullName, "Unnamed Park");
  const heroImage = park.images?.[0]?.url || "images/hero-mountains.svg";
  const heroAlt = safeText(park.images?.[0]?.altText, `${parkName} photo`);
  const shortDescription =
    park.description && park.description.length > 160 ? `${park.description.slice(0, 160).trim()}…` : park.description || "";

  document.title = `${parkName} | National Park Adventure Planner`;

  contentEl.innerHTML = `
    <div class="park-hero">
      <img src="${heroImage}" alt="${heroAlt}" />
    </div>

    <div class="park-details-header">
      <h1>${parkName}</h1>
      <p class="park-card-state">${safeText(park.states, "States not listed")}</p>
      <div class="park-detail-actions">
        <button
          type="button"
          class="favorite-btn"
          data-park-code="${park.parkCode}"
          data-park-name="${escapeAttr(parkName)}"
          data-park-image="${escapeAttr(heroImage)}"
          data-park-states="${escapeAttr(safeText(park.states, ""))}"
          data-park-description="${escapeAttr(shortDescription)}"
          aria-pressed="false"
          aria-label="Save ${parkName} to favorites"
        ><span class="favorite-icon" aria-hidden="true">&hearts;</span> Favorite</button>
        <button type="button" id="add-to-trip-btn" class="btn btn-primary">Add to Trip</button>
      </div>
    </div>

    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <p>${safeText(park.description, "No description is available for this park.")}</p>
    </section>

    <section aria-labelledby="alerts-heading">
      <h2 id="alerts-heading">Current Alerts</h2>
      ${renderAlerts(alerts)}
    </section>

    <section aria-labelledby="activities-heading">
      <h2 id="activities-heading">Activities</h2>
      ${renderActivities(park.activities)}
    </section>

    <section aria-labelledby="fees-heading">
      <h2 id="fees-heading">Entrance Fees</h2>
      ${renderFees(park.entranceFees)}
    </section>

    <section aria-labelledby="hours-heading">
      <h2 id="hours-heading">Operating Hours</h2>
      ${renderHours(park.operatingHours)}
    </section>

    <section aria-labelledby="directions-heading">
      <h2 id="directions-heading">Directions</h2>
      <p>${safeText(park.directionsInfo, "Directions information is not listed for this park.")}</p>
      ${park.directionsUrl ? `<p><a href="${park.directionsUrl}" target="_blank" rel="noopener">Get Directions</a></p>` : ""}
    </section>

    <section aria-labelledby="weather-heading">
      <h2 id="weather-heading">Weather</h2>
      <p>${safeText(park.weatherInfo, "Weather information is not listed for this park.")}</p>
    </section>

    <section aria-labelledby="contact-heading">
      <h2 id="contact-heading">Contact</h2>
      ${renderContact(park.contacts, park.url)}
    </section>

    <section aria-labelledby="map-heading">
      <h2 id="map-heading">Map</h2>
      <div id="park-map" class="map-container"></div>
    </section>

    ${renderGallery(park.images, parkName)}
  `;

  statusEl.hidden = true;
  contentEl.hidden = false;

  renderSingleParkMap(document.getElementById("park-map"), park);
  refreshFavoriteButtonStates(contentEl);
  setupAddToTripButton(park, parkName, heroImage);
}

function setupAddToTripButton(park, parkName, heroImage) {
  const addToTripBtn = document.getElementById("add-to-trip-btn");
  if (!addToTripBtn) return;

  const markAsAdded = () => {
    addToTripBtn.textContent = "Added to Trip ✓";
    addToTripBtn.disabled = true;
  };

  if (isInTrip(park.parkCode)) {
    markAsAdded();
    return;
  }

  addToTripBtn.addEventListener("click", () => {
    addParkToTrip({
      parkCode: park.parkCode,
      fullName: parkName,
      image: heroImage,
      states: safeText(park.states, ""),
    });
    markAsAdded();
  });
}

async function init() {
  const parkCode = getParkCodeFromURL();

  if (!parkCode) {
    statusEl.textContent = "No park was specified. Please choose a park from the Explore Parks page.";
    return;
  }

  try {
    const [park, alertsData] = await Promise.all([
      fetchParkByCode(parkCode),
      fetchParkAlerts(parkCode, 10).catch(() => null),
    ]);

    if (!park) {
      statusEl.textContent = `We couldn't find a park with the code "${parkCode}". Please try again from the Explore Parks page.`;
      return;
    }

    renderPark(park, alertsData?.data ?? []);
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "Sorry, this park's details could not be loaded right now. Please check the NPS API key in js/config.js and try again.";
  }
}

document.addEventListener("DOMContentLoaded", init);

