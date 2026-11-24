const gateway = 'http://localhost:11000';

module.exports = {
  '/auth': {
    target: gateway,
    changeOrigin: true
  },
  '/builder': {
    target: gateway,
    changeOrigin: true,
    bypass: request => {
      // /builder is both the Angular route prefix and the API gateway prefix.
      // Let browser page navigations reach Angular's SPA fallback; API calls
      // use application/json and continue through the gateway proxy.
      if (request.method === 'GET' && request.headers.accept?.includes('text/html')) {
        return request.url;
      }

      return undefined;
    }
  },
  '/realtime': {
    target: gateway,
    changeOrigin: true,
    ws: true
  },
  '/designer-studio-app': {
    target: gateway,
    changeOrigin: true
  }
};
