/**
 * HTTPS/TLS Server Support
 * Provides HTTPS server creation with proper TLS configuration
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { configManager } from './config-manager';

export interface TLSConfig {
  enabled: boolean;
  keyPath?: string;
  certPath?: string;
  caPath?: string;
  selfSigned?: boolean;
}

export interface ServerOptions {
  port: number;
  host?: string;
  tls?: TLSConfig;
}

export class HTTPSServer {
  private static instance: HTTPSServer;
  private tlsConfig: TLSConfig;

  private constructor() {
    this.tlsConfig = this.loadTLSConfig();
  }

  public static getInstance(): HTTPSServer {
    if (!HTTPSServer.instance) {
      HTTPSServer.instance = new HTTPSServer();
    }
    return HTTPSServer.instance;
  }

  private loadTLSConfig(): TLSConfig {
    const securityConfig = configManager.getSecurityConfig();
    
    return {
      enabled: securityConfig.enableHttps,
      keyPath: configManager.get('TLS_KEY_PATH', './certs/server.key'),
      certPath: configManager.get('TLS_CERT_PATH', './certs/server.crt'),
      caPath: configManager.get('TLS_CA_PATH'),
      selfSigned: configManager.getBoolean('TLS_SELF_SIGNED', false),
    };
  }

  public createServer(app: any, options: ServerOptions): http.Server | https.Server {
    if (!this.tlsConfig.enabled) {
      console.log('🔓 Creating HTTP server (TLS disabled)');
      return http.createServer(app);
    }

    try {
      const httpsOptions = this.getHTTPSOptions();
      console.log('🔒 Creating HTTPS server with TLS');
      return https.createServer(httpsOptions, app);
    } catch (error) {
      console.warn('⚠️  Failed to create HTTPS server, falling back to HTTP:', error);
      return http.createServer(app);
    }
  }

  private getHTTPSOptions(): https.ServerOptions {
    const options: https.ServerOptions = {};

    // Load private key
    if (this.tlsConfig.keyPath && fs.existsSync(this.tlsConfig.keyPath)) {
      options.key = fs.readFileSync(this.tlsConfig.keyPath);
    } else if (this.tlsConfig.selfSigned) {
      console.warn('⚠️  TLS key not found, generating self-signed certificate');
      const selfSigned = this.generateSelfSignedCert();
      options.key = selfSigned.key;
      options.cert = selfSigned.cert;
      return options;
    } else {
      throw new Error(`TLS key file not found: ${this.tlsConfig.keyPath}`);
    }

    // Load certificate
    if (this.tlsConfig.certPath && fs.existsSync(this.tlsConfig.certPath)) {
      options.cert = fs.readFileSync(this.tlsConfig.certPath);
    } else {
      throw new Error(`TLS certificate file not found: ${this.tlsConfig.certPath}`);
    }

    // Load CA certificate if provided
    if (this.tlsConfig.caPath && fs.existsSync(this.tlsConfig.caPath)) {
      options.ca = fs.readFileSync(this.tlsConfig.caPath);
    }

    // Security settings
    options.secureProtocol = 'TLSv1_2_method';
    options.ciphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
    ].join(':');
    options.honorCipherOrder = true;

    return options;
  }

  private generateSelfSignedCert(): { key: Buffer; cert: Buffer } {
    // This is a simplified self-signed certificate generation
    // In production, use proper certificate management
    console.warn('🚨 Using self-signed certificate - NOT suitable for production!');
    
    // For now, return empty buffers - in a real implementation,
    // you would use a library like node-forge to generate certificates
    const dummyKey = Buffer.from(`-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNfFmuPiKuSRSKhisuZjI0TJErc+CXVLUuT+/xF3+4CWQn4KxWSfdz0c0xTgvwj
lRHPbMHDf+R1IsZWFSLd1aMcMfnNjxqyA0JZM2stMa2w4CDBqRaLf0AL2r3Oq67j
kbNubHMnLTGvNA+J+Oz7rCWHSuDVjTiDFA9yt4Oa5+lKKDCRp4GkVBjI65YeWw3P
KtXydJSMikKv5EdQw0dMelDuSTXiOBxbAuLjjFt9PkjZ2hJ/gIl2RjSNhHrSOABN
cEhbQWX5xP5+vAXAMbATSRhEAoGBAOqVvwrXReGozzjfMRn8MvMr8HUOyIvBQVvv
DDrEiPJ7cCCchNxqyWQ4F+j2lQKBgQDNiKSaXbDQpksX1eoFkEEsCS7m3SiUDSVE
FzjMBfOGEHi4YYaNnBZzplc+A09+QmtY2pP+CIBAHQBzuVUxMyBMmJ2U/S7VePD7
cNeHlh4Q/KQlAoGBAInkgnoz8fWM6W5x4r8w4LQlFz2nvVXv+eWmaVRhPBFURtfn
bDzd1qz8b2xVvFAkh+Qkun5ej8z+4qQlAoGAVR8Ua3TVD4nDgTGbBHRhPiJBXmlW
MXPFoQs1vmeDKVh+IuLBcCWTS8AN+Rqtq+7InMGSOg==
-----END PRIVATE KEY-----`);

    const dummyCert = Buffer.from(`-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTIwOTEyMjE1MjAyWhcNMTUwOTEyMjE1MjAyWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1L7VLPHCgcEDXxZrj4irkkUioYrLmYyNEyRK3Pgl1S1Lk/v8Rd/u
AlkJ+CsVkn3c9HNMUwL8I5URz2zBw3/kdSLGVhUi3dWjHDH5zY8asgNCWTNrLTGt
sOAgwakWi39AC9q9zquu45GzbmxzJy0xrzQPifjsw6wlh0rg1Y04gxQPcreDmufp
SigwkaeBoFQYyOuWHlsNzyrV8nSUjIpCr+RHUMNHTHpQ7kk14jgcWwLi44xbfT5I
2doSf4CJdkY0jYR60jgATXBIW0Fl+cT+frwFwDGwE0kYRAKBgQDqlb8K10Xhqs84
3zEZ/DLzK/B1DsiLwUFb7ww6xIjye3AgnITcaslkOBfo9pUCgYEAzYikml2w0KZL
F9XqBZBBLAku5t0olA0lRBc4zAXzhhB4uGGGjZwWc6ZXPgNPfkJrWNqT/giAQB0A
c7lVMTMgTJidlP0u1Xjw+3DXh5YeEPykJQKBgQCJ5IJ6M/H1jOlucaK/MOC0JRc9
p71V7/nlpmlUYTwRVEbX52w83das/G9sVbxQJIfkJLp+Xo/M/uKkJQKBgFUfFGt0
1Q+Jw4ExmwR0YT4iQV5pVjFzxaELNb5ngylYfiLiwXAlk0vADfkaravuyJzBkjoA
oGAVHxRrdNUPicOBMZsEdGE+IkFeaVYxc8WhCzW+Z4MpWH4i4sFwJZNLwA35Gq2r
7sicwZI6AKBgFR8Ua3TVD4nDgTGbBHRhPiJBXmlWMXPFoQs1vmeDKVh+IuLBcCWT
S8AN+Rqtq+7InMGSOg==
-----END CERTIFICATE-----`);

    return { key: dummyKey, cert: dummyCert };
  }

  public ensureCertificateDirectory(): void {
    const certDir = path.dirname(this.tlsConfig.certPath || './certs/server.crt');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
      console.log(`📁 Created certificate directory: ${certDir}`);
    }
  }

  public validateTLSConfig(): boolean {
    if (!this.tlsConfig.enabled) {
      return true; // Valid to have TLS disabled
    }

    if (this.tlsConfig.selfSigned) {
      return true; // Self-signed is valid for development
    }

    // Check if certificate files exist
    const keyExists = this.tlsConfig.keyPath && fs.existsSync(this.tlsConfig.keyPath);
    const certExists = this.tlsConfig.certPath && fs.existsSync(this.tlsConfig.certPath);

    if (!keyExists || !certExists) {
      console.error('❌ TLS configuration invalid: Missing certificate files');
      console.error(`Key file: ${this.tlsConfig.keyPath} (exists: ${keyExists})`);
      console.error(`Cert file: ${this.tlsConfig.certPath} (exists: ${certExists})`);
      return false;
    }

    return true;
  }
}

export const httpsServer = HTTPSServer.getInstance();