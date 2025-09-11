#!/bin/bash
echo 'aa Starting Cursor + Lovable Development Environment'
echo '=================================================='

# Kill any existing processes
pkill -f sync.sh 2>/dev/null
lsof -ti:3000 | xargs kill 2>/dev/null

# Start everything
echo '1. Starting dev server...'
npm run dev &
DEV_PID=$!

echo '2. Starting sync script...'
./sync.sh &
SYNC_PID=$!

echo '3. Opening Cursor...'
cursor . &

sleep 3

echo ''
echo 'a ALL SYSTEMS RUNNING!'
echo '====================='
echo 'Dev Server PID: '$DEV_PID
echo 'Sync Script PID: '$SYNC_PID
echo 'Access app at: http://localhost:3000'
echo ''
echo 'Press Ctrl+C to stop all services'

# Wait for Ctrl+C
trap 'kill $DEV_PID $SYNC_PID 2>/dev/null; exit' INT
wait
