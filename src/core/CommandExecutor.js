var CommandExecutor = (function () {
	function fail(reason, status, extra) {
		var payload = {
			ok: false,
			command: true,
			reason: typeof ParameterEngine !== "undefined" && ParameterEngine.normalizeReason
				? ParameterEngine.normalizeReason(reason)
				: reason,
			status: status
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

	function findParamByDisplayName(parameters, parameterName) {
		var wanted = String(parameterName || "").replace(/^\s+|\s+$/g, "").toLowerCase();
		var i;
		var param;
		var name;
		var found = null;
		if (!wanted || !parameters || !parameters.length) {
			return null;
		}
		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			name = param && param.displayName ? String(param.displayName).replace(/^\s+|\s+$/g, "").toLowerCase() : "";
			if (!name || name !== wanted) {
				continue;
			}
			if (found) {
				return null;
			}
			found = param;
		}
		return found;
	}

	function copyNumericRuntime(target, written) {
		if (!target || !written) {
			return target;
		}
		if (written.clips) {
			target.clips = written.clips;
		}
		if (written.summary) {
			target.summary = written.summary;
		}
		if (written.selectedCount !== undefined) {
			target.selectedCount = written.selectedCount;
		}
		if (written.successfulCount !== undefined) {
			target.successfulCount = written.successfulCount;
		}
		if (written.failedCount !== undefined) {
			target.failedCount = written.failedCount;
		}
		if (written.verifiedCount !== undefined) {
			target.verifiedCount = written.verifiedCount;
		}
		if (written.batch !== undefined) {
			target.batch = written.batch;
		}
		if (written.debugSelection) {
			target.debugSelection = written.debugSelection;
		}
		if (written.runtime) {
			target.runtime = written.runtime;
		}
		if (written.clipParameter !== undefined) {
			target.clipParameter = written.clipParameter;
		}
		if (written.parameterType) {
			target.parameterType = written.parameterType;
		}
		if (written.originalValue !== undefined) {
			target.originalValue = written.originalValue;
		}
		if (written.timeVarying !== undefined) {
			target.timeVarying = written.timeVarying;
		}
		if (written.keyframesSupported !== undefined) {
			target.keyframesSupported = written.keyframesSupported;
		}
		if (written.scope) {
			target.scope = written.scope;
		}
		if (written.component) {
			target.component = written.component;
		}
		if (written.usedQE !== undefined) {
			target.usedQE = written.usedQE;
		}
		if (written.method) {
			target.method = written.method;
		}
		if (written.verified !== undefined) {
			target.verified = written.verified;
		}
		if (written.productionEnabled !== undefined) {
			target.productionEnabled = written.productionEnabled;
		}
		if (written.uiKind) {
			target.uiKind = written.uiKind;
		}
		if (written.componentMatchCount !== undefined) {
			target.componentMatchCount = written.componentMatchCount;
		}
		if (written.matchCount !== undefined) {
			target.matchCount = written.matchCount;
		}
		if (written.settersCalled !== undefined) {
			target.settersCalled = written.settersCalled;
		}
		if (written.choices) {
			target.choices = written.choices;
		}
		if (written.picker) {
			target.picker = written.picker;
		}
		if (written.reResolved !== undefined) {
			target.reResolved = written.reResolved;
		}
		if (written.detail) {
			target.detail = written.detail;
		}
		return target;
	}

	function isBatchWrite(written) {
		if (!written) {
			return false;
		}
		if (typeof BatchNumericExecutor !== "undefined" && BatchNumericExecutor.isBatchResult) {
			return BatchNumericExecutor.isBatchResult(written);
		}
		if (written.batch === true) {
			return true;
		}
		if (typeof written.selectedCount === "number" && written.selectedCount > 1) {
			return true;
		}
		if (written.clips && written.clips.length > 1) {
			return true;
		}
		return false;
	}

	function isLumetriPickerWrite(written) {
		if (typeof LumetriPicker !== "undefined" && LumetriPicker.isPickerPayload) {
			return LumetriPicker.isPickerPayload(written);
		}
		return !!(written && (written.uiKind === "choose-lumetri" || written.uiKind === "choose-parameter"));
	}

	function finishNumericWrite(written, effectLabel, parameterName, value, done) {
		var shaped;
		var batchPayload;
		if (isLumetriPickerWrite(written)) {
			done(copyNumericRuntime({
				ok: false,
				command: true,
				clipParameter: true,
				reason: written.reason,
				uiKind: written.uiKind,
				choices: written.choices || [],
				picker: written.picker,
				matchCount: written.matchCount,
				componentMatchCount: written.componentMatchCount,
				settersCalled: false,
				verified: false,
				usedQE: false,
				effect: written.effect || effectLabel,
				parameter: written.parameter || parameterName,
				value: value,
				requestedValue: value
			}, written));
			return;
		}
		if (written && written.reason === "NO_VIDEO_SELECTION") {
			done(copyNumericRuntime(fail("NO_VIDEO_SELECTION", "Select a video clip first."), written));
			return;
		}
		if (isBatchWrite(written) && typeof BatchNumericExecutor !== "undefined" && BatchNumericExecutor.toCommandPayload) {
			batchPayload = BatchNumericExecutor.toCommandPayload(written, {
				effect: effectLabel,
				parameter: parameterName,
				value: value,
				clipParameter: written.clipParameter === true,
				parameterType: written.parameterType,
				type: written.type || written.parameterType,
				status: typeof ParameterEngine !== "undefined" && ParameterEngine.statusFor
					? ParameterEngine.statusFor(written.reason || "WRITE_FAILED")
					: undefined
			});
			if (!batchPayload.ok && batchPayload.status === batchPayload.reason && typeof ParameterEngine !== "undefined" && ParameterEngine.statusFor) {
				batchPayload.status = ParameterEngine.statusFor(batchPayload.reason);
			}
			copyNumericRuntime(batchPayload, written);
			if (!batchPayload.runtime) {
				batchPayload.runtime = {};
			}
			batchPayload.runtime.commandExecutorEnteredBatch = true;
			done(batchPayload);
			return;
		}
		if (written && written.reason === "PARAMETER_NOT_FOUND") {
			done(copyNumericRuntime(fail("PARAMETER_NOT_FOUND", "Parameter not found."), written));
			return;
		}
		if (typeof ParameterEngine !== "undefined" && ParameterEngine.commandFromWrite) {
			shaped = ParameterEngine.commandFromWrite(written, {
				effect: effectLabel,
				parameter: parameterName,
				value: value,
				requestedValue: value,
				type: (written && (written.type || written.parameterType)) || "number"
			});
			if (!shaped.ok) {
				done(copyNumericRuntime(fail(
					shaped.reason,
					shaped.status || (written && written.detail) || "Could not write parameter.",
					{
						effect: effectLabel,
						parameter: parameterName,
						detail: shaped.detail
					}
				), written));
				return;
			}
			copyNumericRuntime(shaped, written);
			if (!shaped.runtime) {
				shaped.runtime = {};
			}
			shaped.runtime.commandExecutorEnteredBatch = false;
			done(shaped);
			return;
		}
		if (!written || !written.ok) {
			done(copyNumericRuntime(fail(
				(written && written.reason) || "WRITE_FAILED",
				(written && written.detail) || "Could not write parameter.",
				{
					effect: effectLabel,
					parameter: parameterName
				}
			), written));
			return;
		}
		done(copyNumericRuntime({
			ok: true,
			command: true,
			effect: written.effect || effectLabel,
			parameter: written.parameter || parameterName,
			value: value,
			requestedValue: value,
			actualValue: written.readBack,
			verified: written.verified !== false,
			type: written.type || "number",
			method: written.method || written.methodUsed || "setValue(value, true)",
			oldValue: written.oldValue,
			readBack: written.readBack
		}, written));
	}

	function clipInputFromSpec(spec) {
		var input = {
			numbers: spec && spec.numbers ? spec.numbers : [],
			booleanValue: spec && spec.booleanValue,
			value: spec && spec.value
		};
		if ((!input.numbers || !input.numbers.length) && typeof spec.value === "number") {
			input.numbers = [spec.value];
		}
		if ((!input.numbers || !input.numbers.length) && spec.value && typeof spec.value.length === "number" && spec.value.length === 2) {
			input.numbers = [spec.value[0], spec.value[1]];
		}
		if ((!input.numbers || !input.numbers.length) && spec.value && typeof spec.value.x === "number") {
			input.numbers = [spec.value.x, spec.value.y];
		}
		if (typeof spec.lumetriComponentIndex === "number") {
			input.lumetriComponentIndex = spec.lumetriComponentIndex;
		}
		if (typeof spec.lumetriParameterIndex === "number") {
			input.lumetriParameterIndex = spec.lumetriParameterIndex;
		}
		if (spec.lumetriHierarchyPath) {
			input.lumetriHierarchyPath = spec.lumetriHierarchyPath;
		}
		return input;
	}

	function runClipParameter(csInterface, spec, done) {
		var parameterName;
		var input;
		if (!spec || !spec.parameterQuery) {
			done(fail("PARAMETER_NOT_FOUND", "Parameter not found."));
			return;
		}
		parameterName = spec.parameterQuery;
		if (spec.reason === "INVALID_VALUE") {
			done(fail("INVALID_VALUE", "Invalid value.", {
				parameter: parameterName,
				clipParameter: true
			}));
			return;
		}
		if (typeof SpeedOperation !== "undefined" && SpeedOperation.isSpeedCommand && SpeedOperation.isSpeedCommand(parameterName)) {
			done(SpeedOperation.unsupportedWrite());
			return;
		}
		input = clipInputFromSpec(spec);
		if (typeof ParameterEngine !== "undefined" && typeof ParameterEngine.setParameter === "function") {
			ParameterEngine.setParameter(csInterface, {
				scope: "clip",
				parameterName: parameterName,
				value: input,
				expectedType: spec.expectedType || "unknown"
			}, function (written) {
				finishNumericWrite(written, "", parameterName, spec.value, done);
			});
			return;
		}
		if (typeof PremiereBridge !== "undefined" && PremiereBridge.setClipParameter) {
			PremiereBridge.setClipParameter(csInterface, parameterName, input, spec.expectedType || "", function (written) {
				finishNumericWrite(written, "", parameterName, spec.value, done);
			});
			return;
		}
		done(fail("WRITE_FAILED", "Could not write parameter."));
	}

	function finishTypedWrite(written, effectLabel, parameterName, resolved, done) {
		var shaped;
		var displayValue = resolved && resolved.displayValue !== undefined ? resolved.displayValue : (resolved && resolved.value);
		if (written && written.reason === "NO_VIDEO_SELECTION") {
			done(fail("NO_VIDEO_SELECTION", "Select a video clip first."));
			return;
		}
		if (written && written.reason === "PARAMETER_NOT_FOUND") {
			done(fail("PARAMETER_NOT_FOUND", "Parameter not found."));
			return;
		}
		if (typeof ParameterEngine !== "undefined" && ParameterEngine.commandFromWrite) {
			shaped = ParameterEngine.commandFromWrite(written, {
				effect: effectLabel,
				parameter: parameterName,
				value: displayValue,
				requestedValue: resolved && resolved.value,
				type: resolved && resolved.type
			});
			if (!shaped.ok) {
				done(fail(
					shaped.reason,
					shaped.status || "Value could not be verified.",
					{
						effect: effectLabel,
						parameter: parameterName
					}
				));
				return;
			}
			done(shaped);
			return;
		}
		if (!written || !written.ok || !written.verified) {
			done(fail(
				(written && written.reason) || "VALUE_NOT_VERIFIED",
				"Value could not be verified.",
				{
					effect: effectLabel,
					parameter: parameterName
				}
			));
			return;
		}
		done({
			ok: true,
			command: true,
			effect: written.effect || effectLabel,
			parameter: written.parameter || parameterName,
			value: displayValue,
			requestedValue: resolved && resolved.value,
			actualValue: written.readBack,
			verified: true,
			type: (resolved && resolved.type) || written.type,
			method: written.method || written.methodUsed || "setValue(value, true)",
			oldValue: written.oldValue,
			readBack: written.readBack
		});
	}

	function listThenWrite(csInterface, effect, value, parameterName, done, alreadyApplied) {
		PremiereBridge.listEffectParameters(csInterface, effect.premiereName, function (listed) {
			var picked;
			var effectLabel;

			if (listed && listed.reason === "NO_VIDEO_SELECTION") {
				done(fail("NO_VIDEO_SELECTION", "Select a video clip first."));
				return;
			}

			if (!listed || !listed.ok) {
				if (!alreadyApplied && listed && listed.reason === "EFFECT_NOT_FOUND") {
					if (typeof PremiereBridge.ensureEffectOnSelection === "function") {
						PremiereBridge.ensureEffectOnSelection(csInterface, effect.premiereName, function (ensured) {
							if (ensured && ensured.reason === "NO_VIDEO_SELECTION") {
								done(fail("NO_VIDEO_SELECTION", "Select a video clip first."));
								return;
							}
							listThenWrite(csInterface, effect, value, parameterName, done, true);
						});
						return;
					}
					EffectExecutor.applyEffect(csInterface, effect.premiereName, function (applied) {
						if (applied && applied.reason === "NO_VIDEO_SELECTION") {
							done(fail("NO_VIDEO_SELECTION", "Select a video clip first."));
							return;
						}
						if (!applied || !applied.ok || !applied.applied) {
							done(applied || fail("APPLY_FAILED", "Could not apply effect."));
							return;
						}
						listThenWrite(csInterface, effect, value, parameterName, done, true);
					});
					return;
				}
				done(fail(
					parameterName ? "PARAMETER_NOT_FOUND" : "NO_NUMERIC_PARAMETER",
					alreadyApplied
						? (parameterName ? "Parameter not found." : "Could not find a writable numeric parameter.")
						: "Effect not found."
				));
				return;
			}

			effectLabel = (listed.effect && listed.effect.displayName) ? listed.effect.displayName : effect.name;
			if (parameterName) {
				picked = findParamByDisplayName(listed.parameters, parameterName);
				if (!picked || !picked.displayName) {
					done(fail("PARAMETER_NOT_FOUND", "Parameter not found."));
					return;
				}
			} else {
				picked = NumericParameterPicker.pick(effectLabel, listed.parameters);
				if (!picked || !picked.displayName) {
					done(fail("NO_NUMERIC_PARAMETER", "Could not find a writable numeric parameter."));
					return;
				}
			}

			if (picked.type === "boolean" || picked.type === "enum") {
				writeTypedValue(csInterface, effect, picked, String(value), effectLabel, done);
				return;
			}

			if (typeof ParameterEngine !== "undefined" && !ParameterEngine.inRange(picked, value)) {
				done(fail("VALUE_OUT_OF_RANGE", "Value out of range.", {
					effect: effectLabel,
					parameter: picked.displayName
				}));
				return;
			}

			if (typeof ParameterEngine !== "undefined" && typeof ParameterEngine.setParameter === "function") {
				ParameterEngine.setParameter(csInterface, {
					effectName: effect.premiereName,
					parameterName: picked.displayName,
					value: value,
					expectedType: picked.type === "angle" ? "angle" : "number"
				}, function (written) {
					finishNumericWrite(written, effectLabel, picked.displayName, value, done);
				});
				return;
			}

			PremiereBridge.setParameter(
				csInterface,
				effect.premiereName,
				picked.displayName,
				value,
				function (written) {
					finishNumericWrite(written, effectLabel, picked.displayName, value, done);
				}
			);
		});
	}

	function run(csInterface, effect, value, parameterName, done) {
		if (!effect || !effect.premiereName) {
			done(fail("EFFECT_NOT_FOUND", "Effect not found."));
			return;
		}
		if (typeof value !== "number" || !isFinite(value)) {
			done(fail("INVALID_VALUE", "Invalid value."));
			return;
		}
		listThenWrite(csInterface, effect, value, parameterName || "", done, false);
	}

	function writeTypedValue(csInterface, effect, metadata, rawValue, effectLabel, done) {
		var resolved;
		if (typeof ParameterValueParser === "undefined" || typeof ParameterValueResolver === "undefined") {
			done(fail("TYPE_NOT_WRITABLE", "Parameter type not writable yet."));
			return;
		}
		resolved = ParameterValueResolver.resolve(metadata, rawValue);
		if (!resolved || !resolved.ok) {
			done(fail(
				(resolved && resolved.reason) || "INVALID_VALUE",
				(resolved && resolved.status) || "Invalid value.",
				{
					effect: effectLabel,
					parameter: metadata.displayName,
					type: resolved && resolved.type,
					value: resolved && resolved.value
				}
			));
			return;
		}
		if (!resolved.write || (resolved.type !== "boolean" && resolved.type !== "enum")) {
			done(fail("TYPE_NOT_WRITABLE", "Parameter type not writable yet.", {
				effect: effectLabel,
				parameter: metadata.displayName,
				type: resolved.type,
				value: resolved.value
			}));
			return;
		}
		if (typeof PremiereBridge.setTypedParameter !== "function") {
			done(fail("UNSUPPORTED_TYPE", "Parameter type not writable yet."));
			return;
		}
		if (typeof ParameterEngine !== "undefined" && typeof ParameterEngine.setParameter === "function") {
			ParameterEngine.setParameter(csInterface, {
				effectName: effect.premiereName,
				parameterName: metadata.displayName,
				value: resolved.value,
				expectedType: resolved.type,
				expectedLabel: resolved.type === "enum" ? String(resolved.displayValue || "") : ""
			}, function (written) {
				finishTypedWrite(written, effectLabel, metadata.displayName, resolved, done);
			});
			return;
		}
		PremiereBridge.setTypedParameter(
			csInterface,
			effect.premiereName,
			metadata.displayName,
			resolved.value,
			resolved.type,
			resolved.type === "enum" ? String(resolved.displayValue || "") : "",
			function (written) {
				finishTypedWrite(written, effectLabel, metadata.displayName, resolved, done);
			}
		);
	}

	function runTyped(csInterface, effect, leftover, done, alreadyApplied) {
		if (!effect || !effect.premiereName) {
			done(fail("EFFECT_NOT_FOUND", "Effect not found."));
			return;
		}
		if (typeof ParameterValueParser === "undefined" || typeof ParameterValueResolver === "undefined") {
			done(fail("INVALID_VALUE", "Invalid value."));
			return;
		}

		PremiereBridge.listEffectParameters(csInterface, effect.premiereName, function (listed) {
			var matched;
			var resolved;
			var effectLabel;

			if (listed && listed.reason === "NO_VIDEO_SELECTION") {
				done(fail("NO_VIDEO_SELECTION", "Select a video clip first."));
				return;
			}

			if (!listed || !listed.ok) {
				done(fail(
					(listed && listed.reason) || "EFFECT_NOT_FOUND",
					listed && listed.reason === "NO_VIDEO_SELECTION"
						? "Select a video clip first."
						: (listed && listed.reason === "EFFECT_NOT_FOUND"
							? "Effect not found."
							: "Parameter not found.")
				));
				return;
			}

			effectLabel = (listed.effect && listed.effect.displayName) ? listed.effect.displayName : effect.name;
			matched = ParameterValueParser.matchNamedParameter(leftover, listed.parameters);
			if (!matched || !matched.parameter || !matched.parameter.displayName) {
				done(fail("PARAMETER_NOT_FOUND", "Parameter not found."));
				return;
			}
			if (!matched.rawValue) {
				done(fail("NOT_A_TYPED_COMMAND", "Invalid value."));
				return;
			}

			resolved = ParameterValueResolver.resolve(matched.parameter, matched.rawValue);
			if (!resolved || !resolved.ok) {
				done(fail(
					(resolved && resolved.reason) || "INVALID_VALUE",
					(resolved && resolved.status) || "Invalid value.",
					{
						effect: effectLabel,
						parameter: matched.parameter.displayName,
						type: resolved && resolved.type,
						value: resolved && resolved.value
					}
				));
				return;
			}

			if (resolved.type === "boolean" || resolved.type === "enum") {
				writeTypedValue(csInterface, effect, matched.parameter, matched.rawValue, effectLabel, done);
				return;
			}

			if (!resolved.write || (resolved.type !== "number" && resolved.type !== "angle")) {
				done(fail("UNSUPPORTED_TYPE", "Parameter type not writable yet.", {
					effect: effectLabel,
					parameter: matched.parameter.displayName,
					type: resolved.type,
					value: resolved.value
				}));
				return;
			}

			if (typeof ParameterEngine !== "undefined" && typeof ParameterEngine.setParameter === "function") {
				ParameterEngine.setParameter(csInterface, {
					effectName: effect.premiereName,
					parameterName: matched.parameter.displayName,
					value: resolved.value,
					expectedType: resolved.type
				}, function (written) {
					finishNumericWrite(written, effectLabel, matched.parameter.displayName, resolved.value, done);
				});
				return;
			}

			PremiereBridge.setParameter(
				csInterface,
				effect.premiereName,
				matched.parameter.displayName,
				resolved.value,
				function (written) {
					finishNumericWrite(written, effectLabel, matched.parameter.displayName, resolved.value, done);
				}
			);
		});
	}

	return {
		run: run,
		runTyped: runTyped,
		runClipParameter: runClipParameter
	};
}());
