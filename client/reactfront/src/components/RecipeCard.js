import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from './ui/card';
import { Button } from './ui/button';

const RecipeCard = ({ recipe }) => {
  return (
    <Card className="h-full overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{recipe.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {recipe.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {recipe.category}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {recipe.prep_time} mins
          </span>
        </div>
        
        {recipe.ingredients && (
          <p className="text-sm text-muted-foreground">
            {recipe.ingredients.length} ingredients
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          asChild
        >
          <Link to={`/recipe/${recipe.id}`}>
            View Recipe
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecipeCard;