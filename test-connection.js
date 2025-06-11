import https from 'node:https';

// Options for the request
const options = {
  hostname: 'api.anthropic.com',
  port: 443,
  path: '/api/hello',
  method: 'GET',
  headers: {
    'User-Agent': 'claude-cli/1.0.19 (external, cli)',
    'Accept': 'application/json'
  },
  timeout: 10000, // 10 seconds
};

console.log('Starting request to api.anthropic.com...');

// Make the request
const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`BODY: ${data}`);
    console.log('Request completed successfully');
  });
});

// Handle errors
req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  console.error(e.stack);
});

// Handle timeout
req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

// End the request
req.end();
console.log('Request sent, waiting for response...');
