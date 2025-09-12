import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
EOFnpm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom husky lint-staged
cat > setup.sh << 'EOF'
#!/bin/bash
echo 'aa Mothership HQ Setup'
echo '====================='

# Install Husky
npx husky install

# Create git hooks
npx husky add .husky/pre-commit 'npm run lint'

# Create branches
git checkout -b develop
git checkout -b staging
git checkout main

echo 'a Setup complete!'
echo 'Run npm run dev to start'
