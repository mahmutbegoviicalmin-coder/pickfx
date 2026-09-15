// Run with npm run test:bootstrap. Execute real bridge scripts and host files;
// do not substitute successful responses for evalScript/evalFile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { test } = require('node:test');
const acorn = require('acorn');
const root = path.resolve(__dirname, '..');
const panel = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'src/premiere/PremiereBridge.js'), 'utf8'), panel);
const bridge = panel.PremiereBridge;
const es3 = { ecmaVersion: 3, allowReserved: 'never', locations: true };

function runtime(options = {}) {
  const files = [];
  const context = vm.createContext({ $: {}, app: { project: {} } });
  if (!options.existingJson) vm.runInContext('JSON = undefined;', context);
  function File(name) {
    this.fsName = path.resolve(String(name));
    this.exists = fs.existsSync(this.fsName) && !(options.missing || []).includes(this.fsName);
    this.parent = { fsName: path.dirname(this.fsName) };
  }
  context.File = File;
  function evaluate(source, filename) {
    // V8 accepts reserved ES3 property names; parse before execution so the
    // test catches code Premiere cannot compile. This is not the Adobe DOM.
    try { acorn.parse(source, es3); } catch (error) {
      error.line = error.loc.line;
      error.fileName = filename;
      throw error;
    }
    return vm.runInContext(source, context, { filename, timeout: 3000 });
  }
  context.$.evalFile = function (file) {
    const target = new File(file.fsName || file);
    if (!target.exists) throw new Error('File not found: ' + target.fsName);
    const before = context.$.fileName;
    context.$.fileName = target.fsName;
    files.push(target.fsName);
    try {
      const source = options.sources && options.sources[target.fsName] !== undefined
        ? options.sources[target.fsName] : fs.readFileSync(target.fsName, 'utf8');
      return evaluate(source, target.fsName);
    } finally { context.$.fileName = before; }
  };
  return {
    context, files,
    cs: {
      getSystemPath: () => root,
      evalScript(source, done) {
        let result;
        try { result = String(evaluate(source, 'CEP evalScript')); }
        catch (error) { result = 'EvalScript error.'; }
        done(result);
      }
    }
  };
}

function call(env, method, ...args) {
  let result;
  bridge[method](env.cs, ...args, value => { result = value; });
  assert.ok(result, method + ' must invoke its callback');
  return result;
}

test('all preset bootstrap files compile as ES3, including the manifest host', () => {
  const files = ['src/premiere/host.jsx', 'src/premiere/json2.js']
    .concat(bridge.PRESET_HOST_MODULES.map(spec => spec.path.slice(1)));
  for (const file of files) {
    assert.doesNotThrow(() => acorn.parse(fs.readFileSync(path.join(root, file), 'utf8'), es3), file);
  }
});

test('manifest host bootstraps JSON in a fresh host', () => {
  const env = runtime();
  env.context.$.evalFile(path.join(root, 'src/premiere/host.jsx'));
  assert.equal(typeof env.context.$._pickfx, 'object');
  assert.equal(vm.runInContext('typeof JSON.stringify', env.context), 'function');
  assert.equal(env.context.$._pickfxJsonPolyfill.ready, true);
});

test('cold preset bootstrap executes the real modules and returns serializable status', () => {
  const env = runtime();
  const result = call(env, 'ensurePresetHost');
  assert.equal(result.ok, true, JSON.stringify(result, (key, value) => key === 'hostStatusAfter' ? undefined : value));
  assert.equal(result.capability.ok, true);
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(env.files.includes(path.join(root, 'src/premiere/json2.js')), true);
  const count = env.files.length;
  assert.equal(call(env, 'ensurePresetHost').ok, true);
  assert.equal(env.files.length, count, 'ready runtime must not reload modules');
  assert.equal(call(env, 'listCapturableComponents').reason, 'NO_VIDEO_SELECTION');
  const diagnostic = call(env, 'debugPresetCaptureStartup');
  assert.doesNotThrow(() => JSON.stringify(diagnostic));
});

