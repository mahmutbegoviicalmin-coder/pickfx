(function () {
	var startCount = passed + failed;
	var Resolver = TerminalCommandResolver;
	var Dispatcher = TerminalCommandDispatcher;
	var Adapter = TerminalRegistryAdapter;

	function parameter(index, name, type, value, extra) {
		var result = {
			index: index,
			displayName: name,
			matchName: null,
			matchNameAvailable: false,
			valueType: type,
			currentValue: value,
			hasGetValue: true,
			hasSetValue: true,
			isTimeVarying: false,
			areKeyframesSupported: true
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					result[key] = extra[key];
				}
			}
		}
		return result;
	}

	function effect(name, parameters) {
		return {
			type: "video-effect",
			displayName: name,
			premiereName: name,
			matchName: "TEST." + name,
			status: "discovered",
			parameters: parameters || []
		};
	}

	var registry = {
		effects: [
			effect("Gaussian Blur", [
				parameter(0, "Seed", "number", 0),
				parameter(1, "Amount", "number", 20),
				parameter(2, "Thickness", "number", 20),
				parameter(3, "_ Applied Version", "number", 260300)
			]),
			effect("Directional Blur", [
				parameter(0, "Angle", "number", 0),
				parameter(1, "Amount", "number", 35),
				parameter(2, "Chromatic Aberration", "number", 0)
			]),
			effect("Camera Blur", [parameter(0, "Radius", "number", 10)]),
			effect("Radial Blur", [parameter(0, "Amount", "number", 10)]),
			effect("Sharpen", [parameter(0, "Sharpen Amount", "number", 0)]),
			effect("Black & White", [parameter(0, "Mix", "number", 100)]),
			effect("No Numeric", [parameter(0, "Enabled", "boolean", true)]),
			effect("Uncertain FX", [
				parameter(0, "Alpha", "number", 0),
				parameter(1, "Beta", "number", 0)
			]),
			effect("Double Amount", [
				parameter(0, "Amount", "number", 0),
				parameter(1, "Amount", "number", 0)
			])
		],
		transitions: [],
		transitionSupport: {
			available: false,
			reason: "TRANSITION_REGISTRY_UNAVAILABLE"
		}
	};
	var parsed;
	var resolved;
	var dispatched;
	var calls;
	var generated;
	var validated;
	var source;
	var research;
	var beforeResearch;
	var compiled;

	parsed = Resolver.parse("gaussian blur");
	assertEq("terminal parse name ok", parsed.ok, true);
	assertEq("terminal parse missing optional value", parsed.hasValue, false);
	assertEq("terminal parse multi-word query", parsed.query, "gaussian blur");

	resolved = Resolver.resolve("Gaussian Blur", registry);
	assertEq("terminal case-insensitive title input", resolved.ok, true);
	assertEq("terminal title resolves Gaussian Blur", resolved.resolvedEffect.displayName, "Gaussian Blur");

	resolved = Resolver.resolve("GAUSSIAN BLUR", registry);
	assertEq("terminal uppercase input", resolved.ok, true);

	resolved = Resolver.resolve("  gaussian---blur   12.5  ", registry);
	assertEq("terminal punctuation and whitespace normalization", resolved.ok, true);
	assertEq("terminal decimal value", resolved.value, 12.5);
	assertEq("terminal decimal resolves Amount", resolved.parameter.displayName, "Amount");

	resolved = Resolver.resolve("gaussian blur 30", registry);
	assertEq("terminal numeric command resolves", resolved.ok, true);
	assertEq("terminal integer value", resolved.value, 30);
	assertEq("terminal Gaussian parameter is Amount", resolved.parameter.displayName, "Amount");
	assertEq("terminal valued command requires read-back", resolved.execution.requiresReadBack, true);

	resolved = Resolver.resolve("directional blur 45", registry);
	assertEq("terminal Directional Blur resolves", resolved.ok, true);
	assertEq("terminal Directional parameter is Amount", resolved.parameter.displayName, "Amount");

	resolved = Resolver.resolve("directional blur -45", registry);
	assertEq("terminal negative numeric resolves", resolved.ok, true);
	assertEq("terminal negative value is not clamped", resolved.value, -45);

	resolved = Resolver.resolve("black white", registry);
	assertEq("terminal multi-word punctuation effect resolves", resolved.ok, true);
	assertEq("terminal ampersand normalization", resolved.resolvedEffect.displayName, "Black & White");

	resolved = Resolver.resolve("gausian blur", registry);
	assertEq("terminal fuzzy matching", resolved.ok, true);
	assertEq("terminal fuzzy target", resolved.resolvedEffect.displayName, "Gaussian Blur");

	resolved = Resolver.resolve("gauss", registry);
	assertEq("terminal partial matching", resolved.ok, true);
	assertEq("terminal partial target", resolved.resolvedEffect.displayName, "Gaussian Blur");

	resolved = Resolver.resolve("blur", registry);
	assertEq("terminal ambiguous effect rejected", resolved.reason, "AMBIGUOUS_EFFECT");
	assert("terminal ambiguous effect returns choices", resolved.candidates.length >= 3);

	resolved = Resolver.resolve("effect that does not exist", registry);
	assertEq("terminal nonexistent effect", resolved.reason, "EFFECT_NOT_FOUND");

	resolved = Resolver.resolve("gaussian blur", registry);
	assertEq("terminal no-value effect resolves", resolved.ok, true);
	assertEq("terminal no-value action apply only", resolved.execution.action, "apply");
	assertEq("terminal no-value parameter untouched", resolved.parameter, null);

	resolved = Resolver.resolve("sharpen 20", registry);
	assertEq("terminal one numeric parameter resolves", resolved.ok, true);
	assertEq("terminal unique parameter selected", resolved.parameter.displayName, "Sharpen Amount");

	resolved = Resolver.resolve("no numeric 20", registry);
	assertEq("terminal effect with no numeric parameter", resolved.reason, "NO_NUMERIC_PARAMETER");

	resolved = Resolver.resolve("uncertain fx 20", registry);
	assertEq("terminal multiple uncertain parameters rejected", resolved.reason, "AMBIGUOUS_PARAMETER");
	assertEq("terminal uncertain parameter choices", resolved.candidates.length, 2);

	resolved = Resolver.resolve("double amount 20", registry);
	assertEq("terminal tied scored parameters rejected", resolved.reason, "AMBIGUOUS_PARAMETER");

	assertEq("terminal empty input fails", Resolver.resolve("", registry).reason, "EMPTY_INPUT");
	assertEq("terminal number-only input fails", Resolver.resolve("30", registry).reason, "EFFECT_NAME_REQUIRED");
	assertEq("terminal malformed blur suffix fails", Resolver.resolve("blur abc", registry).reason, "EFFECT_NOT_FOUND");
	assertEq("terminal malformed Gaussian suffix is invalid value", Resolver.resolve("gaussian blur xyz", registry).reason, "INVALID_VALUE");

	resolved = Resolver.resolveTransition("cross dissolve", registry);
	assertEq("terminal transition unsupported without registry", resolved.reason, "TRANSITION_UNSUPPORTED");
	assertEq("terminal registry fabricates no transitions", registry.transitions.length, 0);

	resolved = Resolver.resolveTransition("cross dissolve", {
		transitions: [{
			type: "transition",
			displayName: "Cross Dissolve",
			premiereName: "Cross Dissolve"
		}]
	});
	assertEq("terminal future transition interface resolves supplied data", resolved.ok, true);
	assertEq("terminal transition execution remains unsupported", resolved.execution.supported, false);

	assertEq("terminal feature disabled by default constant", Resolver.FEATURE_ENABLED_BY_DEFAULT, false);
	assertEq("terminal feature disabled without options", Resolver.isFeatureEnabled(), false);
	assertEq("terminal feature disabled for stored false", Resolver.isFeatureEnabled({
		storage: { getItem: function () { return "false"; } }
	}), false);
	assertEq("terminal feature explicit opt-in", Resolver.isFeatureEnabled({ explicit: true }), true);
	assertEq("terminal feature stored opt-in", Resolver.isFeatureEnabled({
		storage: { getItem: function () { return "true"; } }
	}), true);

	calls = { apply: 0, write: 0 };
	Dispatcher.dispatch({}, Resolver.resolve("gaussian blur", registry), {
		featureEnabled: false,
		effectExecutor: {
			applyEffect: function () {
				calls.apply += 1;
			}
		},
		commandExecutor: {
			run: function () {
				calls.write += 1;
			}
		}
	}, function (payload) {
		dispatched = payload;
	});
	assertEq("terminal dispatcher blocks disabled feature", dispatched.reason, "TERMINAL_RESOLVER_DISABLED");
	assertEq("terminal disabled dispatcher performs no apply", calls.apply, 0);
	assertEq("terminal disabled dispatcher performs no write", calls.write, 0);

	calls = { apply: 0, write: 0 };
	Dispatcher.dispatch({}, Resolver.resolve("gaussian blur", registry), {
		featureEnabled: true,
		effectExecutor: {
			applyEffect: function (csInterface, name, done) {
				calls.apply += 1;
				calls.applyName = name;
				done({ ok: true, applied: 1 });
			}
		},
		commandExecutor: {
			run: function () {
				calls.write += 1;
			}
		}
	}, function (payload) {
		dispatched = payload;
	});
	assertEq("terminal no-value dispatch uses effect executor", calls.apply, 1);
	assertEq("terminal no-value dispatch effect name", calls.applyName, "Gaussian Blur");
	assertEq("terminal no-value dispatch avoids writer", calls.write, 0);
	assertEq("terminal no-value execution path", dispatched.executionPath, "EffectExecutor.applyEffect");

	calls = { apply: 0, write: 0 };
	Dispatcher.dispatch({}, Resolver.resolve("gaussian blur 30", registry), {
		featureEnabled: true,
		effectExecutor: {
			applyEffect: function () {
				calls.apply += 1;
			}
		},
		commandExecutor: {
			run: function (csInterface, targetEffect, value, parameterName, done) {
				calls.write += 1;
				calls.effect = targetEffect.premiereName;
				calls.value = value;
				calls.parameter = parameterName;
				done({ ok: true, verified: true, readBack: value });
			}
		}
	}, function (payload) {
		dispatched = payload;
	});
	assertEq("terminal valued dispatch uses existing command executor", calls.write, 1);
	assertEq("terminal valued dispatch does not separately apply", calls.apply, 0);
	assertEq("terminal valued dispatch effect", calls.effect, "Gaussian Blur");
	assertEq("terminal valued dispatch parameter", calls.parameter, "Amount");
	assertEq("terminal valued dispatch value", calls.value, 30);
	assertEq("terminal valued dispatch preserves verification", dispatched.verified, true);
	assertEq("terminal valued dispatch requires read-back", dispatched.readBackRequired, true);
	assertEq("terminal valued execution path", dispatched.executionPath, "CommandExecutor.run");

	Dispatcher.dispatch({}, Resolver.resolve("gaussian blur 30", registry), {
		featureEnabled: true,
		commandExecutor: {
			run: function (csInterface, targetEffect, value, parameterName, done) {
				done({ ok: true, verified: false, readBack: 29 });
			}
		}
	}, function (payload) {
		dispatched = payload;
	});
	assertEq("terminal dispatcher rejects unverified write", dispatched.reason, "VALUE_NOT_VERIFIED");

	Dispatcher.dispatch({}, {
		ok: true,
		type: "transition",
		resolvedTransition: { displayName: "Cross Dissolve" }
	}, {
		featureEnabled: true
	}, function (payload) {
		dispatched = payload;
	});
	assertEq("terminal dispatcher reports transitions unsupported", dispatched.reason, "TRANSITION_UNSUPPORTED");

	research = {
		schemaVersion: 1,
		source: "PickFX CEP Research Registry Builder",
		apiModel: "CEP_ExtendScript",
		generatedAt: "2026-08-22T00:00:00.000Z",
		effects: [{
			displayName: "Test Effect",
			matchName: "TEST.Effect",
			matchNameAvailable: true,
			status: "discovered",
			parameters: [parameter(0, "Amount", "number", 0)]
		}]
	};
	beforeResearch = JSON.stringify(research);
	compiled = Adapter.compile(research, { sha256: "abc" });
	assertEq("terminal adapter compiles research schema", compiled.ok, true);
	assertEq("terminal adapter does not mutate research input", JSON.stringify(research), beforeResearch);
	assertEq("terminal adapter creates no transitions", compiled.registry.transitions.length, 0);
	assertEq("terminal adapter rejects unsupported schema", Adapter.compile({
		schemaVersion: 2,
		source: research.source,
		effects: []
	}).reason, "REGISTRY_SCHEMA_UNSUPPORTED");

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot === "string") {
		source = fs.readFileSync(path.join(__pickfxRoot, "src/core/TerminalCommandResolver.js"), "utf8");
		assert("terminal resolver contains no direct setter call", source.indexOf("setValue") === -1);
		source = fs.readFileSync(path.join(__pickfxRoot, "src/core/TerminalCommandDispatcher.js"), "utf8");
		assert("terminal dispatcher contains no direct setter call", source.indexOf("setValue") === -1);
		assert("terminal dispatcher preserves existing command path", source.indexOf("CommandExecutor.run") !== -1);
		source = fs.readFileSync(path.join(__pickfxRoot, "src/panel/js/panel.js"), "utf8");
		assert("terminal panel uses production registry feature gate", source.indexOf("TerminalProductionRegistry.isFeatureEnabled") !== -1);
		assert("terminal panel integration does not default flag true", source.indexOf("__PICKFX_TERMINAL_RESOLVER_ENABLED__ = true") === -1);

		generated = JSON.parse(fs.readFileSync(
			path.join(__pickfxRoot, "src/data/terminal-registry.generated.json"),
			"utf8"
		));
		validated = Adapter.validateCompiled(generated);
		assertEq("terminal generated registry valid", validated.ok, true);
		assertEq("terminal generated effect count", validated.effectCount, 134);
		assertEq("terminal generated parameter count", validated.parameterCount, 2434);
		assertEq("terminal generated transition count", validated.transitionCount, 0);
		assertEq("terminal generated source schema", generated.sourceRegistry.schemaVersion, 1);
		assertEq("terminal generated source label", generated.sourceRegistry.source, "PickFX CEP Research Registry Builder");
		assertEq("terminal generated source hash length", generated.sourceRegistry.sha256.length, 64);

		resolved = Resolver.resolve("gaussian blur 30", generated);
		assertEq("terminal actual registry Gaussian resolves", resolved.ok, true);
		assertEq("terminal actual registry Gaussian parameter", resolved.parameter.displayName, "Amount");
		resolved = Resolver.resolve("directional blur 45", generated);
		assertEq("terminal actual registry Directional resolves", resolved.ok, true);
		assertEq("terminal actual registry Directional parameter", resolved.parameter.displayName, "Amount");
	}

	print("terminal resolver tests " + ((passed + failed) - startCount));
}());
