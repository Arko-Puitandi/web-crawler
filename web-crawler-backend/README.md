# Web Crawler Backend# 🌐 Web Crawler Backend



A powerful Node.js/Express backend service for extracting location data from websites using multiple strategies including Puppeteer, Playwright, heuristic extraction, and API detection.Enterprise-grade location data extraction system supporting websites, PDFs, and modern JavaScript applications.



## Features## 🚀 Features



- **Multi-Strategy Extraction**: 4 parallel extraction strategies for comprehensive location discovery- **Multi-Source Extraction**: Websites (HTML, SPA), PDF documents, and data attributes

  - Location Extractor: Parses structured HTML for location data- **8 Extraction Strategies**: JSON-LD, Microdata, Lists, Sections, Tables, Regex patterns, Contact pages, Data attributes

  - Heuristic Extractor: Pattern matching for addresses with confidence scoring- **International Support**: US, UK, Netherlands, and European address formats

  - Map Detector: Extracts coordinates from embedded maps- **Smart Geocoding**: Google Maps API with ISO3 country code conversion

  - Playwright XHR: Captures API responses for hidden location data- **Building Data**: Automatic footprint (MULTIPOLYGON WKT) and height estimation

  - **Modern Frameworks**: React, Vue, Angular, and Google-style components

- **Smart Crawling**:- **PDF Support**: Extract locations from PDF documents

  - Robots.txt compliance

  - PDF extraction support## 📋 Prerequisites

  - Site-wide crawling capability

  - Duplicate detection and filtering- Node.js 18+

- Google Maps API key (for geocoding)

- **Geocoding & Enrichment**:

  - OpenCage API integration for geocoding## 🛠️ Installation

  - Google Maps fallback

  - Address validation and normalization```bash

  - Country, state, and postal code extraction# Install dependencies

npm install

- **Quality Scoring**: Automatic data quality assessment based on completeness

# Create environment file

## Tech Stackcp .env.example .env



- Node.js 18+# Add your Google Maps API key to .env

- Express 4.18.2```

- Puppeteer 21.5.0

- Playwright## 🔧 Configuration

- Cheerio (HTML parsing)

- OpenCage Geocoding APIEdit `.env` file:



## Installation```env

NODE_ENV=development

```bashPORT=4000

cd web-crawler-backendGOOGLE_MAPS_API_KEY=your_api_key_here

npm installCORS_ORIGIN=http://localhost:5173

``````



## Configuration### 🗺️ Getting Google Maps API Key



Create a `.env` file in the backend root:Follow these steps to get your Google Maps API key:



```env1. **Go to Google Cloud Console**

PORT=4000   - Visit: https://console.cloud.google.com/

NODE_ENV=development

OPENCAGE_API_KEY=your_opencage_api_key2. **Create a New Project** (or select existing)

GOOGLE_MAPS_API_KEY=your_google_maps_api_key   - Click "Select a project" dropdown at the top

PUPPETEER_TIMEOUT=30000   - Click "NEW PROJECT"

```   - Enter project name: "Web Crawler"

   - Click "CREATE"

## Running the Server

3. **Enable Geocoding API**

```bash   - In the left menu, go to: **APIs & Services** → **Library**

# Development mode   - Search for: "Geocoding API"

npm start   - Click on "Geocoding API"

   - Click **ENABLE** button

# Production mode

npm run start:prod4. **Create API Credentials**

```   - In the left menu, go to: **APIs & Services** → **Credentials**

   - Click **+ CREATE CREDENTIALS** at the top

Server will run on `http://localhost:4000`   - Select **API Key**

   - Your API key will be generated (looks like: `AIzaSyD...`)

## API Endpoints   - Copy the API key



### POST `/api/crawl`5. **Restrict API Key (Recommended for Security)**

Extract location data from URLs   - Click on the API key name to edit

   - Under "Application restrictions":

**Request Body:**     - Select "IP addresses"

```json     - Add your server IP (or `0.0.0.0/0` for development)

{   - Under "API restrictions":

  "urls": ["https://example.com/locations"],     - Select "Restrict key"

  "crawlType": "single"     - Check only: **Geocoding API**

}   - Click **SAVE**

```

6. **Enable Billing (Required)**

**Response:**   - Google Maps requires billing to be enabled

```json   - Go to: **Billing** → **Link a billing account**

{   - Add payment method (credit card)

  "success": true,   - **Note:** Google provides $200 free credit per month

  "data": [   - Geocoding costs: $5 per 1,000 requests (after free tier)

    {

      "locationName": "Office Name",7. **Add to .env File**

      "locationAddress": "123 Main St, City, State 12345",   ```env

      "latitude": "40.7128",   GOOGLE_MAPS_API_KEY=AIzaSyD...your_actual_key_here

      "longitude": "-74.0060",   ```

      "countryIso3": "USA",

      "postcode": "12345",**Free Tier Limits:**

      "state": "New York",- $200 free credit per month

      "activityAtAsset": "Office",- Geocoding: First 40,000 requests free

      "qualityScore": 95- After that: $5 per 1,000 requests

    }

  ]**Alternative (Free) Options:**

}- **OpenCage Geocoder**: 2,500 requests/day free

```- **Nominatim (OpenStreetMap)**: Free, but rate-limited

