// Execute repository TypeScript with explicit boundary mocks, without contacting external services.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
module.exports = function createLoader(mocks) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return load(path.join(process.cwd(), 'src', id.slice(2)) + '.ts');
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id.endsWith('.ts') ? id : id + '.ts'));
      return require(id);
    };
    new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load;
};
