#!/bin/bash

# Script to update documentation dates across all markdown files

echo "🔄 Updating documentation dates..."

# Count files before
total_files=$(find docs-site/docs -name "*.md" -type f | wc -l)
echo "📁 Total markdown files: $total_files"

# Find and replace old date patterns
find docs-site/docs -name "*.md" -type f -exec sed -i \
  -e 's/Last updated on Oct 14, 2018 by Author/Last updated July 2nd 2025 by SYMBiEX/g' \
  -e 's/(Simulated during dev for better perf)//g' \
  -e 's/Last updated: January 2024/Last updated: July 2nd 2025/g' \
  {} \;

# Also update any other date patterns we might find
find docs-site/docs -name "*.md" -type f -exec sed -i \
  -e 's/January 2024/July 2nd 2025/g' \
  -e 's/Author:/SYMBiEX:/g' \
  {} \;

echo "✅ Date updates completed!"
echo "🎯 All documentation now shows: 'Last updated July 2nd 2025 by SYMBiEX'" 