// favorites.js — Local Storage favorites, shared by every page that
// renders a favorite-button (home, parks, park-details, trip-planner).
//
// Every favorite-btn in the app carries its park data as data-* attributes
// (data-park-code, data-park-name, data-park-image, data-park-states,
// data-park-description). setupFavoriteButtonDelegation() listens for
// clicks on `document` exactly once (called from main.js, which loads on
// every page) so newly rendered cards work automatically without needing
// their own click listeners.

const FAVORITES_KEY = "npap:favorites";

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Could not save favorites:", error);
  }
}

export function getAllFavorites() {
  return getFavorites();
}

export function isFavorite(parkCode) {
  return getFavorites().some((fav) => fav.parkCode === parkCode);
}

export function addFavorite(favorite) {
  const favorites = getFavorites();
  if (favorites.some((fav) => fav.parkCode === favorite.parkCode)) return;
  favorites.push(favorite);
  saveFavorites(favorites);
}

export function removeFavorite(parkCode) {
  saveFavorites(getFavorites().filter((fav) => fav.parkCode !== parkCode));
}

function readFavoriteFromButton(button) {
  return {
    parkCode: button.dataset.parkCode,
    fullName: button.dataset.parkName || "",
    image: button.dataset.parkImage || "",
    states: button.dataset.parkStates || "",
    description: button.dataset.parkDescription || "",
  };
}

function updateButtonState(button, isSaved, animate = false) {
  button.setAttribute("aria-pressed", String(isSaved));
  const name = button.dataset.parkName || "this park";
  button.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${name} ${isSaved ? "from" : "to"} favorites`);
  // Change the glyph itself (not just color) so favorited state doesn't rely on color alone.
  const icon = button.querySelector(".favorite-icon");
  if (icon) {
    icon.textContent = isSaved ? "♥" : "♡";
  }

  if (animate) {
    button.classList.remove("favorite-pop");
    // Force a reflow so the animation can restart if clicked repeatedly.
    void button.offsetWidth;
    button.classList.add("favorite-pop");
  }
}

// Sets the correct aria-pressed/aria-label state on any favorite buttons
// inside `root`. Call this after rendering or re-rendering park cards.
export function refreshFavoriteButtonStates(root = document) {
  root.querySelectorAll(".favorite-btn[data-park-code]").forEach((button) => {
    updateButtonState(button, isFavorite(button.dataset.parkCode));
  });
}

// Call once per page load (done from main.js). Uses event delegation so
// favorite buttons rendered later (search results, featured parks, etc.)
// work without any extra setup.
export function setupFavoriteButtonDelegation(root = document) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest(".favorite-btn[data-park-code]");
    if (!button) return;

    const parkCode = button.dataset.parkCode;
    const nowFavorited = !isFavorite(parkCode);

    if (nowFavorited) {
      addFavorite(readFavoriteFromButton(button));
    } else {
      removeFavorite(parkCode);
    }

    updateButtonState(button, nowFavorited, true);

    // Lets any page (e.g. the trip planner's favorites list) react to a
    // favorite being added/removed from anywhere on the site.
    document.dispatchEvent(new CustomEvent("favorites:changed"));
  });
}
