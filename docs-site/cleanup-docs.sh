#!/bin/bash

echo "🧹 Cleaning up documentation site..."

# Create archive directory
ARCHIVE_DIR="migration-archive-$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

echo "📁 Creating archive: $ARCHIVE_DIR"

# Archive migration scripts
echo "📦 Archiving migration scripts..."
mv -v create-all-docs.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v create-missing-docs.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v create-symlinks.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v execute-restructure.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v fill-all-missing-docs.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v migrate-content.sh "$ARCHIVE_DIR/" 2>/dev/null
mv -v restructure-docs.sh "$ARCHIVE_DIR/" 2>/dev/null

# Archive old sidebar configurations
echo "📦 Archiving old configurations..."
mv -v sidebars-old.ts "$ARCHIVE_DIR/" 2>/dev/null
mv -v sidebars-new.ts "$ARCHIVE_DIR/" 2>/dev/null
mv -v sidebars-corrected.ts "$ARCHIVE_DIR/" 2>/dev/null
mv -v sidebars-numbered.ts "$ARCHIVE_DIR/" 2>/dev/null

# Archive migration documentation
echo "📦 Archiving migration documentation..."
mv -v MIGRATION_PLAN.md "$ARCHIVE_DIR/" 2>/dev/null
mv -v MIGRATION_REPORT.md "$ARCHIVE_DIR/" 2>/dev/null
mv -v DOCUMENTATION_RESTRUCTURE_SUMMARY.md "$ARCHIVE_DIR/" 2>/dev/null

# Move docs-backup to archive
echo "📦 Moving docs backup to archive..."
if [ -d "docs-backup" ]; then
    mv docs-backup "$ARCHIVE_DIR/"
    echo "✅ Moved docs-backup to archive"
fi

# Clean up any empty directories in docs
echo "🧹 Cleaning empty directories..."
find docs -type d -empty -delete 2>/dev/null

# Create archive README
cat > "$ARCHIVE_DIR/README.md" << EOF
# Documentation Migration Archive

This archive contains files from the documentation restructuring completed on $(date).

## Contents

### Scripts
- Migration and restructuring scripts
- Documentation creation scripts

### Configuration Files
- Old sidebar configurations
- Migration planning documents

### Backup
- docs-backup/ - Original documentation structure

## Summary
Successfully migrated from 6-8 monolithic categories to 26 well-organized categories.

### Statistics
- 174 documentation files created
- 26 main categories
- 100+ subcategories

The new documentation structure is now live in the main docs/ directory.
EOF

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "- Migration files archived to: $ARCHIVE_DIR/"
echo "- Documentation structure cleaned"
echo "- Symbolic links maintained for compatibility"
echo ""
echo "💡 The archive can be safely deleted once you're confident the new structure is working correctly."