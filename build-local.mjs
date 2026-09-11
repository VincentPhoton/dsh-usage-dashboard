/**
 * Local build that mirrors build.mjs (same esbuild configs) but skips the tsc
 * declaration step — the public type surface is unchanged by the pricing fix.
 * Run with: node build-local.mjs
 */
import { build } from 'esbuild'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'

const { name: packageName, version: packageVersion } = JSON.parse(readFileSync('package.json', 'utf8'))

rmSync('lib', { recursive: true, force: true })
mkdirSync('lib', { recursive: true })

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']

// Host half: plain ESM for Node.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: dshExternal,
  logLevel: 'info',
})

// Client half: CJS closure registering with the web module loader.
await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [...dshExternal, 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  // The 额度 page footer shows this label; it comes from package.json.
  define: { __PLUGIN_LABEL__: JSON.stringify(`${packageName} v${packageVersion}`) },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

console.log('build-local.mjs: done')
