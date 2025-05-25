import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Search, X, ChefHat, Clock, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// Common everyday ingredients for quick selection (all lowercase)
const COMMON_INGREDIENTS = [
  // Proteins
  'chicken breast', 'ground beef', 'salmon', 'eggs', 'bacon', 'pork chops', 'shrimp', 'tofu',
  // Vegetables
  'onions', 'garlic', 'tomatoes', 'bell peppers', 'carrots', 'broccoli', 'spinach', 'potatoes',
  'mushrooms', 'zucchini', 'green beans', 'lettuce', 'cucumber', 'celery',
  // Pantry staples
  'rice', 'pasta', 'bread', 'flour', 'olive oil', 'butter', 'milk', 'cheese',
  'salt', 'black pepper', 'lemon', 'garlic powder', 'onion powder',
  // Grains & legumes
  'quinoa', 'brown rice', 'black beans', 'chickpeas', 'lentils', 'oats',
  // Herbs & spices
  'basil', 'oregano', 'thyme', 'rosemary', 'paprika', 'cumin', 'chili powder',
  // Dairy
  'yogurt', 'sour cream', 'heavy cream', 'parmesan cheese', 'mozzarella',
  // Others
  'chicken broth', 'vegetable broth', 'soy sauce', 'honey', 'vinegar'
];

const FridgeSearch = () => {
  const [ingredients, setIngredients] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [matchingRecipes, setMatchingRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllCommon, setShowAllCommon] = useState(false);
  
  // Auto-search for recipes when ingredients change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRecipes(ingredients);
    }, 300); // 300ms debounce to avoid too many API calls
    
    return () => clearTimeout(timeoutId);
  }, [ingredients]);
  
  // Handle adding an ingredient from input
  const handleAddIngredient = (ingredient = inputValue.trim()) => {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    if (normalizedIngredient && !ingredients.includes(normalizedIngredient)) {
      setIngredients([...ingredients, normalizedIngredient]);
      setInputValue('');
    }
  };
  
  // Handle removing an ingredient
  const handleRemoveIngredient = (ingredient) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };
  
  // Handle quick add from common ingredients
  const handleQuickAdd = (ingredient) => {
    // Ingredient is already lowercase from COMMON_INGREDIENTS
    if (!ingredients.includes(ingredient)) {
      setIngredients([...ingredients, ingredient]);
    }
  };
  
  // Search for recipes based on ingredients
  const searchRecipes = async (ingredientList = ingredients) => {
    if (ingredientList.length === 0) {
      setMatchingRecipes([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('/api/fridge-search', { ingredients: ingredientList });
      setMatchingRecipes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error searching recipes:', error);
      setLoading(false);
    }
  };
  
  // Check if ingredient should show partial match hint
  const shouldShowPartialHint = (ingredient) => {
    return ingredient.length >= 4 && ingredient.length <= 6;
  };
  
  // Get progress bar color based on match percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <ChefHat className="h-10 w-10 text-primary" />
          What Can My Fridge Make?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select ingredients you have available, and we'll automatically find delicious recipes you can make right now!
        </p>
      </div>

      {/* Ingredient Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Ingredients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="ingredient-input">Type ingredient name</Label>
            <div className="flex gap-2">
              <Input
                id="ingredient-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toLowerCase())}
                placeholder="e.g. chicken, rice, tomatoes..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient();
                  }
                }}
                className="flex-1"
              />
              <Button 
                onClick={() => handleAddIngredient()}
                disabled={!inputValue.trim()}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              💡 Tip: You can type partial ingredient names (4+ characters) like "chick" to match "chicken breast"
            </p>
          </div>

          {/* Common Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Quick add common ingredients</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCommon(!showAllCommon)}
              >
                {showAllCommon ? 'Show Less' : 'Show All'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(showAllCommon ? COMMON_INGREDIENTS : COMMON_INGREDIENTS.slice(0, 15)).map((ingredient) => (
                <Badge
                  key={ingredient}
                  variant={ingredients.includes(ingredient) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => handleQuickAdd(ingredient)}
                >
                  {ingredient}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Selected Ingredients */}
      {ingredients.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Your Ingredients ({ingredients.length})</span>
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => searchRecipes()}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Refresh Search
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <Badge 
                  key={index}
                  variant="info"
                  className="cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors flex items-center gap-1 px-3 py-1"
                  onClick={() => handleRemoveIngredient(ingredient)}
                  title={shouldShowPartialHint(ingredient) ? "Will match partial ingredient names" : "Click to remove"}
                                  >
                    {ingredient}
                    {shouldShowPartialHint(ingredient) && <span className="text-xs opacity-75">~</span>}
                    <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recipe Results */}
      {matchingRecipes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Recipes You Can Make ({matchingRecipes.length})
          </h2>
          
          <div className="grid gap-4">
            {matchingRecipes.map(recipe => (
              <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                    {/* Recipe Info */}
                    <div className="lg:col-span-2">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {recipe.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="info">
                          {recipe.category}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.prep_time} mins
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        You have {recipe.matching_count} of {recipe.total_ingredients} ingredients
                        {recipe.match_percentage < 100 && (
                          <span className="text-xs text-blue-600 ml-2">
                            (includes partial matches)
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {/* Match Info & Action */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {recipe.match_percentage}%
                        </div>
                        <div className="text-sm text-gray-600 mb-2">Match</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${getProgressColor(recipe.match_percentage)}`}
                            style={{ width: `${recipe.match_percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <Link to={`/recipe/${recipe.id}`}>
                        <Button className="w-full">
                          View Recipe
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* No Results */}
      {ingredients.length > 0 && matchingRecipes.length === 0 && !loading && (
        <Card className="text-center p-8">
          <CardContent>
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No matching recipes found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adding more ingredients or check out all recipes to find something to cook.
            </p>
            <Link to="/">
              <Button>
                Browse All Recipes
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Getting Started */}
      {ingredients.length === 0 && (
        <Card className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent>
            <ChefHat className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Cook?
            </h3>
            <p className="text-gray-600 mb-4">
              Add ingredients above and watch as recipes appear automatically! Start with common items like "chicken", "rice", or "cheese".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FridgeSearch;