import React, { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, Minus, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddRecipe = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [dataImported, setDataImported] = useState(false);
  
  // Form state
  const [recipe, setRecipe] = useState({
    title: '',
    category_id: '',
    prep_time: '',
    serving_size: '',
    directions: '',
    notes: '',
    ingredients: [{ name: '', quantity: '', unit: '', is_alternative: false }]
  });
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (err) {
        setError('Failed to load categories. Please try again.');
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Update recipe state
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRecipe({ ...recipe, [name]: value });
  };
  
  // Handle ingredient changes
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index][field] = value;
    setRecipe({ ...recipe, ingredients: newIngredients });
  };
  
  // Add new ingredient field
  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { name: '', quantity: '', unit: '', is_alternative: false }]
    });
  };
  
  // Remove ingredient field
  const removeIngredient = (index) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients.splice(index, 1);
    setRecipe({ ...recipe, ingredients: newIngredients });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!recipe.title || !recipe.directions) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Filter out ingredients with empty names and validate
    const validIngredients = recipe.ingredients.filter(ingredient => 
      ingredient.name && ingredient.name.trim() !== ''
    );
    
    if (validIngredients.length === 0) {
      setError('At least one ingredient with a name is required.');
      return;
    }
    
    // Create the recipe data with only valid ingredients
    const recipeToSubmit = {
      ...recipe,
      ingredients: validIngredients
    };
    
    try {
      setLoading(true);
      setError('');
      
      // Send data to API
      await axios.post('/api/recipes', recipeToSubmit);
      
      setSuccess(true);
      setLoading(false);
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Failed to save recipe. Please try again.');
      setLoading(false);
      console.error('Error saving recipe:', err);
    }
  };
  
  // Handle recipe import
  const handleImportRecipe = async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a valid URL');
      return;
    }
    
    setImportLoading(true);
    setImportError('');
    setImportSuccess(false);
    
    try {
      const response = await axios.post('/api/import-recipe', { url: importUrl });
      const importedRecipe = response.data;
      
      // Update the form with imported data
      setRecipe({
        title: importedRecipe.title || '',
        category_id: '',
        prep_time: importedRecipe.prep_time || '',
        serving_size: importedRecipe.serving_size || '',
        directions: importedRecipe.directions || '',
        notes: importedRecipe.notes || '',
        ingredients: importedRecipe.ingredients.length > 0 ? importedRecipe.ingredients : [{ name: '', quantity: '', unit: '', is_alternative: false }]
      });
      
      setImportSuccess(true);
      setImportLoading(false);
      setDataImported(true);
      
      // Show success and close modal after a delay
      setTimeout(() => {
        setShowImportModal(false);
        setImportUrl('');
        setImportSuccess(false);
      }, 2000);
      
      // Show success message
      setError('');
      
    } catch (err) {
      setImportError(err.response?.data?.error || 'Failed to import recipe. Please try again.');
      setImportLoading(false);
      console.error('Error importing recipe:', err);
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New Recipe</h1>
        <Button 
          variant="outline" 
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Import from URL
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Recipe added successfully! Redirecting...</AlertDescription>
        </Alert>
      )}
      {dataImported && (
        <Alert className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Recipe data imported! Please review the information below!
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Recipe Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={recipe.title}
                  onChange={handleChange}
                  placeholder="e.g. Chocolate Chip Cookies"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  id="category_id"
                  name="category_id"
                  value={recipe.category_id}
                  onChange={handleChange}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prep_time">Preparation Time (minutes) *</Label>
                <Input
                  id="prep_time"
                  type="number"
                  name="prep_time"
                  value={recipe.prep_time}
                  onChange={handleChange}
                  placeholder="e.g. 30"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serving_size">Serving Size</Label>
                <Input
                  id="serving_size"
                  type="number"
                  name="serving_size"
                  value={recipe.serving_size}
                  onChange={handleChange}
                  placeholder="e.g. 4"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5 space-y-2">
                  <Label htmlFor={`ingredient-name-${index}`}>Ingredient Name *</Label>
                  <Input
                    id={`ingredient-name-${index}`}
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="e.g. Flour"
                    required
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor={`ingredient-quantity-${index}`}>Quantity</Label>
                  <Input
                    id={`ingredient-quantity-${index}`}
                    value={ingredient.quantity}
                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    placeholder="2"
                  />
                </div>
                
                <div className="col-span-3 space-y-2">
                  <Label htmlFor={`ingredient-unit-${index}`}>Unit</Label>
                  <Input
                    id={`ingredient-unit-${index}`}
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    placeholder="cups"
                  />
                </div>
                
                <div className="col-span-2 flex justify-end">
                  {index > 0 && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <Button 
              type="button"
              variant="outline" 
              onClick={addIngredient}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="directions">Directions *</Label>
              <Textarea
                id="directions"
                name="directions"
                value={recipe.directions}
                onChange={handleChange}
                placeholder="Step-by-step instructions for preparing the recipe..."
                rows={5}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={recipe.notes}
                onChange={handleChange}
                placeholder="Optional notes, tips, or variations..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between pt-6">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Recipe'
            )}
          </Button>
        </div>
      </form>
      
      {/* Import Recipe Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Import Recipe from URL</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          {importSuccess && (
            <Alert variant="success" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Recipe imported successfully! The form has been populated with the extracted data.</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">Recipe URL</Label>
              <Input
                id="import-url"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/recipe-page"
                disabled={importLoading}
              />
              <p className="text-sm text-gray-600">
                Paste a URL from popular recipe websites or Instagram posts. We'll extract the recipe details automatically.
              </p>
            </div>
          
          <div className="mt-3">
            <h6>Supported Sources:</h6>
            <ul className="small text-muted mb-0">
              <li>Popular cooking websites (AllRecipes, Food Network, BBC Good Food, etc.)</li>
              <li>Food blogs</li>
              <li>Instagram recipe posts (limited - may require manual editing)</li>
            </ul>
          </div>
          
          <div className="mt-3">
            <h6>Tips:</h6>
            <ul className="small text-muted mb-0">
              <li>For best results, use the direct recipe page URL</li>
              <li>Review and edit the imported data before saving</li>
              <li>Instagram videos have limited parsing - you may need to edit for the best results</li>
            </ul>
          </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowImportModal(false);
              setImportUrl('');
              setImportError('');
              setImportSuccess(false);
            }}
            disabled={importLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleImportRecipe}
            disabled={importLoading || !importUrl.trim()}
          >
            {importLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Importing...
              </>
            ) : (
              'Import Recipe'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AddRecipe;