import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// Exercise the real Studio with the application CSS and component-owned styles.
// The fixture makes no account writes or paid generation requests.
const flags = process.argv.slice(2)
if (flags.length > 1 || flags.some(flag => !['--build', '--start'].includes(flag))) {
  console.error('Usage: node scripts/serve-thumbnail-workspace-fixture.mjs [--build|--start]')
  process.exit(1)
}
const root = process.cwd()
const fixture = resolve(root, '.tmp/thumbnail-workspace-runtime')
mkdirSync(join(fixture, 'app'), { recursive: true })
cpSync(join(root, 'public/thumbnail-references'), join(fixture, 'public/thumbnail-references'), { recursive: true })
writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, name: 'thumbnail-workspace-runtime' }))
writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  target: 'ES2020', lib: ['dom', 'esnext'], jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler',
  esModuleInterop: true, resolveJsonModule: true, skipLibCheck: true, noEmit: true,
  paths: { '@/*': [root.replaceAll('\\', '/') + '/*'] },
}, include: ['**/*.tsx', '**/*.ts', '.next/types/**/*.ts'] }))
writeFileSync(join(fixture, 'postcss.config.mjs'), `export { default } from ${JSON.stringify(pathToFileURL(join(root, 'postcss.config.mjs')).href)}\n`)
writeFileSync(join(fixture, 'next.config.mjs'), `export default { outputFileTracingRoot: ${JSON.stringify(root)}, experimental: { externalDir: true }, typescript: { ignoreBuildErrors: true }, webpack(config) { config.resolve.alias['@'] = ${JSON.stringify(root)}; return config } }\n`)
writeFileSync(join(fixture, 'app/page.tsx'), `export { default } from ${JSON.stringify(join(root, 'tests/fixtures/thumbnail-workspace-page.tsx').replaceAll('\\', '/'))}\n`)
writeFileSync(join(fixture, 'app/layout.tsx'), `import ${JSON.stringify(join(root, 'app/globals.css').replaceAll('\\', '/'))};\nexport default function Layout({ children }) { return <html lang="en"><body>{children}</body></html> }\n`)
const command = flags.includes('--build') ? ['build', '--webpack'] : flags.includes('--start') ? ['start', '-p', '3220', '--hostname', '127.0.0.1'] : ['dev', '--webpack', '-p', '3220', '--hostname', '127.0.0.1']
const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), ...command, fixture], { cwd: root, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } })
child.on('error', error => { console.error(error.message); process.exit(1) })
child.on('exit', code => process.exit(code ?? 1))
