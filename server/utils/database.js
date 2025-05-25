const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.resolve(__dirname, '../../database/recipes.db');
const db = new sqlite3.Database(dbPath);

// Configure SQLite for performance
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA cache_size = -20000');
  db.run('PRAGMA temp_store = MEMORY');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA foreign_keys = ON');
});

// Helper functions
const dbHelpers = {
  // Run a query with promise support
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Get single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Get multiple rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Transaction helper
  async transaction(operations) {
    await this.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const results = [];
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      await this.run('COMMIT');
      return results;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  },

  // Bulk ingredient operations
  async bulkIngredientLookup(ingredientNames) {
    const placeholders = ingredientNames.map(() => '?').join(',');
    return this.all(`SELECT id, name FROM ingredients WHERE name IN (${placeholders})`, ingredientNames);
  },

  async createIngredientsIfNotExist(ingredients) {
    const existingIngredients = await this.bulkIngredientLookup(ingredients.map(i => i.name));
    const existingMap = new Map(existingIngredients.map(i => [i.name, i.id]));
    
    const newIngredients = ingredients.filter(i => !existingMap.has(i.name));
    
    for (const ingredient of newIngredients) {
      try {
        const result = await this.run('INSERT INTO ingredients (name) VALUES (?)', [ingredient.name]);
        existingMap.set(ingredient.name, result.lastID);
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          // Handle race condition
          const existing = await this.get('SELECT id FROM ingredients WHERE name = ?', [ingredient.name]);
          existingMap.set(ingredient.name, existing.id);
        } else {
          throw err;
        }
      }
    }
    
    return existingMap;
  },

  async createRecipeIngredients(recipeId, ingredients, ingredientMap) {
    const operations = ingredients.map(ing => async () => {
      const ingredientId = ingredientMap.get(ing.name);
      if (!ingredientId) throw new Error(`Ingredient ID not found for: ${ing.name}`);
      
      try {
        await this.run(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, is_alternative, alternative_for)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [recipeId, ingredientId, ing.quantity || '', ing.unit || '', ing.is_alternative ? 1 : 0, ing.alternative_for || null]
        );
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('recipe_ingredients.recipe_id, recipe_ingredients.ingredient_id')) {
          // Relationship already exists, skip
          return;
        }
        throw err;
      }
    });

    await Promise.all(operations.map(op => op()));
  }
};

// Initialize database tables
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

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name)');
    db.run('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title)');

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
      db.run('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)', category);
    });
  });
}

module.exports = { db, dbHelpers, initDb }; 