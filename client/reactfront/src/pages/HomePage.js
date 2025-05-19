import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import RecipeCard from '../components/RecipeCard';

const HomePage = () => {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtering state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('title'); // title, prep_time
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch recipes
        const recipesRes = await axios.get('/api/recipes');
        setRecipes(recipesRes.data);
        
        // Fetch categories
        const categoriesRes = await axios.get('/api/categories');
        setCategories(categoriesRes.data);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load recipes. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, []);

  // Filter and sort recipes
  const filteredRecipes = recipes
    .filter(recipe => 
      // Filter by category if selected
      (selectedCategory ? recipe.category_id === parseInt(selectedCategory) : true) &&
      // Filter by search term
      (searchTerm ? recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    )
    .sort((a, b) => {
      // Sort by selected sort method
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'prep_time') {
        return a.prep_time - b.prep_time;
      }
      return 0;
    });

  if (loading) return <div className="text-center my-5">Loading recipes...</div>;
  if (error) return <div className="text-center my-5 text-danger">{error}</div>;

  return (
    <Container className="py-4">
      <h1 className="mb-4">My Recipes</h1>
      
      {/* Filter controls */}
      <Row className="mb-4">
        <Col md={4}>
          <InputGroup>
            <Form.Control
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button 
                variant="outline-secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </Button>
            )}
          </InputGroup>
        </Col>
        
        <Col md={3}>
          <Form.Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        
        <Col md={3}>
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="title">Sort: Alphabetical</option>
            <option value="prep_time">Sort: Preparation Time</option>
          </Form.Select>
        </Col>
        
        <Col md={2}>
          <Button 
            variant="primary" 
            href="/add-recipe" 
            className="w-100"
          >
            Add Recipe
          </Button>
        </Col>
      </Row>
      
      {/* Recipe cards */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {filteredRecipes.length > 0 ? (
          filteredRecipes.map(recipe => (
            <Col key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </Col>
          ))
        ) : (
          <Col xs={12}>
            <div className="text-center my-5">
              <p>No recipes found. Try adjusting your filters or add a new recipe.</p>
              <Button variant="primary" href="/add-recipe">
                Add Your First Recipe
              </Button>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default HomePage;