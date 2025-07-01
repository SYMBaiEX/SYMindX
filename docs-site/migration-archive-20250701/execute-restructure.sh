#!/bin/bash

# Master script to execute the documentation restructuring

echo "🚀 SYMindX Documentation Restructuring"
echo "====================================="
echo ""

# Change to docs-site directory
cd /home/cid/CursorProjects/symindx/docs-site

# Step 1: Make scripts executable
echo "📋 Step 1: Making scripts executable..."
chmod +x restructure-docs.sh
chmod +x migrate-content.sh

# Step 2: Create backup
echo "📋 Step 2: Creating backup of existing docs..."
if [ -d "docs" ] && [ ! -d "docs-backup" ]; then
    cp -r docs docs-backup
    echo "✅ Backup created: docs-backup/"
else
    echo "⚠️  Backup already exists or docs directory not found"
fi

# Step 3: Run restructure script
echo "📋 Step 3: Creating new directory structure..."
./restructure-docs.sh

# Step 4: Run migration script
echo "📋 Step 4: Migrating existing content..."
./migrate-content.sh

# Step 5: Summary
echo ""
echo "✅ Restructuring Complete!"
echo ""
echo "📊 Summary:"
echo "- New structure: 26 categories with subcategories"
echo "- Backup location: docs-backup/"
echo "- Migration report: MIGRATION_REPORT.md"
echo ""
echo "🔍 To verify the new structure:"
echo "1. cd /home/cid/CursorProjects/symindx/docs-site"
echo "2. npm run start"
echo "3. Navigate to http://localhost:3000"
echo ""
echo "📝 Next steps:"
echo "1. Review migrated content for accuracy"
echo "2. Update any broken internal links"
echo "3. Create content for empty sections"
echo "4. Update the search configuration"
echo "5. Test mobile responsiveness"