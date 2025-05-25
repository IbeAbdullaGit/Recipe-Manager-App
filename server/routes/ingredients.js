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
    // Convert all ingredients to lowercase for case-insensitive matching
    const lowerIngredients = ingredients.map(ingredient => ingredient.toLowerCase().trim());
    
    // Create dynamic WHERE conditions for partial matching
    // Each user ingredient will match if:
    // 1. Exact match, OR
    // 2. Database ingredient contains user ingredient (if user input >= 4 chars), OR  
    // 3. User ingredient contains database ingredient (if db ingredient >= 4 chars)
    const whereConditions = lowerIngredients.map((ingredient, index) => {
      if (ingredient.length >= 4) {
        return `(
          LOWER(i.name) = ? OR
          LOWER(i.name) LIKE ? OR
          (LENGTH(LOWER(i.name)) >= 4 AND ? LIKE '%' || LOWER(i.name) || '%')
        )`;
      } else {
        // For short ingredients, require exact match
        return `LOWER(i.name) = ?`;
      }
    }).join(' OR ');
    
    // Create parameter array for the query
    const queryParams = [];
    lowerIngredients.forEach(ingredient => {
      if (ingredient.length >= 4) {
        queryParams.push(ingredient); // exact match
        queryParams.push(`%${ingredient}%`); // database contains user input
        queryParams.push(ingredient); // user input contains database
      } else {
        queryParams.push(ingredient); // exact match only
      }
    });
    
    // This query finds recipes where ingredients partially or exactly match the user's ingredient list
    // and ranks them by how complete they are (% of recipe ingredients the user has)
    const query = `
      WITH recipe_ingredient_counts AS (
        SELECT r.id, COUNT(ri.ingredient_id) as total_ingredients
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        GROUP BY r.id
      ),
      matching_ingredients AS (
        SELECT r.id, r.title, r.prep_time, COUNT(DISTINCT ri.ingredient_id) as matching_count
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ${whereConditions}
        GROUP BY r.id, r.title, r.prep_time
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
      WHERE mi.matching_count > 0
      ORDER BY match_percentage DESC, mi.matching_count DESC, r.prep_time ASC
    `;
    
    const results = await dbHelpers.all(query, queryParams);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 