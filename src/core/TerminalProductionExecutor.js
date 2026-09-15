var TerminalProductionExecutor = (function () {
	function fail(reason, detail, extra) {
		var payload = {
			ok: false,
			command: true,
			productionTerminal: true,
			reason: reason,
			status: detail || reason,
			verified: false
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					payload[key] = extra[key];
				}
			}
		}
		payload.ok = false;
		payload.command = true;
		payload.productionTerminal = true;
		payload.reason = reason;
		payload.status = detail || reason;
		payload.verified = false;
		return payload;
	}

	function clipsAllVerified(payload) {
		var clips = payload && payload.clips;
		var i;
		if (!clips || !clips.length) {
			return false;
		}
		for (i = 0; i < clips.length; i++) {
			if (!clips[i] || clips[i].ok !== true || clips[i].verified !== true) {
				return false;
			}
		}
		return true;
	}

	function isVerifiedEffectPayload(payload) {
		if (!payload) {
			return false;
		}
		if (payload.ok === true && payload.verified === true && payload.targetLocked === true) {
			return true;
		}
		return payload.targetLocked === true && clipsAllVerified(payload);
	}

	function finishEffect(payload, resolution, done) {
		var effect = resolution.resolvedEffect;
		var parameter = resolution.resolvedParameter;
		if (!isVerifiedEffectPayload(payload)) {
			done(fail(
				(payload && payload.reason) ||
					(payload && payload.targetLocked !== true
						? "TARGET_NOT_LOCKED"
						: "VALUE_NOT_VERIFIED"),
				(payload && (payload.detail || payload.status || payload.error)) ||
					"Effect value or target could not be verified.",
				payload || {}
			));
			return;
		}
		payload.ok = true;
		payload.verified = true;
		payload.targetLocked = true;
		payload.command = true;
		payload.productionTerminal = true;
		payload.effect = effect.displayName;
		payload.parameter = parameter.displayName;
		payload.value = resolution.value;
		payload.requestedValue = resolution.value;
		done(payload);
	}

	function isLumetriEffect(effect) {
		if (!effect) {
			return false;
		}
		if (effect.matchName === "AE.ADBE Lumetri") {
			return true;
		}
		return effect.displayName === "Lumetri Color" ||
			effect.premiereName === "Lumetri Color";
	}

	function finishApply(payload, resolution, done) {
		var effect = resolution.resolvedEffect;
		if (!payload || !payload.ok || payload.verified !== true ||
				payload.targetLocked !== true) {
			done(fail(
				(payload && payload.reason) ||
					(payload && payload.targetLocked !== true
						? "TARGET_NOT_LOCKED"
						: "EFFECT_NOT_FOUND"),
				(payload && (payload.detail || payload.status)) ||
					"Lumetri Color could not be applied to the selected clip.",
				payload || {}
			));
			return;
		}
		if (payload.matchName && payload.matchName !== "AE.ADBE Lumetri") {
			done(fail(
				"EFFECT_IDENTITY_MISMATCH",
				"Applied effect identity was not AE.ADBE Lumetri.",
				payload
			));
			return;
		}
		payload.command = true;
		payload.productionTerminal = true;
		payload.applyOnly = true;
		payload.effect = effect.displayName;
		payload.matchName = payload.matchName || effect.matchName;
		done(payload);
	}

	function runEffect(csInterface, resolution, done) {
		var effect;
		var parameter;
		if (!resolution || resolution.type !== "EFFECT" ||
				resolution.productionVerified !== true) {
			done(fail("COMMAND_NOT_PROMOTED", "Command is not production-verified."));
			return;
		}
		effect = resolution.resolvedEffect;
		parameter = resolution.resolvedParameter;
		if (!effect) {
			done(fail("PARAMETER_NOT_PROMOTED", "Parameter is not production-verified."));
			return;
		}
		if (resolution.applyOnly === true) {
			if (!isLumetriEffect(effect)) {
				done(fail("VALUE_REQUIRED", "A value is required for a production terminal command."));
				return;
			}
			if (typeof PremiereBridge === "undefined" ||
					typeof PremiereBridge.ensureVerifiedTerminalEffect !== "function") {
				done(fail("SAFE_EXECUTOR_UNAVAILABLE", "Verified effect applicator is unavailable."));
				return;
			}
			PremiereBridge.ensureVerifiedTerminalEffect(
				csInterface,
				effect.premiereName,
				effect.matchName || "AE.ADBE Lumetri",
				function (payload) {
					finishApply(payload, resolution, done);
				}
			);
			return;
		}
		if (!parameter || parameter.productionReady !== true) {
			done(fail("PARAMETER_NOT_PROMOTED", "Parameter is not production-verified."));
			return;
		}
		if (typeof PremiereBridge === "undefined" ||
				typeof PremiereBridge.setVerifiedTerminalEffectParameter !== "function") {
			done(fail("SAFE_EXECUTOR_UNAVAILABLE", "Verified effect executor is unavailable."));
			return;
		}
		PremiereBridge.setVerifiedTerminalEffectParameter(
			csInterface,
			effect.premiereName,
			effect.matchName || "",
			parameter.displayName,
			resolution.value,
			function (payload) {
				finishEffect(payload, resolution, done);
			},
			parameter.index
		);
	}

	function motionSpec(resolution) {
		var entry = resolution.productionEntry;
		var value = entry.valueType === "point"
			? [resolution.x, resolution.y]
			: resolution.value;
		return {
			isClipParameter: true,
			parameterQuery: entry.parameterDisplayName,
			componentMatchName: entry.componentMatchName,
			expectedType: entry.valueType === "point" ? "point2d" : "number",
			value: value,
			numbers: entry.valueType === "point"
				? [resolution.x, resolution.y]
				: [resolution.value],
			productionCapabilityId: entry.id,
			productionVerified: true
		};
	}

	function runMotion(csInterface, resolution, done) {
		var spec;
		if (!resolution || resolution.type !== "MOTION" ||
				resolution.productionVerified !== true ||
				!resolution.productionEntry ||
				resolution.productionEntry.writerPath !==
					"ConfirmedParameterWrites.write") {
			done(fail("COMMAND_NOT_PROMOTED", "Motion command is not production-verified."));
			return;
		}
		if (typeof CommandExecutor === "undefined" ||
				typeof CommandExecutor.runClipParameter !== "function") {
			done(fail("SAFE_EXECUTOR_UNAVAILABLE", "Confirmed parameter writer is unavailable."));
			return;
		}
		spec = motionSpec(resolution);
		CommandExecutor.runClipParameter(csInterface, spec, function (payload) {
			if (!isVerifiedEffectPayload(payload)) {
				done(fail(
					(payload && payload.reason) ||
						(payload && payload.targetLocked !== true
							? "TARGET_NOT_LOCKED"
							: "VALUE_NOT_VERIFIED"),
					(payload && (payload.detail || payload.status)) ||
						"Motion value or target could not be verified.",
					payload || {}
				));
				return;
			}
			payload.ok = true;
			payload.verified = true;
			payload.targetLocked = true;
			payload.command = true;
			payload.productionTerminal = true;
			payload.capabilityId = resolution.productionEntry.id;
			done(payload);
		});
	}

	function dispatch(csInterface, resolution, options, done) {
		if (options && options.entitlementState &&
				options.entitlementState !== "LIFETIME" &&
				options.entitlementState !== "MONTHLY_ACTIVE") {
			done(fail("ENTITLEMENT_INACTIVE", "PickFX access is inactive."));
			return;
		}
		if (!options || options.featureEnabled !== true) {
			done(fail("FEATURE_DISABLED", "Production terminal is disabled."));
			return;
		}
		if (!resolution || resolution.productionVerified !== true) {
			done(fail("COMMAND_NOT_PROMOTED", "Command is not in the production registry."));
			return;
		}
		if (resolution.type === "EFFECT") {
			runEffect(csInterface, resolution, done);
			return;
		}
		if (resolution.type === "MOTION") {
			runMotion(csInterface, resolution, done);
			return;
		}
		done(fail("CAPABILITY_NOT_PROMOTED", "Capability is not executable."));
	}

	return {
		motionSpec: motionSpec,
		runEffect: runEffect,
		runMotion: runMotion,
		dispatch: dispatch,
		isLumetriEffect: isLumetriEffect
	};
}());

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalProductionExecutor;
}
