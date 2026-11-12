const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Weather information API placeholder',
    regions: {
      Guwahati: { temp: '32°C', status: 'Partly Cloudy', rainChance: '20%' },
      Shillong: { temp: '21°C', status: 'Heavy Rain', rainChance: '90%' },
      Gangtok: { temp: '18°C', status: 'Mist', rainChance: '40%' }
    }
  });
});

module.exports = router;
