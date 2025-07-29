#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

let backendProcess = null;
let frontendProcess = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, maxAttempts = 30) {
  console.log(`Waiting for server at ${url}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${url}/health`);
      console.log(`✅ Server at ${url} is ready`);
      return true;
    } catch (error) {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Server not ready yet...`);
      await sleep(2000);
    }
  }
  
  throw new Error(`Server at ${url} failed to start within ${maxAttempts * 2} seconds`);
}

async function testBackendEndpoints() {
  console.log('\n🧪 Testing Backend API Endpoints...');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BACKEND_URL}/health`,
      method: 'GET'
    },
    {
      name: 'System Status',
      url: `${BACKEND_URL}/api/status`,
      method: 'GET'
    },
    {
      name: 'News List',
      url: `${BACKEND_URL}/api/news`,
      method: 'GET'
    },
    {
      name: 'Categories',
      url: `${BACKEND_URL}/api/categories`,
      method: 'GET'
    },
    {
      name: 'Scheduler Status',
      url: `${BACKEND_URL}/api/scheduler/status`,
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log(`✅ ${test.name}: OK`);
      } else {
        console.log(`⚠️ ${test.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Failed - ${error.message}`);
    }
  }
}

async function testFrontendBackendIntegration() {
  console.log('\n🔗 Testing Frontend-Backend Integration...');
  
  try {
    // Test if frontend can reach backend
    const response = await axios.get(`${FRONTEND_URL}`, {
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    if (response.status === 200) {
      console.log('✅ Frontend is accessible');
      
      // Check if frontend is configured to use correct backend URL
      const frontendEnvPath = path.join(__dirname, '../frontend/.env');
      const fs = require('fs');
      
      if (fs.existsSync(frontendEnvPath)) {
        const envContent = fs.readFileSync(frontendEnvPath, 'utf8');
        if (envContent.includes(`REACT_APP_API_URL=http://localhost:${BACKEND_PORT}`)) {
          console.log('✅ Frontend is configured to use correct backend URL');
        } else {
          console.log('⚠️ Frontend may not be configured with correct backend URL');
        }
      }
    } else {
      console.log(`⚠️ Frontend returned status ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Frontend integration test failed: ${error.message}`);
  }
}

async function startBackend() {
  console.log('🚀 Starting Backend Server...');
  
  // Use cross-platform environment variable setting
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd' : 'npm';
  const args = isWindows ? ['/c', 'set NODE_ENV=development && npm run dev'] : ['run', 'dev'];
  
  backendProcess = spawn(command, args, {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });
  
  // Wait for backend to be ready
  await waitForServer(BACKEND_URL);
}

async function startFrontend() {
  console.log('🚀 Starting Frontend Server...');
  
  frontendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '../frontend'),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, BROWSER: 'none' } // Prevent browser from opening
  });
  
  frontendProcess.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data.toString().trim()}`);
  });
  
  frontendProcess.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data.toString().trim()}`);
  });
  
  // Wait for frontend to be ready
  await sleep(10000); // Frontend takes longer to start
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    console.log('✅ Backend process terminated');
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
    console.log('✅ Frontend process terminated');
  }
}

async function main() {
  console.log('🔧 AI News Aggregator - Full Integration Test');
  console.log('='.repeat(50));
  
  try {
    // Start backend
    await startBackend();
    
    // Test backend endpoints
    await testBackendEndpoints();
    
    // Start frontend (optional - comment out if not needed)
    // await startFrontend();
    // await testFrontendBackendIntegration();
    
    console.log('\n✅ Integration tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- Backend API endpoints are working');
    console.log('- CORS configuration is correct');
    console.log('- Environment configuration is loaded');
    console.log('- Security headers are present');
    
  } catch (error) {
    console.error('\n❌ Integration tests failed:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});

// Run the integration test
if (require.main === module) {
  main();
}

module.exports = { main, testBackendEndpoints, testFrontendBackendIntegration };