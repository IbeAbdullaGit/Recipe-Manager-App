import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
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
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Add New Recipe</h1>
        <Button 
          variant="outline-primary" 
          onClick={() => setShowImportModal(true)}
        >
          Import from URL
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Recipe added successfully! Redirecting...</Alert>}
      {dataImported && <Alert variant="info" dismissible onClose={() => setDataImported(false)}>
        Recipe data imported! Please review the information below!
      </Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Recipe Details</Card.Title>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Recipe Title *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={recipe.title}
                    onChange={handleChange}
                    placeholder="e.g. Chocolate Chip Cookies"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
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
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preparation Time (minutes) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="prep_time"
                    value={recipe.prep_time}
                    onChange={handleChange}
                    placeholder="e.g. 30"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Serving Size</Form.Label>
                  <Form.Control
                    type="number"
                    name="serving_size"
                    value={recipe.serving_size}
                    onChange={handleChange}
                    placeholder="e.g. 4"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Ingredients</Card.Title>
            
            {recipe.ingredients.map((ingredient, index) => (
              <Row key={index} className="mb-3 align-items-center">
                <Col md={5}>
                  <Form.Group>
                    <Form.Label>Ingredient Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      placeholder="e.g. Flour"
                      required
                    />
                  </Form.Group>
                </Col>
                
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="text"
                      value={ingredient.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Unit</Form.Label>
                    <Form.Control
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                      placeholder="e.g. cups"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={2} className="d-flex align-items-end">
                  {index > 0 && (
                    <Button 
                      variant="outline-danger" 
                      onClick={() => removeIngredient(index)}
                      className="mt-2"
                    >
                      Remove
                    </Button>
                  )}
                </Col>
              </Row>
            ))}
            
            <Button 
              variant="outline-primary" 
              onClick={addIngredient}
              className="mt-2"
            >
              Add Ingredient
            </Button>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Instructions</Card.Title>
            
            <Form.Group className="mb-3">
              <Form.Label>Directions *</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                name="directions"
                value={recipe.directions}
                onChange={handleChange}
                placeholder="Step-by-step instructions for preparing the recipe..."
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={recipe.notes}
                onChange={handleChange}
                placeholder="Optional notes, tips, or variations..."
              />
            </Form.Group>
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-between">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Recipe'}
          </Button>
        </div>
      </Form>
      
      {/* Import Recipe Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Import Recipe from URL</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importError && <Alert variant="danger">{importError}</Alert>}
          {importSuccess && <Alert variant="success">Recipe imported successfully! The form has been populated with the extracted data.</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Recipe URL</Form.Label>
            <Form.Control
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/recipe-page"
              disabled={importLoading}
            />
            <Form.Text className="text-muted">
              Paste a URL from popular recipe websites or Instagram posts. We'll extract the recipe details automatically.
            </Form.Text>
          </Form.Group>
          
          <div className="mt-3">
            <h6>Supported Sources:</h6>
            <ul className="small text-muted mb-0">
              <li>Popular cooking websites (AllRecipes, Food Network, BBC Good Food, etc.)</li>
              <li>Food blogs with structured recipe data</li>
              <li>Instagram recipe posts (limited - may require manual editing)</li>
              <li>Any website using Recipe schema markup</li>
            </ul>
          </div>
          
          <div className="mt-3">
            <h6>Tips:</h6>
            <ul className="small text-muted mb-0">
              <li>For best results, use the direct recipe page URL</li>
              <li>Instagram videos have limited parsing - you may need to edit the results</li>
              <li>Review and edit the imported data before saving</li>
              <li>Don't forget to select a category after importing</li>
            </ul>
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
    </Container>
  );
};

export default AddRecipe;