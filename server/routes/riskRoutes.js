const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Risk Analysis API placeholder',
    assessments: [
      { location: 'NH-6', threat: 'LANDSLIDE', level: 'HIGH', recommendation: 'Divert to NH-2' },
      { location: 'Guwahati Plains', threat: 'FLOOD', level: 'MEDIUM', recommendation: 'Proceed with Caution' }
    ]
  });
});

module.exports = router;
