import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/acer/Downloads/data-cleaning-platform';

async function main() {
  console.log('Initializing Git repository...');
  await git.init({ fs, dir });

  // Read all files recursively, respecting .gitignore
  function getFiles(currentDir, baseDir = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const relPath = baseDir ? `${baseDir}/${entry.name}` : entry.name;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name.endsWith('.log')) {
        continue;
      }
      if (entry.isDirectory()) {
        files = files.concat(getFiles(path.join(currentDir, entry.name), relPath));
      } else {
        files.push(relPath);
      }
    }
    return files;
  }

  const filesToAdd = getFiles(dir);
  console.log(`Adding ${filesToAdd.length} files...`);

  for (const filepath of filesToAdd) {
    await git.add({ fs, dir, filepath });
  }

  console.log('Committing files...');
  const sha = await git.commit({
    fs,
    dir,
    message: 'Initial commit: Complete professional DataForge Studio platform',
    author: {
      name: 'dileepvenkat276-prog',
      email: 'dileepvenkat276@users.noreply.github.com'
    }
  });

  console.log(`Committed successfully! Commit SHA: ${sha}`);

  // Create/checkout main branch
  await git.branch({ fs, dir, ref: 'main', checkout: true });
  console.log('Main branch checked out.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
