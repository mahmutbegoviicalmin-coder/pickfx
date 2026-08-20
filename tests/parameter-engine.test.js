var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var context = {
	console: console,
	module: { exports: {} },
	$: {},
	print: function (msg) {
		console.log(msg);
	}
};
vm.createContext(context);

function load(rel) {
	vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), context, { filename: rel });
}

load("src/core/ParameterValueParser.js");
load("src/core/ParameterValueResolver.js");
load("src/core/ParameterEngine.js");
load("src/core/PointValue.js");
load("src/core/ParameterValueType.js");
load("src/core/SpeedOperation.js");
load("src/core/TypedCandidateClassifier.js");
load("src/core/BooleanCandidateInspect.js");
load("src/core/BooleanWriteTest.js");
load("src/core/BatchNumericExecutor.js");
load("src/core/NumericParameterPicker.js");
load("src/core/EffectSearch.js");
load("src/core/CommandParser.js");
load("src/core/CommandExecutor.js");
load("src/core/MotionParameterInspect.js");
load("src/core/PointParameterWriter.js");
load("src/core/ClipParameterWriter.js");
load("src/core/MotionWriteTest.js");
load("src/core/ConfirmedParameterWrites.js");
load("src/core/CommandPreview.js");
load("src/core/SafeNumericTestValue.js");
load("src/core/NumericCandidateClassifier.js");
load("src/core/ParameterCapability.js");
load("src/core/UniversalParameterInspect.js");
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
load("tests/command-routing.cases.js");
load("tests/command-preview.cases.js");
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
vm.runInContext(
	'print("passed " + passed + "  failed " + failed); if (failed) { throw new Error(failed + " tests failed"); }',
	context
);
