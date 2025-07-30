// Test script to verify API configuration
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing API Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  REACT_APP_ENV:', process.env.REACT_APP_ENV);
console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Check if frontend build exists
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
const buildExists = fs.existsSync(frontendBuildPath);
console.log('\nBuild Status:');
console.log('  Frontend build exists:', buildExists);

if (buildExists) {
  const indexPath = path.join(frontendBuildPath, 'index.html');
  const indexExists = fs.existsSync(indexPath);
  console.log('  index.html exists:', indexExists);
  
  if (indexExists) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const hasHerokuUrl = indexContent.includes('herokuapp.com');
    console.log('  Contains herokuapp.com:', hasHerokuUrl);
    
    if (hasHerokuUrl) {
      console.log('  ⚠️  WARNING: Build contains hardcoded Heroku URLs!');
    } else {
      console.log('  ✅ Build looks clean');
    }
  }
}

// Check backend build
const backendBuildPath = path.join(__dirname, 'dist');
const backendExists = fs.existsSync(backendBuildPath);
console.log('  Backend build exists:', backendExists);

console.log('\n🎯 Recommendations:');
if (!buildExists) {
  console.log('  - Run: ./build-clean.sh');
}
console.log('  - Deploy with: ./deploy-with-auth.sh');
console.log('  - Test locally: npm run start:prod');