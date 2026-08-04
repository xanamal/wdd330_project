// main.js — shared behavior loaded on every page:
// hamburger menu, active-page highlighting, and footer dates.

import { fetchParkAlerts } from "./api.js";
import { setupFavoriteButtonDelegation, refreshFavoriteButtonStates } from "./favorites.js";

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setupNavToggle() {
  const toggleBtn = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggleBtn || !nav) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav-open");
    toggleBtn.classList.toggle("is-active", isOpen);
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the mobile menu after a nav link is chosen.
  nav.addEventListener("click", (event) => {
    if (event.target.tagName === "A" && nav.classList.contains("nav-open")) {
      nav.classList.remove("nav-open");
      toggleBtn.classList.remove("is-active");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });
}

function highlightActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".primary-nav a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function setFooterDates() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const modifiedEl = document.getElementById("last-modified");
  if (modifiedEl) {
    modifiedEl.textContent = document.lastModified;
  }
}

// Sends the home page search box to the Explore Parks page with the query
// carried over as a URL parameter, so parks.js can read and apply it.
function setupHomeSearchForm() {
  const form = document.getElementById("home-search-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = form.elements.search.value.trim();
    const params = new URLSearchParams();
    if (query) {
      params.set("search", query);
    }
    window.location.href = `parks.html${params.toString() ? `?${params}` : ""}`;
  });
}

function createFeaturedParkCard(park) {
  const card = document.createElement("article");
  card.className = "card";

  card.innerHTML = `
    <img src="${park.image}" alt="" />
    <div class="park-card-body">
      <h3>${park.name}</h3>
      <p class="park-card-state">${park.state}</p>
      <p>${park.description}</p>
      <div class="park-card-actions">
        <a class="btn btn-secondary" href="park-details.html?parkCode=${encodeURIComponent(park.parkCode)}">Details</a>
        <button
          type="button"
          class="favorite-btn"
          data-park-code="${park.parkCode}"
          data-park-name="${escapeAttr(park.name)}"
          data-park-image="${escapeAttr(park.image)}"
          data-park-states="${escapeAttr(park.state)}"
          data-park-description="${escapeAttr(park.description)}"
          aria-pressed="false"
          aria-label="Save ${park.name} to favorites"
        ><span class="favorite-icon" aria-hidden="true">&hearts;</span></button>
      </div>
    </div>
  `;

  return card;
}

async function loadFeaturedParks() {
  const grid = document.getElementById("featured-parks-grid");
  if (!grid) return;

  try {
    const response = await fetch("data/featured-parks.json");
    if (!response.ok) {
      throw new Error(`Featured parks request failed with status ${response.status}`);
    }

    const parks = await response.json();
    if (!Array.isArray(parks) || parks.length === 0) {
      throw new Error("Featured parks data is empty or invalid.");
    }

    grid.innerHTML = "";
    parks.forEach((park) => {
      grid.appendChild(createFeaturedParkCard(park));
    });
    refreshFavoriteButtonStates(grid);
  } catch (error) {
    console.error(error);
    grid.innerHTML = "<p>Sorry, featured parks could not be loaded right now.</p>";
  }
}

function createAlertItem(alert) {
  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${alert.parkCode ? alert.parkCode.toUpperCase() : "NPS"}:</strong>
    ${alert.title || "Alert"}
  `;
  return item;
}

async function loadHomeAlerts() {
  const alertsList = document.getElementById("home-alerts-list");
  if (!alertsList) return;

  try {
    const data = await fetchParkAlerts("", 5);
    const alerts = data?.data ?? [];

    if (alerts.length === 0) {
      alertsList.innerHTML = "<p>There are no current alerts to show.</p>";
      return;
    }

    const list = document.createElement("ul");
    alerts.forEach((alert) => list.appendChild(createAlertItem(alert)));
    alertsList.innerHTML = "";
    alertsList.appendChild(list);
  } catch (error) {
    console.error(error);
    alertsList.innerHTML = "<p>Sorry, current alerts could not be loaded right now.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavToggle();
  highlightActiveNavLink();
  setFooterDates();
  setupHomeSearchForm();
  setupFavoriteButtonDelegation(document);
  loadFeaturedParks();
  loadHomeAlerts();
});
