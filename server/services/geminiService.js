const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service
 * 
 * Secure backend service for Google Gemini AI integration
 */

let genAI = null;
let model = null;
let currentModel = 'gemini-1.5-flash';

const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-pro'
];

let modelIndex = 0;

const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY not configured in .env. System will use Smart Logistics Reasoning Engine for AI Assistant.');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    currentModel = FALLBACK_MODELS[modelIndex];
    model = genAI.getGenerativeModel({ model: currentModel });
    console.log(`✓ Gemini AI initialized successfully with model: ${currentModel}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error.message);
    return false;
  }
};

const isGeminiAvailable = () => {
  return genAI !== null && model !== null;
};

const tryFallbackModel = async () => {
  if (modelIndex >= FALLBACK_MODELS.length - 1) {
    return false;
  }
  
  modelIndex++;
  currentModel = FALLBACK_MODELS[modelIndex];
  
  try {
    model = genAI.getGenerativeModel({ model: currentModel });
    console.log(`Switched to fallback model: ${currentModel}`);
    return true;
  } catch (error) {
    console.error(`Failed to switch to ${currentModel}:`, error.message);
    return false;
  }
};

/**
 * Generate AI response specifically answering the user's question
 */
const generateAIResponse = async (userMessage, context = {}, retryCount = 0) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini AI is not configured. Set GEMINI_API_KEY environment variable.');
  }

  try {
    const history = context.conversationHistory || [];
    const relevantData = context.relevantData || context;
    const userRole = (context.userRole || relevantData.projectOverview?.userRole || 'ADMIN').toUpperCase();
    const userName = context.userName || relevantData.projectOverview?.userName || 'User';
    const preferredLang = context.preferredLanguage || 'en';

    let roleDirective = '';
    if (userRole === 'DRIVER') {
      roleDirective = `YOU ARE THE DRIVER AI ASSISTANT FOR LOGGED-IN DRIVER "${userName}".
- Answer questions using ONLY the authenticated driver's data contained in RELEVANT LOGISTICS SYSTEM DATA.
- Help with assigned shipments, pickup/destination, Admin-selected route, assigned vehicle, remaining distance, ETA, live GPS status, route deviation alerts, safety warnings, and driver performance reports.
- NEVER expose data belonging to other drivers or NGOs, or administrative control settings.
- If the driver asks to perform an unauthorized action (e.g. "delete shipment", "change route", "assign driver", "assign vehicle"), answer: "You don't have permission to perform that action."`;
    } else if (userRole === 'NGO') {
      roleDirective = `YOU ARE THE NGO AI ASSISTANT FOR LOGGED-IN NGO "${userName}".
- Answer questions using ONLY the authenticated NGO's data contained in RELEVANT LOGISTICS SYSTEM DATA.
- Help with NGO orders, order status, linked shipments, pickup/destination, assigned driver, assigned vehicle, Admin-selected route, remaining distance, ETA, live shipment tracking, alerts, and NGO reports.
- NEVER expose data belonging to other NGOs or drivers, or administrative control settings.
- NGO cannot manage routes. Always refer to the route as the "Admin-selected route".
- If the NGO asks to perform an unauthorized action (e.g. "change route", "delete shipment", "assign driver", "assign vehicle"), answer: "You don't have permission to perform that action."`;
    } else {
      roleDirective = `YOU ARE THE AI LOGISTICS ASSISTANT FOR SYSTEM ADMIN "${userName}".
- Provide system-wide logistics intelligence, shipment analysis, weather hazards, route optimization, and operational support.`;
    }

    const langDirective = preferredLang === 'hi'
      ? `CRITICAL LANGUAGE REQUIREMENT: THE USER'S PREFERRED LANGUAGE IS HINDI (हिंदी).
YOU MUST WRITE YOUR ENTIRE RESPONSE IN NATURAL HINDI USING DEVANAGARI SCRIPT.
DO NOT ANSWER IN ENGLISH.
Whether the user asks in English ("What is NGO?", "How does GPS work?"), Hinglish ("MongoDB kyu use kiya hai?"), or Hindi ("यह प्रोजेक्ट कैसे काम करता है?"), YOUR RESPONSE MUST BE WRITTEN IN HINDI.
Keep actual database values (such as ID "SHP-2026-0001", Driver Name "Aditya", Location "Lucknow Railway Station", numbers/units "120 km") unchanged, but render all surrounding explanations, bullet points, headers, and sentences in Hindi.`
      : `CRITICAL LANGUAGE REQUIREMENT: THE USER'S PREFERRED LANGUAGE IS ENGLISH. Answer the user in clear, natural English.`;

    const projectKnowledge = `PROJECT KNOWLEDGE & TECHNICAL ARCHITECTURE CONTEXT:
- Problem & Purpose: Disaster-resilient logistics platform optimizing relief freight dispatches during emergencies (floods, heavy rain, landslides) and normal operations.
- Tech Stack:
  • Frontend: React 19 (Vite), TailwindCSS, Leaflet & React-Leaflet GIS Maps, Lucide React, Socket.io-client.
  • Backend: Node.js & Express.js REST APIs microservices architecture.
  • Database: MongoDB & Mongoose ODM (User, Order, Shipment, Vehicle, Route, Alert, AuditLog).
  • Security: JWT (JSON Web Tokens), Bcrypt.js password hashing with salt, Express protect middleware, Mongoose query filtering (req.user._id).
  • Map & Routing: OpenRouteService (ORS) & OSRM API for road network geometry calculation.
  • Weather API: Open-Meteo Weather API for sampling rainfall, wind speed, and hazard risk along route coordinates.
  • Realtime: Socket.IO (locationUpdate, newAlert) for live truck tracking and emergency alerts.
  • AI: Google Gemini AI SDK (@google/generative-ai) & Smart Reasoning Engine.
- User Roles:
  • Admin: System-wide control (Dashboard, Orders, Shipments, Vehicles, Routes, Analytics, Alerts, Reports, AI Assistant). Assigns driver/vehicle and selects route corridor.
  • Driver: Mobile transit view (Dashboard, Assigned Shipments, Alerts, Reports, AI Assistant, Profile). Enables live GPS, follows Admin-selected route, views remaining distance & ETA.
  • NGO: Relief order management (Dashboard, Orders creation/tracking, Alerts, Reports, AI Assistant, Profile). Creates orders, tracks linked shipments. (NGO does NOT have standalone Routes management module).
- System Workflow: NGO creates Order -> Admin verifies & converts to Shipment -> Admin assigns Driver/Vehicle -> System evaluates OSRM route & Open-Meteo weather risks -> Admin selects route -> Driver starts transit with live GPS -> Socket.IO broadcasts location -> System monitors route deviation (>500m Haversine threshold) & weather hazards -> Delivery completed & Reports update.`;

    const systemPrompt = `System Identity & Directive:
${roleDirective}
${langDirective}

${projectKnowledge}

CRITICAL ANSWER ACCURACY & CONCISE RESPONSE RULES:
1. BREVITY & CONCISE FOCUS:
   - KEEP ALL RESPONSES SHORT, SMART, AND DIRECT (1–3 sentences or 2–4 short bullet points).
   - NEVER dump full shipment records, all locations, routes, drivers, and ETAs automatically unless the user explicitly asks for complete details (e.g. "Show full shipment details for SHP-2026-0001").
   - For "Which shipments are active?" / "कौन सी शिपमेंट सक्रिय हैं?", give a brief count and list at most 3–5 representative shipment IDs with their status.
   - For single-field queries ("Who is assigned?", "Pickup location?", "Status?", "Destination?"), answer ONLY the requested field.
2. CLASSIFY & ANSWER DIRECTLY:
   A. PROJECT KNOWLEDGE / TECH / VIVA QUESTIONS (e.g. "Why React?", "Why MongoDB?", "How does Socket.IO work?", "How does route deviation work?", "Explain this project", "What does Admin do?"):
      Answer concisely in 1–3 clear sentences or short bullet points using the PROJECT KNOWLEDGE context.
   B. GENERAL KNOWLEDGE QUESTIONS (e.g. "What is NGO?", "What is logistics?", "What is GPS?"):
      Answer directly and naturally in 1–2 concise sentences.
   C. LIVE OPERATIONAL DATA QUESTIONS (e.g. "What is my shipment status?", "Where is my shipment?", "Who is my driver?", "Which vehicle is assigned?", "What is my ETA?", "Are there any alerts?", "How many orders do I have?"):
      Answer ONLY using the requested attributes from RELEVANT LOGISTICS SYSTEM DATA. Return ONLY the requested field.
3. BREVITY FOR SPECIFIC FIELD QUERIES:
   - "Which shipments are active?" -> "Currently 12 shipments are active. Key active shipments: SHP-2026-0001 (IN_TRANSIT), SHP-2026-0002 (ROUTE_SELECTED)."
   - "Who is assigned to SHP-2026-0001?" -> "Driver Aditya (Vehicle: UP-32-AB-1234) is assigned to SHP-2026-0001."
   - "Where is the pickup location?" -> "Pickup location: Delhi, Medical Hub."
   - "What is the destination?" -> "Destination: KGMU, Lucknow."
   - "What is the status?" -> "Shipment SHP-2026-0001 is currently IN_TRANSIT."
4. LANGUAGE & HINGLISH: Match the user's language/dialect. If Hindi is selected, answer in natural Devanagari Hindi while keeping proper technical terms in English script.
5. NO FAKE DATA: Never invent database values, driver names, vehicle numbers, coordinates, or distance for operational queries.

CONVERSATION HISTORY:
${JSON.stringify(history, null, 2)}

RELEVANT LOGISTICS SYSTEM DATA:
${JSON.stringify(relevantData, null, 2)}

EXACT USER QUESTION:
${userMessage}

Provide a concise, direct, question-specific response formatted cleanly in GitHub Markdown.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('Gemini AI error:', error);
    
    const status = error.status || error.response?.status;
    const errorMessage = error.message || '';
    
    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      if (retryCount === 0) {
        const switched = await tryFallbackModel();
        if (switched) {
          return await generateAIResponse(userMessage, context, retryCount + 1);
        }
      }
      const rateLimitError = new Error('AI service rate limit reached. Using Smart Logistics Reasoning Engine.');
      rateLimitError.code = 'RATE_LIMIT';
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    
    throw error;
  }
};

const processLogisticsChat = async (userQuery, contextData = {}) => {
  return await generateAIResponse(userQuery, contextData);
};

module.exports = {
  initializeGemini,
  isGeminiAvailable,
  generateAIResponse,
  processLogisticsChat
};
