const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDb } = require('./utils/database');
const { requestLogger } = require('./middleware/logging');

// Route imports
const recipesRoutes = require('./routes/recipes');
const categoriesRoutes = require('./routes/categories');
const ingredientsRoutes = require('./routes/ingredients');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// Initialize database
initDb();

// Routes
app.get('/', (req, res) => {
  res.send('Recipe Manager API is running');
});

app.use('/api/recipes', recipesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/ingredients', ingredientsRoutes);

// Legacy route for fridge search (maintain compatibility)
app.post('/api/fridge-search', (req, res) => {
  req.url = '/fridge-search';
  ingredientsRoutes(req, res);
});

// Legacy route for import (maintain compatibility) 
app.post('/api/import-recipe', (req, res) => {
  req.url = '/import';
  recipesRoutes(req, res);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Recipe Manager Server running on port ${PORT}`);
  console.log(`📊 Database optimizations applied`);
  console.log(`🗂️  Modular architecture loaded`);
});

module.exports = app;