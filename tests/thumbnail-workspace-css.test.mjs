import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const require = createRequire(import.meta.url)
const cssLoader = require('next/dist/build/webpack/loaders/css-loader/src').default
const { getCssModuleLocalIdent } = require('next/dist/build/webpack/config/blocks/css/loaders/getCssModuleLocalIdent')
const root = process.cwd()
const stylesheetPath = resolve(root, 'components/editor/thumbnail-studio/ThumbnailWorkspace.module.css')
const source = readFileSync(resolve(root, 'components/editor/thumbnail-studio/ThumbnailWorkspace.tsx'), 'utf8')
const css = readFileSync(stylesheetPath, 'utf8')
const usedClasses = [...new Set([...source.matchAll(/styles\.([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]))]

async function compileExports(stylesheet) {
  const generated = await new Promise((resolveResult, reject) => {
    const trace = { traceChild() { return this }, traceAsyncFn(action) { return action() } }
    const context = {
      resourcePath: stylesheetPath, rootContext: root, context: dirname(stylesheetPath),
      currentTraceSpan: trace,
      getOptions() { return {
        esModule: false, url: false, import: false,
        modules: { mode: 'pure', exportOnlyLocals: true, exportLocalsConvention: 'asIs', getLocalIdent: getCssModuleLocalIdent },
        postcss: async () => ({ postcss }),
      } },
      getResolve() { return async (_context, request) => request },
      emitWarning(warning) { reject(warning) },
      async() { return (error, output) => error ? reject(error) : resolveResult(output) },
    }
    Promise.resolve(cssLoader.call(context, stylesheet)).catch(reject)
  })
  const module = { exports: {} }
  runInNewContext(generated, { module })
  return module.exports
}

function assertClassContract(exports) {
  for (const name of usedClasses) {
    assert.equal(typeof exports[name], 'string', `Studio CSS export ${name} is missing`)
    assert.ok(exports[name].length > 0, `Studio CSS export ${name} is empty`)
  }
}

test('the actual Next CSS loader exports every class used by Thumbnail Studio', async () => {
  assertClassContract(await compileExports(css))
})

test('production PostCSS optimization preserves the Studio class contract', async () => {
  const optimized = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(css, { from: stylesheetPath })
  assertClassContract(await compileExports(optimized.css))
})

test('a missing Studio shell class fails the same contract check', async () => {
  const missingShell = css.replace(/\.studio\b/g, '.missingShellControl')
  const exports = await compileExports(missingShell)
  assert.throws(() => assertClassContract(exports), /Studio CSS export studio is missing/)
})
