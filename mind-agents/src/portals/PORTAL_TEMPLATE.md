# Creating a New Portal

To create a new AI provider portal:

1. **Create your portal directory:**

   ```
   mind-agents/src/portals/your-portal-name/
   ```

2. **Create the required files:**
   - `index.ts` - Main portal implementation
   - `package.json` - Portal metadata and dependencies
   - `README.md` - Documentation for your portal
   - `config.example.json` - Example configuration

3. **Use this package.json template:**

   ```json
   {
     "name": "@symindx/portal-your-name",
     "version": "1.0.0",
     "type": "module",
     "private": true,
     "main": "index.ts",
     "dependencies": {
       // Add any portal-specific dependencies here
     },
     "peerDependencies": {
       "@symindx/mind-agents": "^1.0.0"
     },
     "symindx": {
       "type": "portal",
       "displayName": "Your Portal Name",
       "description": "Description of your AI provider",
       "author": "Your Name",
       "capabilities": ["text", "chat", "embeddings"],
       "models": ["model-1", "model-2"]
     }
   }
   ```

4. **Implement the BasePortal interface:**

   ```typescript
   import { BasePortal } from '../base-portal.js';

   export class YourPortal extends BasePortal {
     // Implementation
   }
   ```

5. **Register in the root package.json workspaces**

6. **Submit a PR!**
