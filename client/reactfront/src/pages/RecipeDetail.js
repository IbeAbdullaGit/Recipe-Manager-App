import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/recipes/${id}`);
        setRecipe(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load recipe. Please try again.');
        setLoading(false);
        console.error('Error fetching recipe:', err);
      }
    };
    
    fetchRecipe();
  }, [id]);
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await axios.delete(`/api/recipes/${id}`);
        navigate('/');
      } catch (err) {
        setError('Failed to delete recipe. Please try again.');
        console.error('Error deleting recipe:', err);
      }
    }
  };
  
  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading recipe...</div>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container className="py-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-primary">Back to Recipes</Link>
      </Container>
    );
  }
  
  if (!recipe) {
    return (
      <Container className="py-4">
        <div className="alert alert-warning">Recipe not found</div>
        <Link to="/" className="btn btn-primary">Back to Recipes</Link>
      </Container>
    );
  }
  
  // Filter regular and alternative ingredients
  const regularIngredients = recipe.ingredients.filter(ing => !ing.is_alternative);
  const alternativeIngredients = recipe.ingredients.filter(ing => ing.is_alternative);
  
  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{recipe.title}</h1>
        <div>
          <Button 
            variant="outline-primary" 
            onClick={() => navigate(`/edit-recipe/${id}`)}
            className="me-2"
          >
            Edit Recipe
          </Button>
          <Button 
            variant="outline-danger" 
            onClick={handleDelete}
          >
            Delete Recipe
          </Button>
        </div>
      </div>
      
      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Recipe Details</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Category:</strong> <Badge bg="info">{recipe.category_name}</Badge>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Preparation Time:</strong> {recipe.prep_time} minutes
                </ListGroup.Item>
                {recipe.serving_size && (
                  <ListGroup.Item>
                    <strong>Serving Size:</strong> {recipe.serving_size} servings
                  </ListGroup.Item>
                )}
                <ListGroup.Item>
                  <strong>Date Added:</strong> {new Date(recipe.date_added).toLocaleDateString()}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>Ingredients</Card.Title>
              <ListGroup variant="flush">
                {regularIngredients.map((ingredient, index) => (
                  <ListGroup.Item key={index}>
                    <Row>
                      <Col md={8}>
                        <strong>{ingredient.ingredient_name}</strong>
                      </Col>
                      <Col md={4}>
                        {ingredient.quantity} {ingredient.unit}
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              
              {alternativeIngredients.length > 0 && (
                <>
                  <h6 className="mt-3">Alternative Ingredients</h6>
                  <ListGroup variant="flush">
                    {alternativeIngredients.map((ingredient, index) => (
                      <ListGroup.Item key={index}>
                        <Row>
                          <Col md={8}>
                            <strong>{ingredient.ingredient_name}</strong>
                            {ingredient.alternative_for && (
                              <span className="text-muted"> (alternative for {
                                recipe.ingredients.find(i => i.ingredient_id === ingredient.alternative_for)?.ingredient_name
                              })</span>
                            )}
                          </Col>
                          <Col md={4}>
                            {ingredient.quantity} {ingredient.unit}
                          </Col>
                        </Row>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Directions</Card.Title>
          <Card.Text style={{ whiteSpace: 'pre-line' }}>
            {recipe.directions}
          </Card.Text>
        </Card.Body>
      </Card>
      
      {recipe.notes && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Notes</Card.Title>
            <Card.Text style={{ whiteSpace: 'pre-line' }}>
              {recipe.notes}
            </Card.Text>
          </Card.Body>
        </Card>
      )}
      
      <Link to="/" className="btn btn-primary">Back to Recipes</Link>
    </Container>
  );
};

export default RecipeDetail; 