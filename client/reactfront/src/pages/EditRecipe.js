import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const EditRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [recipe, setRecipe] = useState({
    title: '',
    category_id: '',
    prep_time: '',
    serving_size: '',
    directions: '',
    notes: '',
    ingredients: []
  });
  
  // Fetch recipe data and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch recipe data
        const recipeResponse = await axios.get(`/api/recipes/${id}`);
        
        // Fetch categories
        const categoriesResponse = await axios.get('/api/categories');
        
        // Update state with fetched data
        setRecipe({
          title: recipeResponse.data.title,
          category_id: recipeResponse.data.category_id,
          prep_time: recipeResponse.data.prep_time,
          serving_size: recipeResponse.data.serving_size,
          directions: recipeResponse.data.directions,
          notes: recipeResponse.data.notes,
          ingredients: recipeResponse.data.ingredients.map(ing => ({
            id: ing.ingredient_id,
            name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            is_alternative: ing.is_alternative === 1,
            alternative_for: ing.alternative_for
          }))
        });
        
        setCategories(categoriesResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load recipe data. Please try again.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, [id]);
  
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
    if (!recipe.title || !recipe.category_id || !recipe.directions) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Make sure all ingredients have at least a name
    for (let i = 0; i < recipe.ingredients.length; i++) {
      if (!recipe.ingredients[i].name) {
        setError('All ingredients must have a name.');
        return;
      }
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Send data to API
      await axios.put(`/api/recipes/${id}`, recipe);
      
      setSuccess(true);
      setLoading(false);
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate(`/recipe/${id}`);
      }, 2000);
    } catch (err) {
      setError('Failed to update recipe. Please try again.');
      setLoading(false);
      console.error('Error updating recipe:', err);
    }
  };
  
  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading recipe data...</div>
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">Edit Recipe</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Recipe updated successfully! Redirecting...</Alert>}
      
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
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    name="category_id"
                    value={recipe.category_id}
                    onChange={handleChange}
                    required
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
                  <Button 
                    variant="outline-danger" 
                    onClick={() => removeIngredient(index)}
                    className="mt-2"
                  >
                    Remove
                  </Button>
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
                name="directions"
                value={recipe.directions}
                onChange={handleChange}
                rows={6}
                placeholder="Enter step-by-step directions..."
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                name="notes"
                value={recipe.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Add any additional notes or tips..."
              />
            </Form.Group>
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-between mb-4">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/recipe/${id}`)}
          >
            Cancel
          </Button>
          
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Recipe'}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default EditRecipe; 