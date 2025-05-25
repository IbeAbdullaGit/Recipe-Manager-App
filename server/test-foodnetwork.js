const axios = require('axios');
const cheerio = require('cheerio');
const { parseIngredient } = require('./utils/recipeParser');

async function testFoodNetworkParsing() {
  const url = 'https://www.foodnetwork.com/recipes/food-network-kitchen/bolognese-bianco-3542630';
  
  console.log('Testing Food Network recipe parsing...');
  console.log('URL:', url);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    let recipe = {
      title: '',
      prep_time: '',
      serving_size: '',
      directions: '',
      notes: '',
      ingredients: []
    };
    
    console.log('\n=== TESTING STRUCTURED DATA ===');
    
    // Try JSON-LD structured data first
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let recipeData = null;
    
    console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);
    
    jsonLdScripts.each((i, script) => {
      try {
        const data = JSON.parse($(script).html());
        console.log(`Script ${i + 1} type:`, data['@type'] || 'Unknown');
        console.log(`Script ${i + 1} keys:`, Object.keys(data).slice(0, 10)); // Show first 10 keys
        
        if (data['@type'] === 'Recipe' || (data['@graph'] && data['@graph'].find(item => item['@type'] === 'Recipe'))) {
          recipeData = data['@type'] === 'Recipe' ? data : data['@graph'].find(item => item['@type'] === 'Recipe');
          console.log('✅ Found Recipe structured data!');
          return false; // break
        }
      } catch (e) {
        console.log(`Script ${i + 1}: JSON parsing failed`);
      }
    });
    
    if (recipeData) {
      console.log('\n=== STRUCTURED DATA RESULTS ===');
      console.log('Title:', recipeData.name || 'Not found');
      console.log('Prep Time:', recipeData.prepTime || 'Not found');
      console.log('Yield:', recipeData.recipeYield || 'Not found');
      console.log('Ingredients count:', recipeData.recipeIngredient?.length || 0);
      console.log('Instructions count:', recipeData.recipeInstructions?.length || 0);
      console.log('Description:', recipeData.description?.substring(0, 100) + '...' || 'Not found');
      
      // Parse the data
      recipe.title = recipeData.name || '';
      
      if (recipeData.prepTime) {
        const timeMatch = recipeData.prepTime.match(/PT(\d+)M/);
        if (timeMatch) {
          recipe.prep_time = parseInt(timeMatch[1]);
        }
      }
      
      if (recipeData.recipeYield) {
        const yield_val = Array.isArray(recipeData.recipeYield) ? recipeData.recipeYield[0] : recipeData.recipeYield;
        const servingMatch = yield_val.toString().match(/\d+/);
        if (servingMatch) {
          recipe.serving_size = parseInt(servingMatch[0]);
        }
      }
      
      if (recipeData.recipeInstructions) {
        const instructions = Array.isArray(recipeData.recipeInstructions) ? recipeData.recipeInstructions : [recipeData.recipeInstructions];
        recipe.directions = instructions.map((instruction, index) => {
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
      
      if (recipeData.recipeIngredient) {
        recipe.ingredients = recipeData.recipeIngredient.map(ingredient => parseIngredient(ingredient));
      }
      
      if (recipeData.description) {
        recipe.notes = recipeData.description;
      }
    } else {
      console.log('\n=== TESTING HTML PARSING ===');
      
      // Test title
      const titleSelectors = [
        'h1.o-AssetTitle__a-HeadlineText',
        '.o-RecipeInfo__a-Headline',
        'h1[class*="recipe"]',
        '.recipe-title',
        'h1',
        '[data-module="AssetTitle"] h1',
        '.m-AssetTitle h1'
      ];
      
      console.log('\nTesting title selectors:');
      for (const selector of titleSelectors) {
        const titleEl = $(selector).first();
        if (titleEl.length) {
          const title = titleEl.text().trim();
          console.log(`✓ "${selector}": "${title}"`);
          if (title && title !== 'Level:' && title.length > 5) {
            recipe.title = title;
            break;
          }
        } else {
          console.log(`✗ "${selector}": Not found`);
        }
      }
      
      // Test prep time with Food Network specific selectors
      const timeSelectors = [
        '.o-RecipeInfo__a-Description.m-RecipeInfo__a-Description--Total',
        '.o-RecipeInfo__a-Description:contains("min")',
        '.o-RecipeInfo__a-Description:contains("hr")',
        '.o-RecipeInfo__a-Description',
        '[class*="prep-time"]',
        '.recipe-meta:contains("Prep")'
      ];
      
      console.log('\nTesting prep time selectors:');
      for (const selector of timeSelectors) {
        const timeEl = $(selector).first();
        if (timeEl.length) {
          const timeText = timeEl.text().trim();
          console.log(`✓ "${selector}": "${timeText}"`);
          const timeMatch = timeText.match(/(\d+)\s*(hr|hour|hours)?\s*(\d+)?\s*(min|minute|minutes)/i);
          if (timeMatch && !recipe.prep_time) {
            let totalMinutes = 0;
            if (timeMatch[1] && (timeMatch[2])) { // Hours present
              totalMinutes += parseInt(timeMatch[1]) * 60;
              if (timeMatch[3]) { // Minutes also present
                totalMinutes += parseInt(timeMatch[3]);
              }
            } else if (timeMatch[1]) { // Only minutes
              totalMinutes = parseInt(timeMatch[1]);
            }
            if (totalMinutes > 0) {
              recipe.prep_time = totalMinutes;
              console.log(`  → Parsed as: ${totalMinutes} minutes`);
            }
          }
        } else {
          console.log(`✗ "${selector}": Not found`);
        }
      }
      
      // Test serving size with Food Network specific selectors
      const servingSelectors = [
        '.o-RecipeInfo__a-Description:contains("serving")',
        '.o-RecipeInfo__a-Description:contains("Serving")',
        '.o-RecipeInfo__a-Description:contains("serves")',
        '.o-RecipeInfo__a-Description:contains("Serves")',
        '.o-RecipeInfo__a-Description:contains("yield")',
        '[class*="serving"]',
        '.recipe-meta:contains("Serves")'
      ];
      
      console.log('\nTesting serving size selectors:');
      for (const selector of servingSelectors) {
        const servingEl = $(selector).first();
        if (servingEl.length) {
          const servingText = servingEl.text().trim();
          console.log(`✓ "${selector}": "${servingText}"`);
          const servingMatch = servingText.match(/(\d+)/);
          if (servingMatch && !recipe.serving_size) {
            recipe.serving_size = parseInt(servingMatch[0]);
            console.log(`  → Parsed as: ${recipe.serving_size} servings`);
          }
        } else {
          console.log(`✗ "${selector}": Not found`);
        }
      }
      
      // Test ingredients
      const ingredientSelectors = [
        '.o-Ingredients__a-Ingredient--CheckboxLabel',
        '.o-RecipeIngredients__a-Ingredient',
        '.o-RecipeIngredients__a-ListItem',
        '.o-RecipeIngredients li',
        '.o-RecipeIngredients p',
        '.o-RecipeIngredients div[class*="Ingredient"]',
        'section[class*="ingredient"] p',
        'section[class*="ingredient"] div',
        '.recipe-ingredients li',
        '[data-module="RecipeIngredients"] li',
        '.m-RecipeIngredients li',
        'section[class*="ingredient"] li',
        '.recipe-ingredient'
      ];
      
      console.log('\nTesting ingredient selectors:');
      for (const selector of ingredientSelectors) {
        const ingredientEls = $(selector);
        console.log(`"${selector}": Found ${ingredientEls.length} elements`);
        if (ingredientEls.length > 0) {
          console.log(`Sample ingredients from "${selector}":`);
          ingredientEls.slice(0, 5).each((i, el) => {
            const text = $(el).text().trim();
            console.log(`  - "${text}"`);
          });
          
          // Only add ingredients if we haven't found any yet
          if (recipe.ingredients.length === 0) {
            ingredientEls.each((i, el) => {
              const text = $(el).text().trim();
              if (text && text.length > 2 && !text.toLowerCase().includes('ingredients') && 
                  !text.toLowerCase().includes('deselect') && !text.toLowerCase().includes('select all')) {
                recipe.ingredients.push(parseIngredient(text));
              }
            });
          }
        }
      }
      
      // Also let's examine the page structure around ingredients
      console.log('\n=== EXAMINING INGREDIENTS STRUCTURE ===');
      const ingredientSections = $('[class*="ingredient" i], [class*="Ingredient"], [data-module*="Ingredient"]');
      console.log(`Found ${ingredientSections.length} ingredient-related sections`);
      ingredientSections.each((i, section) => {
        const $section = $(section);
        console.log(`Section ${i + 1}: ${$section.attr('class') || 'No class'} - ${$section.children().length} children`);
        if (i < 2) { // Only show first 2 sections
          $section.children().slice(0, 3).each((j, child) => {
            const text = $(child).text().trim();
            if (text && text.length < 200) {
              console.log(`  Child: "${text}"`);
            }
          });
        }
      });
      
      // Test directions
      const directionSelectors = [
        '.o-Method__m-Step',
        '.o-RecipeDirections__a-ListItem',
        '.o-RecipeDirections li',
        '.o-Method p',
        '.o-Method div[class*="Step"]',
        'section[class*="method"] p',
        'section[class*="method"] div',
        '.recipe-instructions li'
      ];
      
      console.log('\nTesting direction selectors:');
      for (const selector of directionSelectors) {
        const directionEls = $(selector);
        console.log(`"${selector}": Found ${directionEls.length} elements`);
        if (directionEls.length) {
          console.log(`Sample directions from "${selector}":`);
          directionEls.slice(0, 3).each((i, el) => {
            const text = $(el).text().trim();
            console.log(`  Step ${i + 1}: "${text.substring(0, 100)}..."`);
          });
          
          if (!recipe.directions) {
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
            }
          }
        }
      }
      
      // Also let's examine the page structure around directions
      console.log('\n=== EXAMINING DIRECTIONS STRUCTURE ===');
      const directionSections = $('[class*="method" i], [class*="Method"], [class*="direction" i], [class*="Direction"], [data-module*="Method"], [data-module*="Direction"]');
      console.log(`Found ${directionSections.length} direction-related sections`);
      directionSections.each((i, section) => {
        const $section = $(section);
        console.log(`Section ${i + 1}: ${$section.attr('class') || 'No class'} - ${$section.children().length} children`);
        if (i < 2) { // Only show first 2 sections
          $section.children().slice(0, 3).each((j, child) => {
            const text = $(child).text().trim();
            if (text && text.length < 200) {
              console.log(`  Child: "${text}"`);
            }
          });
        }
      });
    }
    
    console.log('\n=== FINAL PARSED RECIPE ===');
    console.log('Title:', recipe.title || 'Not found');
    console.log('Prep Time:', recipe.prep_time || 'Not found');
    console.log('Serving Size:', recipe.serving_size || 'Not found');
    console.log('Ingredients:', recipe.ingredients.length);
    console.log('Directions length:', recipe.directions.length);
    console.log('Notes length:', recipe.notes.length);
    
    if (recipe.ingredients.length > 0) {
      console.log('\nSample ingredients:');
      recipe.ingredients.slice(0, 3).forEach((ing, i) => {
        console.log(`  ${i + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`.trim());
      });
    }
    
    if (recipe.directions) {
      console.log('\nFirst direction:');
      console.log(recipe.directions.split('\n\n')[0]);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testFoodNetworkParsing(); 