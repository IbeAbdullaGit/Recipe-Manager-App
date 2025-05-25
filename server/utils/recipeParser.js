const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extract recipe data from Instagram video posts
 * Note: Instagram requires special handling due to their dynamic content loading
 */
async function parseInstagramRecipe(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
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
    
    // Try to get content from multiple sources
    const description = $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || 
                       $('meta[property="twitter:description"]').attr('content') || '';
    
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[property="twitter:title"]').attr('content') ||
                  $('title').text() || '';
    
    // Extract content from description
    if (description) {
      console.log('Instagram description found:', description);
      
      // Split by common delimiters
      const lines = description.split(/[\n\r•·\-\*]/g)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      let currentSection = '';
      let stepCounter = 1;
      
      for (let line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Detect sections
        if (lowerLine.includes('ingredient') || lowerLine.includes('you need') || lowerLine.includes('what you need')) {
          currentSection = 'ingredients';
          continue;
        } else if (lowerLine.includes('instruction') || lowerLine.includes('method') || 
                   lowerLine.includes('step') || lowerLine.includes('direction') ||
                   lowerLine.includes('how to') || lowerLine.includes('recipe')) {
          currentSection = 'instructions';
          stepCounter = 1;
          continue;
        } else if (lowerLine.includes('note') || lowerLine.includes('tip') || lowerLine.includes('hint')) {
          currentSection = 'notes';
          continue;
        }
        
        // Extract metadata
        if (lowerLine.includes('serve') || lowerLine.includes('portion')) {
          const servingMatch = line.match(/(\d+)/);
          if (servingMatch) {
            recipe.serving_size = parseInt(servingMatch[1]);
          }
          continue;
        }
        
        if (lowerLine.includes('prep') || lowerLine.includes('time') || lowerLine.includes('minute') || lowerLine.includes('hour')) {
          const timeMatch = line.match(/(\d+)/);
          if (timeMatch) {
            recipe.prep_time = parseInt(timeMatch[1]);
          }
          continue;
        }
        
        // Extract title if not found yet
        if (!recipe.title && line.length > 5 && line.length < 100 && 
            (lowerLine.includes('recipe') || lines.indexOf(line) === 0)) {
          recipe.title = line.replace(/recipe/i, '').trim();
          continue;
        }
        
        // Add content to sections
        if (currentSection === 'ingredients' && line.length > 2) {
          // Clean ingredient line
          const cleanLine = line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
          if (cleanLine) {
            recipe.ingredients.push({
              name: cleanLine,
              quantity: '',
              unit: '',
              is_alternative: false
            });
          }
        } else if (currentSection === 'instructions' && line.length > 5) {
          const cleanLine = line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
          if (cleanLine) {
            const stepText = cleanLine.match(/^step\s*\d+/i) ? cleanLine : `Step ${stepCounter}: ${cleanLine}`;
            if (recipe.directions) {
              recipe.directions += '\n\n' + stepText;
            } else {
              recipe.directions = stepText;
            }
            stepCounter++;
          }
        } else if (currentSection === 'notes' && line.length > 5) {
          const cleanLine = line.trim();
          if (recipe.notes) {
            recipe.notes += ' ' + cleanLine;
          } else {
            recipe.notes = cleanLine;
          }
        }
      }
    }
    
    // If we couldn't extract much, try from title
    if (!recipe.title && title) {
      const titleParts = title.split(/[•\-|]/);
      if (titleParts.length > 0) {
        recipe.title = titleParts[0].trim();
      }
    }
    
    // If still no content, try alternative parsing
    if (!recipe.title && !recipe.ingredients.length && !recipe.directions) {
      // Try to find any text content in the page
      const allText = $('body').text();
      const textLines = allText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10 && line.length < 500);
      
      if (textLines.length > 0) {
        recipe.title = textLines[0];
        recipe.notes = 'Content imported from Instagram. Please review and edit the recipe details.';
      }
    }
    
    // Ensure we have at least some content
    if (!recipe.ingredients.length) {
      recipe.ingredients = [{ name: '', quantity: '', unit: '', is_alternative: false }];
    }
    
    if (!recipe.title) {
      recipe.title = 'Instagram Recipe';
    }
    
    if (!recipe.directions) {
      recipe.directions = 'Please add cooking instructions from the Instagram post.';
    }
    
    return recipe;
    
  } catch (error) {
    console.error('Instagram parsing error:', error);
    // Return a basic structure that user can fill in
    return {
      title: 'Instagram Recipe - Please Edit',
      prep_time: '',
      serving_size: '',
      directions: 'Please copy the cooking instructions from the Instagram post.',
      notes: 'This recipe was imported from Instagram. Please review and complete the details.',
      ingredients: [{ name: '', quantity: '', unit: '', is_alternative: false }]
    };
  }
}

