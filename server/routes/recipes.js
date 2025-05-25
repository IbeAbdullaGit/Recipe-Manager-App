const express = require('express');
const { dbHelpers } = require('../utils/database');
const { parseInstagramRecipe, parseIngredient } = require('../utils/recipeParser');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

// Get all recipes
router.get('/', async (req, res) => {
  try {
    const recipes = await dbHelpers.all('SELECT * FROM recipes ORDER BY title');
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single recipe with ingredients
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recipe with category name
    const recipe = await dbHelpers.get(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `, [id]);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Get recipe ingredients
    const ingredients = await dbHelpers.all(`
      SELECT ri.*, i.name as ingredient_name 
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `, [id]);
    
    recipe.ingredients = ingredients;
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new recipe
router.post('/', async (req, res) => {
  try {
    const { title, category_id, directions, prep_time, serving_size, notes, ingredients } = req.body;
    
    // Validate and clean data
    const cleanedData = {
      title: title?.trim() || '',
      category_id: category_id && category_id.trim() !== '' ? parseInt(category_id) : null,
      directions: directions?.trim() || '',
      prep_time: prep_time && prep_time !== '' ? parseInt(prep_time) : null,
      serving_size: serving_size && serving_size !== '' ? parseInt(serving_size) : null,
      notes: notes?.trim() || ''
    };
    
    // Validate ingredients
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Ingredients must be provided as an array' });
    }
    
    const validIngredients = ingredients.filter(ing => ing.name && ing.name.trim() !== '');
    
    if (validIngredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient with a name is required' });
    }
    
    // Use transaction to create recipe with ingredients
    await dbHelpers.transaction([
      async () => {
        // Create recipe
        const result = await dbHelpers.run(
          `INSERT INTO recipes (title, category_id, directions, prep_time, serving_size, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cleanedData.title, cleanedData.category_id, cleanedData.directions, 
           cleanedData.prep_time, cleanedData.serving_size, cleanedData.notes]
        );
        
        const recipeId = result.lastID;
        
        // Create ingredients and relationships
        const ingredientMap = await dbHelpers.createIngredientsIfNotExist(validIngredients);
        await dbHelpers.createRecipeIngredients(recipeId, validIngredients, ingredientMap);
        
        return { id: recipeId, ...req.body };
      }
    ]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Recipe creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update existing recipe
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category_id, directions, prep_time, serving_size, notes, ingredients } = req.body;
    
    // Validate ingredients
    const validIngredients = ingredients.filter(ing => ing.name && ing.name.trim() !== '');
    
    await dbHelpers.transaction([
      async () => {
        // Update recipe
        await dbHelpers.run(
          `UPDATE recipes 
           SET title = ?, category_id = ?, directions = ?, prep_time = ?, serving_size = ?, notes = ?
           WHERE id = ?`,
          [title, category_id, directions, prep_time, serving_size, notes, id]
        );
        
        // Delete existing recipe_ingredients
        await dbHelpers.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
        
        // Create new ingredients and relationships
        if (validIngredients.length > 0) {
          const ingredientMap = await dbHelpers.createIngredientsIfNotExist(validIngredients);
          await dbHelpers.createRecipeIngredients(id, validIngredients, ingredientMap);
        }
      }
    ]);
    
    res.json({ id, ...req.body });
  } catch (err) {
    console.error('Recipe update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbHelpers.transaction([
      async () => {
        await dbHelpers.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
        await dbHelpers.run('DELETE FROM recipes WHERE id = ?', [id]);
      }
    ]);
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import recipe from URL
router.post('/import', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    let recipe = {
      title: '',
      prep_time: '',
      serving_size: '',
      directions: '',
      notes: '',
      ingredients: []
    };
    
    if (url.includes('instagram.com')) {
      recipe = await parseInstagramRecipe(url);
    } else {
      // Regular website parsing
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Try JSON-LD structured data first
      recipe = parseStructuredData($) || parseHtmlFallback($);
    }
    
    // Ensure we have at least one ingredient
    if (recipe.ingredients.length === 0) {
      recipe.ingredients = [{ name: '', quantity: '', unit: '', is_alternative: false }];
    }
    
    res.json(recipe);
    
  } catch (error) {
    console.error('Error importing recipe:', error);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({ error: 'Unable to access the provided URL. Please check the URL and try again.' });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to import recipe. The website might not be supported or the recipe format is not recognized.' });
  }
});

