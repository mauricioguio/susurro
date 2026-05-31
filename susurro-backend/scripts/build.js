const { execSync } = require('child_process');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
}

const opts = { stdio: 'inherit', env: process.env };
execSync('node_modules/.bin/prisma generate', opts);
execSync('node_modules/.bin/nest build', opts);
