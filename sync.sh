#!/bin/bash
# Real-time sync between Cursor and Lovable

echo 'aa Starting real-time sync...'

# Function to sync changes
sync_changes() {
    echo "$(date): Checking for changes..."
    
    # Pull Lovable changes
    git fetch origin
    
    # Check if lovable branch has updates
    LOVABLE_BRANCH=$(git branch -r | grep lovable/design | head -1 | xargs)
    if [ ! -z "$LOVABLE_BRANCH" ]; then
        echo "Found Lovable branch: $LOVABLE_BRANCH"
        git merge $LOVABLE_BRANCH --no-ff --no-edit 2>/dev/null || true
    fi
    
    # Push local changes
    git add -A
    git commit -m "[Cursor] Auto-sync: $(date '+%H:%M:%S')" 2>/dev/null || true
    git push origin HEAD 2>/dev/null || true
}

# Run sync every 2 minutes
while true; do
    sync_changes
    sleep 120
done
