const fs = require('fs');
const zlib = require('zlib');

const source = fs.readFileSync('cloud-logs.txt');
try {
  const unzipped = zlib.brotliDecompressSync(source);
  fs.writeFileSync('cloud-logs-unzipped.txt', unzipped);
  console.log('Unzipped Brotli successfully');
} catch (e) {
  console.error('Not a valid brotli file:', e.message);
}
