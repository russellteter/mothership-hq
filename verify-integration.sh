#!/bin/bash
clear
echo 'aa CURSOR + LOVABLE INTEGRATION STATUS'
echo '======================================'
echo ''
# Check Cursor
if pgrep -f Cursor > /dev/null; then
    echo 'a Cursor: Running'
else
    echo 'a Cursor: Not detected'
fi
# Check dev server
if lsof -i:3000 > /dev/null 2>&1; then
    echo 'a Dev Server: Running on port 3000'
else
    echo 'a Dev Server: Not running'
fi
# Check sync script
if ps aux | grep -v grep | grep sync.sh > /dev/null; then
    echo 'a Sync Script: Active'
else
    echo 'aa  Sync Script: Not running (run ./sync.sh)'
fi
# Check git status
echo ''
echo 'aa Git Status:'
echo '  Branch: '$(git branch --show-current)
echo '  Lovable branches: '$(git brach -r | grep -c lovable)
echo '  Last commit: '$(git log -1 --format='%cr by %an')
# Check files
echo ''
echo 'aa Integration Files:'
[ -f .cursorcontext ] && echo '  a .cursorcontext' || echo '  a .cursorcontext'
[ -f .gitattributes ] && echo '  a .gitattributes' || echo '  a .gitattributes'
[ -f sync.sh ] && echo '  a sync.sh' || echo '  a sync.sh'
[ -f .github/workflows/auto-merge-lovable.yml ] && echo '  a auto-merge workflow' || echo '  a auto-merge workflow'
echo ''
echo '======================================'
echo 'aa Quick Commands:'
echo '  Start sync: ./sync.sh &'
echo '  Open Cursor: cursor .'
echo '  Check status: ./verify-integration.sh'
echo '======================================'
