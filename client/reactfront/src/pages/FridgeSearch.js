import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Form, Button, 
  ListGroup, Badge, Card, ProgressBar 
} from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';

const FridgeSearch = () => {
  const [ingredients, setIngredients] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [matchingRecipes, setMatchingRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch all ingredients for autocomplete
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await axios.get('/api/ingredients');
        setAllIngredients(response.data);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
      }
    };
    
    fetchIngredients();
  }, []);
  
  // Handle adding an ingredient
  const handleAddIngredient = () => {
    if (inputValue.trim() && !ingredients.includes(inputValue.trim())) {
      setIngredients([...ingredients, inputValue.trim()]);
      setInputValue('');
    }
  };
  
  // Handle removing an ingredient
  const handleRemoveIngredient = (ingredient) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };
  
  // Search for recipes based on ingredients
  const searchRecipes = async () => {
    if (ingredients.length === 0) return;
    
    try {
      setLoading(true);
      const response = await axios.post('/api/fridge-search', { ingredients });
      setMatchingRecipes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error searching recipes:', error);
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">What Can My Fridge Make?</h1>
      <p className="lead">
        Enter the ingredients you have available, and we'll find recipes you can make!
      </p>
      
      <Row className="mb-4">
        <Col md={8}>
          <Form.Group>
            <Form.Label>Add ingredients you have:</Form.Label>
            <div className="d-flex">
              <Form.Control
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="E.g. chicken, rice, tomatoes"
                list="ingredient-suggestions"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient();
                  }
                }}
              />
              <datalist id="ingredient-suggestions">
                {allIngredients.map((ingredient, index) => (
                  <option key={index} value={ingredient.name} />
                ))}
              </datalist>
              <Button 
                variant="primary" 
                onClick={handleAddIngredient}
                className="ms-2"
              >
                Add
              </Button>
            </div>
          </Form.Group>
        </Col>
        
        <Col md={4} className="d-flex align-items-end">
          <Button 
            variant="success" 
            onClick={searchRecipes}
            className="w-100"
            disabled={ingredients.length === 0}
          >
            Find Recipes
          </Button>
        </Col>
      </Row>
      
      {ingredients.length > 0 && (
        <div className="mb-4">
          <h5>Your ingredients:</h5>
          <div className="d-flex flex-wrap">
            {ingredients.map((ingredient, index) => (
              <Badge 
                bg="info" 
                className="me-2 mb-2 p-2" 
                key={index}
                style={{ cursor: 'pointer' }}
                onClick={() => handleRemoveIngredient(ingredient)}
              >
                {ingredient} &times;
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="text-center my-5">Searching for recipes...</div>
      ) : (
        <>
          {matchingRecipes.length > 0 ? (
            <>
              <h3 className="mb-3">Recipes you can make:</h3>
              <ListGroup>
                {matchingRecipes.map(recipe => (
                  <ListGroup.Item key={recipe.id} className="mb-2">
                    <Row>
                      <Col md={8}>
                        <h5>{recipe.title}</h5>
                        <div>
                          <Badge bg="info" className="me-2">
                            {recipe.category}
                          </Badge>
                          <Badge bg="secondary">
                            {recipe.prep_time} mins
                          </Badge>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-end mb-2">
                          <strong>Match: {recipe.match_percentage}%</strong>
                        </div>
                        <ProgressBar 
                          now={recipe.match_percentage} 
                          variant={
                            recipe.match_percentage > 90 ? "success" :
                            recipe.match_percentage > 70 ? "info" :
                            recipe.match_percentage > 50 ? "warning" : "danger"
                          }
                          className="mb-2"
                        />
                        <div className="text-muted small">
                          You have {recipe.matching_count} of {recipe.total_ingredients} ingredients
                        </div>
                        <div className="text-end mt-2">
                          <Link 
                            to={`/recipe/${recipe.id}`} 
                            className="btn btn-outline-primary btn-sm"
                          >
                            View Recipe
                          </Link>
                        </div>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          ) : ingredients.length > 0 && (
            <Card className="text-center p-4 bg-light">
              <Card.Body>
                <Card.Title>No matching recipes found</Card.Title>
                <Card.Text>
                  Try adding more ingredients or check out all recipes to find something to cook.
                </Card.Text>
                <Link to="/" className="btn btn-primary">
                  Browse All Recipes
                </Link>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};

export default FridgeSearch;