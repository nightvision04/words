const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Directory to search
const appDirectory = path.join(__dirname, '../');

// File patterns to match
const filePatterns = ['**/*.ts', '**/*.tsx', '**/*.js'];

// Subfolders and files to include
const includeList = [
  'app/game/page.tsx',
  'app/api/setup-game/route.ts',
  'app/api/update-board/route.ts',
  'app/api/update-turn/route.ts',
  'scripts/createTables.js',
  'scripts/distributeTiles.js',
];
// const includeList = [
//     'app/game/page.tsx',
//     'app/api/setup-game/route.ts',
//     'app/api/add-user/route.ts',
//     'app/api/check-for-invite/route.ts',
//     'app/api/check-game-status/route.ts',
//     'app/api/get-id-from-from/route.ts',
//   ];

// Get all files matching the patterns
function getAllFiles(directory, patterns) {
    return patterns.reduce((acc, pattern) => {
        return acc.concat(glob.sync(pattern, { cwd: directory, absolute: true }));
    }, []);
}

// Print file contents
function printFileContents(filePath) {
    const relativePath = path.relative(process.cwd(), filePath); // Use process.cwd() to get the correct relative path
    const contents = fs.readFileSync(filePath, 'utf-8');
    console.log(`${relativePath}:\n${contents}\n`);
}

// Main function
function main() {
    console.log(`Searching for files in: ${appDirectory}`);
    const files = getAllFiles(appDirectory, filePatterns);
    const filteredFiles = files.filter(file => {
        const relativeFilePath = path.relative(appDirectory, file).replace(/\\/g, '/');
        return includeList.includes(relativeFilePath);
    });
    console.log(`Found ${filteredFiles.length} files.`);
    filteredFiles.forEach(printFileContents);
}

main();
