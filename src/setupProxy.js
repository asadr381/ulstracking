const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/track',
    createProxyMiddleware({
      target: 'https://excel-api-0x2r.onrender.com',
      changeOrigin: true,
    })
  );
};