test('existing JSON identity and methods are preserved', () => {
  const env = runtime({ existingJson: true });
  const original = vm.runInContext('JSON', env.context);
  const stringify = original.stringify;
  assert.equal(call(env, 'ensurePresetHost').ok, true);
  assert.equal(vm.runInContext('JSON', env.context), original);
  assert.equal(original.stringify, stringify);
});

test('missing JSON file stops bootstrap with the correct module', () => {
  const env = runtime({ missing: [path.join(root, 'src/premiere/json2.js')] });
  const result = call(env, 'ensurePresetHost');
  assert.equal(result.reason, 'JSON_UNAVAILABLE');
  assert.equal(result.failingModule, '/src/premiere/json2.js');
  assert.equal(env.files.length, 0);
});

test('capture, per-user disk save, reload and verified apply with the cold runtime', t => {
  const env = runtime();
  assert.equal(call(env, 'ensurePresetHost').ok, true);
  // Only the Adobe selection/ComponentParam boundary is a fixture; use the
  // actual host capture, schema, filesystem store and parameter writer.
  vm.runInContext(`
    var scale = {
      displayName: 'Scale', matchName: '', value: 37,
      getKeys: function () { return []; },
      isTimeVarying: function () { return false; },
      getValue: function () { return this.value; },
      setValue: function (value) { this.value = value; return true; }
    };
    var clip = {
      name: 'Source', parentTrackIndex: 0, start: {ticks: '0'},
      components: {numItems: 1, 0: {
        displayName: 'Motion', matchName: 'AE.ADBE Motion',
        properties: {numItems: 1, 0: scale}
      }}
    };
    app.project.activeSequence = {name: 'Sequence'};
    $._pickfx.selectedVideoTrackItems = function () {
      return {ok: true, count: 1, items: [clip]};
    };
  `, env.context);
  const listing = call(env, 'listCapturableComponents');
  assert.equal(listing.ok, true, JSON.stringify(listing));
  assert.equal(listing.components[0].supportedParameterCount, 1);
  const page = call(env, 'captureComponent', listing.session, 0, 0, 20);
  assert.equal(page.ok, true, JSON.stringify(page));
  const ui = vm.createContext({});
  for (const file of ['src/core/PresetSchema.js', 'src/panel/ui/PresetStore.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ui);
  }
  const preset = ui.PresetSchema.build({
    name: 'Scale 37', components: [{ ...page.component, parameters: page.parameters }]
  });
  assert.equal(preset.ok, true);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pickfx-bootstrap-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const wrap = fn => (...args) => {
    try { return {err: 0, data: fn(...args)}; } catch (error) { return {err: 1}; }
  };
  const disk = {
    makedir: wrap(p => fs.mkdirSync(p)),
    readFile: wrap(p => fs.readFileSync(p, 'utf8')),
    writeFile: wrap((p, data) => fs.writeFileSync(p, data)),
    readdir: wrap(p => fs.readdirSync(p)),
    stat: wrap(p => ({isDirectory: fs.statSync(p).isDirectory()}))
  };
  const options = {fs: disk, csInterface: {getSystemPath: () => directory},
    userId: '11111111-1111-4111-8111-111111111111'};
  const saved = ui.PresetStore.save(preset.preset, options);
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(ui.PresetStore.list({...options, userId: '22222222-2222-4222-8222-222222222222'}).presets.length, 0);
  const reloaded = ui.PresetStore.list(options);
  assert.equal(reloaded.presets.length, 1);
  env.context.scale.value = 100;
  const applied = call(env, 'applyPickFXPreset', reloaded.presets[0]);
  assert.equal(applied.ok, true, JSON.stringify(applied));
  assert.equal(env.context.scale.value, 37);
  assert.equal(applied.clips[0].parametersVerified, 1);
});
