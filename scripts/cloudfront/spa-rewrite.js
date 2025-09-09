function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';

  // Do not rewrite API routes
  if (uri.startsWith('/api/')) {
    return request;
  }

  // If the request ends with a slash or the last path segment has no dot,
  // treat it as an SPA route and rewrite to index.html
  var last = uri.split('/').pop();
  var hasExt = last && last.includes('.');
  if (uri.endsWith('/') || !hasExt) {
    request.uri = '/index.html';
  }

  return request;
}