- **Mapbox**: 100,000 requests/month free

## Project Structure

To use alternatives, modify `src/services/geocoding.service.js`

```

web-crawler-backend/## 🏃 Running the Application

├── src/

│   ├── app.js                 # Express app setup```bash

│   ├── routes/npm start

│   │   └── crawl.routes.js    # API routes```

│   ├── services/

│   │   ├── crawler.service.js              # Main orchestrationServer runs at `http://localhost:4000`

│   │   ├── location-extractor.service.js   # HTML parsing

│   │   ├── heuristic-extractor.service.js  # Pattern matching## 📡 API Endpoints

│   │   ├── playwright-renderer.service.js  # JS rendering & XHR

│   │   ├── map-detector.service.js         # Map coordinate extraction### POST /api/crawl

│   │   ├── geocoding.service.js            # Address geocoding

│   │   ├── robots.service.js               # Robots.txt handlingExtract location data from websites or PDFs.

│   │   └── pdf-extractor.service.js        # PDF parsing

│   └── utils/**Request:**

│       └── logger.js          # Logging utility```json

└── package.json{

```  "urls": ["https://example.com/contact", "https://example.com/report.pdf"]

}

## Key Services```



### Crawler Service**Response:** Returns 14 fields per location:

- Orchestrates all extraction strategies- Location name, address, activity, lat/lng

- Handles deduplication with fuzzy matching- Country (ISO3), postcode, state, city

- Manages enrichment and quality scoring- **Footprint** (MULTIPOLYGON WKT format)

- **Height** (estimated in meters)

### Extraction Strategies- Usage share, source URL, source type

1. **Location Extractor**: Semantic HTML parsing (80% confidence)

2. **Heuristic Extractor**: Text pattern matching (75%+ confidence threshold)**Supported Sources:**

3. **Map Detector**: Iframe and data attribute extraction- ✅ HTML websites (static & dynamic)

4. **Playwright XHR**: Captures API responses for dynamic content- ✅ PDF documents (.pdf files)

- ✅ React/Vue/Angular apps

### Confidence Filtering- ✅ Google-style components

- Heuristic matches require 75%+ confidence score- ✅ Contact pages, career pages, store locators

- Prevents false positives from text pattern matching

- Prioritizes visible HTML content over hidden API data### GET /health



## PerformanceHealth check endpoint.



- Parallel execution of extraction strategies## 🧪 Testing

- Enhanced deduplication reduces false positives

- Typical extraction: 10-20 locations in 5-10 seconds```bash

# Test with a website

## Error Handlingcurl -X POST http://localhost:4000/api/crawl \

  -H "Content-Type: application/json" \

- Comprehensive try-catch blocks  -d '{"urls": ["https://www.wissen.com/en/contact"]}'

- Detailed logging with Winston

- Graceful fallbacks for failed strategies# Test with PDF

curl -X POST http://localhost:4000/api/crawl \

## License  -H "Content-Type: application/json" \

  -d '{"urls": ["https://example.com/annual-report.pdf"]}'

MIT```


## 📁 Project Structure

```
web-crawler-backend/
├── src/
│   ├── services/
│   │   ├── crawler.service.js          # Main orchestrator
│   │   ├── location-extractor.service.js  # 8 extraction strategies
│   │   ├── pdf-extractor.service.js    # PDF text extraction
│   │   ├── geocoding.service.js        # Google Maps API
│   │   └── iso-converter.service.js    # ISO2 to ISO3 conversion
│   ├── routes/             # API routes
│   ├── utils/              # Logger, helpers
│   └── app.js              # Express app
├── logs/                   # Application logs
└── package.json            # Dependencies
```

## 🎯 Extraction Strategies

1. **JSON-LD**: Structured data (schema.org)
2. **Microdata**: Schema.org microdata attributes
3. **Location Lists**: Grids, lists, containers (.locations-list, .office-grid)
4. **Sections**: Semantic HTML sections
5. **Tables**: Tabular location data
6. **Address Patterns**: US, UK, NL postcodes and street addresses
7. **Contact Pages**: Contact-specific patterns
8. **Data Attributes**: SPA frameworks (data-slug, data-location, etc.)

## 📊 Logging

Logs written to:
- `logs/error.log` - Errors only
- `logs/combined.log` - All activity
- Console output with detailed strategy results

## 🐛 Troubleshooting

### No locations found
- Check logs for which strategies were attempted
- PDF URLs must end in `.pdf` or contain `/pdf/`
- JavaScript-heavy sites may need waitForSelector (contact support)
- Verify page actually contains location/address data

### Geocoding fails
1. Verify Google Maps API key in `.env`
2. Enable Geocoding API in Google Cloud Console
3. Check billing is enabled (required by Google)
4. Monitor API quotas

### Puppeteer errors
Ensure Chromium dependencies are installed:
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser
```

## 📄 License

MIT