// Helper functions for recipe parsing
function parseStructuredData($) {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  let recipeData = null;
  
  jsonLdScripts.each((i, script) => {
    try {
      const data = JSON.parse($(script).html());
      if (data['@type'] === 'Recipe' || (data['@graph'] && data['@graph'].find(item => item['@type'] === 'Recipe'))) {
        recipeData = data['@type'] === 'Recipe' ? data : data['@graph'].find(item => item['@type'] === 'Recipe');
        return false; // break
      }
    } catch (e) {
      // Continue if JSON parsing fails
    }
  });
  
  if (!recipeData) return null;
  
  const recipe = {
    title: recipeData.name || '',
    prep_time: extractTime(recipeData.prepTime),
    serving_size: extractServing(recipeData.recipeYield),
    directions: extractInstructions(recipeData.recipeInstructions),
    notes: recipeData.recipeNotes || recipeData.cookingTips || recipeData.notes || recipeData.description || '',
    ingredients: (recipeData.recipeIngredient || []).map(ingredient => parseIngredient(ingredient))
  };
  
  return recipe;
}

function parseHtmlFallback($) {
  const recipe = {
    title: '',
    prep_time: '',
    serving_size: '',
    directions: '',
    notes: '',
    ingredients: []
  };

  // Enhanced title parsing with multiple selectors
  const titleSelectors = [
    'h1.o-AssetTitle__a-HeadlineText',          // Food Network
    '.o-RecipeInfo__a-Headline',                // Food Network
    'h1[class*="recipe"]',                      // Generic recipe title
    '.recipe-title',                            // Common class
    'h1',                                       // Fallback
    '[data-module="AssetTitle"] h1',            // Food Network variant
    '.m-AssetTitle h1'                          // Food Network variant
  ];
  
  for (const selector of titleSelectors) {
    const titleEl = $(selector).first();
    if (titleEl.length) {
      const title = titleEl.text().trim();
      if (title && title !== 'Level:' && title.length > 5) {
        recipe.title = title;
        break;
      }
    }
  }

  // Enhanced prep time parsing
  const timeSelectors = [
    '.o-RecipeInfo__a-Description.m-RecipeInfo__a-Description--Total',  // Food Network
    '.o-RecipeInfo__a-Description:contains("min")',                     // Food Network
    '.o-RecipeInfo__a-Description:contains("hr")',                      // Food Network  
    '.o-RecipeInfo__a-Description',                                     // Food Network
    '[class*="prep-time"]',                                             // Generic
    '.recipe-meta:contains("Prep")',                                    // Generic
    '.prep-time',                                                       // Common class
    '.cooking-time',                                                    // Common class
    '[data-testid*="time"]'                                            // Generic testid
  ];
  
  for (const selector of timeSelectors) {
    const timeEl = $(selector).first();
    if (timeEl.length) {
      const timeText = timeEl.text().trim();
      const timeMatch = timeText.match(/(\d+)\s*(hr|hour|hours)?\s*(\d+)?\s*(min|minute|minutes)/i);
      if (timeMatch) {
        let totalMinutes = 0;
        if (timeMatch[1] && timeMatch[2]) { // Hours present
          totalMinutes += parseInt(timeMatch[1]) * 60;
          if (timeMatch[3]) { // Minutes also present
            totalMinutes += parseInt(timeMatch[3]);
          }
        } else if (timeMatch[1]) { // Only minutes
          totalMinutes = parseInt(timeMatch[1]);
        }
        if (totalMinutes > 0) {
          recipe.prep_time = totalMinutes;
          break;
        }
      }
    }
  }

  // Enhanced serving size parsing
  const servingSelectors = [
    '.o-RecipeInfo__a-Description:contains("serving")',   // Food Network
    '.o-RecipeInfo__a-Description:contains("Serving")',   // Food Network
    '.o-RecipeInfo__a-Description:contains("serves")',    // Food Network
    '.o-RecipeInfo__a-Description:contains("Serves")',    // Food Network
    '.o-RecipeInfo__a-Description:contains("yield")',     // Food Network
    '[class*="serving"]',                                 // Generic
    '.recipe-meta:contains("Serves")',                    // Generic
    '.serving-size',                                      // Common class
    '.recipe-yield'                                       // Common class
  ];
  
  for (const selector of servingSelectors) {
    const servingEl = $(selector).first();
    if (servingEl.length) {
      const servingText = servingEl.text().trim();
      const servingMatch = servingText.match(/(\d+)/);
      if (servingMatch) {
        recipe.serving_size = parseInt(servingMatch[0]);
        break;
      }
    }
  }

  // Enhanced ingredient parsing
  const ingredientSelectors = [
    '.o-Ingredients__a-Ingredient--CheckboxLabel',      // Food Network checkbox labels
    '.o-RecipeIngredients__a-Ingredient',               // Food Network
    '.o-RecipeIngredients__a-ListItem',                 // Food Network
    '.o-RecipeIngredients li',                          // Food Network
    '.o-RecipeIngredients p',                           // Food Network
    '.o-RecipeIngredients div[class*="Ingredient"]',    // Food Network
    'section[class*="ingredient"] p',                   // Generic
    'section[class*="ingredient"] div',                 // Generic
    '.recipe-ingredients li',                           // Common class
    '[data-module="RecipeIngredients"] li',             // Food Network data module
    '.m-RecipeIngredients li',                          // Food Network
    'section[class*="ingredient"] li',                  // Generic
    '.recipe-ingredient',                               // Common class
    '.ingredients-section li',                          // Generic
    '.ingredient-list li',                              // Generic
    '.recipe-card-ingredient'                           // Generic
  ];
  
  for (const selector of ingredientSelectors) {
    const ingredientEls = $(selector);
    if (ingredientEls.length > 0) {
             ingredientEls.each((i, el) => {
         const text = $(el).text().trim();
         if (text && text.length > 2 && 
             !text.toLowerCase().includes('ingredients') && 
             !text.toLowerCase().includes('deselect') && 
             !text.toLowerCase().includes('select all') &&
             text.toLowerCase() !== 'deselect all') {
           recipe.ingredients.push(parseIngredient(text));
         }
       });
      
      if (recipe.ingredients.length > 0) {
        break; // Found ingredients, stop trying other selectors
      }
    }
  }

  // Enhanced directions parsing
  const directionSelectors = [
    '.o-Method__m-Step',                          // Food Network
    '.o-RecipeDirections__a-ListItem',            // Food Network
    '.o-RecipeDirections li',                     // Food Network
    '.o-Method p',                                // Food Network
    '.o-Method div[class*="Step"]',               // Food Network
    'section[class*="method"] p',                 // Generic
    'section[class*="method"] div',               // Generic
    '.recipe-instructions li',                    // Common class
    '.recipe-directions li',                      // Common class
    '.instructions-list li',                      // Generic
    '.method-list li',                           // Generic
    '.recipe-method li'                          // Generic
  ];
  
  for (const selector of directionSelectors) {
    const directionEls = $(selector);
    if (directionEls.length > 0) {
      const directions = [];
      let stepNumber = 1;
      
      directionEls.each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          // Check if text already has step numbering
          if (text.match(/^step\s*\d+/i)) {
            directions.push(text);
          } else if (text.match(/^\d+\./)) {
            directions.push(text.replace(/^\d+\./, `Step ${stepNumber}:`));
            stepNumber++;
          } else {
            directions.push(`Step ${stepNumber}: ${text}`);
            stepNumber++;
          }
        }
      });
      
      if (directions.length > 0) {
        recipe.directions = directions.join('\n\n');
        break;
      }
    }
  }

  // Try to extract notes from description or other areas
  const noteSelectors = [
    '.recipe-description',
    '.recipe-summary', 
    '.recipe-notes',
    '.chef-notes',
    '.cooking-tips',
    '.recipe-intro p'
  ];
  
  for (const selector of noteSelectors) {
    const noteEl = $(selector).first();
    if (noteEl.length) {
      const noteText = noteEl.text().trim();
      if (noteText && noteText.length > 20) {
        recipe.notes = noteText;
        break;
      }
    }
  }

  // Ensure we have at least one ingredient field
  if (recipe.ingredients.length === 0) {
    recipe.ingredients = [{ name: '', quantity: '', unit: '', is_alternative: false }];
  }

  // Set fallback title if none found
  if (!recipe.title) {
    recipe.title = 'Imported Recipe';
  }
  
  return recipe;
}

function extractTime(timeString) {
  if (!timeString) return '';
  const timeMatch = timeString.match(/PT(\d+)M/);
  return timeMatch ? parseInt(timeMatch[1]) : '';
}

function extractServing(yieldData) {
  if (!yieldData) return '';
  const yield_val = Array.isArray(yieldData) ? yieldData[0] : yieldData;
  const servingMatch = yield_val.toString().match(/\d+/);
  return servingMatch ? parseInt(servingMatch[0]) : '';
}

function extractInstructions(instructions) {
  if (!instructions) return '';
  const instructionArray = Array.isArray(instructions) ? instructions : [instructions];
  return instructionArray.map((instruction, index) => {
    let text = '';
    if (typeof instruction === 'string') {
      text = instruction;
    } else if (instruction.text) {
      text = instruction.text;
    } else if (instruction.name) {
      text = instruction.name;
    }
    
    text = text.trim();
    if (text && !text.match(/^(step\s*\d+|^\d+\.)/i)) {
      return `Step ${index + 1}: ${text}`;
    }
    return text;
  }).filter(step => step).join('\n\n');
}

module.exports = router; 