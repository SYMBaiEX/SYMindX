# SYMindX Project Analyzer

This tool helps developers quickly understand and navigate the SYMindX codebase structure, dependencies, and architecture.

## Quick Analysis Commands

### Project Structure Overview
```bash
# Get high-level project structure
find . -type d -name "node_modules" -prune -o -type d -print | head -20

# Count lines of code by language
find . -name "*.ts" -not -path "./node_modules/*" | xargs wc -l | tail -1
find . -name "*.js" -not -path "./node_modules/*" | xargs wc -l | tail -1
find . -name "*.tsx" -not -path "./node_modules/*" | xargs wc -l | tail -1

# Find all main entry points
find . -name "index.ts" -not -path "./node_modules/*"
find . -name "main.ts" -not -path "./node_modules/*"
```

### Dependency Analysis
```bash
# Analyze package.json dependencies
echo "=== Production Dependencies ==="
cat package.json | jq '.dependencies // {}' | jq 'keys[]'

echo "=== Development Dependencies ==="
cat package.json | jq '.devDependencies // {}' | jq 'keys[]'

echo "=== Peer Dependencies ==="
cat package.json | jq '.peerDependencies // {}' | jq 'keys[]'

# Check for outdated packages
bun outdated

# Analyze bundle size (if applicable)
bun run build:analyze 2>/dev/null || echo "Build analyze not available"
```

### Code Quality Metrics
```bash
# TypeScript error count
bunx tsc --noEmit | grep -c "error TS" || echo "0 TypeScript errors"

# ESLint issues count
bunx eslint . --format=compact | grep -c "problem" || echo "0 ESLint issues"

# Test coverage summary
bun test --coverage 2>/dev/null | grep -E "(Lines|Functions|Branches|Statements)" || echo "Coverage data not available"

# Find TODO/FIXME comments
echo "=== TODO Items ==="
grep -r "TODO\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" . | wc -l
```

## Architecture Analysis

### Core Components Discovery
```bash
# Find all main architectural components
echo "=== Core Runtime Components ==="
ls -la src/core/ 2>/dev/null || echo "Core directory not found at src/core/"

echo "=== Memory Providers ==="
ls -la src/memory/ 2>/dev/null || find . -name "*memory*" -type d | head -5

echo "=== AI Portals ==="
ls -la src/portals/ 2>/dev/null || find . -name "*portal*" -type d | head -5

echo "=== Extensions ==="
ls -la src/extensions/ 2>/dev/null || find . -name "*extension*" -type d | head -5

echo "=== Web Interface ==="
ls -la web/ 2>/dev/null || ls -la website/ 2>/dev/null || echo "Web directory not found"
```

### Import/Export Analysis
```bash
# Find circular dependencies
echo "=== Checking for Circular Dependencies ==="
bunx madge --circular --format amd . || echo "Install madge: bun add -g madge"

# Most imported modules
echo "=== Most Imported Modules ==="
grep -r "import.*from" --include="*.ts" --include="*.tsx" . | \
  sed "s/.*from[[:space:]]*['\"]//g" | sed "s/['\"].*//g" | \
  sort | uniq -c | sort -nr | head -10

# Export analysis
echo "=== Export Patterns ==="
grep -r "export " --include="*.ts" --include="*.tsx" . | \
  grep -o "export [a-zA-Z]*" | sort | uniq -c | sort -nr
```

## Performance Analysis

### Bundle Analysis
```bash
# File size analysis
echo "=== Largest Source Files ==="
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  grep -v node_modules | xargs ls -la | sort -k5 -nr | head -10

echo "=== Smallest Components ==="
find . -name "*.ts" -o -name "*.tsx" | \
  grep -v node_modules | xargs wc -l | sort -n | head -10

# Asset analysis
echo "=== Asset Files ==="
find . -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.gif" | \
  grep -v node_modules | xargs ls -la | sort -k5 -nr | head -10
```

### Memory Usage Patterns
```bash
# Find potential memory leaks
echo "=== Potential Memory Patterns ==="
grep -r "setInterval\|setTimeout" --include="*.ts" --include="*.tsx" . | wc -l
grep -r "addEventListener" --include="*.ts" --include="*.tsx" . | wc -l
grep -r "new.*Array\|new.*Object" --include="*.ts" --include="*.tsx" . | wc -l

# Database connection patterns
grep -r "createConnection\|connect\|pool" --include="*.ts" . | wc -l
```

## Development Workflow Analysis

### Git Analysis
```bash
# Recent activity
echo "=== Recent Commits ==="
git log --oneline -10

echo "=== Most Active Files ==="
git log --pretty=format: --name-only | grep -v "^$" | sort | uniq -c | sort -nr | head -10

echo "=== Branch Information ==="
git branch -v

echo "=== Contributor Analysis ==="
git shortlog -sn | head -5
```

