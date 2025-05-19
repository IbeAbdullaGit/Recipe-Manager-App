import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const RecipeCard = ({ recipe }) => {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Title>{recipe.title}</Card.Title>
        
        <div className="mb-2">
          {recipe.category && (
            <Badge bg="info" className="me-2">
              {recipe.category}
            </Badge>
          )}
          <Badge bg="secondary">
            {recipe.prep_time} mins
          </Badge>
        </div>
        
        {recipe.ingredients && (
          <Card.Text>
            <small>
              {recipe.ingredients.length} ingredients
            </small>
          </Card.Text>
        )}
        
        <Link 
          to={`/recipe/${recipe.id}`} 
          className="btn btn-outline-primary btn-sm mt-2"
        >
          View Recipe
        </Link>
      </Card.Body>
    </Card>
  );
};

export default RecipeCard;