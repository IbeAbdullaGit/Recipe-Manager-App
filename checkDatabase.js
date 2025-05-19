const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.resolve(__dirname, './database/recipes.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
  
  // Query all recipes
  db.all(`
    SELECT r.*, c.name as category_name
    FROM recipes r
    LEFT JOIN categories c ON r.category_id = c.id
    ORDER BY r.title
  `, [], (err, recipes) => {
    if (err) {
      console.error('Error querying recipes:', err.message);
      return;
    }
    
    if (recipes.length === 0) {
      console.log('No recipes found in the database.');
    } else {
      console.log(`\nFound ${recipes.length} recipes:\n`);
      
      recipes.forEach((recipe, index) => {
        console.log(`------- Recipe ${index + 1} -------`);
        console.log(`ID: ${recipe.id}`);
        console.log(`Title: ${recipe.title}`);
        console.log(`Category: ${recipe.category_name}`);
        console.log(`Prep Time: ${recipe.prep_time} minutes`);
        console.log(`Serving Size: ${recipe.serving_size || 'Not specified'}`);
        console.log(`Date Added: ${recipe.date_added}`);
        console.log(`-----------------------------\n`);
      });
      
      // Now query ingredients for each recipe
      console.log('Getting ingredients for each recipe:');
      
      let pending = recipes.length;
      recipes.forEach(recipe => {
        db.all(`
          SELECT i.name as ingredient_name, ri.quantity, ri.unit, ri.is_alternative
          FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = ?
        `, [recipe.id], (err, ingredients) => {
          if (err) {
            console.error(`Error querying ingredients for recipe ${recipe.id}:`, err.message);
            return;
          }
          
          console.log(`\nIngredients for "${recipe.title}":`);
          if (ingredients.length === 0) {
            console.log(' - No ingredients found');
          } else {
            ingredients.forEach(ing => {
              console.log(` - ${ing.ingredient_name}${ing.quantity ? ' (' + ing.quantity + ' ' + ing.unit + ')' : ''}`);
            });
          }
          
          pending--;
          if (pending === 0) {
            console.log('\nDatabase query complete.');
            // Close the database
            db.close();
          }
        });
      });
    }
  });
}); 