const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to SQLite database
const dbPath = path.resolve(__dirname, '../database/recipes.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Initialize database tables
    initDb();
  }
});

// Create database tables if they don't exist
function initDb() {
  db.serialize(() => {
    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )`);

    // Recipes table
    db.run(`CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER,
      directions TEXT,
      prep_time INTEGER,
      serving_size INTEGER,
      notes TEXT,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )`);

    // Ingredients table
    db.run(`CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);

    // Recipe_Ingredients junction table
    db.run(`CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id INTEGER,
      ingredient_id INTEGER,
      quantity TEXT,
      unit TEXT,
      is_alternative BOOLEAN DEFAULT 0,
      alternative_for INTEGER,
      PRIMARY KEY (recipe_id, ingredient_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients (id),
      FOREIGN KEY (alternative_for) REFERENCES ingredients (id)
    )`);

    // Insert default categories
    const defaultCategories = [
      ['breakfast', 'Morning meals'],
      ['appetizer', 'Starters and snacks'],
      ['lunch', 'Midday meals'],
      ['dinner', 'Evening meals'],
      ['dessert', 'Sweet treats'],
      ['before sleep meal', 'Light meals before bedtime']
    ];

    defaultCategories.forEach(category => {
      db.run('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)', 
        category, function(err) {
          if (err) {
            console.error('Error inserting category:', err.message);
          }
        });
    });
  });
}

// Basic route
app.get('/', (req, res) => {
  res.send('Recipe Manager API is running');
});

// API Routes
// Get all recipes
app.get('/api/recipes', (req, res) => {
  db.all('SELECT * FROM recipes ORDER BY title', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single recipe with ingredients
app.get('/api/recipes/:id', (req, res) => {
  const id = req.params.id;
  
  // Get recipe details
  db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, recipe) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Get recipe ingredients
    db.all(`
      SELECT ri.*, i.name as ingredient_name 
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `, [id], (err, ingredients) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      recipe.ingredients = ingredients;
      res.json(recipe);
    });
  });
});

// Add new recipe
app.post('/api/recipes', (req, res) => {
  const { title, category_id, directions, prep_time, serving_size, notes, ingredients } = req.body;
  
  db.serialize(() => {
    // Begin transaction
    db.run('BEGIN TRANSACTION');
    
    // Insert recipe
    db.run(
      `INSERT INTO recipes (title, category_id, directions, prep_time, serving_size, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, category_id, directions, prep_time, serving_size, notes],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        const recipeId = this.lastID;
        let pendingIngredients = ingredients.length;
        
        // No ingredients to add
        if (pendingIngredients === 0) {
          db.run('COMMIT');
          return res.json({ id: recipeId, ...req.body });
        }
        
        // Insert ingredients
        ingredients.forEach(ing => {
          // Check if ingredient exists
          db.get('SELECT id FROM ingredients WHERE name = ?', [ing.name], (err, row) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            let ingredientId;
            
            if (row) {
              ingredientId = row.id;
              addRecipeIngredient();
            } else {
              // Create new ingredient
              db.run('INSERT INTO ingredients (name) VALUES (?)', [ing.name], function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                ingredientId = this.lastID;
                addRecipeIngredient();
              });
            }
            
            function addRecipeIngredient() {
              // Add to junction table
              db.run(
                `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, is_alternative, alternative_for)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [recipeId, ingredientId, ing.quantity, ing.unit, ing.is_alternative ? 1 : 0, ing.alternative_for || null],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  
                  pendingIngredients--;
                  
                  // If all ingredients are processed, commit transaction
                  if (pendingIngredients === 0) {
                    db.run('COMMIT');
                    res.json({ id: recipeId, ...req.body });
                  }
                }
              );
            }
          });
        });
      }
    );
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// What can my fridge make - search recipes by ingredients
app.post('/api/fridge-search', (req, res) => {
  const { ingredients } = req.body;
  
  if (!ingredients || !ingredients.length) {
    return res.status(400).json({ error: 'No ingredients provided' });
  }
  
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
  
  db.all(query, ingredients, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, db };