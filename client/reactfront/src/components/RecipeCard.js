import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Clock, Users, Loader2 } from 'lucide-react';
import axios from 'axios';

const RecipeCard = ({ recipe, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/recipes/${recipe.id}`);
      if (onDelete) {
        onDelete(recipe.id);
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="h-full transition-all duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-left flex-1 mr-2">
            {recipe.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteModal(true)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {recipe.category}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              <Clock className="w-3 h-3 mr-1" />
              {recipe.prep_time} mins
            </span>
          </div>
          
          {recipe.ingredients && (
            <p className="text-sm text-muted-foreground flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {recipe.ingredients.length} ingredients
            </p>
          )}
        </CardContent>
        
        <CardFooter className="pt-0">
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Recipe</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete "<strong>{recipe.title}</strong>"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
            className="ml-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default RecipeCard;