### Test Coverage Analysis
```bash
# Test file coverage
echo "=== Test File Ratio ==="
TEST_FILES=$(find . -name "*.test.ts" -o -name "*.spec.ts" | grep -v node_modules | wc -l)
SRC_FILES=$(find . -name "*.ts" | grep -v node_modules | grep -v "\.test\." | grep -v "\.spec\." | wc -l)
echo "Test files: $TEST_FILES, Source files: $SRC_FILES"

# Find untested files
echo "=== Potentially Untested Files ==="
for file in $(find src -name "*.ts" | grep -v "\.test\." | grep -v "\.spec\."); do
  basename=$(basename "$file" .ts)
  dirname=$(dirname "$file")
  if [ ! -f "${dirname}/${basename}.test.ts" ] && [ ! -f "${dirname}/${basename}.spec.ts" ] && [ ! -f "tests/${basename}.test.ts" ]; then
    echo "$file"
  fi
done | head -10
```

## Configuration Analysis

### Environment Setup
```bash
# Environment files
echo "=== Environment Configuration ==="
ls -la .env* 2>/dev/null || echo "No environment files found"

# Configuration files
echo "=== Configuration Files ==="
ls -la *.config.* *.json *.yaml *.yml 2>/dev/null | head -10

# Docker setup
echo "=== Docker Configuration ==="
ls -la Dockerfile docker-compose* 2>/dev/null || echo "No Docker files found"
```

### Build Configuration
```bash
# Build tools
echo "=== Build Configuration ==="
cat package.json | jq '.scripts // {}' | jq 'to_entries[] | "\(.key): \(.value)"'

# TypeScript configuration
echo "=== TypeScript Config ==="
cat tsconfig.json | jq '.compilerOptions | keys[]' 2>/dev/null || echo "No tsconfig.json found"

# Bundler configuration
ls -la vite.config.* webpack.config.* rollup.config.* 2>/dev/null || echo "No bundler config found"
```

## Security Analysis

### Dependency Security
```bash
# Security audit
echo "=== Security Audit ==="
bun audit 2>/dev/null || npm audit 2>/dev/null || echo "Security audit not available"

# Environment variable usage
echo "=== Environment Variables ==="
grep -r "process\.env\|import\.meta\.env" --include="*.ts" --include="*.tsx" . | \
  sed 's/.*\(process\.env\|import\.meta\.env\)\.\([A-Z_]*\).*/\2/' | \
  sort | uniq | head -10

# Hardcoded secrets check
echo "=== Potential Hardcoded Secrets ==="
grep -r "password\|secret\|key\|token" --include="*.ts" --include="*.tsx" . | \
  grep -v "\.test\.\|\.spec\.\|\.md" | wc -l
```

## Database Analysis

### Schema Analysis
```bash
# Find database schemas
echo "=== Database Files ==="
find . -name "*.sql" -o -name "*schema*" -o -name "*migration*" | head -10

# Database configuration
echo "=== Database Configuration ==="
grep -r "database\|sqlite\|postgres\|mysql" --include="*.json" --include="*.ts" . | head -5
```

## Extension System Analysis

### Extension Discovery
```bash
# Find extension files
echo "=== Extension Files ==="
find . -name "*extension*" -o -name "*plugin*" | grep -v node_modules | head -10

# Extension interfaces
echo "=== Extension Interfaces ==="
grep -r "interface.*Extension\|type.*Extension" --include="*.ts" . | head -5

# Extension registry
echo "=== Extension Registry Usage ==="
grep -r "register\|Extension" --include="*.ts" . | wc -l
```

## AI Portal Analysis

### AI Provider Detection
```bash
# AI provider implementations
echo "=== AI Providers ==="
find . -name "*openai*" -o -name "*anthropic*" -o -name "*claude*" -o -name "*gpt*" | \
  grep -v node_modules | head -10

# Portal configurations
echo "=== Portal Configurations ==="
grep -r "provider\|model\|api_key" --include="*.ts" --include="*.json" . | \
  grep -v "\.test\.\|\.spec\." | wc -l
```

## Usage Instructions

1. **Quick Health Check**: Run all analysis commands to get project overview
2. **Deep Dive**: Focus on specific sections based on your needs
3. **Performance Issues**: Use bundle and memory analysis
4. **Code Quality**: Check TypeScript, ESLint, and test coverage
5. **Security Review**: Run security and dependency analysis
6. **Architecture Understanding**: Use component discovery and import analysis

## Integration with Development

Add these commands to your `package.json` scripts:

```json
{
  "scripts": {
    "analyze:structure": "bash .cursor/tools/analyze-structure.sh",
    "analyze:deps": "bash .cursor/tools/analyze-deps.sh",
    "analyze:performance": "bash .cursor/tools/analyze-performance.sh",
    "analyze:security": "bash .cursor/tools/analyze-security.sh",
    "analyze:all": "bash .cursor/tools/analyze-all.sh"
  }
}
```

This analyzer helps maintain code quality and provides insights for developers working on the SYMindX project. 