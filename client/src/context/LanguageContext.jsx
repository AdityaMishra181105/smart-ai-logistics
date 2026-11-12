import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../translations/en';
import { hi } from '../translations/hi';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('preferredLanguage');
      return saved === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const targetLang = lang === 'hi' ? 'hi' : 'en';
    setLanguageState(targetLang);
    try {
      localStorage.setItem('preferredLanguage', targetLang);
    } catch (e) {
      console.error('Failed to save preferredLanguage to localStorage:', e);
    }
  };

  const isHindi = language === 'hi';

  const t = (key, fallback = '') => {
    const dict = isHindi ? hi : en;
    if (dict[key] !== undefined) {
      return dict[key];
    }
    if (en[key] !== undefined) {
      return en[key];
    }
    return fallback || key;
  };

  const translateStatus = (statusStr) => {
    if (!statusStr || typeof statusStr !== 'string') return statusStr;
    const clean = statusStr.trim().toUpperCase().replace(/\s+/g, '_');
    
    const statusMap = {
      IN_TRANSIT: 'statusInTransit',
      DELIVERED: 'statusDelivered',
      PENDING: 'statusPending',
      CONFIRMED: 'statusConfirmed',
      ASSIGNED: 'statusAssigned',
      ACTIVE: 'statusActive',
      CANCELLED: 'statusCancelled',
      AT_RISK: 'statusAtRisk',
      DELAYED: 'statusDelayed',
      ROUTE_SELECTED: 'statusRouteSelected',
      ROUTE_PENDING: 'statusRoutePending',
      PROCESSING: 'statusProcessing',
      COMPLETED: 'statusCompleted',
      RESOLVED: 'statusResolved',
      DISMISSED: 'statusDismissed',
      ACKNOWLEDGED: 'acknowledged',
      AVAILABLE: 'available',
      MAINTENANCE: 'maintenance',
      UNASSIGNED: 'unassigned',
      ON_TIME: 'statusOnTime',
      APPROVED: 'statusApproved',
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      'N/A': 'notSpecified',
      NOT_SPECIFIED: 'notSpecified',
      NONE: 'none',
      PLANNED: 'planned',
      IN_PROGRESS: 'inProgress',
      IDLE: 'idle',
      UNKNOWN: 'unknown'
    };

    const transKey = statusMap[clean];
    if (transKey) {
      return t(transKey, statusStr);
    }
    return statusStr;
  };

  const translateSeverity = (sev) => {
    if (!sev || typeof sev !== 'string') return sev;
    if (!isHindi) return sev;
    const clean = sev.trim().toUpperCase();
    const map = {
      CRITICAL: 'गंभीर',
      HIGH: 'उच्च',
      MEDIUM: 'मध्यम',
      MODERATE: 'मध्यम',
      LOW: 'निम्न'
    };
    return map[clean] || sev;
  };

  const translateAlertType = (typeStr) => {
    if (!typeStr || typeof typeStr !== 'string') return typeStr;
    if (!isHindi) return typeStr.replace(/_/g, ' ');
    const clean = typeStr.trim().toUpperCase();
    const map = {
      TRANSIT_DELAY: 'ट्रांजिट विलंब',
      CORRIDOR_HAZARD: 'कॉरिडोर खतरा',
      WEATHER_WARNING: 'मौसम चेतावनी',
      VEHICLE_ISSUE: 'वाहन समस्या',
      SHIPMENT_RISK: 'शिपमेंट जोखिम',
      SYSTEM_ALERT: 'सिस्टम अलर्ट'
    };
    return map[clean] || typeStr.replace(/_/g, ' ');
  };

  const translateAuditAction = (actionStr) => {
    if (!actionStr || typeof actionStr !== 'string') return actionStr;
    if (!isHindi) return actionStr.replace(/_/g, ' ');
    const clean = actionStr.trim().toUpperCase();
    const map = {
      ROUTES_GENERATED: 'रूट तैयार किए गए',
      ROUTE_SELECTED: 'रूट चयनित',
      DRIVER_ASSIGNED: 'ड्राइवर असाइन किया गया',
      SHIPMENT_CREATED: 'शिपमेंट बनाया गया',
      ORDER_CREATED: 'ऑर्डर बनाया गया',
      STATUS_UPDATED: 'स्थिति अपडेट की गई'
    };
    return map[clean] || actionStr.replace(/_/g, ' ');
  };

  const translateGoodsType = (typeStr) => {
    if (!typeStr || typeof typeStr !== 'string') return typeStr;
    const clean = typeStr.trim().toUpperCase();
    const map = {
      MEDICINE: 'medicines',
      MEDICINES: 'medicines',
      FOOD: 'foodSupplies',
      FOOD_SUPPLIES: 'foodSupplies',
      CONSTRUCTION_MATERIAL: 'constructionMaterials',
      CONSTRUCTION_MATERIALS: 'constructionMaterials',
      AGRICULTURAL_PRODUCE: 'agriculturalProduce'
    };
    const transKey = map[clean];
    if (transKey) return t(transKey, typeStr.replace(/_/g, ' '));
    return typeStr.replace(/_/g, ' ');
  };

  const translateRole = (roleStr) => {
    if (!roleStr || typeof roleStr !== 'string') return roleStr;
    if (!isHindi) return roleStr;
    const clean = roleStr.trim().toUpperCase();
    const map = {
      ADMIN: 'एडमिन',
      DRIVER: 'ड्राइवर',
      NGO: 'NGO',
      SYSTEM: 'सिस्टम'
    };
    return map[clean] || roleStr;
  };

  const translateAlertTitle = (titleStr) => {
    if (!titleStr || typeof titleStr !== 'string') return titleStr;
    if (!isHindi) return titleStr;

    let res = titleStr.trim();

    if (res.startsWith('Corridor Hazard Warning: ')) {
      const route = res.replace('Corridor Hazard Warning: ', '');
      return `कॉरिडोर खतरे की चेतावनी: ${route}`;
    }
    if (res.startsWith('Corridor Hazard: Route ') && res.includes(' Cancelled')) {
      const route = res.replace('Corridor Hazard: Route ', '').replace(' Cancelled', '');
      return `कॉरिडोर खतरा: रूट ${route} रद्द किया गया`;
    }
    if (res.startsWith('Transit Delay: Shipment ')) {
      const code = res.replace('Transit Delay: Shipment ', '');
      return `ट्रांजिट विलंब: शिपमेंट ${code}`;
    }
    if (res.startsWith('Shipment At Risk: ')) {
      const code = res.replace('Shipment At Risk: ', '');
      return `जोखिम में शिपमेंट: ${code}`;
    }
    if (res.startsWith('Vehicle Issue: Vehicle ')) {
      const veh = res.replace('Vehicle Issue: Vehicle ', '');
      return `वाहन समस्या: वाहन ${veh}`;
    }
    if (res.startsWith('Hazard Alert: ')) {
      const subTitle = res.replace('Hazard Alert: ', '');
      return `खतरा अलर्ट: ${translateAlertTitle(subTitle)}`;
    }
    if (res.startsWith('Flooding Highway ') || res.startsWith('FLOODING HIGHWAY ')) {
      const hw = res.replace(/Flooding Highway /i, '').replace(/FLOODING HIGHWAY /i, '');
      return `हाईवे ${hw} पर बाढ़`;
    }

    const exactMap = {
      'CORRIDOR HAZARD WARNING': 'कॉरिडोर खतरे की चेतावनी',
      'Corridor Hazard Warning': 'कॉरिडोर खतरे की चेतावनी',
      'FLOODING HIGHWAY B': 'हाईवे बी पर बाढ़',
      'Flooding Highway B': 'हाईवे बी पर बाढ़',
      'LANDSLIDE WARNING': 'भूस्खलन की चेतावनी',
      'Landslide Warning': 'भूस्खलन की चेतावनी',
      'Critical Landslide Alert': 'गंभीर भूस्खलन अलर्ट',
      'High Landslide Risk Warning': 'उच्च भूस्खलन जोखिम चेतावनी',
      'Critical Flood Alert': 'गंभीर बाढ़ अलर्ट',
      'High Flood Risk Warning': 'उच्च बाढ़ जोखिम चेतावनी',
      'Multiple Safety Threats Detected': 'अनेक सुरक्षा खतरे पाए गए',
      'Heavy Rainfall Warning': 'भारी वर्षा की चेतावनी',
      'Rain Warning Active': 'वर्षा की चेतावनी सक्रिय',
      'Reduced Visibility Warning': 'कम दृश्यता की चेतावनी',
      'Critical Weather Threat': 'गंभीर मौसम खतरा',
      'Critical Combined Route Risk': 'गंभीर संयुक्त रूट जोखिम',
      'High Route Combined Risks': 'उच्च रूट संयुक्त जोखिम',
      'Moderate Combined Risk Warning': 'मध्यम संयुक्त जोखिम चेतावनी',
      'Safety Alert: No Safe Route Available': 'सुरक्षा अलर्ट: कोई सुरक्षित रूट उपलब्ध नहीं',
      'Safer Route Available': 'अधिक सुरक्षित रूट उपलब्ध',
      'Recommended Route Selected': 'अनुशंसित रूट चयनित',
      'Urgent Cargo Safety Alert': 'अति आवश्यक माल सुरक्षा अलर्ट',
      'Poor Route Accessibility': 'कमज़ोर रूट पहुँच',
      'Route Accessibility Blocked': 'रूट पहुँच अवरुद्ध',
      'Guwahati Corridor Blockage': 'गुवाहाटी कॉरिडोर अवरोध',
      'Incomplete Alert': 'अधूरा अलर्ट'
    };

    if (exactMap[res]) {
      return exactMap[res];
    }

    return res;
  };

  const translateAlertDescription = (descStr) => {
    if (!descStr || typeof descStr !== 'string') return descStr;
    if (!isHindi) return descStr;

    let res = descStr.trim();

    const corridorMatch = res.match(/Real-time weather analysis detected (CRITICAL|HIGH|MEDIUM|MODERATE|LOW) risk corridor \(([^)]+)\) (en route from|on route from) (.+?)( to | en route to | going to )(.+)/i);
    if (corridorMatch) {
      const sev = translateSeverity(corridorMatch[1]);
      const score = corridorMatch[2];
      const origin = corridorMatch[4];
      const dest = corridorMatch[6];
      return `रियल-टाइम मौसम विश्लेषण में ${origin} से ${dest} के मार्ग पर ${sev} जोखिम वाला कॉरिडोर (${score}) पाया गया।`;
    }

    const corridorMatchShort = res.match(/Real-time weather analysis detected (CRITICAL|HIGH|MEDIUM|MODERATE|LOW) risk corridor \(([^)]+)\)/i);
    if (corridorMatchShort) {
      const sev = translateSeverity(corridorMatchShort[1]);
      const score = corridorMatchShort[2];
      return `रियल-टाइम मौसम विश्लेषण में ${sev} जोखिम वाला कॉरिडोर (${score}) पाया गया।`;
    }

    if (res.startsWith('Hazard Detected: ')) {
      const text = res.replace('Hazard Detected: ', '');
      let translatedText = text;
      if (text.includes('Long Distance Corridor')) {
        translatedText = text.replace('Long Distance Corridor', 'लंबी दूरी का कॉरिडोर');
      }
      translatedText = translateAlertDescription(translatedText);
      return `पाया गया खतरा: ${translatedText}`;
    }

    if (res.endsWith(' submerged')) {
      const place = res.replace(' submerged', '');
      return `${place} जलमग्न है।`;
    }

    if (res.startsWith('Severe weather near ')) {
      const place = res.replace('Severe weather near ', '');
      return `${place} के पास गंभीर मौसम की स्थिति।`;
    }

    if (res.includes('Heavy precipitation warning')) {
      res = res.replace('Heavy precipitation warning', 'भारी वर्षा की चेतावनी');
      res = res.replace('detected along route corridor', 'मार्ग कॉरिडोर के साथ पाई गई');
    }

    if (res.includes('Vehicle deviation detected exceeding Haversine threshold')) {
      res = res.replace('Vehicle deviation detected exceeding Haversine threshold', 'हैवरसाइन सीमा से अधिक वाहन विचलन पाया गया');
    }

    const phraseMap = [
      ['Real-time weather analysis detected MEDIUM risk corridor', 'रियल-टाइम मौसम विश्लेषण में मध्यम जोखिम वाला कॉरिडोर पाया गया'],
      ['Real-time weather analysis detected HIGH risk corridor', 'रियल-टाइम मौसम विश्लेषण में उच्च जोखिम वाला कॉरिडोर पाया गया'],
      ['Real-time weather analysis detected CRITICAL risk corridor', 'रियल-टाइम मौसम विश्लेषण में गंभीर जोखिम वाला कॉरिडोर पाया गया'],
      ['Real-time weather analysis detected LOW risk corridor', 'रियल-टाइम मौसम विश्लेषण में कम जोखिम वाला कॉरिडोर पाया गया'],
      ['Heavy precipitation warning', 'भारी वर्षा की चेतावनी'],
      ['High rainfall detected', 'भारी वर्षा पाई गई'],
      ['Landslide risk detected', 'भूस्खलन का जोखिम पाया गया'],
      ['Road block detected', 'सड़क अवरोध पाया गया'],
      ['Low visibility warning', 'कम दृश्यता की चेतावनी'],
      ['Severe weather warning', 'गंभीर मौसम की चेतावनी'],
      ['Awaiting response', 'प्रतिक्रिया की प्रतीक्षा में'],
      ['Halted corridor sections', 'रोके गए कॉरिडोर खंड'],
      ['Precipitation warnings', 'वर्षा की चेतावनियाँ'],
      ['Operators assigned', 'ऑपरेटर असाइन किए गए'],
      ['Cleared hazards logged', 'समाधान किए गए खतरे दर्ज']
    ];

    phraseMap.forEach(([enPhrase, hiPhrase]) => {
      if (res.includes(enPhrase)) {
        res = res.replace(enPhrase, hiPhrase);
      }
    });

    return res;
  };

  const translateText = (textStr) => {
    if (!textStr || typeof textStr !== 'string') return textStr;
    if (!isHindi) return textStr;

    let res = textStr;
    const phraseMap = [
      ['Real-time weather analysis detected MEDIUM risk corridor', 'रियल-टाइम मौसम विश्लेषण में मध्यम जोखिम वाला कॉरिडोर पाया गया'],
      ['Real-time weather analysis detected HIGH risk corridor', 'रियल-टाइम मौसम विश्लेषण में उच्च जोखिम वाला कॉरिडोर पाया गया'],
      ['Real-time weather analysis detected CRITICAL risk corridor', 'रियल-टाइम मौसम विश्लेषण में गंभीर जोखिम वाला कॉरिडोर पाया गया'],
      ['Heavy precipitation warning (>15mm/hr) detected along route corridor', 'मार्ग कॉरिडोर के साथ भारी वर्षा की चेतावनी (>15मिमी/घंटा) पाई गई'],
      ['Vehicle deviation detected exceeding Haversine threshold', 'हैवरसाइन सीमा से अधिक वाहन विचलन पाया गया'],
      ['High rainfall detected', 'भारी वर्षा पाई गई'],
      ['Landslide risk detected', 'भूस्खलन जोखिम पाया गया'],
      ['Road block detected', 'सड़क अवरोध पाया गया'],
      ['Low visibility warning', 'कम दृश्यता चेतावनी'],
      ['Severe weather warning', 'गंभीर मौसम चेतावनी'],
      ['Awaiting response', 'प्रतिक्रिया की प्रतीक्षा में'],
      ['Halted corridor sections', 'रोके गए कॉरिडोर खंड'],
      ['Precipitation warnings', 'वर्षा की चेतावनियाँ'],
      ['Operators assigned', 'ऑपरेटर असाइन किए गए'],
      ['Cleared hazards logged', 'समाधान किए गए खतरे दर्ज']
    ];

    phraseMap.forEach(([enPhrase, hiPhrase]) => {
      if (res.includes(enPhrase)) {
        res = res.replace(enPhrase, hiPhrase);
      }
    });

    return res;
  };

  const translateRouteName = (routeNameStr) => {
    if (!routeNameStr || typeof routeNameStr !== 'string') return routeNameStr;
    if (!isHindi) return routeNameStr;

    let res = routeNameStr.trim();

    const routeMap = {
      'Primary Transit Expressway': 'प्राथमिक ट्रांजिट एक्सप्रेसवे',
      'Alternative Bypass Route': 'वैकल्पिक बाईपास रूट',
      'Selected Route Corridor': 'चयनित रूट कॉरिडोर',
      'Standard Corridor': 'मानक कॉरिडोर',
      'Primary Corridor': 'प्राथमिक कॉरिडोर',
      'Alternative Corridor': 'वैकल्पिक कॉरिडोर',
      'NH-44 Express Corridor': 'NH-44 एक्सप्रेस कॉरिडोर',
      'Lucknow-Kanpur Highway': 'लखनऊ-कानपुर हाईवे',
      'Delhi-Agra Expressway': 'दिल्ली-आगरा एक्सप्रेसवे',
      'Guwahati Corridor': 'गुवाहाटी कॉरिडोर'
    };

    if (routeMap[res]) {
      return routeMap[res];
    }

    let translated = res;
    if (translated.includes('Primary Transit Expressway')) {
      translated = translated.replace('Primary Transit Expressway', 'प्राथमिक ट्रांजिट एक्सप्रेसवे');
    }
    if (translated.includes('Alternative Bypass Route')) {
      translated = translated.replace('Alternative Bypass Route', 'वैकल्पिक बाईपास रूट');
    }
    if (translated.includes('Selected Route Corridor')) {
      translated = translated.replace('Selected Route Corridor', 'चयनित रूट कॉरिडोर');
    }
    if (translated.includes('Standard Corridor')) {
      translated = translated.replace('Standard Corridor', 'मानक कॉरिडोर');
    }

    return translated;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      isHindi,
      t,
      translateStatus,
      translateSeverity,
      translateGoodsType,
      translateAlertType,
      translateAuditAction,
      translateRole,
      translateText,
      translateAlertTitle,
      translateAlertDescription,
      translateRouteName
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
