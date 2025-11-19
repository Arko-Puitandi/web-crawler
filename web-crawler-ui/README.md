# Web Crawler UI# 🌐 Web Crawler UI



A modern React-based frontend for visualizing and managing location data extracted by the web crawler backend. Features a custom data grid, interactive maps, and comprehensive filtering capabilities.Enterprise location data extraction interface supporting websites, PDFs, and modern JavaScript applications.



## Features![React](https://img.shields.io/badge/React-19.2.0-blue)

![Vite](https://img.shields.io/badge/Vite-7.2.2-purple)

- **Custom Data Grid**: Built from scratch with full AG Grid-like functionality![License](https://img.shields.io/badge/License-MIT-green)

  - Sortable columns (click header)

  - Resizable columns (drag edge)---

  - Reorderable columns (drag handle)

  - Filter inputs per column## 📑 Table of Contents

  - Pagination (20 rows per page)

  - Row selection with checkboxes- [Features](#features)

  - Export to CSV (current page or all data)- [Screenshots](#screenshots)

- [Getting Started](#getting-started)

- **Professional Purple Theme**: Modern gradient design with vibrant colors- [Usage Guide](#usage-guide)

- [Architecture](#architecture)

- **Data Management**:- [API Documentation](#api-documentation)

  - API data integration with backend- [Styling & Theming](#styling--theming)

  - Mock data mode for testing- [Optimization](#optimization)

  - Real-time filtering and search- [Development](#development)

  - Column visibility controls- [Troubleshooting](#troubleshooting)

  - Bulk URL upload

---

- **Location Details Modal**:

  - Centered single-card view## ✨ Features

  - Three sections: Details, Contact Info, Map

  - Google Maps integration with satellite view### 🎯 Core Functionality

  - Location markers on map- **Multi-Source Extraction**: Websites (HTML, React, Vue, Angular), PDFs, Google-style components

- **Multiple URL Input**: Tag-based system for batch processing

- **Map Visualization**:- **14 Data Fields**: Including footprint (MULTIPOLYGON WKT) and building height

  - Interactive Google Maps display- **Smart Autocomplete**: URL suggestions with keyboard navigation

  - Color-coded quality indicators- **Advanced Filtering**: Column filters with visibility toggles

  - Zoom controls

  - Marker clustering### 📊 Data Grid

  - Info windows with location details- **Sortable Columns**: Ascending/descending with visual indicators

- **Pagination**: 5, 10, 20, 50 rows per page

## Tech Stack- **Row Selection**: Individual and bulk selection

- **Column Management**: Show/hide columns dynamically

- React 19.2.0- **Responsive Design**: Mobile-optimized

- Vite 7.2.2

- Google Maps JavaScript API### 📤 Export

- Custom CSS (no external UI libraries)- **CSV Export**: Current page or all filtered data

- **PDF Export**: Professional reports with jsPDF

## Installation- **Filtered Export**: Respects all active filters



```bash### 🎨 UI/UX

cd web-crawler-ui- **Light Theme**: Clean white/gray design

npm install- **Smooth Animations**: Cubic-bezier transitions and slide-in effects

```- **Tag-Based Input**: Visual URL tags with add/remove functionality

- **Toast Notifications**: Success/error messages with auto-dismiss

## Configuration- **Loading States**: Animated spinners with overlay

- **Hover Effects**: Scale transforms and shadow elevations

Update the Google Maps API key in `src/components/MapVisualization.jsx`:

### 🔄 State Management

```javascript- **React Context API**: Centralized global state management

const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';- **React Query**: Built-in caching, retry logic, and error handling

```- **Custom Hooks**: Reusable logic for autocomplete, notifications, and data fetching



## Running the Application---



```bash## 📸 Screenshots

# Development mode

npm run dev### Main Interface

- Tag-based URL input with autocomplete

# Build for production- AG-grid style filter panel overlay

npm run build- Data grid with pagination and sorting

- Export dropdown with CSV/PDF options

# Preview production build

npm run preview### Filter Panel

```- Column visibility toggles

- Individual column search filters

Application will run on `http://localhost:5173`- Reset filters button (smart visibility)

- Compact, scrollable design

## Project Structure

---

```

web-crawler-ui/## 🚀 Getting Started

├── src/

│   ├── main.jsx                    # App entry point### Prerequisites

│   ├── App.jsx                     # Main app component

│   ├── App.css                     # Global styles- **Node.js** v16 or higher

│   ├── components/- **npm** or **yarn** package manager

│   │   ├── CustomDataGrid.jsx      # Custom data grid- **Backend API** (optional - mock data available)

│   │   ├── CustomDataGrid.css      # Grid styling

│   │   ├── LocationDetailModal.jsx # Detail view### Installation

│   │   ├── LocationDetailModal.css # Modal styling

│   │   ├── MapVisualization.jsx    # Map component```bash

│   │   ├── SearchBar.jsx           # URL input with tags# Clone the repository

│   │   ├── DataSourceToggle.jsx    # API/Mock togglegit clone <repository-url>

│   │   ├── FilterBox.jsx           # Column visibilitycd web-crawler-ui

│   │   └── Notifications.jsx       # Toast messages

│   ├── context/# Install dependencies

│   │   └── AppContext.jsx          # Global statenpm install

│   └── mock/

│       └── mockData.js             # Sample data# Copy environment template (optional)

├── public/cp .env.example .env

└── package.json```

```

### Configuration

## Key Features

Create a `.env` file to configure the API endpoint:

### Custom Data Grid

- **No external dependencies** - Built entirely with React```env

- **Full feature parity** with AG Grid# Backend API base URL

- **Performance optimized** for large datasetsVITE_API_BASE_URL=http://localhost:4000

- **Responsive design** with mobile support

# Request timeout (milliseconds)

### URL InputVITE_API_TIMEOUT=30000

- **Tag-based interface** - Add multiple URLs```

- **Autocomplete** - Previously used URLs

- **Inline search button** - Clean, compact design**Default Settings:**

- **URL count badge** - Shows number of added URLs- API Endpoint: `http://localhost:4000/api/crawl`

- Timeout: 30 seconds

### Filtering & Search- Mock Data: Enabled by default

- **Per-column filters** - Filter each column independently

- **Real-time updates** - Instant results### Running the Application

- **Column visibility** - Show/hide columns

- **Reset filters** - Clear all active filters```bash

# Start development server with hot reload

### Data Exportnpm run dev

- **CSV format** - Export current page or all data

- **Formatted columns** - Clean, readable output# Build for production

- **Custom naming** - Timestamped filenamesnpm run build



### Map Integration# Preview production build

- **Google Maps** - Satellite view with markersnpm run preview

- **Quality indicators** - Color-coded by data quality

- **Interactive** - Click markers for details# Run linter

- **Legend** - Visual quality score guidenpm run lint

```

## Styling

**Development Server:** `http://localhost:5173` (default Vite port)

The application uses a professional purple gradient theme:

- Primary: `#667eea → #764ba2`### Quick Start

- Compact design with 10px padding

- Smooth transitions and hover effects1. **Run the app**: `npm run dev`

- Professional shadows and borders2. **Open browser**: Navigate to `http://localhost:5173`

3. **Add URLs**: Enter one or more URLs in tag format

## API Integration4. **Click Search**: Fetch location data from backend

5. **Filter & Export**: Use sidebar filters and export buttons

The UI connects to the backend at `http://localhost:4000`:

---

```javascript

// Fetch locations from URLs## 📖 Usage Guide

POST /api/crawl

Body: { urls: ["https://example.com"], crawlType: "single" }### Mock Data Mode (Default)

```

1. App loads with **25+ mock locations** by default

## Data Source Modes2. Click **📦 Mock Data** badge to view mock data

3. Use all features without backend setup:

1. **API Data** (default):   - Sorting and filtering

   - Fetches from backend crawler   - Pagination

   - Real-time extraction   - Column visibility

   - Full location details with geocoding   - CSV/PDF export



2. **Mock Data**:### API Data Mode

   - Sample locations for testing

   - No backend required#### Single URL Search

   - Filterable by country1. Enter a URL in the search bar: `https://example.com`

2. Click **🔍 Search** button or press Enter

## Browser Support3. Wait for data to fetch (loading spinner appears)

4. View results in data grid

- Chrome/Edge (recommended)5. App automatically switches to **🌐 API Data** mode

- Firefox

- Safari#### Multiple URLs (Tag-Based)

- Modern browsers with ES6+ support1. Enter first URL and press Enter (creates a tag)

2. Enter additional URLs (each becomes a tag)

## License3. Click **🔍 Search** to crawl all URLs

4. Remove tags individually with ✕ button

MIT5. Use **Clear All** for 2+ tags


#### Autocomplete Feature
- **Type** to see URL suggestions from current data
- **Arrow Keys** (↑ ↓) to navigate suggestions
- **Enter** to select highlighted suggestion
- **Escape** to close dropdown
- **Click** to select with mouse

### Filter Panel

#### Opening Filters
- Click **🔍 Filters & Columns** button
- Panel slides in from right side as overlay
- Close with **✕** button or click outside

#### Column Visibility
- **Toggle switches** to show/hide columns
- Changes apply instantly to data grid
- All columns visible by default

#### Column Filters
- **Search boxes** for each column
- Type to filter data in real-time
- Filters combine (AND logic)
- **Reset Filters** button appears when active

#### Filter Features
- **Smart suggestions** for select fields (Usage Share, etc.)
- **No suggestions** for Activity and Source Type (type freely)
- **Active filter badge** shows filtered columns
- **Clear all** resets to original data

### Data Grid Operations

#### Sorting
- **Click header** to sort ascending
- **Click again** for descending
- **Third click** clears sort
- Visual arrow indicators (↑ ↓)

#### Pagination
- **Page size**: Choose 5, 10, 20, or 50 rows
- **Navigation**: Previous/Next buttons
- **Info**: Shows "X-Y of Z rows"
- **Disabled states** when at boundaries

#### Row Selection
- **Checkbox per row** for individual selection
- **Header checkbox** for select all (current page)
- **Selection info** shows count at bottom
- Used for future batch operations

#### Column Management
- **Show/hide** columns via filter panel
- **Responsive**: Adapts to screen size
- **Sticky header**: Stays visible while scrolling

### Export Options

#### CSV Export
1. Click **Export** dropdown button
2. Select **Export Current Page** or **Export All Data**
3. CSV downloads with filtered data
4. Respects visible columns
5. Success notification appears

#### PDF Export
1. Open Export dropdown
2. Select PDF option
3. Professional PDF generates
4. Includes all visible columns
5. Warning notification (amber theme)

### Data Source Toggle

#### Switching Modes
- **Mock Data**: 📦 Green badge, local data
- **API Data**: 🌐 Purple badge, backend data
- **Click badge** to toggle between modes
- **Record count** displayed below badge
- **Clear API Data** button when API active

### Notifications

- **Success**: Green gradient with ✓ icon (3s auto-dismiss)
- **Error**: Red gradient with ✗ icon (3s auto-dismiss)
- **Warning**: Amber gradient with ⚠ icon
- **Info**: Blue gradient for general messages

---

## 🏗️ Architecture

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI library with hooks |
| **Vite** | 7.2.2 | Build tool & dev server |
| **React Query** | 5.x | Data fetching & caching |
| **jsPDF** | Latest | PDF generation |
| **jsPDF AutoTable** | Latest | PDF table formatting |

### Project Structure

```
web-crawler-ui/
├── public/                      # Static assets
├── src/
│   ├── components/              # React components
│   │   ├── DataGrid.jsx         # Main data grid with pagination
│   │   ├── SearchBar.jsx        # Tag-based URL input with autocomplete
│   │   ├── FilterBox.jsx        # AG-grid style filter sidebar
│   │   ├── DataSourceToggle.jsx # Mock/API mode switcher
│   │   ├── ExportButtons.jsx    # CSV/PDF export dropdown
│   │   └── Notifications.jsx    # Toast notifications
│   ├── context/
│   │   └── AppContext.jsx       # Global state management
│   ├── hooks/
│   │   ├── useLocationData.js   # React Query API hook
│   │   ├── useAutocomplete.js   # Autocomplete logic
│   │   └── useNotification.js   # Notification system
│   ├── config/
│   │   └── api.js               # API configuration
│   ├── mock/
│   │   └── mockData.js          # 25+ sample locations
│   ├── App.jsx                  # Main app component
│   ├── App.css                  # App-specific styles
│   ├── main.jsx                 # Entry point with providers
│   └── index.css                # Global styles & variables
├── .env.example                 # Environment template
├── package.json                 # Dependencies
├── vite.config.js              # Vite configuration
└── README.md                    # This file
```

### State Management Flow

```
User Action
    ↓
Component (SearchBar, FilterBox, etc.)
    ↓
useAppContext() Hook
    ↓
AppContext (Global State)
    ├── useMockData
    ├── activeData
    ├── apiData
    ├── url
    └── Actions (setUrl, toggleDataSource, etc.)
    ↓
Components Re-render with New Data
```

### Data Fetching Architecture

```
Component calls fetchLocations()
    ↓
useFetchLocations() Hook (React Query)
    ↓
API Request (POST /api/crawl)
    ├── Success → setApiDataAndSwitch(data)
    └── Error → showError(message)
    ↓
Context Updates
    ↓
UI Updates
```

### Component Hierarchy

```
App.jsx
├── DataSourceToggle
├── SearchBar
│   └── Autocomplete Dropdown
├── Notifications
├── FilterBox (Overlay)
│   ├── Column Visibility Toggles
│   └── Column Search Filters
└── DataGrid
    ├── Table Header (Sortable)
    ├── Table Body (Scrollable)
    ├── Pagination Controls
    └── ExportButtons
        └── CSV/PDF Dropdown
```

---

## 📡 API Documentation

### Endpoint

**POST** `/api/crawl` or `/api/locations/crawl`

### Request Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Payload

#### Single URL
```json
{
  "url": "https://example.com"
}
```

#### Multiple URLs
```json
{
  "urls": [
    "https://example1.com",
    "https://example2.com",
    "https://example3.com"
  ]
}
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "locationName": "Main Office",
      "locationAddress": "123 Business St, Suite 100, New York, NY 10001",
      "activityAtAsset": "Headquarters",
      "latitude": "40.7128",
      "longitude": "-74.0060",
      "countryIso3": "USA",
      "postcode": "10001",
      "state": "New York",
      "streetOrCity": "New York",
      "usageShare": "Own",
      "sourceUrl": "https://example.com/locations",
      "sourceType": "Website"
    }
  ],
  "totalRecords": 1,
  "crawledAt": "2025-11-17T10:30:00Z"
}
```

**Alternative Format** (Array only):
```json
[
  {
    "locationName": "Main Office",
    "locationAddress": "...",
    ...
  }
]
```

### Data Field Specifications

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `locationName` | string | Yes | Location name | "Main Office" |
| `locationAddress` | string | Yes | Full address | "123 Business St..." |
| `activityAtAsset` | string | Yes | Activity type | "Headquarters" |
| `latitude` | string | Yes | Latitude | "40.7128" |
| `longitude` | string | Yes | Longitude | "-74.0060" |
| `countryIso3` | string | Yes | ISO 3166-1 alpha-3 | "USA" |
| `postcode` | string | No | Postal code | "10001" |
| `state` | string | No | State/Province | "New York" |
| `streetOrCity` | string | Yes | City name | "New York" |
| `usageShare` | string | Yes | Usage type | "Own", "Lease" |
| `sourceUrl` | string | Yes | Source URL | "https://..." |
| `sourceType` | string | Yes | Source type | "Website" |

### Error Response

**Status:** `400`, `404`, `500`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "The provided URL is invalid or unreachable",
    "details": "Failed to connect to https://invalid-url.com"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_URL` | 400 | URL format invalid |
| `URL_UNREACHABLE` | 404 | Cannot connect |
| `NO_DATA_FOUND` | 404 | No location data |
| `CRAWL_TIMEOUT` | 408 | Request timeout |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### cURL Examples

```bash
# Single URL
curl -X POST http://localhost:4000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Multiple URLs
curl -X POST http://localhost:4000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example1.com", "https://example2.com"]}'
```

### Performance Requirements

- **Timeout**: 30 seconds max
- **Batch Size**: Up to 10 URLs per request
- **Rate Limit**: 100 requests/hour per client
- **Response Time**: < 5 seconds (recommended)

---

## 🎨 Styling & Theming

### Design System

**Theme:** Light/White theme with clean aesthetics

**Color Palette:**
```css
/* Primary Colors */
--color-primary: #2563eb;        /* Blue */
--color-success: #10b981;        /* Green */
--color-error: #ef4444;          /* Red */
--color-warning: #f59e0b;        /* Amber */

/* Background */
--color-bg-primary: #ffffff;     /* White */
--color-bg-secondary: #f8fafc;   /* Light gray */
--color-bg-card: #ffffff;        /* Card white */

/* Text */
--color-text-primary: #1e293b;   /* Dark gray */
--color-text-secondary: #64748b; /* Medium gray */
--color-text-tertiary: #94a3b8;  /* Light gray */

/* Borders */
--color-border: #e2e8f0;         /* Light border */
--color-border-light: #cbd5e1;   /* Lighter border */
```

### Key Visual Features

#### Gradients
- **Primary Button**: Blue to indigo (#2563eb → #4f46e5)
- **Filter Button**: Purple to pink (#9333ea → #ec4899)
- **Reset Button**: Orange gradient (#f59e0b → #d97706)
- **Success Alert**: Green fade
- **Error Alert**: Red fade

#### Animations
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide In Right */
@keyframes slideInRight {
  from { 
    opacity: 0; 
    transform: translateX(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
}

/* Tag Slide In */
@keyframes tagSlideIn {
  from { 
    opacity: 0; 
    transform: scale(0.8); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

/* Pulse Glow (Reset Button) */
@keyframes pulseGlow {
  0%, 100% { 
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3); 
  }
  50% { 
    box-shadow: 0 2px 12px rgba(245, 158, 11, 0.5); 
  }
}
```

#### Component Styles

**Cards:**
- Background: White (#ffffff)
- Border: Light gray (#e2e8f0)
- Border radius: 12px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
- Hover: Elevated shadow

**Buttons:**
- Border radius: 8px
- Padding: 0.75rem 1.25rem
- Font weight: 600
- Transition: 0.2s cubic-bezier
- Hover: translateY(-2px) + scale(1.02)

**Input Fields:**
- Border: 2px solid #e2e8f0
- Focus: Blue border + shadow ring
- Border radius: 8px
- Padding: 0.75rem

**Tags (URL):**
- Background: Blue gradient
- Color: White
- Border radius: 20px (pill shape)
- Animation: tagSlideIn on add
- Hover: Elevated + darker

**Filter Panel:**
- Width: 350px
- Max height: 600px
- Position: Absolute overlay
- Border radius: 12px
- Shadow: 0 8px 32px rgba(0, 0, 0, 0.15)
- Animation: slideInRight

**Custom Scrollbar:**
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .filter-sidebar {
    width: 100%;
  }
  
  .table-with-filter {
    flex-direction: column;
  }
  
  .tag-input-container {
    flex-direction: column;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .app-content {
    padding: 1.5rem 2rem;
  }
}

/* Desktop */
@media (min-width: 1200px) {
  .table-with-filter {
    gap: 1.5rem;
  }
}
```

### Accessibility

- **Focus states**: Blue ring on all interactive elements
- **Keyboard navigation**: Full keyboard support
- **ARIA labels**: Proper labeling for screen readers
- **Color contrast**: WCAG AA compliant
- **Touch targets**: Minimum 44x44px on mobile

---

## ⚡ Optimization

### Architecture Improvements

**React Context API:**
- Centralized global state management
- Eliminates prop drilling
- Single source of truth for data
- Easy to extend and maintain

**React Query Integration:**
- Built-in caching and stale-while-revalidate
- Automatic retry on failure (1 retry)
- Request deduplication
- Background refetching
- Optimistic updates

**Custom Hooks:**
```javascript
// useLocationData.js - API calls
const { mutate, isPending, isError } = useFetchLocations();

// useAutocomplete.js - Autocomplete logic
const { 
  filteredSuggestions, 
  selectedIndex, 
  showDropdown,
  handleKeyDown 
} = useAutocomplete(suggestions, inputValue);

// useNotification.js - Toast notifications
const { notification, showSuccess, showError } = useNotification();
```

**Component Extraction:**
- Smaller, focused files (< 300 lines)
- Single responsibility principle
- Reusable across features
- Easier to test and debug

### Performance Optimizations

**Code Splitting:**
- Dynamic imports for large libraries
- Lazy loading of components
- Route-based splitting (future)

**Memoization:**
```javascript
// useMemo for expensive computations
const filteredData = React.useMemo(
  () => applyFilters(data, filters),
  [data, filters]
);

// useCallback for event handlers
const handleSearch = React.useCallback(
  (url) => fetchLocations(url),
  [fetchLocations]
);
```

**Virtual Scrolling:**
- Fixed height table with overflow
- Only renders visible rows
- Smooth scrolling performance

**Debouncing:**
- Filter inputs debounced (300ms)
- Prevents excessive re-renders
- Improves typing experience

### Bundle Size Optimization

- Tree-shaking with ES modules
- Vite's optimized production build
- Minification and compression
- CSS modules for scoped styles

### Caching Strategy

**React Query Cache:**
- Default staleTime: 5 minutes
- Cache persists during session
- Automatic background refresh
- Manual invalidation on demand

**Browser Cache:**
- Service worker (future enhancement)
- LocalStorage for preferences
- Session storage for temporary data

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (HMR enabled)
npm run dev -- --host    # Expose to network

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format with Prettier

# Testing (setup required)
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes**: Edit files in `src/`
3. **Hot reload**: Vite automatically updates browser
4. **Check errors**: View console for issues
5. **Test features**: Use mock data or backend
6. **Lint code**: `npm run lint` before commit
7. **Build**: `npm run build` to verify production

### Adding New Features

#### New Filter Column
```javascript
// 1. Add to columns array in App.jsx
const columns = [
  ...existingColumns,
  { field: 'newField', headerName: 'New Field' }
];

// 2. FilterBox.jsx automatically picks it up
// 3. Add mock data in mockData.js
```

#### New Export Format
```javascript
// 1. Create handler in App.jsx
const handleExportJSON = () => {
  const json = JSON.stringify(filteredData, null, 2);
  // Download logic
};

// 2. Add button in ExportButtons.jsx
<button onClick={onExportJSON}>Export JSON</button>
```

#### New Custom Hook
```javascript
// src/hooks/useMyHook.js
export const useMyHook = (param) => {
  const [state, setState] = React.useState(null);
  
  React.useEffect(() => {
    // Logic here
  }, [param]);
  
  return { state, setState };
};
```

### Customization Guide

**API Endpoint:**
```javascript
// src/config/api.js
export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
```

**Timeout Settings:**
```javascript
// src/config/api.js
export const TIMEOUT = 
  import.meta.env.VITE_API_TIMEOUT || 30000;
```

**Columns Configuration:**
```javascript
// src/App.jsx
const columns = [
  { field: 'locationName', headerName: 'Location Name' },
  // Add/remove columns here
];
```

**Mock Data:**
```javascript
// src/mock/mockData.js
export const mockLocations = [
  {
    locationName: 'New Location',
    // Add new mock entries
  }
];
```

**Theming:**
```css
/* src/index.css */
:root {
  --color-primary: #2563eb;  /* Change primary color */
  --color-success: #10b981;  /* Change success color */
  /* Modify other CSS variables */
}
```

### Environment Variables

```env
# .env file
VITE_API_BASE_URL=http://localhost:4000
VITE_API_TIMEOUT=30000
VITE_ENABLE_MOCK=true
VITE_PAGE_SIZE=10
```

### Debugging Tips

**React DevTools:**
- Install React DevTools browser extension
- Inspect component tree and state
- Profile performance

**Vite DevTools:**
- Open `http://localhost:5173/__inspect/`
- View module graph
- Check HMR updates

**Console Logging:**
```javascript
// Temporary debug logs
console.log('State:', state);
console.table(data);
console.time('Operation');
// ... code
console.timeEnd('Operation');
```

**Network Debugging:**
- Open browser Network tab
- Check API requests/responses
- Verify payload and status codes
- Check CORS headers

### Code Quality

**ESLint Rules:**
- No unused variables
- Consistent spacing
- React hooks rules
- Import ordering

**Prettier Config:**
- 2-space indentation
- Single quotes
- Trailing commas
- Line width: 80

**Git Hooks (Recommended):**
```bash
# Install husky
npm install --save-dev husky

# Pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
```

### Testing (Future Enhancement)

**Recommended Stack:**
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Cypress** - E2E testing

**Example Test:**
```javascript
// SearchBar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

test('adds URL tag on enter', () => {
  render(<SearchBar onSubmit={jest.fn()} />);
  const input = screen.getByPlaceholderText(/enter url/i);
  
  fireEvent.change(input, { target: { value: 'https://test.com' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  
  expect(screen.getByText('https://test.com')).toBeInTheDocument();
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### Backend Connection Failed

**Error:** "Cannot connect to backend server"

**Solutions:**
1. Verify backend is running: `curl http://localhost:4000/api/crawl`
2. Check CORS configuration on backend:
   ```javascript
   // Express.js example
   app.use(cors({
     origin: 'http://localhost:5173',
     methods: ['GET', 'POST']
   }));
   ```
3. Verify API endpoint in `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:4000
   ```
4. Check network connectivity
5. Disable browser extensions (ad blockers)

#### Request Timeout

**Error:** "Request timed out after 30 seconds"

**Solutions:**
1. Increase timeout in `src/config/api.js`:
   ```javascript
   export const TIMEOUT = 60000; // 60 seconds
   ```
2. Optimize backend crawler performance
3. Reduce number of URLs in batch request
4. Check server logs for errors

#### Filter Panel Not Opening

**Issue:** Clicking "Filters & Columns" button does nothing

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `showFilterModal` state in React DevTools
3. Clear browser cache: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Restart dev server: `npm run dev`

#### Export Not Working

**Issue:** CSV/PDF download doesn't start

**Solutions:**
1. Check browser's download settings (allow downloads)
2. Verify data exists: Check `filteredData` in React DevTools
3. Check console for errors
4. Try different browser
5. Disable popup blockers

#### Tags Not Adding

**Issue:** URL tags not created when pressing Enter

**Solutions:**
1. Ensure input has focus
2. Check for valid URL format
3. Clear browser cache
4. Verify `tags` state in React DevTools
5. Check console for JavaScript errors

#### Table Not Scrolling

**Issue:** Table overflow not working

**Solutions:**
1. Check CSS `overflow` properties in DevTools
2. Verify table has fixed height
3. Clear cache and hard reload
4. Check for conflicting CSS

#### Mock Data Not Loading

**Issue:** App shows "No data" with mock mode

**Solutions:**
1. Verify `src/mock/mockData.js` exists
2. Check `mockLocations` export
3. Restart dev server
4. Check browser console for import errors

### Performance Issues

#### Slow Rendering

**Solutions:**
1. Reduce page size (use 10 instead of 50)
2. Hide unused columns
3. Clear filters
4. Check browser RAM usage
5. Close other tabs

#### Laggy Typing in Filters

**Solutions:**
1. Reduce debounce delay (currently 300ms)
2. Close filter panel when not in use
3. Clear other filters
4. Check CPU usage

### Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Not Supported:**
- Internet Explorer (any version)
- Opera Mini
- Old mobile browsers

### Development Issues

#### Port Already in Use

**Error:** "Port 5173 is already in use"

**Solution:**
```bash
# Kill process on port
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process

# Or use different port
npm run dev -- --port 3000
```

#### Module Not Found

**Error:** "Cannot find module '@tanstack/react-query'"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Build Fails

**Error:** "Build failed with errors"

**Solutions:**
1. Check ESLint errors: `npm run lint`
2. Fix TypeScript/JavaScript errors
3. Clear build cache: `rm -rf dist`
4. Update dependencies: `npm update`

### Getting Help

**Before Opening an Issue:**
1. Check existing issues on GitHub
2. Search documentation (this README)
3. Check browser console for errors
4. Try in incognito/private mode
5. Test with mock data first

**When Reporting an Issue:**
1. **Describe the problem** clearly
2. **Steps to reproduce** the issue
3. **Expected vs actual** behavior
4. **Browser and version** information
5. **Console errors** (screenshot or copy)
6. **Environment:** OS, Node version, npm version

**Debug Checklist:**
- [ ] Browser console checked for errors
- [ ] Network tab checked for failed requests
- [ ] React DevTools inspected for state issues
- [ ] Backend server is running
- [ ] CORS is properly configured
- [ ] `.env` file is correctly set up
- [ ] Dependencies are installed
- [ ] Dev server is running on correct port

---

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Query Docs](https://tanstack.com/query/latest)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

### Tutorials
- React Hooks: Context API
- React Query: Data Fetching Patterns
- CSS Grid & Flexbox Layouts
- Vite: Fast Development Setup

### Community
- GitHub Issues: Report bugs and request features
- Stack Overflow: Get help from community
- Discord/Slack: Join developer communities

---

## 🎯 Roadmap

### Planned Features
- [ ] Advanced filter operators (AND/OR logic)
- [ ] Custom column ordering (drag & drop)
- [ ] Data visualization (charts/maps)
- [ ] Bulk operations (delete, edit)
- [ ] Export to Excel (XLSX format)
- [ ] Save filter presets
- [ ] User preferences persistence
- [ ] Dark mode toggle
- [ ] Internationalization (i18n)
- [ ] Advanced search with regex
- [ ] API key authentication
- [ ] Real-time updates (WebSocket)
- [ ] Offline mode (PWA)

### Under Consideration
- TypeScript migration
- Unit & E2E testing
- Accessibility audit (WCAG AAA)
- Performance monitoring
- Error boundary improvements
- Service worker caching

---

## 📄 License

MIT License

Copyright (c) 2025 Web Crawler UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 👥 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

**Code Standards:**
- Follow ESLint rules
- Write clean, documented code
- Add comments for complex logic
- Test your changes
- Update README if needed

---

## 💬 Support & Contact

**Issues:** [GitHub Issues](https://github.com/your-repo/web-crawler-ui/issues)

**Email:** support@example.com

**Documentation:** This README file

**Updates:** Check GitHub for latest releases

---

## 🙏 Acknowledgments

- **React Team** - For the amazing framework
- **Vite Team** - For blazing fast build tool
- **TanStack** - For React Query
- **jsPDF** - For PDF generation
- **Community** - For feedback and contributions

---

**Built with ❤️ using React & Vite**

**Version:** 1.0.0  
**Last Updated:** November 17, 2025
