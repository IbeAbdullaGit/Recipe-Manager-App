const express = require('express');
const { dbHelpers } = require('../utils/database');

const router = express.Router();

// Get all ingredients
router.get('/', async (req, res) => {
  try {
    const ingredients = await dbHelpers.all('SELECT * FROM ingredients ORDER BY name');
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// What can my fridge make - search recipes by ingredients
router.post('/fridge-search', async (req, res) => {
  const { ingredients } = req.body;
  
  if (!ingredients || !ingredients.length) {
    return res.status(400).json({ error: 'No ingredients provided' });
  }
  
  try {
    // Create placeholders for the SQL query
    const placeholders = ingredients.map(() => '?').join(',');
    
    // This query finds recipes where all ingredients are in the user's ingredient list
    // and ranks them by how complete they are (% of recipe ingredients the user has)
    const query = `
      WITH recipe_ingredient_counts AS (
        SELECT r.id, COUNT(ri.ingredient_id) as total_ingredients
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        GROUP BY r.id
      ),
      matching_ingredients AS (
        SELECT r.id, r.title, r.prep_time, COUNT(ri.ingredient_id) as matching_count
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE i.name IN (${placeholders})
        GROUP BY r.id
      )
      SELECT 
        r.id, r.title, r.prep_time, c.name as category,
        mi.matching_count, 
        ric.total_ingredients,
        ROUND((mi.matching_count * 100.0 / ric.total_ingredients), 2) as match_percentage
      FROM matching_ingredients mi
      JOIN recipes r ON mi.id = r.id
      JOIN recipe_ingredient_counts ric ON r.id = ric.id
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY match_percentage DESC, r.prep_time ASC
    `;
    
    const results = await dbHelpers.all(query, ingredients);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 