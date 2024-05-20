const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Directory to search
const appDirectory = path.join(__dirname, '../app');

// File patterns to match
const filePatterns = ['**/*.ts', '**/*.tsx', '**/*.js'];

// Subfolders and files to avoid
const excludeList = [
  'add-user', 'check-for-invite', 'list-users', 'get-id-from-token', 
  'lobby', 'layout.tsx',
];

// Get all files matching the patterns and exclude specified subfolders and files
function getAllFiles(directory, patterns, exclude) {
    const files = patterns.reduce((acc, pattern) => {
        return acc.concat(glob.sync(pattern, { cwd: directory, absolute: true }));
    }, []);

    return files.filter(file => {
        const relativeFilePath = path.relative(directory, file).replace(/\\/g, '/');
        return !exclude.some(excludeItem => {
            const normalizedExclude = excludeItem.replace(/\\/g, '/');
            return relativeFilePath.endsWith(normalizedExclude) || 
                   relativeFilePath.includes(`${normalizedExclude}/`);
        });
    });
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
    const files = getAllFiles(appDirectory, filePatterns, excludeList);
    console.log(`Found ${files.length} files.`);
    files.forEach(printFileContents);
}

main();
