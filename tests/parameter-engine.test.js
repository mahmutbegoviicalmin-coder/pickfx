var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var context = {
	console: console,
	module: { exports: {} },
	$: {},
	Time: function () {
		this.ticks = "0";
	},
	EvalScript_ErrMessage: "EvalScript error.",
	print: function (msg) {
		console.log(msg);
	},
	fs: fs,
	path: path,
	__pickfxRoot: root
};
vm.createContext(context);

function load(rel) {
	vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), context, { filename: rel });
}

load("src/core/ParameterValueParser.js");
load("src/core/ParameterValueResolver.js");
load("src/core/ParameterEngine.js");
load("src/core/ParameterReadBack.js");
load("src/core/PointValue.js");
load("src/core/ParameterValueType.js");
load("src/core/SpeedOperation.js");
load("src/core/TypedCandidateClassifier.js");
load("src/core/BooleanCandidateInspect.js");
load("src/core/BooleanWriteTest.js");
load("src/core/BatchNumericExecutor.js");
load("src/core/NumericParameterPicker.js");
load("src/core/EffectSearch.js");
load("src/core/TerminalRegistryAdapter.js");
load("src/core/TerminalCommandResolver.js");
load("src/core/TerminalCommandDispatcher.js");
load("src/core/TerminalResearchHarness.js");
load("src/core/CommandParser.js");
load("src/core/CommandExecutor.js");
load("src/core/MotionParameterInspect.js");
load("src/core/PointParameterWriter.js");
load("src/core/ClipParameterWriter.js");
load("src/core/ParameterWriter.js");
load("src/core/MotionWriteTest.js");
load("src/core/ConfirmedParameterWrites.js");
load("src/core/ActionRegistry.js");
load("src/core/KeyframeEngine.js");
load("src/core/CommandPreview.js");
load("src/core/SafeNumericTestValue.js");
load("src/core/TerminalRegistryAudit.js");
load("src/core/TerminalExhaustiveHarness.js");
load("src/core/TerminalParameterIntelligence.js");
load("src/core/TerminalProductionReadinessAudit.js");
load("src/core/TerminalCapabilityRegistry.js");
load("src/core/TerminalClipCapability.js");
load("src/core/TerminalMotionCapability.js");
load("src/core/TerminalTransitionCapability.js");
load("src/core/TerminalCapabilityResearchHarness.js");
load("src/core/TerminalProductionRegistry.js");
load("src/core/TerminalProductionExecutor.js");
load("src/core/TerminalEffectDiscovery.js");
load("src/core/PanelEntitlement.js");
load("src/core/TerminalPromotionPipeline.js");
load("src/core/ResearchBaselineCleanup.js");
load("src/panel/ui/EffectIconResolver.js");
load("src/panel/ui/EffectIcons.js");
load("src/panel/ui/EffectCatalogBrowse.js");
load("src/panel/ui/ClipControlCatalog.js");
load("src/panel/ui/CommandPaletteState.js");
load("src/panel/ui/PaletteFlow.js");
load("src/panel/ui/PaletteKeyboard.js");
load("src/panel/ui/EffectIndexState.js");
load("src/panel/ui/ShortcutStore.js");
load("src/panel/ui/RecentStore.js");
load("src/panel/js/CepKeyInterest.js");
load("src/panel/ui/TerminalKeyboardShortcut.js");
load("src/panel/ui/CustomerSettingsCopy.js");
load("src/panel/js/GlobalLauncher.js");
load("src/panel/bootstrap/PickFXNativeHelperBridge.js");
load("src/panel/js/LauncherRuntime.js");
load("src/panel/js/EntitlementClient.js");
load("src/premiere/PremiereBridge.js");
load("src/core/ActionExecutor.js");
load("src/core/PresetCapability.js");
load("src/core/PresetSchema.js");
load("src/core/PresetSearch.js");
load("src/core/PresetCapture.js");
load("src/core/PresetExecutor.js");
load("src/core/PresetHost.js");
load("src/panel/ui/PresetStore.js");
load("src/core/NumericCandidateClassifier.js");
load("src/core/ParameterCapability.js");
load("src/core/UniversalParameterInspect.js");
load("src/core/EffectRegistryDiscovery.js");
load("src/core/EffectRegistryBuilder.js");
load("src/core/UniversalParameterResolver.js");
load("src/core/NumberParameterWriter.js");
load("src/core/BooleanParameterWriter.js");
load("src/core/ColorParameterWriter.js");
load("src/core/EnumParameterWriter.js");
load("src/core/StringParameterWriter.js");
load("src/core/UniversalParameterWriter.js");
load("src/core/NumericCandidateScan.js");
load("src/core/ParameterWriteTest.js");
load("src/core/ColorWriteTestWiring.js");
load("src/core/ColorParameterDiscover.js");
load("src/core/LumetriPicker.js");
load("src/core/LumetriInstanceIdentityInspect.js");
load("src/core/ColorParameterWriteTest.js");
load("src/core/AudioWriteTestWiring.js");
load("src/core/AudioParameterDiscover.js");
load("src/core/AudioParameterWriteTest.js");
load("src/core/AudioLevelCapabilityProbe.js");
load("src/core/EnumWriteTestWiring.js");
load("src/core/EnumParameterDiscover.js");
load("src/core/EnumParameterWriteTest.js");
load("src/core/BlendModeDiagnostic.js");
load("tests/parameter-engine.cases.js");
load("tests/premiere-bridge.cases.js");
load("tests/command-routing.cases.js");
load("tests/command-preview.cases.js");
load("tests/command-palette-state.cases.js");
load("tests/typed-candidate.cases.js");
load("tests/boolean-candidate-inspect.cases.js");
load("tests/boolean-write-test.cases.js");
load("tests/batch-numeric.cases.js");
load("tests/point-value.cases.js");
load("tests/clip-parameter.cases.js");
load("tests/motion-write-test.cases.js");
load("tests/universal-parameter.cases.js");
load("tests/universal-parameter-v2.cases.js");
load("tests/crop-parameter.cases.js");
load("tests/color-parameter.cases.js");
load("tests/lumetri-instance-identity.cases.js");
load("tests/lumetri-picker.cases.js");
load("tests/lumetri-command-e2e.cases.js");
load("tests/audio-parameter.cases.js");
load("tests/enum-parameter.cases.js");
load("tests/blend-mode-diagnostic.cases.js");
load("tests/effect-registry-discovery.cases.js");
load("tests/effect-registry-builder.cases.js");
load("tests/terminal-command-resolver.cases.js");
load("tests/terminal-research-harness.cases.js");
load("tests/terminal-registry-audit.cases.js");
load("tests/terminal-exhaustive-harness.cases.js");
load("tests/terminal-parameter-intelligence.cases.js");
load("tests/terminal-production-readiness-audit.cases.js");
load("tests/terminal-capability.cases.js");
load("tests/terminal-production.cases.js");
load("tests/terminal-effect-discovery.cases.js");
load("tests/terminal-promotion-pipeline.cases.js");
load("tests/research-baseline-cleanup.cases.js");
load("tests/terminal-production-v2.cases.js");
load("tests/terminal-customer-catalog.cases.js");
load("tests/panel-entitlement.cases.js");
load("tests/customer-ui-polish.cases.js");
load("tests/global-launcher.cases.js");
load("tests/native-helper-bridge.cases.js");
load("tests/lumetri-terminal.cases.js");
load("tests/palette-flow.cases.js");
load("tests/palette-keyboard.cases.js");
load("tests/cep-key-interest.cases.js");
load("tests/effect-index-state.cases.js");
load("tests/parameter-readback.cases.js");
load("tests/shortcut-store.cases.js");
load("tests/keyboard-palette.cases.js");
load("tests/effect-catalog-browse.cases.js");
load("tests/clip-control-catalog.cases.js");
load("tests/action-registry.cases.js");
load("tests/keyframe-engine.cases.js");
load("tests/preset.cases.js");
vm.runInContext(
	'print("passed " + passed + "  failed " + failed); if (failed) { throw new Error(failed + " tests failed"); }',
	context
);
