// Cross-platform build helper script
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// Create directory recursively (cross-platform equivalent of mkdir -p)
function mkdirp(dirPath) {
  const absolutePath = path.resolve(dirPath);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
}

// Generate version info
function generateVersion() {
  mkdirp('dist');
  
  const sha = execSync('git rev-parse HEAD').toString().trim();
  const tag = execSync('git describe --tags --always').toString().trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const version = process.env.npm_package_version;
  
  const versionInfo = {
    sha,
    tag,
    branch,
    version
  };
  
  fs.writeFileSync('dist/esm/version.json', JSON.stringify(versionInfo, null, 2));
  fs.writeFileSync('dist/commonjs/version.json', JSON.stringify(versionInfo, null, 2));
  
  console.log('Generated version.json:', versionInfo);
}

// Sync version from package.json to manifest.json
function syncManifestVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const manifestJson = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

  const packageVersion = packageJson.version;
  const manifestVersion = manifestJson.version;

  if (packageVersion === manifestVersion) {
    console.log(`✓ Versions already in sync: ${packageVersion}`);
    return;
  }

  manifestJson.version = packageVersion;

  fs.writeFileSync('manifest.json', JSON.stringify(manifestJson, null, 2) + '\n');
  console.log(`✓ Updated manifest.json version: ${manifestVersion} → ${packageVersion}`);
}

// Copy JSON files to dist
function copyJsonFiles() {
  const srcDir = 'src';
  const destDirCjs = 'dist/commonjs';
  const destDirEsm = 'dist/esm';

  function copyJsonRecursive(srcPath, destPath) {
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      const srcItemPath = path.join(srcPath, item);
      const destItemPath = path.join(destPath, item);
      
      if (fs.statSync(srcItemPath).isDirectory()) {
        mkdirp(destItemPath);
        copyJsonRecursive(srcItemPath, destItemPath);
      } else if (item.endsWith('.json')) {
        fs.copyFileSync(srcItemPath, destItemPath);
      }
    });
  }

  copyJsonRecursive(srcDir, destDirCjs);
  copyJsonRecursive(srcDir, destDirEsm);
}

// Process command line arguments
const command = process.argv[2];

switch (command) {
  case 'generate-version':
    generateVersion();
    break;
  case 'sync-manifest-version':
    syncManifestVersion();
    break;
  case 'copy-json':
    copyJsonFiles();
    break;
  default:
    console.error('Unknown command:', command);
    process.exit(1);
}
