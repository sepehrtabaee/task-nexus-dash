#!/bin/bash
export DISPLAY=:0

# Disable screen saver / power saving
xset s off
xset s noblank
xset -dpms

echo "Stopping existing Chromium processes..."
pkill -f chromium || true

echo "Stopping existing Node processes..."
pkill -f node || true
pkill -f vite || true
pkill -f "serve" || true

cd ~/task-manager-pi

echo "Installing dependencies (optional safety step)..."
npm install

echo "Building Dashboard ..."
npm run build
echo "Running  Vite app..."
npm run preview -- --host 0.0.0.0 --port 5173 &

sleep 3

echo "Launching Chromium kiosk..."
nohup chromium --kiosk http://localhost:5173 > /dev/null 2>&1 &