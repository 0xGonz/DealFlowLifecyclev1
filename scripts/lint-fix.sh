#!/bin/bash

# Fix code formatting with Prettier
echo "Fixing code formatting with Prettier..."
npx prettier --write "client/src/**/*.{js,jsx,ts,tsx}" "server/**/*.{js,ts}" "shared/**/*.{js,ts}"

# Fix ESLint issues where possible
echo "Fixing code quality issues with ESLint..."
npx eslint --fix "client/src/**/*.{js,jsx,ts,tsx}" "server/**/*.{js,ts}" "shared/**/*.{js,ts}"

echo "Lint fixes completed!"