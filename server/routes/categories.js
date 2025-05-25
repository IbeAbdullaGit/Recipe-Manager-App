const express = require('express');
const { dbHelpers } = require('../utils/database');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await dbHelpers.all('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 