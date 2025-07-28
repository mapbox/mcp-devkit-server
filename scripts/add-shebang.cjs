const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist', 'index.js');

// Read the file
let content = fs.readFileSync(distPath, 'utf8');

// Add shebang if not already present
if (!content.startsWith('#!/usr/bin/env node')) {
  content = '#!/usr/bin/env node\n' + content;
  fs.writeFileSync(distPath, content);
  
  // Make the file executable
  fs.chmodSync(distPath, '755');
  
  console.log('Added shebang to dist/index.js');
} else {
  console.log('Shebang already present in dist/index.js');
}