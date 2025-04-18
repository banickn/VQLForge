#!/bin/sh
# Simple wrapper to wait a bit before starting nginx

echo "Waiting 5 seconds for backend DNS registration..."
sleep 5

echo "Starting Nginx..."
# Execute the original Nginx command
exec nginx -g 'daemon off;'