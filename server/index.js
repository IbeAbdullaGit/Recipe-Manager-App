const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDb } = require('./utils/database');
const { requestLogger } = require('./middleware/logging');

// Route imports
const recipesRoutes = require('./routes/recipes');
const categoriesRoutes = require('./routes/categories');
const ingredientsRoutes = require('./routes/ingredients');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// Initialize database
initDb();

// Routes
app.get('/', (req, res) => {
  res.send('Recipe Manager API is running');
});

app.use('/api/recipes', recipesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/ingredients', ingredientsRoutes);

// Legacy route for fridge search (maintain compatibility)
// Import the specific route handler
const { dbHelpers } = require('./utils/database');

app.post('/api/fridge-search', async (req, res) => {
  const { ingredients } = req.body;
  
  if (!ingredients || !ingredients.length) {
    return res.status(400).json({ error: 'No ingredients provided' });
  }
  
  try {
    // Convert all ingredients to lowercase for case-insensitive matching
    const lowerIngredients = ingredients.map(ingredient => ingredient.toLowerCase().trim());
    
    // Create dynamic WHERE conditions for partial matching
    const whereConditions = lowerIngredients.map((ingredient, index) => {
      if (ingredient.length >= 4) {
        return `(
          LOWER(i.name) = ? OR
          LOWER(i.name) LIKE ? OR
          (LENGTH(LOWER(i.name)) >= 4 AND ? LIKE '%' || LOWER(i.name) || '%')
        )`;
      } else {
        return `LOWER(i.name) = ?`;
      }
    }).join(' OR ');
    
    // Create parameter array for the query
    const queryParams = [];
    lowerIngredients.forEach(ingredient => {
      if (ingredient.length >= 4) {
        queryParams.push(ingredient);
        queryParams.push(`%${ingredient}%`);
        queryParams.push(ingredient);
      } else {
        queryParams.push(ingredient);
      }
    });
    
    // Query to find matching recipes
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

// Legacy route for import (maintain compatibility) 
app.post('/api/import-recipe', (req, res) => {
  req.url = '/import';
  recipesRoutes(req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Recipe Manager Server running on port ${PORT}`);
  console.log(`📊 Database optimizations applied`);
  console.log(`🗂️  Modular architecture loaded`);
});

module.exports = app;