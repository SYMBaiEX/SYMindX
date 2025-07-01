---
sidebar_position: 4
sidebar_label: "OpenAPI"
title: "OpenAPI"
description: "OpenAPI specification"
---

# OpenAPI Specification

The SYMindX API is fully documented using OpenAPI 3.0 specification, providing machine-readable API definitions for automatic client generation, interactive documentation, and API testing. The specification covers all REST endpoints, request/response schemas, authentication methods, and error codes.

## Specification URL

```
http://localhost:3001/openapi.json
```

The OpenAPI specification is automatically generated and served by the API server, always reflecting the current API implementation.

## Interactive Documentation

### Swagger UI

Access the interactive API documentation at:

```
http://localhost:3001/docs
```

Swagger UI provides:
- Interactive API exploration
- Try-it-out functionality
- Request/response examples
- Authentication testing
- Schema visualization

### ReDoc

For a cleaner, read-focused documentation experience:

```
http://localhost:3001/redoc
```

ReDoc features:
- Three-panel responsive design
- Code samples in multiple languages
- Deep linking support
- Search functionality
- Print-friendly output

## Using the Specification

### Client Generation

Generate type-safe API clients in any language:

```bash
# TypeScript/JavaScript client
npx openapi-generator-cli generate \
  -i http://localhost:3001/openapi.json \
  -g typescript-axios \
  -o ./src/api-client

# Python client
openapi-generator generate \
  -i http://localhost:3001/openapi.json \
  -g python \
  -o ./symindx-python-client

# Go client
openapi-generator generate \
  -i http://localhost:3001/openapi.json \
  -g go \
  -o ./symindx-go-client
```

### API Testing with Postman

Import the OpenAPI spec directly into Postman:

1. Open Postman
2. Click "Import" → "Link"
3. Enter: `http://localhost:3001/openapi.json`
4. Postman creates a complete collection with all endpoints

### Validation & Mocking

Use the specification for request validation and API mocking:

```javascript
// Express middleware for request validation
import { OpenAPIValidator } from 'express-openapi-validator';

app.use(OpenAPIValidator.middleware({
  apiSpec: 'http://localhost:3001/openapi.json',
  validateRequests: true,
  validateResponses: true
}));
```

## Specification Structure

### Info Section

```yaml
openapi: 3.0.0
info:
  title: SYMindX API
  version: 1.0.0
  description: AI Agent Runtime System API
  contact:
    name: SYMindX Support
    email: support@symindx.ai
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
```

### Servers

```yaml
servers:
  - url: http://localhost:3001
    description: Local development server
  - url: https://api.symindx.ai
    description: Production server
  - url: ws://localhost:3001
    description: WebSocket server
```

### Authentication

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Bearer token authentication

security:
  - bearerAuth: []
```

### Schema Definitions

All request and response schemas are fully documented:

```yaml
components:
  schemas:
    Agent:
      type: object
      required:
        - id
        - name
        - status
      properties:
        id:
          type: string
          description: Unique agent identifier
          example: "nyx_123"
        name:
          type: string
          description: Agent display name
          example: "NyX Assistant"
        status:
          type: string
          enum: [active, idle, stopped, error]
          description: Current agent status
        emotion:
          type: string
          description: Current emotional state
          example: "curious"
        capabilities:
          type: array
          items:
            type: string
          description: Agent capabilities
          example: ["chat", "code_analysis", "debugging"]
```

### Endpoint Documentation

Each endpoint includes comprehensive documentation:

```yaml
paths:
  /chat:
    post:
      summary: Send a chat message
      description: Send a message to an agent and receive a response
      operationId: sendChatMessage
      tags:
        - Chat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatRequest'
            examples:
              simple:
                summary: Simple chat message
                value:
                  message: "Hello, how are you?"
                  agentId: "nyx"
              withContext:
                summary: Message with context
                value:
                  message: "What's the weather?"
                  agentId: "nyx"
                  context:
                    userId: "user_123"
                    location: "New York"
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalError'
```

## Extensions & Plugins

### VS Code Extension

Install the OpenAPI (Swagger) Editor extension for VS Code:

1. Install from marketplace: "OpenAPI (Swagger) Editor"
2. Open `http://localhost:3001/openapi.json`
3. Get intellisense, validation, and preview

### API Documentation Tools

Generate static documentation sites:

```bash
# Using Redocly
npx @redocly/cli build-docs \
  http://localhost:3001/openapi.json \
  -o ./docs

# Using Spectacle
npx spectacle \
  -d http://localhost:3001/openapi.json \
  -t ./public/api-docs
```

## Best Practices

### API Versioning

The specification supports multiple API versions:

```yaml
servers:
  - url: http://localhost:3001/v1
    description: API version 1
  - url: http://localhost:3001/v2
    description: API version 2 (beta)
```

### Request Examples

Provide multiple examples for complex endpoints:

```yaml
examples:
  multiAgentChat:
    summary: Multi-agent conversation
    value:
      message: "I need help with a complex problem"
      agents: ["nyx", "sage", "aria"]
      strategy: "collaborative"
```

### Error Responses

Standardized error response schemas:

```yaml
components:
  schemas:
    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          description: Error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error details
        timestamp:
          type: string
          format: date-time
```

## Integration Examples

### TypeScript with Generated Client

```typescript
import { Configuration, DefaultApi } from './api-client';

const config = new Configuration({
  basePath: 'http://localhost:3001',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const api = new DefaultApi(config);

// Type-safe API calls
const response = await api.sendChatMessage({
  message: 'Hello!',
  agentId: 'nyx'
});

console.log(response.data.response);
```

### API Contract Testing

```javascript
// Jest test using OpenAPI
import { matchesSchema } from 'jest-openapi';

test('chat endpoint matches OpenAPI spec', async () => {
  const response = await fetch('http://localhost:3001/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Test' })
  });

  const data = await response.json();
  expect(data).toMatchSchema('ChatResponse');
});
```

## Next Steps

- View [Endpoints](./endpoints) for detailed endpoint documentation
- Explore [Schemas](./schemas) for data model definitions
- Check [Examples](./examples) for usage patterns
- Review [API Overview](./overview) for architectural details
