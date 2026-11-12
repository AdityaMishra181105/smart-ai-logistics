// Base weights map for priority levels
const BaseWeightProfiles = {
  NORMAL: {
    distance: 25,
    duration: 25,
    safety: 35,
    environmental: 15
  },
  LOW: {
    distance: 40,
    duration: 25,
    safety: 20,
    environmental: 15
  },
  HIGH: {
    distance: 15,
    duration: 20,
    safety: 45,
    environmental: 20
  },
  URGENT: {
    distance: 15,
    duration: 45,
    safety: 30,
    environmental: 10
  }
};

// Weight offsets map for cargo categories
const CategoryAdjustments = {
  MEDICINE: {
    duration: 10,
    distance: -5,
    environmental: -5,
    safety: 0
  },
  FOOD: {
    duration: 5,
    safety: 5,
    distance: -10,
    environmental: 0
  },
  AGRICULTURE: {
    distance: 10,
    duration: -5,
    safety: -5,
    environmental: 0
  },
  CONSTRUCTION: {
    distance: 0,
    duration: 0,
    safety: 0,
    environmental: 0
  },
  OTHER: {
    distance: 0,
    duration: 0,
    safety: 0,
    environmental: 0
  }
};

// Sub-score penalty values based on combined risk levels
const RiskPenalties = {
  CRITICAL: -35,
  HIGH: -15,
  MEDIUM: -5,
  LOW: 0
};

// Classification tags for route options suitability
const ViabilityLevels = {
  RECOMMENDED: 'RECOMMENDED',
  VIABLE: 'VIABLE',
  CAUTION: 'CAUTION',
  AVOID: 'AVOID'
};

module.exports = {
  BaseWeightProfiles,
  CategoryAdjustments,
  RiskPenalties,
  ViabilityLevels
};
