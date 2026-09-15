var TerminalCommandDispatcher = (function () {
	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			terminalResolver: true,
			reason: reason,
			status: detail || reason
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		return payload;
	}

	function dependencies(options) {
		return {
			effectExecutor: options && options.effectExecutor
				? options.effectExecutor
				: (typeof EffectExecutor !== "undefined" ? EffectExecutor : null),
			commandExecutor: options && options.commandExecutor
				? options.commandExecutor
				: (typeof CommandExecutor !== "undefined" ? CommandExecutor : null)
		};
	}

	function dispatch(csInterface, resolution, options, done) {
		var deps = dependencies(options);
		var effect;
		var parameter;
		if (typeof done !== "function") {
			return;
		}
		if (!options || options.featureEnabled !== true) {
			done(fail("TERMINAL_RESOLVER_DISABLED", "Terminal resolver is disabled."));
			return;
		}
		if (!resolution || resolution.ok !== true) {
			done(fail(
				(resolution && resolution.reason) || "COMMAND_UNRESOLVED",
				"Terminal command could not be resolved.",
				{ resolution: resolution || null }
			));
			return;
		}
		if (resolution.type === "transition") {
			done(fail(
				"TRANSITION_UNSUPPORTED",
				"Premiere transition application is not implemented.",
				{ resolution: resolution }
			));
			return;
		}
		effect = resolution.resolvedEffect;
		if (!effect || !effect.premiereName) {
			done(fail("EFFECT_NOT_FOUND", "Effect not found.", { resolution: resolution }));
			return;
		}
		if (!resolution.hasValue) {
			if (!deps.effectExecutor || typeof deps.effectExecutor.applyEffect !== "function") {
				done(fail("APPLY_FAILED", "Existing effect application path is unavailable."));
				return;
			}
			deps.effectExecutor.applyEffect(csInterface, effect.premiereName, function (payload) {
				if (payload && typeof payload === "object") {
					payload.terminalResolver = true;
					payload.resolvedEffect = effect;
					payload.executionPath = "EffectExecutor.applyEffect";
				}
				done(payload);
			});
			return;
		}
		parameter = resolution.parameter;
		if (!parameter || !parameter.displayName) {
			done(fail("NO_NUMERIC_PARAMETER", "No resolved numeric parameter.", {
				resolution: resolution
			}));
			return;
		}
		if (!deps.commandExecutor || typeof deps.commandExecutor.run !== "function") {
			done(fail("WRITE_FAILED", "Existing safe command path is unavailable."));
			return;
		}
		deps.commandExecutor.run(
			csInterface,
			effect,
			resolution.value,
			parameter.displayName,
			function (payload) {
				if (payload && payload.ok === true && payload.verified !== true) {
					done(fail("VALUE_NOT_VERIFIED", "Parameter write was not verified.", {
						resolution: resolution,
						writerPayload: payload
					}));
					return;
				}
				if (payload && typeof payload === "object") {
					payload.terminalResolver = true;
					payload.resolvedEffect = effect;
					payload.resolvedParameter = parameter;
					payload.executionPath = "CommandExecutor.run";
					payload.readBackRequired = true;
				}
				done(payload);
			}
		);
	}

	return {
		dispatch: dispatch
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalCommandDispatcher;
}
