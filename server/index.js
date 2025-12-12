const path = require('path');
const express = require('express');
const app = require('../beams/backend/app');

const PORT = process.env.PORT || 3000;

// Heroku trust proxy (required for HTTPS behind proxy)
app.set('trust proxy', 1);

// Serve Angular app in production
if (process.env.NODE_ENV === 'production') {
  // Angular build output path (based on angular.json: dist/mean-corse-01)
  // Check for both possible structures (Angular 17+ uses /browser subdirectory)
  const possiblePaths = [
    path.join(__dirname, '..', 'dist', 'mean-corse-01', 'browser'),
    path.join(__dirname, '..', 'dist', 'mean-corse-01')
  ];
  
  let staticPath = null;
  for (const possiblePath of possiblePaths) {
    if (require('fs').existsSync(possiblePath)) {
      staticPath = possiblePath;
      break;
    }
  }
  
  if (staticPath) {
    // Serve static files
    app.use(express.static(staticPath));
    
    // SPA fallback: all non-API routes return index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });
  } else {
    console.warn('Warning: Angular build not found. Make sure to run "npm run build" before starting in production mode.');
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: serving Angular app + API');
  } else {
    console.log('Development mode: API only');
  }
});
