// Vercel serverless function entry.
//
// Vercel routes every /api/* request to this file automatically, which is the
// only signal it gets that the project has an API at all — with no api/
// directory and no "main" in the root package.json, it builds and serves the
// Vite output and nothing else.
//
// .mjs rather than .js: the root package.json has no "type": "module", so a
// .js file here would be parsed as CommonJS and this import would throw.
// server/src/app.js is unaffected — it sits under server/package.json, which
// does set "type": "module".
//
// The Express app is imported rather than started, because app.js exports the
// app and keeps app.listen() isolated in server.js. A function must not bind a
// port.
import app from '../server/src/app.js'

export default app
