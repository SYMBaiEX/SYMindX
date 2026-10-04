export function resolveChatCompletionsUrl(baseUrl: string): string {
  if (typeof baseUrl !== 'string' || baseUrl.length === 0 || baseUrl.length > 2000) {
    throw new Error('Provider baseUrl is required');
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('Provider baseUrl must be a valid URL');
  }

  const hostname = url.hostname.toLowerCase();
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('Provider baseUrl must use HTTPS (HTTP only for loopback)');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Provider baseUrl cannot contain credentials, query, or fragment');
  }

  const rootPath = url.pathname.replace(/\/+$/, '');
  url.pathname = rootPath.endsWith('/v1')
    ? `${rootPath}/chat/completions`
    : `${rootPath}/v1/chat/completions`;
  return url.toString();
}
