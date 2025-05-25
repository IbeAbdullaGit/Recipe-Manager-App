// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  if (req.method === 'POST' && req.path === '/api/recipes') {
    console.log('Recipe creation request received!');
    console.log('Request body keys:', Object.keys(req.body));
  }
  
  next();
};

module.exports = { requestLogger }; 