/**
 * Enhanced recipe parsing with better ingredient extraction
 */
function parseIngredient(ingredientText) {
  if (!ingredientText || typeof ingredientText !== 'string') {
    return { name: '', quantity: '', unit: '', is_alternative: false };
  }
  
  let text = ingredientText.trim();
  
  // Remove common prefixes and suffixes
  text = text.replace(/^[-•*]\s*/, ''); // Remove bullet points
  text = text.replace(/\s+/g, ' '); // Normalize whitespace
  
  // Clean up Food Network specific formatting
  // Remove parenthetical cooking instructions like "(about a cup)", "(finely diced)", etc.
  text = text.replace(/\s*\([^)]*\)/g, '');
  
  // Remove common cooking instruction suffixes and comma-separated instructions
  // Only remove if they appear after a comma or at the end
  text = text.replace(/,\s*(finely diced|chopped|sliced|minced|grated|crushed|roughly chopped|thinly sliced|cooked|for serving).*$/i, '');
  text = text.replace(/\s+(finely diced|sliced|minced|grated|crushed|roughly chopped|thinly sliced|cooked|for serving).*$/i, '');
  
  // Clean up double spaces and trim
  text = text.replace(/\s+/g, ' ').trim();
  
  let quantity = '';
  let unit = '';
  let name = text;
  
  // Simple and reliable parsing approach
  // Match quantity at the beginning: numbers, fractions, mixed numbers
  const quantityMatch = text.match(/^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+(.+)$/);
  
  if (quantityMatch) {
    quantity = quantityMatch[1].trim();
    const remainder = quantityMatch[2].trim();
    
    // Try to match a unit at the beginning of the remainder
    // Use simple units only to avoid issues with descriptive words
    const units = [
      'cups?', 'tablespoons?', 'tbsp', 'teaspoons?', 'tsp',
      'pounds?', 'lb', 'lbs', 'ounces?', 'oz',
      'cloves?', 'pieces?', 'cans?', 'jars?', 'packages?',
      'stalks?', 'bunches?', 'heads?', 'slices?',
      'large', 'medium', 'small', 'whole'
    ];
    
    let foundUnit = false;
    const unitPattern = new RegExp(`^(${units.join('|')})\\s+(.+)$`, 'i');
    const unitMatch = remainder.match(unitPattern);
    
    if (unitMatch) {
      unit = unitMatch[1];
      name = unitMatch[2];
      foundUnit = true;
    }
    
    if (!foundUnit) {
      // No unit found, remainder is the name
      name = remainder;
      unit = '';
    }
  } else {
    // No quantity found
    quantity = '';
    unit = '';
    name = text;
  }
  
  // Clean up the name
  name = name.replace(/^(of\s+|the\s+)/i, ''); // Remove "of" or "the" at the beginning
  name = name.replace(/\s+/g, ' ').trim(); // Final cleanup
  
  // Ensure we have at least a name
  if (!name || name.length < 2) {
    name = text;
    quantity = '';
    unit = '';
  }
  
  return {
    name: name || '',
    quantity: quantity || '',
    unit: unit || '',
    is_alternative: false
  };
}

module.exports = {
  parseInstagramRecipe,
  parseIngredient
}; 