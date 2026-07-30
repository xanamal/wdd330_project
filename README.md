# National Park Adventure Planner

A responsive web application that helps users discover, explore, and plan trips to U.S. National Parks using the National Park Service API, interactive maps, trip-planning tools, and park search features.

Built for the WDD 330 course project by Xanen Gilbert.

## Main Features

- **Home page** — hero introduction, a name/state search box, featured parks loaded from a local JSON file, a feature overview, and a live preview of current NPS alerts.
- **Explore Parks** — search by name, filter by state and activity, sort A–Z/Z–A, grid or interactive map view, and a "Load More" button, all combinable and reflected in the URL (e.g. `parks.html?search=yellowstone&state=WY`) so results can be shared or reloaded.
- **Park Details** — full park info pulled from the NPS API: description, states, directions, weather, entrance fees, operating hours, activities, contact info, official website link, current alerts, extra photos, and an interactive map marker.
- **Trip Planner** — a Local-Storage-only itinerary builder: add parks from their details page, set arrival/departure dates, add notes, reorder with Move Up/Down, remove a park, see an approximate day count, and clear the whole trip (with confirmation). No login required.
- **Favorites** — save/unsave a park from any card or its details page; favorites persist across a refresh and are listed together on the Trip Planner page.

## Technologies Used

- Semantic HTML5 and hand-written CSS (custom properties, mobile-first responsive layout, `prefers-reduced-motion` support)
- Vanilla JavaScript, organized as ES modules (`type="module"`)
- [National Park Service API](https://www.nps.gov/subjects/developer/) for park data, photos, activities, alerts, fees, and hours
- [Mapbox GL JS](https://docs.mapbox.com/) for interactive maps, with a graceful coordinates/directions-link fallback if no map token is configured
- A local JSON file for the home page's featured parks
- Local Storage for favorites and the trip planner

No frameworks (React, Vue, Angular, Svelte) or CSS frameworks (Bootstrap, Tailwind) are used.

## API Information

This project uses two external services:

1. **National Park Service (NPS) API** — required for the Explore Parks, Park Details, and home-page-alerts features. Get a free key at https://www.nps.gov/subjects/developer/get-started.
2. **Mapbox** — required for the interactive map on Explore Parks (map view) and Park Details. Get a free public token at https://account.mapbox.com/. Without a token, the app automatically falls back to a text list of park coordinates with "Get Directions" links instead of a broken map.

## Setup Instructions

1. Clone or download this repository.
2. Copy the config template and add your own keys:
   ```
   cp js/config.example.js js/config.js
   ```
3. Open `js/config.js` and replace the placeholder values:
   ```js
   export const NPS_API_KEY = "YOUR_NPS_API_KEY_HERE";
   export const MAPBOX_TOKEN = "YOUR_MAPBOX_ACCESS_TOKEN_HERE";
   ```
4. Serve the folder with any static file server (opening `index.html` directly with `file://` will block `fetch()` requests in most browsers). For example:
   ```
   python3 -m http.server 8000
   ```
   then visit `http://localhost:8000/`.

### API Key Instructions (Important)

`js/config.js` is listed in `.gitignore` and will never be committed. `js/config.example.js` is committed instead, showing exactly where your keys belong so anyone cloning the project knows to create their own `config.js`.

**GitHub Pages limitation:** GitHub Pages only serves static files — there is no server-side code to hide a secret key behind. Any key placed in `config.js` and deployed to GitHub Pages is visible to anyone who opens the browser's dev tools or views the page source, regardless of `.gitignore` (which only protects your *source repository*, not the *deployed* files). For a real production app, you would restrict the NPS/Mapbox keys by HTTP referrer/domain in each provider's dashboard and treat any client-side key as public-but-restricted, or proxy requests through a backend. That is outside the scope of this student project, but is worth knowing before reusing this pattern for anything sensitive.

## File Structure

```
/
├── index.html            Home page
├── parks.html            Explore Parks page
├── park-details.html     Park Details page
├── trip-planner.html     Trip Planner + Favorites page
├── css/
│   ├── base.css          Reset, variables, shared layout, all page-specific styles
│   ├── larger.css        Tablet/desktop media query overrides
│   └── planner.css       Trip Planner page-specific styles
├── js/
│   ├── main.js           Shared nav/footer behavior, home page rendering
│   ├── api.js            NPS API requests + sessionStorage caching
│   ├── parks.js          Explore Parks: search/filter/sort/pagination
│   ├── park-details.js   Park Details rendering
│   ├── map.js            Mapbox setup, markers, fallback
│   ├── favorites.js      Local Storage favorites
│   ├── trip-planner.js   Local Storage trip itinerary + Trip Planner page rendering
│   ├── config.example.js Committed template for API keys
│   └── config.js         Your real API keys (gitignored, not committed)
├── data/
│   └── featured-parks.json
├── images/                SVG illustrations used across the site
├── .gitignore
└── README.md
```

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. In the repository settings, go to **Pages** and set the source to the `main` branch, root folder.
3. Since `js/config.js` is gitignored, it will not be part of the deployed site. You have two options:
   - Manually add a `config.js` file to the deployed branch with your real keys (accepting the visibility limitation described above), or
   - Keep the site deployed without live API data — the Home page's featured parks (local JSON) and general layout will still work; the NPS-powered pages will show their built-in "please add your API key" error messages instead of crashing.
4. Visit `https://<your-username>.github.io/<repository-name>/`.

## Known Limitations

- Because GitHub Pages is static-only, API keys embedded in the deployed JavaScript are technically visible to site visitors (see the API Key Instructions section above).
- The Explore Parks map view renders up to a few hundred markers from a single fetched batch of parks; extremely large filtered result sets are capped by what the NPS API returns per request rather than paginated marker-by-marker.
- The Trip Planner's "approximate number of days" is calculated from the earliest arrival date to the latest departure date among parks that have both dates set — it does not account for travel time between parks.
- Without a Mapbox token, maps fall back to a coordinate/directions list rather than a visual map.
- No user accounts — favorites and trip data are stored per-browser in Local Storage and will not follow a user to a different device or browser.

## Credits and References

- [National Park Service API documentation](https://www.nps.gov/subjects/developer/)
- [Mapbox GL JS documentation](https://docs.mapbox.com/mapbox-gl-js/)
- Park photography is not included in this repository; the site instead uses simple original SVG illustrations (`images/`) and real photos returned by the NPS API where available.
