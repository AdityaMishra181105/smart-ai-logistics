# Smart Logistics & Accessibility Platform (SIH26002)

An AI-Powered Smart Logistics & Accessibility Platform built for the **Ministry of Development of North Eastern Region (MDoNER)**.

The platform is designed to assist logistics operators, government officials, drivers, NGOs, and suppliers in managing the transportation of essential goods (medicines, food, building materials, and agricultural produce) under challenging weather and route hazards in the North Eastern Region of India.

---

## 1. Problem Statement Context

In the North Eastern Region (NER) of India, logistics operations face major hurdles due to extreme geographic terrain and environmental disruptions. Regular monsoon rains, seasonal landslides (e.g. NH-6 near Sonapur Tunnel, Silchar-Aizawl passes), and Brahmaputra river plain floods isolate communities. This system provides real-time geological risk evaluation, dynamic route comparisons, and accessibility analysis to ensure essential cargo reaches remote centers safely.

---

## 2. Technology Stack

- **Frontend**: React (v19), Vite (v8), Tailwind CSS, React Router, Axios, Lucide React, Leaflet & React-Leaflet, Recharts
- **Backend**: Node.js, Express.js, JWT, bcryptjs, Helmet, Morgan, Cors
- **Database**: MongoDB (Mongoose) with **Graceful In-Memory Demo Fallback** (fully functional without local MongoDB instances)
- **Mapping**: OpenStreetMap / Leaflet GIS tiles

---

## 3. Project Directory Structure

```
smart-logistics/
│
├── client/                     # React frontend application
│   ├── src/
│   │   ├── assets/             # Global CSS and layouts
│   │   ├── components/         # Reusable widgets
│   │   │   ├── layout/         # Panels (Map, Sidebar, Demo Guide)
│   │   │   └── ui/             # Badges, Buttons, Inputs, Spinners
│   │   ├── constants/          # Navigation role configurations
│   │   ├── context/            # Authentication Context
│   │   ├── pages/              # Portal pages (Dashboard, Registry, Routes, Alerts)
│   │   └── services/           # Axios API services
│   └── package.json
│
├── server/                     # Express backend application
│   ├── config/                 # DB connection and fallback scripts
│   ├── controllers/            # Route handler logic
│   ├── middleware/             # Role verification and JWT validation
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # REST API routes
│   └── services/               # MCDA recommendation & environmental engines
│
└── package.json                # Workspace script manager
```

---

## 4. Authentication & Role-Based Access Control (RBAC)

The platform enforces Role-Based Access Control (RBAC) across both frontend routing views and backend API controllers:

* **ADMIN**: Full administration access.
* **LOGISTICS_OPERATOR**: Access to shipment management, driver assignments, route generation, and intelligence parameters.
* **DRIVER**: Can only view shipments assigned directly to their vehicle. Access is restricted to tracking maps, alerts, and settings.
* **NGO_SUPPLIER**: Restricted to shipment creations and registrations registry. Cannot access route analysis or driver dispatch controls.

---

## 5. Major Features & Algorithmic Scoring

### A. Route Generation & Comparisons
Generates three alternate routes on the GIS map:
1. **FASTEST**: Optimizes for lowest transit time.
2. **SAFEST**: Bypasses segments intersecting weather/landslide risk hazard zones.
3. **BALANCED**: Weights time, road classifications, and risks.

### B. Weather & Environmental Risk Intelligence
Computes environmental risks dynamically using localized weather parameters:
* Rainfall precipitation index (e.g. torrential monsoon alerts).
* Geological landslide susceptibility factors (slope elevation terrain warnings).
* Flood plain vulnerability scores.

### C. Smart Route Recommendation Engine
Applies a Multi-Criteria Decision Analysis (MCDA) algorithm. The suitability score (0-100) incorporates:
* Route base safety and duration scores.
* Shipment priority weights (e.g. CRITICAL medicine weight offsets).
* Cargo classification adjustments (e.g. construction steels are penalised on steep mountain slopes).

### D. Safety Alerts & Accessibility Intelligence
* Evaluates dynamic transit connectivity signal coverage estimates.
* Formulates road accessibility levels: `GOOD` (80-100), `LIMITED` (55-79), `POOR` (25-54), and `BLOCKED` (0-24).
* Automatically raises warning alerts on the Map and Dashboard.

---

## 6. Installation & Execution

### Environment Setup
Create a `.env` file in the project root:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-logistics
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Installation
From the root directory, install dependencies:
```bash
npm run install:all
```

### Running the App
Launch both client and server servers concurrently:
```bash
npm run dev
```

* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Running End-To-End API Tests
Run the API validation test suite:
```bash
node server/test_endpoints.js
```
