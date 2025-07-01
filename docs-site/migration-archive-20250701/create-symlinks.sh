#!/bin/bash

# Create symbolic links from numbered directories to expected paths
cd /home/cid/CursorProjects/symindx/docs-site/docs

# Create symlinks for all numbered directories
ln -sf 01-overview overview
ln -sf 02-getting-started getting-started
ln -sf 03-api-reference api-reference
ln -sf 04-core-concepts core-concepts
ln -sf 05-agents agents
ln -sf 06-modules modules
ln -sf 07-extensions extensions
ln -sf 08-portals portals
ln -sf 09-security security
ln -sf 10-deployment deployment
ln -sf 11-monitoring monitoring
ln -sf 12-testing testing
ln -sf 13-performance performance
ln -sf 14-troubleshooting troubleshooting
ln -sf 15-migration migration
ln -sf 16-integrations integrations
ln -sf 17-examples examples
ln -sf 18-tutorials tutorials
ln -sf 19-advanced-topics advanced-topics
ln -sf 20-architecture architecture
ln -sf 21-development development
ln -sf 22-community community
ln -sf 23-changelog changelog
ln -sf 24-roadmap roadmap
ln -sf 25-support support
ln -sf 26-resources resources

echo "✅ Symbolic links created!"
ls -la | grep ^l