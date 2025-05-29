#!/bin/bash

# Check code formatting with Prettier
echo "Checking code formatting with Prettier..."
npx prettier --check "client/src/**/*.{js,jsx,ts,tsx}" "server/**/*.{js,ts}" "shared/**/*.{js,ts}"

# Run ESLint to check for code quality issues
echo "Checking code quality with ESLint..."
npx eslint "client/src/**/*.{js,jsx,ts,tsx}" "server/**/*.{js,ts}" "shared/**/*.{js,ts}"

echo "Lint check completed!"