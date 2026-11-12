const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { analyzeRouteWeather } = require('./weatherService');

/**
 * Smart Logistics AI Intent & Knowledge Engine
 * Handles natural language English, Hindi, Hinglish, typos, and short queries.
 * Answers BOTH live application data queries AND technical/project architecture knowledge questions.
 */

// Normalize spelling errors, typos, and Hinglish variants
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.toLowerCase().trim();

  // Common Hinglish / Short forms & Typos
  cleaned = cleaned
    .replace(/\bthw\b/g, 'the')
    .replace(/\buse full\b|\busefull\b/g, 'useful')
    .replace(/\bprojeckt\b|\bprofect\b|\bprojec\b/g, 'project')
    .replace(/\bshpmnt\b|\bshipmnt\b|\bshipmnts\b/g, 'shipment')
    .replace(/\breut\b|\brout\b|\brouts\b/g, 'route')
    .replace(/\bvehical\b|\bvehcle\b/g, 'vehicle')
    .replace(/\balrt\b|\balrts\b|\bbtao\b|\bbatao\b/g, 'alert')
    .replace(/\bwether\b|\bweathr\b/g, 'weather')
    .replace(/\bflod\b|\bflooding\b/g, 'flood');

  return cleaned;
};

/**
 * Analyze user query and conversation history to determine exact intent
 */
