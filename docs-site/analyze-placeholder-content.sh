#!/bin/bash

echo "📊 Analyzing Documentation Content Status"
echo "========================================"
echo ""

# Count files with real content vs placeholders
TOTAL_FILES=$(find docs -name "index.md" | wc -l)
PLACEHOLDER_FILES=$(grep -r "This section is being developed" docs/ | wc -l)
REAL_CONTENT_FILES=$((TOTAL_FILES - PLACEHOLDER_FILES))

echo "📈 Overall Statistics:"
echo "- Total documentation files: $TOTAL_FILES"
echo "- Files with real content: $REAL_CONTENT_FILES"
echo "- Files with placeholder content: $PLACEHOLDER_FILES"
echo "- Completion percentage: $((REAL_CONTENT_FILES * 100 / TOTAL_FILES))%"
echo ""

echo "📁 Categories with Placeholder Content:"
echo ""

# Group by main category
for dir in docs/[0-9]*; do
    if [ -d "$dir" ]; then
        CATEGORY=$(basename "$dir")
        CATEGORY_NAME=$(echo "$CATEGORY" | sed 's/^[0-9]*-//')
        PLACEHOLDER_COUNT=$(grep -r "This section is being developed" "$dir" | wc -l)
        TOTAL_COUNT=$(find "$dir" -name "index.md" | wc -l)
        
        if [ $PLACEHOLDER_COUNT -gt 0 ]; then
            echo "📂 $CATEGORY ($CATEGORY_NAME):"
            echo "   - Placeholder files: $PLACEHOLDER_COUNT/$TOTAL_COUNT"
            
            # List specific files
            grep -r "This section is being developed" "$dir" | while read -r line; do
                FILE=$(echo "$line" | cut -d: -f1)
                FILE_REL=$(echo "$FILE" | sed "s|^docs/||")
                echo "   - $FILE_REL"
            done
            echo ""
        fi
    fi
done

echo "✅ Categories with Complete Documentation:"
echo ""

# List categories with no placeholders
for dir in docs/[0-9]*; do
    if [ -d "$dir" ]; then
        CATEGORY=$(basename "$dir")
        CATEGORY_NAME=$(echo "$CATEGORY" | sed 's/^[0-9]*-//')
        PLACEHOLDER_COUNT=$(grep -r "This section is being developed" "$dir" 2>/dev/null | wc -l)
        
        if [ $PLACEHOLDER_COUNT -eq 0 ]; then
            TOTAL_COUNT=$(find "$dir" -name "index.md" | wc -l)
            echo "✓ $CATEGORY ($CATEGORY_NAME) - $TOTAL_COUNT files complete"
        fi
    fi
done

echo ""
echo "🎯 Priority Recommendations:"
echo ""
echo "High Priority (Core functionality):"
echo "1. 02-getting-started - Essential for new users"
echo "2. 04-core-concepts - Fundamental understanding"
echo "3. 05-agents - Core feature documentation"
echo "4. 06-modules - Core components"
echo ""
echo "Medium Priority (Important features):"
echo "5. 07-extensions - Integration points"
echo "6. 08-portals - AI provider setup"
echo "7. 10-deployment - Production readiness"
echo "8. 14-troubleshooting - User support"
echo ""
echo "Lower Priority (Can be developed over time):"
echo "9. 18-tutorials - Step-by-step guides"
echo "10. 19-advanced-topics - Advanced usage"