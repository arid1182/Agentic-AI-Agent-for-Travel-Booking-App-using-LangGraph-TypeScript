#!/bin/bash

echo "...........ADDING ALL FILES ..........."
git add .

echo "...........COMMITING CHANGES .........."
git commit -m "Welcome to Capclouds"

echo "Pushing to GitHub..."
git push --set-upstream origin feature/osrm-api

echo "...........Git ADD, COMMIT and PUSH - COMPLETED!!!!!!!!"