# Web Crawler - Location Data Extraction System

A full-stack application for extracting, visualizing, and managing location data from websites. Combines a powerful Node.js backend with a modern React frontend.

## Overview

This system uses multiple extraction strategies to discover and geocode location information from any website, including:
- Traditional HTML parsing
- JavaScript-rendered content (SPAs)
- Embedded maps and coordinates
- API endpoints and XHR requests
- PDF documents

## Architecture

```
React-Crawl/
├── web-crawler-backend/    # Node.js/Express API
└── web-crawler-ui/         # React frontend
```

## Quick Start

### Backend Setup
```bash
cd web-crawler-backend
npm install
# Create .env with API keys
npm start
# Server runs on http://localhost:4000
```

### Frontend Setup
```bash
cd web-crawler-ui
npm install
npm run dev
# App runs on http://localhost:5173
```

## Features

### Backend
- 4 parallel extraction strategies
- Smart deduplication with fuzzy matching
- Geocoding with OpenCage/Google Maps
- Quality scoring system
- PDF support
- Robots.txt compliance

### Frontend
- Custom-built data grid (no external libs)
- Interactive Google Maps visualization
- Real-time filtering and sorting
- Export to CSV
- Bulk URL upload
- Professional purple gradient theme

## Tech Stack

**Backend:**
- Node.js 18+, Express 4.18
- Puppeteer 21.5, Playwright
- Cheerio, OpenCage API

**Frontend:**
- React 19.2, Vite 7.2
- Google Maps JavaScript API
- Custom CSS

## Configuration

Both services require API keys:

**Backend** (`.env`):
```env
OPENCAGE_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
```

**Frontend** (`MapVisualization.jsx`):
```javascript
const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
```

## API Endpoint

```
POST http://localhost:4000/api/crawl
Body: {
  "urls": ["https://example.com/locations"],
  "crawlType": "single"
}
```

## Documentation

- [Backend README](./web-crawler-backend/README.md) - Detailed backend documentation
- [Frontend README](./web-crawler-ui/README.md) - Detailed frontend documentation

## License

MIT
