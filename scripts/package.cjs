const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const releasesDir = path.join(root, 'releases');

if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

function zipDirectory(sourceDir, outPath) {
  if (fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.writeZip(outPath);
}

console.log('Building Chrome bundle...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('Building Firefox bundle...');
execSync('npm run build:firefox', { cwd: root, stdio: 'inherit' });

console.log('Zipping Chrome package -> releases/digital-decay-chrome.zip...');
const chromeZip = path.join(releasesDir, 'digital-decay-chrome.zip');
zipDirectory(path.join(root, 'dist'), chromeZip);

console.log('Zipping Firefox package -> releases/digital-decay-firefox.zip...');
const firefoxZip = path.join(releasesDir, 'digital-decay-firefox.zip');
zipDirectory(path.join(root, 'dist-firefox'), firefoxZip);

console.log('\n[SUCCESS] Production store zips are ready in ./releases/');
