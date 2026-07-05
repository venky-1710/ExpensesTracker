const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('cloud-logs-unzipped.txt'),
  crlfDelay: Infinity
});

const lines = [];

rl.on('line', (line) => {
  try {
    const parsed = JSON.parse(line);
    if (parsed.phase === "RUN_GRADLEW" && parsed.msg) {
      lines.push(parsed.msg);
      if (lines.length > 100) lines.shift();
    }
  } catch (e) {
    // Ignore
  }
});

rl.on('close', () => {
  console.log("Last 100 lines from Gradle phase:");
  console.log(lines.join('\\n'));
});
