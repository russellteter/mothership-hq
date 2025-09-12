#!/bin/bash
echo '===================================='
echo 'aa MOTHERSHIP HQ VERIFICATION TESTS'
echo '===================================='
echo ''
echo '1. GIT BRANCHES:'
git branch -a
echo ''
echo '2. NODE & NPM VERSIONS:'
node --version
npm --version
echo ''
echo '3. ENVIRONMENT VARIABLES:'
grep -E 'SUPABASE|REDIS|PORT' .env | head -5
echo ''
echo '4. SERVER STATUS:'
lsof -i :3000 | head -2
echo ''
echo '5. BUILD OUTPUT:'
if [ -d 'dist' ]; then
  echo 'a Build directory exists'
  ls -la dist/ | head -5
else
  echo 'a No build directory found'
fi
echo ''
echo '6. AVAILABLE SCRIPTS:'
npm run | grep -E 'dev|build|test|lint' | head -10
echo ''
echo '===================================='
echo 'a VERIFICATION COMPLETE'
echo '===================================='
