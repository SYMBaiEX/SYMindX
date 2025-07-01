---
sidebar_position: 1
title: "Authentication"
description: "Authentication mechanisms in SYMindX"
---

# Authentication

Authentication mechanisms in SYMindX

## Authentication

SYMindX supports multiple authentication methods to secure your deployment.

### Authentication Methods

#### API Key Authentication
```typescript
// Configure API keys
const auth = {
  type: 'apikey',
  keys: {
    'client-1': 'sk-...',
    'client-2': 'sk-...'
  }
};

// Client usage
const response = await fetch('/api/agents', {
  headers: {
    'Authorization': 'Bearer sk-...'
  }
});
```

#### JWT Authentication
```typescript
// Generate JWT token
const token = jwt.sign({
  userId: user.id,
  role: user.role,
  permissions: user.permissions
}, JWT_SECRET, {
  expiresIn: '24h'
});

// Verify token
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

#### OAuth2 Integration
```typescript
// OAuth2 configuration
const oauth2 = {
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: 'http://localhost:3001/auth/google/callback'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: 'http://localhost:3001/auth/github/callback'
    }
  }
};
```

### Session Management

```typescript
// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redis }),
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Session-based auth
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (user) {
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ success: true });
  }
});
```

### Multi-Factor Authentication

```typescript
// TOTP setup
const secret = authenticator.generateSecret();
const qrCode = await qrcode.toDataURL(
  authenticator.keyuri(user.email, 'SYMindX', secret)
);

// Verify TOTP
app.post('/verify-2fa', (req, res) => {
  const { token } = req.body;
  const verified = authenticator.verify({
    token,
    secret: user.totpSecret
  });
  
  if (verified) {
    req.session.twoFactorVerified = true;
    res.json({ success: true });
  }
});
```

### Security Best Practices

1. **Token Rotation**
   ```typescript
   // Rotate tokens periodically
   setInterval(async () => {
     await rotateApiKeys();
   }, 30 * 24 * 60 * 60 * 1000); // 30 days
   ```

2. **Rate Limiting**
   ```typescript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests
     message: 'Too many requests'
   });
   ```

3. **Secure Headers**
   ```typescript
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"]
       }
     }
   }));
   ```