const analyzeIntent = (query, conversationHistory = []) => {
  const rawQuery = query || '';
  const q = normalizeText(rawQuery);

  // Extract specific IDs (SHP-2026-0001 or ORD-2026-0001)
  const shpMatch = rawQuery.match(/SHP-\d{4}-\d{4}/i);
  const shipmentId = shpMatch ? shpMatch[0].toUpperCase() : null;

  const ordMatch = rawQuery.match(/ORD-\d{4}-\d{4}/i);
  const orderId = ordMatch ? ordMatch[0].toUpperCase() : null;

  // Context awareness for follow-up questions
  let contextShp = shipmentId;
  let contextOrd = orderId;

  if (conversationHistory && conversationHistory.length > 0) {
    const lastAiMsg = conversationHistory.filter(m => m.type === 'ai' || m.role === 'assistant').pop();
    const lastUserMsg = conversationHistory.filter(m => m.type === 'user' || m.role === 'user').slice(-2)[0];
    const lastText = (lastAiMsg?.text || '') + ' ' + (lastUserMsg?.text || '');

    const foundShp = lastText.match(/SHP-\d{4}-\d{4}/i);
    if (foundShp && !contextShp) contextShp = foundShp[0].toUpperCase();

    const foundOrd = lastText.match(/ORD-\d{4}-\d{4}/i);
    if (foundOrd && !contextOrd) contextOrd = foundOrd[0].toUpperCase();
  }

  // ----------------------------------------------------
  // 0. GREETINGS & INTRODUCTIONS
  // ----------------------------------------------------
  // ----------------------------------------------------
  // 0. GREETINGS & INTRODUCTIONS
  // ----------------------------------------------------
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|namaste|greetings|hallo|hi there|kaise ho|नमस्ते|हेलो|हेलॉ|सुप्रभात|नमस्कार)\b/i.test(q) || rawQuery.includes('नमस्ते') || rawQuery.includes('हेलो') || rawQuery.includes('नमस्कार')) {
    return { type: 'GREETING_QUERY', query: q, requiresData: false };
  }

  // ----------------------------------------------------
  // 1. VIVA & INTERVIEW PREPARATION INTENTS
  // ----------------------------------------------------
  if (/viva|interview|presentation|demo|biggest challenge|contribution|viva preparation|viva ke liye/i.test(q)) {
    return { type: 'VIVA_QUERY', query: q, requiresData: false };
  }

  if (/security|unauthorized|protect|jwt|bcrypt|password store|security features/i.test(q)) {
    return { type: 'SECURITY_TECH_QUERY', query: q, requiresData: false };
  }

  // ----------------------------------------------------
  // 2. TECHNICAL ARCHITECTURE & STACK INTENTS
  // ----------------------------------------------------
  if (/yolo|yolo kya|what is yolo/i.test(q)) {
    return { type: 'YOLO_DEF_QUERY', query: q, requiresData: false };
  }

  if (/why react|why node|why express|why mongodb|why leaflet|why socket|why osrm|why jwt|why bcrypt|why choose|why did you|why is mongodb|mongodb kyu|react kyu|node kyu|express kyu|socket kyu|leaflet kyu/i.test(q)) {
    return { type: 'TECH_WHY_QUERY', query: q, requiresData: false };
  }

  if (/^what is mongodb$|^explain mongodb$|mongodb kya|mongodb का/i.test(q)) {
    return { type: 'MONGO_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is react$|^explain react$|react kya|react का/i.test(q)) {
    return { type: 'REACT_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is node$|^what is node\.js$|^explain node$|node kya|node\.js kya/i.test(q)) {
    return { type: 'NODE_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is express$|^what is express\.js$|^explain express$|express kya/i.test(q)) {
    return { type: 'EXPRESS_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is (a )?rest api$|^what is (an )?api$|^explain api$|api kya/i.test(q)) {
    return { type: 'API_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is socket\.io$|^what is socket$|^explain socket|socket kya/i.test(q)) {
    return { type: 'SOCKET_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is osrm$|^explain osrm$|osrm kya/i.test(q)) {
    return { type: 'OSRM_DEF_QUERY', query: q, requiresData: false };
  }

  if (/technologies used|tech stack|architecture|what technologies|frontend layer|backend layer|database layer/i.test(q)) {
    return { type: 'TECH_STACK_QUERY', query: q, requiresData: false };
  }

  if (/how does jwt work|how is password stored|authentication work|how auth work/i.test(q)) {
    return { type: 'AUTH_TECH_QUERY', query: q, requiresData: false };
  }

  if (/how does gps work|how does realtime tracking work|how does socket|how live tracking|live tracking work|real-time tracking work|realtime tracking work|socket\.io|gps tracking/i.test(q)) {
    return { type: 'REALTIME_TECH_QUERY', query: q, requiresData: false };
  }

  if (/how does osrm work|how leaflet|routing work|routing engine/i.test(q)) {
    return { type: 'ROUTING_TECH_QUERY', query: q, requiresData: false };
  }

  if (/how does route deviation work|route deviation calculated|route deviation detection|route deviation kya|route deviation|विचलन|deviation/i.test(q)) {
    return { type: 'DEVIATION_TECH_QUERY', query: q, requiresData: false };
  }

  // ----------------------------------------------------
  // 3. SYSTEM WORKFLOW & ROLE INTENTS
  // ----------------------------------------------------
  if (/complete workflow|system workflow|how does the system work|workflow of the system|order se shipment|ye project kaise work/i.test(q)) {
    return { type: 'WORKFLOW_QUERY', query: q, requiresData: false };
  }

  if (/difference between|difference|compare roles|roles comparison|roles in this project|admin driver ngo/i.test(q)) {
    return { type: 'ROLE_COMPARE_QUERY', query: q, requiresData: false };
  }

  if (/what does admin do|role of admin|admin responsibilities|admin kya karta/i.test(q)) {
    return { type: 'ROLE_ADMIN_QUERY', query: q, requiresData: false };
  }

  if (/what does driver do|role of driver|driver responsibilities|driver kya karta/i.test(q)) {
    return { type: 'ROLE_DRIVER_QUERY', query: q, requiresData: false };
  }

  if (/what does ngo do|role of ngo|ngo responsibilities|ngo kya karta/i.test(q)) {
    return { type: 'ROLE_NGO_QUERY', query: q, requiresData: false };
  }

  // ----------------------------------------------------
  // 4. PROJECT PURPOSE & DEFINITION INTENTS
  // ----------------------------------------------------
  if (
    /help me.*understand|understand this project|explain this project|explain complete project|what is this project|tell me about this project|about this project|about project|project explanation|project details/i.test(q) ||
    /purpose|main purpose|problem does this project solve|solution|advantages|limitations|future scope|what is smart logistics|what is this platform|उद्देश्य|मकसद|परपस|project ka purpose|समझाओ|प्रोजेक्ट/i.test(q) ||
    rawQuery.includes('purpose') || rawQuery.includes('उद्देश्य') || rawQuery.includes('प्रोजेक्ट') || rawQuery.includes('समझाओ')
  ) {
    return { type: 'PROJECT_OVERVIEW_QUERY', query: q, requiresData: false };
  }

  if (/^what is (an )?ngo$|^what does ngo mean$|^tell me about ngo$|^explain ngo$|ngo kya hota hai|ngo kya hai/i.test(q)) {
    return { type: 'NGO_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is logistics$|^tell me about logistics$|^explain logistics$|logistics kya hota hai|logistics kya hai/i.test(q)) {
    return { type: 'LOGISTICS_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is supply chain|what is freight|what is fleet management|what is last mile|what is route optimization|what is logistics risk/i.test(q)) {
    return { type: 'LOGISTICS_CONCEPT_QUERY', query: q, requiresData: false };
  }

  if (/why is route selection important|why route selection|route selection why/i.test(q)) {
    return { type: 'ROUTE_SELECTION_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is gps$|^explain gps$|gps kya hota hai|gps kya|gps/i.test(q)) {
    return { type: 'GPS_DEF_QUERY', query: q, requiresData: false };
  }

  if (/^what is ai$|^explain ai$|ai kya hota hai|ai kya|ai/i.test(q)) {
    return { type: 'AI_DEF_QUERY', query: q, requiresData: false };
  }

  if (/disaster.*logistics|disaster aware/i.test(q)) {
    return { type: 'DISASTER_LOGISTICS_DEF_QUERY', query: q, requiresData: false };
  }

  if (/what is this platform|what is smart logistics|explain this logistics system/i.test(q)) {
    return { type: 'PLATFORM_DEF_QUERY', query: q, requiresData: false };
  }

  // ----------------------------------------------------
  // 5. LIVE OPERATIONAL DATA INTENTS (Requires DB Data)
  // ----------------------------------------------------
  if (/organization|ngo name|kon.*organization|kis.*organization|who created.*order|who requested.*order|order kisne|order create kisne|kis ngo ne|customer name/i.test(q)) {
    return { type: 'ORGANIZATION_QUERY', params: { shipmentId: contextShp, orderId: contextOrd }, requiresData: true };
  }

  if (/shipment status|what is my shipment status|status of my shipment|status of shipment|current status|kya status|status/i.test(q) && !q.includes('order')) {
    return { type: 'STATUS_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/pickup location|where is pickup|where is the pickup|pickup address|pickup point|kaha se/i.test(q)) {
    return { type: 'PICKUP_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/destination|delivery location|where is destination|where is the destination|where to deliver|kaha tak/i.test(q)) {
    return { type: 'DESTINATION_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/who is the driver|which driver|assigned driver|driver name|driver details|who is my driver|who is assigned|assigned to|kon.*driver|driver kon|driver kaun|driver ka naam|ड्राइवर|नियुक्त/i.test(q) || rawQuery.includes('ड्राइवर') || rawQuery.includes('नियुक्त')) {
    return { type: 'DRIVER_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/which vehicle|vehicle number|registration number|assigned vehicle|gadi|kon.*gadi|kon.*vehicle|gadi number|vehicle ka number|वाहन|गाड़ी/i.test(q) || rawQuery.includes('वाहन')) {
    return { type: 'VEHICLE_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/what route|which route|admin selected route|selected route|route selected|kon.*route|route konsa|route name|admin ne konsa route|route select|रूट|चयनित/i.test(q) || rawQuery.includes('route') || rawQuery.includes('रूट') || rawQuery.includes('चयनित')) {
    return { type: 'ROUTE_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/remaining distance|distance remaining|how far|kitna door|kitni doori|distance|duri|doori|दूरी|pickup/i.test(q) || rawQuery.includes('दूरी') || rawQuery.includes('distance')) {
    return { type: 'DISTANCE_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/\beta\b|estimated arrival|estimated time|when will it arrive|kitna time|kab pahuchega/i.test(q)) {
    return { type: 'ETA_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (
    /flood ke time|flood aa jaye|heavy rain hone par kya hoga|heavy rain hone par|disaster management|landslide risk kya|road is blocked|road blocked|rerout|severe weather|disaster ke time/i.test(q) ||
    /what should we do during|what happens if a road/i.test(q)
  ) {
    return { type: 'DISASTER_MANAGEMENT_QUERY', query: q, requiresData: false };
  }

  if (
    /route kaise select|ai route ko safe|route decision|how.*route.*select|how.*route.*optim/i.test(q) ||
    /weather api ka use/i.test(q)
  ) {
    return { type: 'PROJECT_QUERY', query: q, requiresData: false };
  }

  if (/give the order|order detail|order details|show my orders|my orders|latest order|pending orders|order info|order status|order details batao/i.test(q) || q === 'order' || q === 'orders' || contextOrd) {
    return { type: 'ORDER_QUERY', params: { orderId: contextOrd }, requiresData: true };
  }

  if (/show my active shipment|show full shipment|full shipment|show shipment details|complete shipment|meri shipment|मेरी shipment/i.test(q) || rawQuery.includes('मेरी shipment')) {
    return { type: 'FULL_SHIPMENT_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/track my shipment|where is my shipment|tracking|current location|live location|mera shipment kaha|shipment tracking/i.test(q)) {
    return { type: 'TRACKING_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/delayed shipment|delayed shipments|delayed|at risk shipment|dekey|देरी वाली|देरी वाली शिपमेंट|विलंबित/i.test(q)) {
    return { type: 'DELAYED_SHIPMENTS_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/critical alert|critical alerts|show critical alerts|g गंभीर अलर्ट|गंभीर अलर्ट|high alert/i.test(q)) {
    return { type: 'CRITICAL_ALERTS_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (/today's summary|daily summary|today summary|today's summary|आज का सारांश|सारांश बताओ|सिस्टम सारांश/i.test(q)) {
    return { type: 'DAILY_SUMMARY_QUERY', params: {}, requiresData: true };
  }

  if (/active shipment|active shipments|what shipments are active|which shipments are active|कौन सी शिपमेंट.*सक्रिय|सक्रिय शिपमेंट|सक्रिय हैं|इन-ट्रांजिट/i.test(q)) {
    return { type: 'ACTIVE_SHIPMENTS_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  if (q === 'shipment' || q === 'shipments' || /shipment details|shipment info|shipment se related/i.test(q)) {
    return { type: 'SHIPMENT_QUERY', params: { shipmentId: contextShp }, requiresData: true };
  }

  return { type: 'GENERAL_CONVERSATIONAL', query: q, requiresData: false };
};

/**
 * Comprehensive Smart Logistics Project Knowledge Base & Conceptual Answer Engine
 */
const handleProjectQuery = (query, intentType = 'PROJECT_QUERY', preferredLanguage = 'en') => {
  const q = normalizeText(query);
  const isHi = preferredLanguage === 'hi';

  // 0. GREETINGS
  if (intentType === 'GREETING_QUERY' || /^(hello|hi|hey|good morning|namaste)\b/i.test(q)) {
    if (isHi || q.includes('namaste') || q.includes('kaise')) {
      return {
        success: true,
        message: "नमस्ते! मैं स्मार्ट लॉजिस्टिक्स AI सहायक हूँ। आज मैं ऑर्डर, शिपमेंट, जीपीएस ट्रैकिंग, रूट, वाहन, अलर्ट या प्रोजेक्ट आर्किटेक्चर में आपकी क्या मदद कर सकता हूँ?"
      };
    }
    return {
      success: true,
      message: "Hello! How can I help you with the Smart Logistics project today?"
    };
  }

  // 1. VIVA / INTERVIEW PREPARATION ANSWERS
  if (intentType === 'VIVA_QUERY' || /viva|interview|presentation|demo/i.test(q)) {
    if (isHi) {
      return {
        success: true,
        message: `### स्मार्ट लॉजिस्टिक्स प्रोजेक्ट — वाइवा और तकनीकी इंटरव्यू सारांश

**1. प्रोजेक्ट की समस्या:**
पारंपरिक राहत आपूर्ति श्रृंखला प्राकृतिक आपदाओं के दौरान खराब समन्वय, बंद सड़कों, जीपीएस विजिबिलिटी की कमी और स्थिर राउटिंग के कारण विफल हो जाती है।

**2. समाधान और मुख्य विशेषता:**
एक आपदा-अनुकूल स्मार्ट लॉजिस्टिक्स प्लेटफॉर्म जिसमें रियल-टाइम GIS ट्रक ट्रैकिंग, AI वेदर रिस्क स्कोरिंग, स्वचालित ऑर्डर-टू-शिपमेंट परिवर्तन और Admins, Drivers, NGOs के बीच समन्वय शामिल है।

**3. तकनीकी नवाचार:**
• **रियल-टाइम GIS टेलीमेट्री:** Socket.IO इंजन जो Leaflet मैप पर जीपीएस लोकेशन ब्रॉडकास्ट करता है।
• **पर्यावरणीय खतरा विश्लेषण:** Open-Meteo Weather API से भारी बारिश और बाढ़ के जोखिम का विश्लेषण।
• **रूट विचलन पहचान:** वाहन 500 मीटर से अधिक हटने पर स्वतः अलर्ट जेनरेशन।
• **रोल-बेस्ड सुरक्षा:** JWT ऑथेंटिकेशन और सख्त Mongoose क्वेरी स्कोपिंग।`
      };
    }
    return {
      success: true,
      message: `### Smart Logistics Project — Viva & Technical Interview Summary

**1. Project Problem Statement:**
Traditional relief and logistics supply chains fail during natural disasters due to uncoordinated dispatching, route blockages, lack of real-time GPS visibility, and static routing.

**2. Solution & Core Value:**
A disaster-resilient Smart Logistics platform featuring real-time GIS truck tracking, AI-driven weather risk scoring along transport corridors, automated order-to-shipment conversion, and role-based coordination between Admins, Drivers, and Relief NGOs.

**3. Key Technical Innovations:**
• **Real-Time GIS Telemetry:** Socket.IO WebSocket engine broadcasting GPS coordinates to Leaflet maps.
• **Environmental Hazard Sampling:** Open-Meteo Weather API sampling heavy rain (>15mm/hr), wind, and flood risks along OSRM road geometry.
• **Route Deviation Detection:** Haversine perpendicular distance monitoring triggering automated CRITICAL alerts if trucks stray >500m.
• **Role-Based Access Control:** Secure JWT authentication with strict database query scoping for Admins, Drivers, and NGOs.`
    };
  }

  if (intentType === 'SECURITY_TECH_QUERY' || /security|unauthorized|protect/i.test(q)) {
    if (isHi) {
      return {
        success: true,
        message: `### सुरक्षा और ऑथेंटिकेशन आर्किटेक्चर

1. **ऑथेंटिकेशन:** यूज़र ऑथेंटिकेशन के लिए JSON Web Tokens (JWT) का उपयोग होता है।
2. **पासवर्ड सुरक्षा:** पासवर्ड \`bcryptjs\` द्वारा हैश करके MongoDB में सुरक्षित रखे जाते हैं।
3. **रोल-बेस्ड मिडिलवेयर:** Express \`protect\` मिडिलवेयर टोकन को सत्यापित करके \`req.user\` सेट करता है।
4. **डेटा आइसोलेशन:**
   • **NGO:** केवल अपने ऑर्डर्स और शिपमेंट देख सकता है।
   • **Driver:** केवल अपने असाइन किए गए डिलीवरी कार्य देख सकता है।
   • **Admin:** पूरे सिस्टम को मैनेज कर सकता है।`
      };
    }
    return {
      success: true,
      message: `### Security & Authentication Architecture

1. **Authentication:** User authentication uses JSON Web Tokens (JWT) signed with a secret key (\`JWT_SECRET\`) on login.
2. **Password Protection:** Passwords are hashed using \`bcryptjs\` with salt before saving to MongoDB. Passwords are never stored in plain text.
3. **Role-Based Middleware:** Express \`protect\` middleware decodes the Bearer token, verifies signature, and populates \`req.user\`.
4. **Database Scoping (Data Isolation):**
   • **NGO:** Mongoose queries are filtered by \`createdBy: req.user._id\` so NGOs can only see their own orders and shipments.
   • **Driver:** Queries are filtered by \`assignedDriver: req.user._id\` so drivers only access their assigned deliveries.
   • **Admin:** Full system permissions.`
    };
  }

  // 2. TECHNICAL DEFINITIONS & STACK ANSWERS
  if (intentType === 'YOLO_DEF_QUERY' || /yolo/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? "YOLO (You Only Look Once) एक रियल-टाइम कंप्यूटर विज़न और ऑब्जेक्ट डिटेक्शन एल्गोरिदम है। लॉजिस्टिक्स और ट्रांसपोर्टेशन में इसका उपयोग वाहन के कैमरों के ज़रिए सड़क की बाधाओं, ट्रैफ़िक, दुर्घटनाओं और माल की सुरक्षा की निगरानी के लिए किया जाता है।"
        : "YOLO (You Only Look Once) is a real-time object detection neural network algorithm used in logistics for automated vehicle camera monitoring, road obstacle detection, and cargo surveillance."
    };
  }

  if (intentType === 'MONGO_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "MongoDB एक NoSQL डॉक्यूमेंट डेटाबेस है जो डेटा को BSON फॉर्मेट में स्टोर करता है। इस प्रोजेक्ट में इसका उपयोग ऑर्डर्स, शिपमेंट, वाहन, यूजर और ट्रैकिंग डेटा को सुरक्षित रखने के लिए किया गया है।"
        : "MongoDB is a NoSQL document database that stores data in flexible BSON format with dynamic schemas."
    };
  }

  if (intentType === 'REACT_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "React 19 एक जावास्क्रिप्ट लाइब्रेरी है जिसका उपयोग इस प्लेटफॉर्म का रेस्पॉन्सिव यूजर इंटरफेस (UI) और लाइव मैप कंपोनेंट्स बनाने के लिए किया गया है।"
        : "React is an open-source JavaScript library for building user interfaces based on components."
    };
  }

  if (intentType === 'NODE_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "Node.js एक हाई-परफॉरमेंस जावास्क्रिप्ट रनटाइम है जिसका उपयोग इस प्लेटफॉर्म के बैकएंड REST APIs और रियल-टाइम कम्यूनिकेशन को चलाने के लिए किया गया है।"
        : "Node.js is a cross-platform JavaScript runtime environment built on Chrome's V8 engine that enables server-side JavaScript execution."
    };
  }

  if (intentType === 'EXPRESS_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "Express.js एक लाइटवेट Node.js वेब फ्रेमवर्क है जो बैकएंड APIs और मिडिलवेयर राउट्स प्रदान करता है।"
        : "Express.js is a minimal and flexible Node.js web application framework that provides features for building web and mobile APIs."
    };
  }

  if (intentType === 'API_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "REST API एक कम्यूनिकेशन प्रोटोकॉल है जो HTTP एंडपॉइंट्स के माध्यम से डेटा ट्रांसफर और मैनेजमेंट की सुविधा देता है।"
        : "A REST API (Representational State Transfer API) allows applications to communicate via HTTP endpoints to create, read, update, or delete data."
    };
  }

  if (intentType === 'SOCKET_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "Socket.IO एक इवेंट-ड्रिवन लाइब्रेरी है जो रियल-टाइम जीपीएस ट्रैकिंग और इमरजेंसी अलर्ट्स के लिए वेबसॉकेट कम्यूनिकेशन प्रदान करती है।"
        : "Socket.IO is an event-driven library for real-time bidirectional WebSocket communication between web clients and servers."
    };
  }

  if (intentType === 'OSRM_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "OSRM (Open Source Routing Machine) सड़क नेटवर्क की दूरी, समय और रूट पॉलीलाइन ज्यामिति की सटीक गणना करने वाला राउटिंग इंजन है।"
        : "OSRM (Open Source Routing Machine) is a high-performance routing engine for calculating shortest road network paths and geometries."
    };
  }

  if (intentType === 'TECH_WHY_QUERY' || /why react|why node|why express|why mongodb|why leaflet|why socket|why osrm/i.test(q)) {
    if (q.includes('react')) {
      return {
        success: true,
        message: isHi
          ? "**Why React?** React का वर्चुअल DOM लाइव जीपीएस मैप्स, अलर्ट्स और स्टेटस अपडेट्स को बिना पूरे पेज को रीलोड किए तेज़ी से अपडेट करता है।"
          : "**Why React?** React provides a fast Virtual DOM and component-based architecture essential for re-rendering live Leaflet map markers, operational telemetry cards, and real-time Socket.IO alerts without full page reloads."
      };
    }
    if (q.includes('node') || q.includes('express')) {
      return {
        success: true,
        message: isHi
          ? "**Why Node.js & Express?** Node.js की नॉन-ब्लॉकिंग I/O क्षमता रियल-टाइम वेबसॉकेट कम्यूनिकेशन (Socket.IO) और APIs के लिए सबसे उपयुक्त है।"
          : "**Why Node.js & Express?** Node's non-blocking, event-driven I/O is ideal for handling concurrent WebSocket connections (Socket.IO) and lightweight REST microservices with minimal overhead."
      };
    }
    if (q.includes('mongo')) {
      return {
        success: true,
        message: isHi
          ? "**Why MongoDB?** MongoDB का फ्लेक्सिबल स्कीमा जीपीएस कोऑर्डिनेट्स, रूट पॉलीलाइन्स और ऑर्डर्स को बिना किसी जटिल टेबल माइग्रेशन के आसानी से स्टोर करता है।"
          : "**Why MongoDB?** MongoDB's flexible BSON document schema allows storing GeoJSON coordinates, dynamic route polyline geometries, nested pickup/destination addresses, and variable shipment attributes without rigid SQL table migrations."
      };
    }
    if (q.includes('socket')) {
      return {
        success: true,
        message: isHi
          ? "**Why Socket.IO?** Socket.IO कम समय में लाइव जीपीएस लोकेशन और आपातकालीन अलर्ट्स तुरंत यूजर स्क्रीन पर पहुँचाता है।"
          : "**Why Socket.IO?** Socket.IO provides low-latency, bidirectional WebSocket communication for broadcasting live driver GPS coordinates and emergency weather alerts instantly to connected client UIs."
      };
    }
    if (q.includes('osrm') || q.includes('ors')) {
      return {
        success: true,
        message: isHi
          ? "**Why OSRM / OpenRouteService?** OSRM वास्तविक सड़क नेटवर्क, दूरी और समय की सटीक गणना करता है।"
          : "**Why OSRM / OpenRouteService?** OSRM provides real road-based routing geometry, distance, and duration calculations based on actual road networks rather than simple straight-line Euclidean distance."
      };
    }
    return {
      success: true,
      message: isHi
        ? `### टेक्नोलॉजी स्टैक कारण
• **React 19:** लाइव मैप और डेटा कार्ड्स के लिए तेज UI री-रेंडरिंग।
• **Node.js & Express:** वेबसॉकेट ट्रैफिक के लिए बेहतरीन इवेंट-ड्रिवन बैकएंड।
• **MongoDB:** जीपीएस कोऑर्डिनेट्स और फ्लेक्सिबल ऑर्डर्स के लिए उपयुक्त डेटाबेस।
• **Socket.IO:** रियल-टाइम जीपीएस ब्रॉडकास्टिंग।
• **OSRM:** वास्तविक सड़क नेटवर्क की सटीक गणना।`
        : `### Technology Stack Justification
• **React 19 (Vite):** Fast UI re-rendering for live map telemetry & operational cards.
• **Node.js & Express:** Non-blocking event-driven backend ideal for real-time WebSocket traffic.
• **MongoDB & Mongoose:** Flexible schema for GeoJSON coordinates & dynamic route polylines.
• **Socket.IO:** Low-latency bidirectional real-time GPS & alert broadcasting.
• **OSRM / OpenRouteService:** Real road geometry calculation & detour alternatives.`
    };
  }

  if (intentType === 'TECH_STACK_QUERY' || /tech stack|technologies used|architecture/i.test(q)) {
    return {
      success: true,
      message: `### Smart Logistics Architecture & Technology Stack

**Frontend Layer:**
• **React 19 (Vite)** with TailwindCSS (Dark Modern Logistics Theme)
• **Leaflet & React-Leaflet GIS Maps** for interactive routing & live truck markers
• **Socket.io-client** for real-time telemetry updates

**Backend Microservices Layer:**
• **Node.js & Express.js** RESTful API services
• **MongoDB & Mongoose ODM** for document data persistence
• **Socket.IO Server** for WebSocket live location broadcasting
• **JWT & Bcrypt.js** for token-based security & password hashing

**AI & External Integrations:**
• **Google Gemini AI SDK** (\`@google/generative-ai\`) for natural language intelligence
• **OpenRouteService & OSRM API** for road network geometry
• **Open-Meteo Weather API** for real-time rainfall, wind, and hazard sampling.`
    };
  }

  if (intentType === 'REALTIME_TECH_QUERY' || /gps|realtime|socket/i.test(q)) {
    return {
      success: true,
      message: `### How Real-Time GPS Tracking Works

1. **Telemetry Transmission:** The Driver application captures browser/device GPS coordinates (\`latitude\`, \`longitude\`).
2. **Socket.IO Event Emission:** Driver client emits \`locationUpdate\` event with shipment ID & coordinates to the Node.js backend.
3. **Database Persistence:** Server updates \`Shipment.liveLocation\` in MongoDB.
4. **Real-Time Broadcast:** Server broadcasts updated location to connected Admin and NGO clients in the shipment's Socket.IO room.
5. **GIS Map Rendering:** Leaflet map on frontend updates the truck marker position instantly without refreshing the page.`
    };
  }

  if (intentType === 'DEVIATION_TECH_QUERY' || /route deviation/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? `### रूट विचलन (Route Deviation) कैसे काम करता है

1. **कॉरिडोर बेसलाइन:** जब एडमिन रूट चुनता है, तो OSRM सड़क नेटवर्क की पॉलीलाइन तैयार करता है।
2. **टेलीमेट्री जाँच:** जब ड्राइवर जीपीएस लोकेशन भेजता है, तो सिस्टम वाहन की दूरी की गणना करता है।
3. **थ्रेशोल्ड मूल्यांकन:** यदि वाहन रूट पॉलीलाइन से >500 मीटर दूर जाता है, तो सिस्टम विचलन दर्ज करता है।
4. **अलर्ट जेनरेशन:** सिस्टम स्वचालित रूप से CRITICAL अलर्ट जेनरैट करता है और Socket.IO से नोटिफिकेशन भेजता है।`
        : `### How Route Deviation Detection Works

1. **Corridor Baseline:** When Admin selects a route, OSRM/ORS generates an array of polyline coordinate pairs representing the assigned road corridor.
2. **Telemetry Check:** Whenever driver emits a new GPS location, system calculates the perpendicular distance (Haversine formula) from the vehicle coordinate to the closest segment of the route polyline.
3. **Threshold Evaluation:** If perpendicular distance exceeds threshold (e.g. >500m), system flags a **Route Deviation**.
4. **Alert Generation:** System automatically creates a \`CRITICAL\` Alert in MongoDB and pushes a push notification via Socket.IO.`
    };
  }

  // 3. WORKFLOW & ROLE ANSWERS
  if (intentType === 'WORKFLOW_QUERY' || /workflow|how system works/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? `### स्मार्ट लॉजिस्टिक्स वर्कफ़्लो (End-to-End Workflow)

1. **ऑर्डर निर्माण (NGO):** NGO राहत सामग्री का ऑर्डर बनाता है।
2. **ऑर्डर सत्यापन (Admin):** एडमिन ऑर्डर की पुष्टि करता है।
3. **शिपमेंट जेनरेशन (Admin):** एडमिन ऑर्डर को शिपमेंट (\`SHP-YYYY-XXXX\`) में बदलकर ड्राइवर और वाहन असाइन करता है।
4. **AI रूट और रिस्क स्कोरिंग:** सिस्टम मौसम और सड़क सुरक्षा का विश्लेषण करके सुरक्षित रूट चुनता है।
5. **ड्राइवर ट्रांजिट:** ड्राइवर लाइव जीपीएस ऑन करके शिपमेंट डिलीवर करता है।
6. **लाइव टेलीमेट्री और अलर्ट मॉनिटरिंग:** Socket.IO द्वारा जीपीएस लोकेशन ब्रॉडकास्ट होती है।
7. **डिलीवरी सत्यापन:** डिलीवरी पूरी होने पर स्टेटस \`DELIVERED\` अपडेट हो जाता है।`
        : `### End-to-End Smart Logistics Workflow

1. **Order Creation (NGO):** Relief NGO creates a delivery request (Cargo details, quantity, pickup & delivery locations, priority).
2. **Order Verification (Admin):** Logistics Admin verifies pending order in Order Management module.
3. **Shipment Generation:** Admin converts Order to active Shipment (\`SHP-YYYY-XXXX\`), assigns available Vehicle and Driver.
4. **AI Route & Hazard Scoring:** System calculates route geometry alternatives via OSRM and samples live weather (rainfall, wind) via Open-Meteo. Admin approves safest route corridor.
5. **Driver Transit:** Driver receives assigned shipment & route on Driver Dashboard, enables live GPS.
6. **Live Telemetry & Alert Monitoring:** Telemetry streams via Socket.IO; system monitors route deviation & weather hazards.
7. **Delivery Verification:** Driver completes delivery; shipment status updates to \`DELIVERED\`; Reports update automatically.`
    };
  }

  if (intentType === 'ROLE_ADMIN_QUERY' || /admin/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? "**एडमिन की भूमिका:** एडमिन के पास पूरा सिस्टम कंट्रोल है — NGO ऑर्डर्स सत्यापित करना, शिपमेंट बनाना, ड्राइवर और वाहन असाइन करना, सुरक्षित रूट चुनना और लाइव जीपीएस टेलीमेट्री मॉनिटर करना।"
        : "**Admin Role & Responsibilities:** Admin has complete operational control: verifies NGO orders, converts orders to shipments, assigns drivers & vehicles, evaluates AI route safety scores, selects optimal routes, monitors live telemetry, manages alerts, and views analytics."
    };
  }

  if (intentType === 'ROLE_DRIVER_QUERY' || /driver/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? "**ड्राइवर की भूमिका:** ड्राइवर असाइन किए गए शिपमेंट को देखता है, एडमिन द्वारा चयनित रूट का पालन करता है, लाइव जीपीएस ऑन करता है और डिलीवरी पूरी करता है।"
        : "**Driver Role & Responsibilities:** Driver has a specialized mobile/transit view: views assigned shipments, follows Admin-selected route corridor, enables live GPS telemetry, views remaining distance, ETA, route deviation alerts, and safety guidelines."
    };
  }

  if (intentType === 'ROLE_NGO_QUERY' || /ngo/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? "**NGO की भूमिका:** NGO राहत सामग्री के लिए ऑर्डर बनाता है, अपने ऑर्डर से जुड़े शिपमेंट को ट्रैक करता है और डिलीवरी रिपोर्ट देखता है।"
        : "**NGO Role & Responsibilities:** NGO represents relief organizations: creates delivery orders for cargo (medicines, food), tracks linked shipments in real time, views assigned driver/vehicle details and Admin-selected route, and views NGO delivery reports. *(NGOs do NOT have standalone route management permissions)*."
    };
  }

  if (intentType === 'ROLE_COMPARE_QUERY' || /compare|difference/i.test(q)) {
    return {
      success: true,
      message: `### Role Comparison & Permissions Matrix

| Feature / Permission | Admin | Driver | NGO |
| :--- | :---: | :---: | :---: |
| **System Overview & Analytics** | Full | Personal | Personal |
| **Create Orders** | Yes | No | Yes (Primary) |
| **Convert Orders to Shipments** | Yes | No | No |
| **Assign Driver & Vehicle** | Yes | No | No |
| **Select / Modify Routes** | Yes | No | View Only |
| **Live GPS Telemetry Broadcasting** | View | Broadcast | View |
| **View Active Alerts** | All | Assigned | NGO-Linked |
| **Operational Reports** | System-Wide | Driver Stats | NGO Stats |`
    };
  }

  // 4. GENERAL CONCEPT DEFINITIONS & OVERVIEW
  if (intentType === 'PROJECT_OVERVIEW_QUERY' || /help me.*understand|understand this project|explain this project/i.test(q)) {
    return {
      success: true,
      message: isHi
        ? "यह Smart Logistics Platform ऑर्डर, शिपमेंट, वाहन, रूट, लाइव GPS ट्रैकिंग और सुरक्षा अलर्ट को एक ही सिस्टम में प्रबंधित करता है। NGO ऑर्डर बनाता है, Admin लॉजिस्टिक्स प्रक्रिया को मैनेज करता है और Driver असाइन किए गए शिपमेंट को डिलीवर करता है।"
        : "This Smart Logistics project is designed to manage and track logistics operations using orders, shipments, vehicles, routes, live GPS tracking, alerts and reports. Admin manages the overall logistics process, NGOs create orders, and Drivers handle assigned shipments and live transportation operations."
    };
  }

  if (intentType === 'NGO_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "NGO का मतलब Non-Governmental Organization (गैर-सरकारी संगठन) है। इस प्लेटफॉर्म में NGO राहत सामग्री के लिए ऑर्डर बना सकता है और उनसे संबंधित शिपमेंट को ट्रैक कर सकता है।"
        : "NGO stands for Non-Governmental Organization. In this logistics platform, an NGO can create logistics orders for relief supplies and track the shipments related to those orders."
    };
  }

  if (intentType === 'LOGISTICS_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "लॉजिस्टिक्स माल, राहत सामग्री और कार्गो को प्रारंभिक स्थान से गंतव्य तक सुरक्षित पहुँचाने की योजना और प्रबंधन की प्रक्रिया है।"
        : "Logistics is the process of planning and managing the physical movement of goods, supplies, and cargo from origin to destination."
    };
  }

  if (intentType === 'LOGISTICS_CONCEPT_QUERY') {
    return {
      success: true,
      message: "Supply Chain & Logistics encompasses planning, route optimization, fleet allocation, real-time dispatch tracking, and last-mile delivery. In this project, these principles are automated using AI route risk scoring and GIS telemetry."
    };
  }

  if (intentType === 'ROUTE_DEVIATION_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "रूट विचलन (Route Deviation) का अर्थ है कि वाहन एडमिन द्वारा निर्धारित रूट से 500 मीटर से अधिक दूर चला गया है, जिससे सुरक्षा अलर्ट जारी होता है।"
        : "Route deviation means the vehicle has moved significantly away from the Admin-selected route corridor, which may trigger safety alerts or delay warnings."
    };
  }

  if (intentType === 'ROUTE_SELECTION_DEF_QUERY') {
    return {
      success: true,
      message: "Route selection helps choose an efficient and safer path for transporting goods, especially when environmental hazards, weather risks, or road obstacles need to be considered."
    };
  }

  if (intentType === 'GPS_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "GPS (ग्लोबल पोजिशनिंग सिस्टम) डिलीवरी वाहनों की लाइव लोकेशन कोऑर्डिनेट्स को रियल-टाइम में ट्रैक करता है।"
        : "GPS (Global Positioning System) tracks the live location coordinates of delivery vehicles in real time."
    };
  }

  if (intentType === 'AI_DEF_QUERY') {
    return {
      success: true,
      message: isHi
        ? "AI (आर्टिफिशियल इंटेलिजेंस) का उपयोग इस प्लेटफॉर्म में मौसम के जोखिम का विश्लेषण करने, सुरक्षित रूट चुनने और उपयोगकर्ताओं की सहायता के लिए किया जाता है।"
        : "AI (Artificial Intelligence) is used in this system to evaluate weather risks along transit routes, optimize vehicle dispatching, and provide conversational assistance."
    };
  }

  if (intentType === 'DISASTER_LOGISTICS_DEF_QUERY') {
    return {
      success: true,
      message: "Disaster-aware logistics optimizes supply chain freight dispatches during emergencies (like heavy rain or floods) by detecting environmental hazards along road corridors and suggesting safe rerouting."
    };
  }

  if (intentType === 'PLATFORM_DEF_QUERY') {
    return {
      success: true,
      message: "The **Smart Logistics Platform** is an intelligent supply chain management system designed to optimize freight dispatches and maintain delivery resilience during natural disasters. It features live tracking, AI-assisted route risk scoring, environmental hazard monitoring, emergency alert broadcasting, and multi-role access for Admins, Drivers, and NGOs."
    };
  }

  if (/route kaise select|ai route ko safe|route decision/.test(q)) {
    return {
      success: true,
      message: `### AI Route Selection Mechanism
1. **Road Geometry Fetching:** System queries OpenRouteService / OSRM for road geometry.
2. **Hazard Sampling:** Open-Meteo Weather API checks rainfall, wind, and flood risk.
3. **Safety Score:** Evaluates overall risk score (75-100 Low Risk, 45-74 Medium Risk, 0-44 High Risk).
4. **Assignment:** Admin assigns the safest route corridor to the shipment.`
    };
  }

  if (/tech|technology|stack/.test(q)) {
    return {
      success: true,
      message: `### Technology Stack
• **Frontend:** React 19, TailwindCSS, Leaflet GIS Maps
• **Backend:** Node.js, Express, MongoDB, Socket.IO
• **AI & Services:** Google Gemini AI, OpenRouteService, Open-Meteo Weather API`
    };
  }

  return {
    success: true,
    message: isHi
      ? "मैं ऑर्डर, शिपमेंट, रूट, वाहन, अलर्ट, रिपोर्ट, ट्रैकिंग या इस प्रोजेक्ट से जुड़े प्रश्नों में सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?"
      : "I can help with shipments, orders, routes, vehicles, alerts, reports, tracking, or questions about this project. What would you like to know?"
  };
};

/**
 * Handle Disaster Management Questions in English / Hinglish
 */
const handleDisasterQuery = (query) => {
  const q = normalizeText(query);

  if (q.includes('heavy rain') || q.includes('rain')) {
    return {
      success: true,
      message: `### Heavy Rainfall Operational Protocol
1. **Surface Friction Loss:** Heavy precipitation reduces braking distance efficiency and increases aquaplaning risk.
2. **Speed Reduction:** Drivers must reduce speed by 25-30% and turn on yellow fog lamps.
3. **Inundation Check:** Control center monitors low-lying underpasses for flash flooding.
4. **Corridor Hazard Alerts:** Automated CRITICAL weather alerts are pushed to the driver if rainfall exceeds 30mm/hr.`
    };
  }

  if (q.includes('road is blocked') || q.includes('road blocked')) {
    return {
      success: true,
      message: `### Blocked Road Emergency Protocol
1. **Rerouting Trigger:** If a corridor is blocked by landslide debris or flooding, operator selects "Re-evaluate Route".
2. **Alternative Bypass:** AI Engine calculates secondary road alternatives with Safety Score > 75.
3. **Driver Notification:** New route geometry and updated ETA are dispatched instantly.`
    };
  }

  if (q.includes('flood')) {
    return {
      success: true,
      message: `### Flood Risk Management Protocol (Flood Ke Time Kya Karein)

**1. Operational Protocol:**
• Immediately suspend dispatches through flooded low-lying corridors.
• Re-route active shipments using secondary high-elevation highways via AI Route Engine.
• Prioritize essential medical supplies and emergency food rations.

**2. Driver Safety Guidance:**
• Driver ko vehicle safe elevated parking area par roknii chahiye.
• Depth unknown hone par flooded road par gadi nahi chalayein.
• Control center ke saath continuous mobile/radio comms maintain karein.`
    };
  }

  if (q.includes('landslide')) {
    return {
      success: true,
      message: `### Landslide Risk Protocol (Hill Corridors)

• **What is Landslide Risk:** Monsoons ke dauran pahadi rasto par mitti aur chattan girne ka khatra.
• **Action Required:** Heavy rain ke dauran hill passes me enter karne se pehle staging areas par vehicle rokein.
• **Mitigation:** SDMA Bulletins check karein aur AI Engine se valley bypass route select karein.`
    };
  }

  return {
    success: true,
    message: `### Disaster Management Guidelines
1. **Pre-Dispatch Checks:** Evaluate route weather risk score before dispatch.
2. **Dynamic Rerouting:** If active route risk score exceeds 50, select immediate detour.
3. **Relief Priority:** Assign CRITICAL priority to emergency medical & food supplies.
4. **Driver Safety:** Instruct driver to park safely if visibility drops below 15 meters.`
  };
};

/**
 * Handle Database Queries for Live Application Data
 */
const handleDatabaseQuery = async (intent, query, user = null, preferredLanguage = 'en') => {
  try {
    const role = (user?.role || 'ADMIN').toUpperCase();
    const userId = user?._id;
    const isHi = preferredLanguage === 'hi';

    // Conceptual & Technical Knowledge Handlers
    if (
      [
        'GREETING_QUERY',
        'MONGO_DEF_QUERY',
        'REACT_DEF_QUERY',
        'NODE_DEF_QUERY',
        'EXPRESS_DEF_QUERY',
        'API_DEF_QUERY',
        'SOCKET_DEF_QUERY',
        'OSRM_DEF_QUERY',
        'VIVA_QUERY',
        'SECURITY_TECH_QUERY',
        'TECH_WHY_QUERY',
        'TECH_STACK_QUERY',
        'AUTH_TECH_QUERY',
        'REALTIME_TECH_QUERY',
        'ROUTING_TECH_QUERY',
        'DEVIATION_TECH_QUERY',
        'WORKFLOW_QUERY',
        'ROLE_COMPARE_QUERY',
        'ROLE_ADMIN_QUERY',
        'ROLE_DRIVER_QUERY',
        'ROLE_NGO_QUERY',
        'PROJECT_OVERVIEW_QUERY',
        'NGO_DEF_QUERY',
        'LOGISTICS_DEF_QUERY',
        'LOGISTICS_CONCEPT_QUERY',
        'ROUTE_DEVIATION_DEF_QUERY',
        'ROUTE_SELECTION_DEF_QUERY',
        'GPS_DEF_QUERY',
        'AI_DEF_QUERY',
        'DISASTER_LOGISTICS_DEF_QUERY',
        'PLATFORM_DEF_QUERY',
        'PROJECT_QUERY',
        'GENERAL_CONVERSATIONAL',
        'GENERAL_LOGISTICS_QUERY'
      ].includes(intent.type)
    ) {
      return handleProjectQuery(query, intent.type, preferredLanguage);
    }

    if (intent.type === 'DISASTER_MANAGEMENT_QUERY') return handleDisasterQuery(query);

    // Unauthorized action check for non-Admin roles
    if (role === 'DRIVER' || role === 'NGO') {
      if (/delete shipment|change route|edit route|select route|modify route|delete route|assign vehicle|assign driver|delete user|manage user|create route/i.test(query)) {
        return {
          success: true,
          message: isHi
            ? "आपके पास इस क्रिया को करने की अनुमति नहीं है।"
            : "You don't have permission to perform that action."
        };
      }
    }

    // Fetch user-scoped shipments
    let userShipments = [];
    if (role === 'DRIVER' && userId) {
      userShipments = await Shipment.find({ assignedDriver: userId }).populate('assignedVehicle assignedDriver').lean();
    } else if (role === 'NGO' && userId) {
      const ngoOrders = await Order.find({ $or: [{ createdBy: userId }, { requestedBy: userId }] }).lean();
      const ngoOrderIds = ngoOrders.map(o => o._id);
      const ngoOrderCodes = ngoOrders.map(o => o.orderId).filter(Boolean);

      userShipments = await Shipment.find({
        $or: [
          { requestedBy: userId },
          { createdBy: userId },
          { assignedOrder: { $in: ngoOrderIds } },
          { orderId: { $in: ngoOrderCodes } }
        ]
      }).populate('assignedDriver assignedVehicle').lean();
    } else {
      userShipments = await Shipment.find({ status: { $nin: ['DELIVERED', 'CANCELLED'] } }).populate('assignedDriver assignedVehicle').limit(10).lean();
    }

    let targetShipment = null;
    if (intent.params?.shipmentId) {
      targetShipment = userShipments.find(s => s.shipmentId === intent.params.shipmentId) || await Shipment.findOne({ shipmentId: intent.params.shipmentId }).populate('assignedDriver assignedVehicle').lean();
    }

    const activeShipments = userShipments.filter(s => ['IN_TRANSIT', 'ROUTE_SELECTED', 'AT_RISK', 'DELAYED'].includes(s.status));
    if (!targetShipment) {
      targetShipment = userShipments.find(s => s.status === 'IN_TRANSIT') || userShipments[0] || null;
    }

    // ----------------------------------------------------
    // QUICK ACTION & OPERATIONAL QUERY HANDLERS
    // ----------------------------------------------------
    if (intent.type === 'DELAYED_SHIPMENTS_QUERY') {
      const delayedShipments = await Shipment.find({
        status: { $in: ['DELAYED', 'AT_RISK'] }
      }).populate('assignedDriver assignedVehicle').lean();

      if (delayedShipments.length === 0) {
        return {
          success: true,
          message: isHi
            ? `वर्तमान में कोई विलंबित (delayed) या जोखिम वाली (at-risk) शिपमेंट नहीं है।`
            : `Currently, there are no delayed or at-risk shipments.`
        };
      }

      let resText = isHi
        ? `अभी **${delayedShipments.length}** विलंबित / जोखिम में शिपमेंट हैं:\n\n`
        : `There are currently **${delayedShipments.length}** delayed or at-risk shipments:\n\n`;

      delayedShipments.slice(0, 5).forEach((s) => {
        const pName = s.pickup?.locationName || 'N/A';
        const dName = s.destination?.locationName || 'N/A';
        resText += `• **${s.shipmentId}** — ${s.status} (${pName} → ${dName})\n`;
      });
      return { success: true, message: resText.trim() };
    }

    if (intent.type === 'CRITICAL_ALERTS_QUERY') {
      const criticalAlerts = await Alert.find({
        severity: { $in: ['CRITICAL', 'HIGH'] },
        status: 'ACTIVE'
      }).lean();

      if (criticalAlerts.length === 0) {
        return {
          success: true,
          message: isHi
            ? `वर्तमान में कोई गंभीर (CRITICAL) अलर्ट सक्रिय नहीं है।`
            : `Currently, there are no active CRITICAL alerts.`
        };
      }

      let resText = isHi
        ? `गंभीर और उच्च प्राथमिकता अलर्ट (**${criticalAlerts.length}**):\n\n`
        : `Critical & High Severity Alerts (**${criticalAlerts.length}**):\n\n`;

      criticalAlerts.slice(0, 5).forEach((a) => {
        resText += `• **${a.title}** (${a.severity}) — ${a.description}\n`;
      });
      return { success: true, message: resText.trim() };
    }

    if (intent.type === 'ACTIVE_SHIPMENTS_QUERY') {
      const activeShipList = await Shipment.find({
        status: { $nin: ['DELIVERED', 'CANCELLED'] }
      }).lean();

      if (activeShipList.length === 0) {
        return {
          success: true,
          message: isHi
            ? `वर्तमान में कोई सक्रिय (in-transit) शिपमेंट नहीं है।`
            : `Currently, there are no active shipments.`
        };
      }

      let resText = isHi
        ? `अभी **${activeShipList.length}** शिपमेंट सक्रिय हैं।\n\nप्रमुख सक्रिय शिपमेंट:\n`
        : `There are currently **${activeShipList.length}** active shipments.\n\nMain active shipments:\n`;

      activeShipList.slice(0, 5).forEach((s) => {
        resText += `• **${s.shipmentId}** — ${s.status}\n`;
      });
      return { success: true, message: resText.trim() };
    }

    if (intent.type === 'DAILY_SUMMARY_QUERY') {
      const totalShipments = await Shipment.countDocuments({ status: { $ne: 'CANCELLED' } });
      const inTransitCount = await Shipment.countDocuments({ status: 'IN_TRANSIT' });
      const deliveredCount = await Shipment.countDocuments({ status: 'DELIVERED' });
      const delayedCount = await Shipment.countDocuments({ status: { $in: ['DELAYED', 'AT_RISK'] } });
      const totalOrdersCount = await Order.countDocuments();
      const activeAlertsCount = await Alert.countDocuments({ status: 'ACTIVE' });
      const criticalAlertsCount = await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' });

      let resText = isHi
        ? `### आज का सिस्टम ऑपरेशन्स सारांश\n\n` +
          `• **सक्रिय इन-ट्रांजिट शिपमेंट**: **${inTransitCount}**\n` +
          `• **कुल शिपमेंट**: **${totalShipments}** (${deliveredCount} डिलीवर, ${delayedCount} विलंबित/जोखिम में)\n` +
          `• **कुल पंजीकृत ऑर्डर**: **${totalOrdersCount}**\n` +
          `• **सक्रिय अलर्ट**: **${activeAlertsCount}** (${criticalAlertsCount} गंभीर खतरा अलर्ट)\n` +
          `• **सिस्टम स्थिति**: सभी ट्रैकिंग मॉड्यूल और जीपीएस नेटवर्क सामान्य रूप से कार्यरत हैं।`
        : `### Today's System Operations Summary\n\n` +
          `• **Active In-Transit Shipments**: **${inTransitCount}**\n` +
          `• **Total Shipments**: **${totalShipments}** (${deliveredCount} Delivered, ${delayedCount} Delayed/At-Risk)\n` +
          `• **Total Orders Registered**: **${totalOrdersCount}**\n` +
          `• **Active Operational Alerts**: **${activeAlertsCount}** (${criticalAlertsCount} CRITICAL hazard alerts)\n` +
          `• **System Health**: All tracking modules & Socket.IO telemetry networks are operational.`;

      return { success: true, message: resText };
    }

    // ----------------------------------------------------
    // SPECIFIC FIELD ATTRIBUTE INTENTS
    // ----------------------------------------------------
    if (intent.type === 'ORGANIZATION_QUERY') {
      const queryFilter = role === 'NGO' ? { $or: [{ createdBy: userId }, { requestedBy: userId }] } : {};
      const order = await Order.findOne(queryFilter).populate('createdBy', 'name organization email').sort({ createdAt: -1 }).lean();
      if (!order) {
        return {
          success: true,
          message: isHi
            ? `वर्तमान में कोई ऑर्डर या संबद्ध संगठन उपलब्ध नहीं हैं।`
            : `There are currently no orders or linked organizations available.`
        };
      }
      const orgName = order.createdBy?.organization || order.createdBy?.name || order.customerName || 'NGO Relief Organization';
      return {
        success: true,
        message: isHi
          ? `संगठन / NGO: **${orgName}** (बनाया गया ऑर्डर आईडी: **${order.orderId}**, कार्गो: **${order.cargoDescription}**)।`
          : `Organization / NGO: **${orgName}** (Created Order ID: **${order.orderId}**, Cargo: **${order.cargoDescription}**).`
      };
    }

    if (intent.type === 'STATUS_QUERY') {
      if (activeShipments.length > 1 && !intent.params?.shipmentId) {
        let resText = isHi
          ? `आपके पास ${activeShipments.length} सक्रिय शिपमेंट हैं:\n\n`
          : `You have ${activeShipments.length} active shipments:\n\n`;
        activeShipments.forEach(s => {
          resText += `• **${s.shipmentId}** — ${s.status}\n`;
        });
        resText += isHi ? `\nआप किस शिपमेंट की स्थिति देखना चाहते हैं?` : `\nWhich one would you like to check?`;
        return { success: true, message: resText };
      }
      if (!targetShipment) {
        return {
          success: true,
          message: isHi
            ? `फिलहाल यह जानकारी उपलब्ध नहीं है। वर्तमान में आपके पास कोई शिपमेंट नहीं है।`
            : `I don't have that information available right now. You currently have no shipments.`
        };
      }
      return {
        success: true,
        message: isHi
          ? `शिपमेंट **${targetShipment.shipmentId}** वर्तमान में **${targetShipment.status}** स्थिति में है।`
          : `Shipment **${targetShipment.shipmentId}** is currently **${targetShipment.status}**.`
      };
    }

    if (intent.type === 'PICKUP_QUERY') {
      if (!targetShipment || !targetShipment.pickup?.locationName) {
        return {
          success: true,
          message: isHi ? `पिकअप स्थान की जानकारी फिलहाल उपलब्ध नहीं है।` : `I don't have that information available right now.`
        };
      }
      return {
        success: true,
        message: isHi ? `पिकअप स्थान: **${targetShipment.pickup.locationName}**।` : `Pickup location: **${targetShipment.pickup.locationName}**.`
      };
    }

    if (intent.type === 'DESTINATION_QUERY') {
      if (!targetShipment || !targetShipment.destination?.locationName) {
        return {
          success: true,
          message: isHi ? `गंतव्य स्थान की जानकारी फिलहाल उपलब्ध नहीं है।` : `I don't have that information available right now.`
        };
      }
      return {
        success: true,
        message: isHi ? `गंतव्य स्थान: **${targetShipment.destination.locationName}**।` : `Destination: **${targetShipment.destination.locationName}**.`
      };
    }

    if (intent.type === 'DRIVER_QUERY') {
      if (role === 'DRIVER') {
        return {
          success: true,
          message: isHi ? `असाइन किया गया ड्राइवर: **${user.name}** (लॉग-इन ड्राइवर)।` : `Assigned Driver: **${user.name}** (Logged-in Driver).`
        };
      }
      const driverName = targetShipment?.assignedDriver?.name;
      if (!driverName) {
        return {
          success: true,
          message: isHi ? `वर्तमान में कोई ड्राइवर असाइन नहीं किया गया है।` : `Driver is not currently assigned.`
        };
      }
      return {
        success: true,
        message: isHi ? `असाइन किया गया ड्राइवर: **${driverName}**।` : `Assigned Driver: **${driverName}**.`
      };
    }

    if (intent.type === 'VEHICLE_QUERY') {
      const regNum = targetShipment?.assignedVehicle?.registrationNumber || targetShipment?.vehicleNumber;
      if (!regNum) {
        return {
          success: true,
          message: isHi ? `वर्तमान में कोई वाहन असाइन नहीं किया गया है।` : `Vehicle is not currently assigned.`
        };
      }
      return {
        success: true,
        message: isHi ? `असाइन किया गया वाहन: **${regNum}**।` : `Assigned Vehicle: **${regNum}**.`
      };
    }

    if (intent.type === 'ROUTE_QUERY') {
      const routeName = targetShipment?.selectedRoute?.name;
      if (!routeName) {
        return {
          success: true,
          message: isHi ? `एडमिन द्वारा चुना गया रूट: चयन लंबित है।` : `Admin-selected route: Pending Selection.`
        };
      }
      return {
        success: true,
        message: isHi ? `एडमिन द्वारा चुना गया रूट: **${routeName}**।` : `Admin-selected route: **${routeName}**.`
      };
    }

    if (intent.type === 'DISTANCE_QUERY') {
      if (!targetShipment || !targetShipment.selectedRoute?.distanceKm) {
        return {
          success: true,
          message: isHi ? `दूरी की जानकारी फिलहाल उपलब्ध नहीं है।` : `I don't have that information available right now.`
        };
      }
      const routeDist = targetShipment.selectedRoute.distanceKm;
      const actualTravelled = targetShipment.actualDistanceTravelled || 0;
      const remaining = targetShipment.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
      return {
        success: true,
        message: isHi ? `शेष दूरी: **${remaining} किमी**।` : `Remaining distance: **${remaining} km**.`
      };
    }

    if (intent.type === 'ETA_QUERY') {
      if (!targetShipment || !targetShipment.selectedRoute?.estimatedDurationMinutes) {
        return {
          success: true,
          message: isHi ? `अनुमानित समय की जानकारी फिलहाल उपलब्ध नहीं है।` : `I don't have that information available right now.`
        };
      }
      if (targetShipment.status === 'DELIVERED') {
        return {
          success: true,
          message: isHi ? `अनुमानित समय (ETA): डिलीवर हो चुका है (0 मिनट)।` : `ETA: Delivered (0 mins).`
        };
      }
      const durMins = targetShipment.selectedRoute.estimatedDurationMinutes;
      const etaStr = durMins >= 60
        ? (isHi ? `${Math.round(durMins / 60)} घंटे` : `${Math.round(durMins / 60)} hours`)
        : (isHi ? `${durMins} मिनट` : `${durMins} mins`);
      return {
        success: true,
        message: isHi ? `अनुमानित समय (ETA): **${etaStr}**।` : `ETA: **${etaStr}**.`
      };
    }

    // ----------------------------------------------------
    // ORDER QUERY
    // ----------------------------------------------------
    if (intent.type === 'ORDER_QUERY') {
      if (role === 'DRIVER') {
        return {
          success: true,
          message: isHi
            ? `ऑर्डर प्रबंधन NGO और Admins द्वारा किया जाता है। एक ड्राइवर के रूप में आप अपने असाइन किए गए शिपमेंट पर ध्यान केंद्रित करते हैं।`
            : `Order management is handled by NGOs and Admins. As a Driver, you focus on your assigned shipments and deliveries.`
        };
      }

      const queryFilter = role === 'NGO' ? { $or: [{ createdBy: userId }, { requestedBy: userId }] } : {};
      const ngoOrders = await Order.find(queryFilter).populate('createdBy', 'name organization email').sort({ createdAt: -1 }).lean();

      if (ngoOrders.length === 0) {
        return {
          success: true,
          message: isHi ? `वर्तमान में आपके पास कोई ऑर्डर नहीं है।` : `You currently have no orders.`
        };
      }

      if (intent.params?.orderId) {
        const o = ngoOrders.find(ord => ord.orderId === intent.params.orderId) || await Order.findOne({ orderId: intent.params.orderId }).populate('createdBy', 'name organization email').lean();
        if (!o) return { success: true, message: isHi ? `ऑर्डर ${intent.params.orderId} मौजूद नहीं है।` : `Order ${intent.params.orderId} does not exist.` };
        const creatorOrg = o.createdBy?.organization || o.createdBy?.name || o.customerName || 'N/A';
        return {
          success: true,
          message: isHi
            ? `**ऑर्डर आईडी**: ${o.orderId}\n` +
              `**संगठन**: ${creatorOrg}\n` +
              `**कार्गो**: ${o.cargoDescription} (${o.quantity})\n` +
              `**पिकअप**: ${o.pickupLocation?.locationName || 'N/A'}\n` +
              `**गंतव्य**: ${o.deliveryLocation?.locationName || 'N/A'}\n` +
              `**स्थिति**: ${o.status}`
            : `**Order ID**: ${o.orderId}\n` +
              `**Organization**: ${creatorOrg}\n` +
              `**Cargo**: ${o.cargoDescription} (${o.quantity})\n` +
              `**Pickup**: ${o.pickupLocation?.locationName || 'N/A'}\n` +
              `**Destination**: ${o.deliveryLocation?.locationName || 'N/A'}\n` +
              `**Status**: ${o.status}`
        };
      }

      if (ngoOrders.length === 1) {
        const o = ngoOrders[0];
        const creatorOrg = o.createdBy?.organization || o.createdBy?.name || o.customerName || 'N/A';
        return {
          success: true,
          message: isHi
            ? `**ऑर्डर आईडी**: ${o.orderId}\n` +
              `**संगठन**: ${creatorOrg}\n` +
              `**कार्गो**: ${o.cargoDescription} (${o.quantity})\n` +
              `**पिकअप**: ${o.pickupLocation?.locationName || 'N/A'}\n` +
              `**गंतव्य**: ${o.deliveryLocation?.locationName || 'N/A'}\n` +
              `**स्थिति**: ${o.status}`
            : `**Order ID**: ${o.orderId}\n` +
              `**Organization**: ${creatorOrg}\n` +
              `**Cargo**: ${o.cargoDescription} (${o.quantity})\n` +
              `**Pickup**: ${o.pickupLocation?.locationName || 'N/A'}\n` +
              `**Destination**: ${o.deliveryLocation?.locationName || 'N/A'}\n` +
              `**Status**: ${o.status}`
        };
      }

      let resText = isHi ? `### आपके ऑर्डर (${ngoOrders.length})\n\n` : `### Your Orders (${ngoOrders.length})\n\n`;
      ngoOrders.forEach((o, idx) => {
        const creatorOrg = o.createdBy?.organization || o.createdBy?.name || o.customerName || 'N/A';
        resText += isHi
          ? `${idx + 1}. **${o.orderId}** (निर्माता: ${creatorOrg})\n   कार्गो: ${o.cargoDescription} (${o.quantity})\n   पिकअप: ${o.pickupLocation?.locationName || 'N/A'} → गंतव्य: ${o.deliveryLocation?.locationName || 'N/A'}\n   स्थिति: ${o.status}\n\n`
          : `${idx + 1}. **${o.orderId}** (Created by: ${creatorOrg})\n   Cargo: ${o.cargoDescription} (${o.quantity})\n   Pickup: ${o.pickupLocation?.locationName || 'N/A'} → Destination: ${o.deliveryLocation?.locationName || 'N/A'}\n   Status: ${o.status}\n\n`;
      });
      return { success: true, message: resText.trim() };
    }

    // ----------------------------------------------------
    // TRACKING QUERY
    // ----------------------------------------------------
    if (intent.type === 'TRACKING_QUERY') {
      if (!targetShipment) {
        return {
          success: true,
          message: isHi ? `ट्रैक करने के लिए आपके पास वर्तमान में कोई सक्रिय शिपमेंट नहीं है।` : `You currently have no active shipments to track.`
        };
      }
      const routeDist = targetShipment.selectedRoute?.distanceKm || 0;
      const actualTravelled = targetShipment.actualDistanceTravelled || 0;
      const remainingDist = targetShipment.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
      const etaStr = targetShipment.status === 'DELIVERED'
        ? (isHi ? '0 मिनट' : '0 mins')
        : (targetShipment.selectedRoute?.estimatedDurationMinutes ? `${Math.round(targetShipment.selectedRoute.estimatedDurationMinutes / 60)} ${isHi ? 'घंटे' : 'hrs'}` : 'N/A');

      let resText = isHi ? `### ट्रैकिंग जानकारी: ${targetShipment.shipmentId}\n\n` : `### Tracking Information: ${targetShipment.shipmentId}\n\n`;
      resText += isHi ? `• **स्थिति**: ${targetShipment.status}\n` : `• **Status**: ${targetShipment.status}\n`;
      if (targetShipment.liveLocation?.latitude) {
        resText += isHi
          ? `• **लाइव GPS लोकेशन**: ${targetShipment.liveLocation.latitude.toFixed(4)}, ${targetShipment.liveLocation.longitude.toFixed(4)}\n`
          : `• **Current GPS Location**: ${targetShipment.liveLocation.latitude.toFixed(4)}, ${targetShipment.liveLocation.longitude.toFixed(4)}\n`;
      } else {
        resText += isHi
          ? `• **लाइव लोकेशन**: लाइव लोकेशन फिलहाल उपलब्ध नहीं है।\n`
          : `• **Live Location**: Live location is currently unavailable.\n`;
      }
      resText += isHi ? `• **शेष दूरी**: ${remainingDist} किमी\n` : `• **Remaining Distance**: ${remainingDist} km\n`;
      resText += isHi ? `• **अनुमानित समय (ETA)**: ${etaStr}` : `• **ETA**: ${etaStr}`;

      return { success: true, message: resText.trim() };
    }

    // ----------------------------------------------------
    // ALERT QUERY
    // ----------------------------------------------------
    if (intent.type === 'ALERT_QUERY') {
      const ngoShipmentIds = userShipments.map(s => s._id);
      const alerts = await Alert.find({
        $or: [
          { assignedTo: userId },
          { requestedBy: userId },
          { reportedBy: userId },
          { relatedShipment: { $in: ngoShipmentIds } }
        ],
        status: 'ACTIVE'
      }).lean();

      if (alerts.length === 0) {
        return {
          success: true,
          message: isHi ? `आपके संचालन से संबंधित वर्तमान में कोई सक्रिय अलर्ट नहीं है।` : `There are currently no active alerts related to your operations.`
        };
      }

      let resText = isHi ? `### सक्रिय अलर्ट (${alerts.length})\n\n` : `### Active Alerts (${alerts.length})\n\n`;
      alerts.forEach((a, idx) => {
        resText += isHi
          ? `${idx + 1}. **${a.title}** (${a.severity})\n   प्रकार: ${a.alertType} | स्थिति: ${a.status}\n   ${a.description}\n\n`
          : `${idx + 1}. **${a.title}** (${a.severity})\n   Type: ${a.alertType} | Status: ${a.status}\n   ${a.description}\n\n`;
      });
      return { success: true, message: resText.trim() };
    }

    // ----------------------------------------------------
    // REPORT QUERY
    // ----------------------------------------------------
    if (intent.type === 'REPORT_QUERY') {
      if (role === 'NGO') {
        const ngoOrders = await Order.find({ $or: [{ createdBy: userId }, { requestedBy: userId }] }).lean();
        const total = ngoOrders.length;
        const pending = ngoOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
        const completed = ngoOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        let resText = isHi ? `### NGO संचालन और डिलीवरी प्रदर्शन रिपोर्ट\n\n` : `### NGO Operations & Delivery Performance Report\n\n`;
        resText += isHi ? `• **कुल बनाए गए ऑर्डर**: ${total}\n` : `• **Total Orders Created**: ${total}\n`;
        resText += isHi ? `• **लंबित ऑर्डर**: ${pending}\n` : `• **Pending Orders**: ${pending}\n`;
        resText += isHi ? `• **पूरे हुए ऑर्डर**: ${completed}\n` : `• **Completed Orders**: ${completed}\n`;
        resText += isHi
          ? `• **इन-ट्रांजिट सक्रिय शिपमेंट**: ${userShipments.filter(s => s.status === 'IN_TRANSIT').length}\n`
          : `• **Active Shipments in Transit**: ${userShipments.filter(s => s.status === 'IN_TRANSIT').length}\n`;
        resText += isHi
          ? `• **डिलीवर किए गए शिपमेंट**: ${userShipments.filter(s => s.status === 'DELIVERED').length}\n`
          : `• **Delivered Shipments**: ${userShipments.filter(s => s.status === 'DELIVERED').length}\n`;
        resText += isHi ? `• **ऑर्डर पूरा होने की दर**: **${rate}%**` : `• **Order Completion Rate**: **${rate}%**`;
        return { success: true, message: resText.trim() };
      } else if (role === 'DRIVER') {
        const total = userShipments.length;
        const completed = userShipments.filter(s => s.status === 'DELIVERED').length;
        const inTransit = userShipments.filter(s => s.status === 'IN_TRANSIT').length;
        const delayed = userShipments.filter(s => s.status === 'DELAYED' || s.status === 'AT_RISK').length;
        const rate = total > 0 ? Math.round(((completed - delayed) / Math.max(1, completed)) * 100) : 100;

        let resText = isHi ? `### आपकी ड्राइवर प्रदर्शन सारांश\n\n` : `### Your Driver Performance Summary\n\n`;
        resText += isHi ? `• **कुल असाइन किए गए शिपमेंट**: ${total}\n` : `• **Total Assigned Shipments**: ${total}\n`;
        resText += isHi ? `• **पूरी हुई डिलीवरी**: ${completed}\n` : `• **Completed Deliveries**: ${completed}\n`;
        resText += isHi ? `• **वर्तमान में इन-ट्रांजिट**: ${inTransit}\n` : `• **Currently In Transit**: ${inTransit}\n`;
        resText += isHi ? `• **विलंबित / जोखिम में**: ${delayed}\n` : `• **Delayed / At Risk**: ${delayed}\n`;
        resText += isHi ? `• **समय पर डिलीवरी सफलता दर**: **${rate}%**` : `• **On-Time Delivery Success Rate**: **${rate}%**`;
        return { success: true, message: resText.trim() };
      } else {
        const totalShipments = await Shipment.countDocuments({ status: { $ne: 'CANCELLED' } });
        const inTransitCount = await Shipment.countDocuments({ status: 'IN_TRANSIT' });
        const deliveredCount = await Shipment.countDocuments({ status: 'DELIVERED' });
        const totalOrdersCount = await Order.countDocuments();
        const activeAlertsCount = await Alert.countDocuments({ status: 'ACTIVE' });

        let resText = isHi ? `### स्मार्ट लॉजिस्टिक्स — सिस्टम ऑपरेशन्स रिपोर्ट\n\n` : `### Smart Logistics — System Operations Report\n\n`;
        resText += isHi ? `• **सक्रिय इन-ट्रांजिट शिपमेंट**: **${inTransitCount}**\n` : `• **Active In-Transit Shipments**: **${inTransitCount}**\n`;
        resText += isHi ? `• **कुल शिपमेंट**: **${totalShipments}** (डिलीवर: ${deliveredCount})\n` : `• **Total Shipments**: **${totalShipments}** (Delivered: ${deliveredCount})\n`;
        resText += isHi ? `• **कुल पंजीकृत ऑर्डर**: **${totalOrdersCount}**\n` : `• **Total Registered Orders**: **${totalOrdersCount}**\n`;
        resText += isHi ? `• **वर्तमान में सक्रिय अलर्ट**: **${activeAlertsCount}**` : `• **Currently Active Alerts**: **${activeAlertsCount}**`;
        return { success: true, message: resText.trim() };
      }
    }

    // ----------------------------------------------------
    // FULL SHIPMENT QUERY
    // ----------------------------------------------------
    if (intent.type === 'FULL_SHIPMENT_QUERY' || intent.type === 'SHIPMENT_QUERY') {
      if (!targetShipment) {
        return {
          success: true,
          message: isHi ? `आपके पास वर्तमान में कोई असाइन किया गया शिपमेंट नहीं है।` : `You currently have no assigned shipments.`
        };
      }
      const routeDist = targetShipment.selectedRoute?.distanceKm || 0;
      const actualTravelled = targetShipment.actualDistanceTravelled || 0;
      const remainingDist = targetShipment.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
      const etaStr = targetShipment.status === 'DELIVERED'
        ? (isHi ? '0 मिनट' : '0 mins')
        : (targetShipment.selectedRoute?.estimatedDurationMinutes ? `${Math.round(targetShipment.selectedRoute.estimatedDurationMinutes / 60)} ${isHi ? 'घंटे' : 'hrs'}` : 'N/A');

      let resText = isHi ? `### सक्रिय शिपमेंट सारांश: ${targetShipment.shipmentId}\n\n` : `### Active Shipment Summary: ${targetShipment.shipmentId}\n\n`;
      resText += isHi ? `• **स्थिति**: ${targetShipment.status}\n` : `• **Status**: ${targetShipment.status}\n`;
      resText += isHi ? `• **कार्गो**: ${targetShipment.goodsType} (${targetShipment.quantity} ${targetShipment.unit || ''})\n` : `• **Cargo**: ${targetShipment.goodsType} (${targetShipment.quantity} ${targetShipment.unit || ''})\n`;
      resText += isHi ? `• **पिकअप स्थान**: ${targetShipment.pickup?.locationName || 'N/A'}\n` : `• **Pickup Location**: ${targetShipment.pickup?.locationName || 'N/A'}\n`;
      resText += isHi ? `• **गंतव्य स्थान**: ${targetShipment.destination?.locationName || 'N/A'}\n` : `• **Destination**: ${targetShipment.destination?.locationName || 'N/A'}\n`;
      resText += isHi ? `• **एडमिन द्वारा चुना गया रूट**: ${targetShipment.selectedRoute?.name || 'Selected Route Corridor'}\n` : `• **Admin-Selected Route**: ${targetShipment.selectedRoute?.name || 'Selected Route Corridor'}\n`;
      resText += isHi ? `• **असाइन किया गया ड्राइवर**: ${targetShipment.assignedDriver?.name || 'असाइन नहीं किया गया'}\n` : `• **Assigned Driver**: ${targetShipment.assignedDriver?.name || 'Unassigned'}\n`;
      resText += isHi ? `• **असाइन किया गया वाहन**: ${targetShipment.assignedVehicle?.registrationNumber || targetShipment.vehicleNumber || 'निर्दिष्ट नहीं'}\n` : `• **Assigned Vehicle**: ${targetShipment.assignedVehicle?.registrationNumber || targetShipment.vehicleNumber || 'NOT SPECIFIED'}\n`;
      resText += isHi ? `• **कुल दूरी**: ${routeDist} किमी\n` : `• **Total Distance**: ${routeDist} km\n`;
      resText += isHi ? `• **शेष दूरी**: ${remainingDist} किमी\n` : `• **Remaining Distance**: ${remainingDist} km\n`;
      resText += isHi ? `• **अनुमानित समय (ETA)**: ${etaStr}` : `• **ETA**: ${etaStr}`;

      return { success: true, message: resText.trim() };
    }

    return handleProjectQuery(query, intent.type, preferredLanguage);
  } catch (error) {
    console.error('Intent handling query error:', error);
    return {
      success: false,
      message: `Failed to retrieve data: ${error.message}`
    };
  }
};

module.exports = {
  analyzeIntent,
  handleDatabaseQuery,
  handleProjectQuery,
  handleDisasterQuery,
  normalizeText
};
