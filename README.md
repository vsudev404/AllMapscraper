# 🗺️ All Maps Data Scraper

> **Extract structured business and location data from Google Maps and Bing Maps with a single Apify Actor.**

[![Apify](https://img.shields.io/badge/Apify-Actor-00A98F?logo=apify&logoColor=white)](https://apify.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Crawlee](https://img.shields.io/badge/Built%20with-Crawlee-FF9900)](https://crawlee.dev)
[![Playwright](https://img.shields.io/badge/Browser%20automation-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**All Maps Data Scraper** is a ready-to-publish [Apify Actor](https://docs.apify.com/platform/actors) for collecting publicly visible business listings from **Google Maps, Bing Maps, or both**.

It turns map search results into a clean, normalized dataset containing business names, categories, addresses, phone numbers, websites, ratings, review counts, coordinates, opening hours, and source URLs.

---

## ✨ Features

- 🔎 **Google Maps + Bing Maps** — choose one provider or run both.
- 📋 **Batch search** — submit multiple search queries in one Actor run.
- 🏢 **Business details** — collect names, categories, addresses, phones and websites.
- ⭐ **Ratings & reviews** — capture rating and review-count information when available.
- 📍 **Coordinates** — extract latitude and longitude where exposed by the map page.
- 🕒 **Opening hours** — Google detail scraping can capture visible hours information.
- 🌐 **Locale support** — configure the language/locale used by map searches.
- 🛡️ **Apify Proxy support** — proxy configuration is exposed through Actor input.
- 📊 **Normalized output** — Google and Bing results use the same dataset schema.
- ⚙️ **Configurable concurrency** — control browser workload and scraping speed.
- 🐳 **Apify-ready Docker setup** — includes a Playwright/Chromium runtime.

---

## 📦 What the Actor collects

| Field | Description |
|---|---|
| `provider` | `google` or `bing` |
| `searchQuery` | Search phrase that produced the listing |
| `title` | Business/listing name |
| `category` | Business category |
| `address` | Visible address |
| `phone` | Visible phone number |
| `website` | Business website when available |
| `rating` | Numeric rating when available |
| `reviewsCount` | Review count when available |
| `latitude` | Latitude |
| `longitude` | Longitude |
| `hours` | Visible opening-hours information |
| `mapUrl` | Source map listing URL |
| `scrapedAt` | UTC timestamp for the extracted record |

### Example output

```json
{
  "provider": "google",
  "searchQuery": "restaurants in Connaught Place, Delhi",
  "title": "Example Restaurant",
  "category": "North Indian Restaurant",
  "address": "Connaught Place, New Delhi, Delhi 110001",
  "phone": "+91 98765 43210",
  "website": "https://example.com",
  "rating": 4.3,
  "reviewsCount": 1287,
  "latitude": 28.6315,
  "longitude": 77.2167,
  "hours": "Open · Closes 11 PM",
  "mapUrl": "https://www.google.com/maps/place/...",
  "scrapedAt": "2026-09-27T10:00:00.000Z"
}
```

---

## 🚀 Quick start

### Run locally

Requirements:

- Node.js 18+
- npm
- Playwright/Chromium environment

```bash
npm install
npm start
```

For an Apify-style local run:

```bash
npx apify run --input-file=./input.json
```

Example `input.json`:

```json
{
  "provider": "both",
  "searchQueries": [
    "restaurants in Connaught Place, Delhi",
    "dentists in Gurgaon"
  ],
  "maxResultsPerQuery": 40,
  "scrapeDetails": true,
  "language": "en",
  "maxConcurrency": 2
}
```

---

## ☁️ Deploy to Apify

This repository already contains the Actor configuration in `.actor/`.

### Option 1 — Link the Git repository

1. Open **Apify Console → Actors**.
2. Create a new Actor.
3. Choose the option to connect/link a Git repository.
4. Select this repository and the `main` branch.
5. Apify can use `.actor/actor.json` and the included `Dockerfile` to build the Actor.
6. Run the Actor and provide the input fields shown in the Actor UI.

### Option 2 — Build from the Apify CLI

Use the Apify CLI with the repository checked out locally, then push/build the Actor according to your Apify account configuration.

---

## ⚙️ Input

| Input | Type | Default | Purpose |
|---|---|---:|---|
| `provider` | string | `google` | `google`, `bing`, or `both` |
| `searchQueries` | string[] | — | One or more map searches |
| `maxResultsPerQuery` | integer | `60` | Maximum listings per query/provider |
| `scrapeDetails` | boolean | `true` | Open Google listings for richer details |
| `language` | string | `en` | Search/UI locale |
| `proxyConfiguration` | object | Apify proxy | Proxy configuration |
| `maxConcurrency` | integer | `2` | Concurrent browser pages |

### Example searches

```text
restaurants in Delhi
software companies in Bangalore
dentists in Gurgaon
coffee shops near Times Square, New York
real estate agencies in London
```

---

## 🧱 Project structure

```text
.
├── .actor/
│   ├── actor.json
│   └── input_schema.json
├── src/
│   ├── main.js
│   ├── utils.js
│   └── scrapers/
│       ├── googleMaps.js
│       └── bingMaps.js
├── Dockerfile
├── package.json
├── LICENSE
└── README.md
```

### Architecture

```text
Actor input
    │
    ├── Google Maps ──► Google scraper ──┐
    │                                    │
    └── Bing Maps ────► Bing scraper ────┤
                                         ▼
                                Normalized records
                                         │
                                         ▼
                                  Apify Dataset
```

---

## 💰 Monetization

If you publish this as an Apify Actor, you can configure pricing through Apify's Actor monetization options.

A practical model for a data-extraction Actor is **usage-based pricing**, where customers pay according to the resources or extraction events defined for the Actor.

Before publishing, review the current Apify pricing and monetization documentation and choose pricing that matches your actual compute/proxy costs.

---

## 🔧 Maintenance

Map websites change their UI and DOM structure over time. If an Actor run starts returning zero or incomplete results:

1. Check the Actor logs.
2. Open the affected map provider in a browser.
3. Inspect the result cards/detail panel.
4. Compare the current DOM with the selectors in the corresponding scraper.
5. Update only the affected scraper when possible.
6. Test with a small query before increasing result limits.

The main provider-specific files are:

- `src/scrapers/googleMaps.js`
- `src/scrapers/bingMaps.js`

---

## ⚠️ Responsible use & legal note

This project is intended for collecting **publicly visible information**. It does not bypass authentication or access private data.

Automated access to websites may be restricted by their terms of service, robots policies, or applicable laws. You are responsible for reviewing and complying with the terms and laws relevant to your use case, including data-protection requirements.

Do not use the scraper to collect sensitive personal information or to circumvent access controls.

---

## 📄 License

This project is released under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👤 Author

**Comet Nexus Tech**

Built with ❤️ using **Apify, Crawlee, Playwright, and Node.js**.
