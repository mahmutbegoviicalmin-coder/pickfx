var BatchNumericExecutor = (function () {
	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function clipNameOf(clip) {
		if (!clip) {
			return "";
		}
		if (clip.clip) {
			return String(clip.clip);
		}
		if (clip.name) {
			return String(clip.name);
		}
		return "";
	}

	function failClip(clip, reason, detail, extra) {
		var row = {
			clip: clipNameOf(clip),
			ok: false,
			effectAlreadyExisted: extra && extra.existed === true,
			effectApplied: extra && extra.applied === true,
			parameterResolved: false,
			requestedValue: extra && extra.requestedValue,
			verified: false,
			reason: reason || "WRITE_FAILED",
			detail: detail ? String(detail) : ""
		};
		return row;
	}

	function fromWriterResult(written, clip, extra) {
		var verified;
		var ok;
		var reason;
		var parameterResolved;
		extra = extra || {};
		verified = !!(written && written.ok && written.verified);
		if (written && written.ok && written.verified === false) {
			reason = "VALUE_NOT_VERIFIED";
			ok = false;
		} else if (!written || !written.ok) {
			reason = (written && written.reason) || "WRITE_FAILED";
			ok = false;
		} else {
			reason = undefined;
			ok = verified;
		}
		parameterResolved = !!(written && written.parameter);
		return {
			clip: clipNameOf(clip),
			ok: ok,
			effectAlreadyExisted: extra.existed === true,
			effectApplied: extra.applied === true,
			parameterResolved: parameterResolved,
			requestedValue: extra.requestedValue,
			actualValue: written && (written.actualValue !== undefined ? written.actualValue : written.readBack),
			verified: verified,
			reason: ok ? undefined : reason,
			detail: ok ? undefined : (written && written.detail ? String(written.detail) : ""),
			value: written && (written.actualValue !== undefined ? written.actualValue : written.readBack),
			component: written && (written.component || written.effect),
			parameter: written && written.parameter,
			parameterType: written && (written.parameterType || written.type),
			method: written && written.method,
			usedQE: written && written.usedQE === true ? true : false,
			scope: written && written.scope ? written.scope : undefined,
			uiKind: written && written.uiKind ? written.uiKind : undefined,
			matchCount: written && written.matchCount,
			componentMatchCount: written && written.componentMatchCount,
			settersCalled: written && written.settersCalled === true,
			choices: written && written.choices,
			picker: written && written.picker,
			reResolved: written && written.reResolved === true
		};
	}

	function summarize(spec, clipResults) {
		var i;
		var row;
		var successful = 0;
		var failed = 0;
		var verifiedCount = 0;
		var firstFail;
		var payload;
		var selected = clipResults ? clipResults.length : 0;
		spec = spec || {};

		for (i = 0; i < selected; i++) {
			row = clipResults[i];
			if (row && row.ok && row.verified) {
				successful += 1;
				verifiedCount += 1;
			} else {
				failed += 1;
				if (!firstFail) {
					firstFail = row;
				}
			}
		}

		payload = {
			ok: selected > 0 && failed === 0,
			batch: selected > 1,
			command: true,
			effect: spec.effect || "",
			parameter: spec.parameter || "",
			requestedValue: spec.requestedValue,
			value: spec.requestedValue,
			summary: {
				selected: selected,
				successful: successful,
				failed: failed
			},
			selectedCount: selected,
			successfulCount: successful,
			failedCount: failed,
			verifiedCount: verifiedCount,
			clips: clipResults || [],
			type: "number",
			method: "setValue(value, true)"
		};

		if (!payload.ok) {
			payload.reason = selected === 0
				? "NO_VIDEO_SELECTION"
				: ((firstFail && firstFail.reason) || "WRITE_FAILED");
			payload.detail = selected === 0
				? "Select a video clip first."
				: ((firstFail && firstFail.detail) || "");
			if (firstFail && firstFail.uiKind) {
				payload.uiKind = firstFail.uiKind;
			}
			if (firstFail && firstFail.componentMatchCount !== undefined) {
				payload.componentMatchCount = firstFail.componentMatchCount;
			}
			if (firstFail && firstFail.matchCount !== undefined) {
				payload.matchCount = firstFail.matchCount;
			}
			if (firstFail && firstFail.settersCalled !== undefined) {
				payload.settersCalled = firstFail.settersCalled === true;
			}
			if (firstFail && firstFail.choices) {
				payload.choices = firstFail.choices;
			}
			if (firstFail && firstFail.picker) {
				payload.picker = firstFail.picker;
			}
		} else if (clipResults && clipResults[0]) {
			payload.actualValue = clipResults[0].actualValue;
			payload.readBack = clipResults[0].actualValue;
			payload.verified = true;
		}

		return payload;
	}

	function noSelection(spec) {
		return summarize(spec, []);
	}

	function run(spec, hooks) {
		var selected;
		var clips;
		var i;
		var clip;
		var existed;
		var applied;
		var applyResult;
		var stillExists;
		var written;
		var results;
		var parameterName;
		var value;

		spec = spec || {};
		hooks = hooks || {};
		parameterName = trim(spec.parameterName || spec.parameter);
		value = spec.value !== undefined ? spec.value : spec.requestedValue;
		results = [];

		if (typeof hooks.getSelectedVideoClips !== "function") {
			return noSelection(spec);
		}

		selected = hooks.getSelectedVideoClips();
		if (!selected || !selected.ok || !selected.clips || !selected.clips.length) {
			return noSelection({
				effect: spec.effectName || spec.effect,
				parameter: parameterName,
				requestedValue: value
			});
		}

		clips = selected.clips;
		for (i = 0; i < clips.length; i++) {
			clip = clips[i];
			existed = false;
			applied = false;

			if (typeof hooks.effectExists === "function") {
				existed = !!hooks.effectExists(clip, spec.effectName || spec.effect);
			}

			if (!existed) {
				if (typeof hooks.applyEffect !== "function") {
					results.push(failClip(clip, "EFFECT_NOT_FOUND", "Effect not found.", {
						existed: false,
						applied: false,
						requestedValue: value
					}));
					continue;
				}
				applyResult = hooks.applyEffect(clip, spec.effectName || spec.effect);
				if (!applyResult || !applyResult.ok) {
					results.push(failClip(clip, (applyResult && applyResult.reason) || "EFFECT_NOT_FOUND", (applyResult && applyResult.detail) || "Could not apply effect.", {
						existed: false,
						applied: false,
						requestedValue: value
					}));
					continue;
				}
				applied = true;
				stillExists = typeof hooks.effectExists === "function"
					? !!hooks.effectExists(clip, spec.effectName || spec.effect)
					: false;
				if (!stillExists) {
					results.push(failClip(clip, "EFFECT_NOT_FOUND", "Effect was not resolvable after apply.", {
						existed: false,
						applied: true,
						requestedValue: value
					}));
					continue;
				}
			}

			if (!parameterName) {
				results.push(failClip(clip, "PARAMETER_NOT_FOUND", "Parameter displayName is required.", {
					existed: existed,
					applied: applied,
					requestedValue: value
				}));
				continue;
			}

			if (typeof hooks.writeNumeric !== "function") {
				results.push(failClip(clip, "WRITE_FAILED", "Numeric writer is not available.", {
					existed: existed,
					applied: applied,
					requestedValue: value
				}));
				continue;
			}

			written = hooks.writeNumeric(clip, spec.effectName || spec.effect, parameterName, value);
			results.push(fromWriterResult(written, clip, {
				existed: existed,
				applied: applied,
				requestedValue: value
			}));
		}

		return summarize({
			effect: spec.effectName || spec.effect,
			parameter: parameterName,
			requestedValue: value
		}, results);
	}

	function toCommandPayload(batch, fields) {
		var payload;
		var extra = fields || {};
		if (!batch) {
			return {
				ok: false,
				command: true,
				reason: "WRITE_FAILED",
				status: "Could not write parameter."
			};
		}
		payload = {
			ok: batch.ok === true,
			command: true,
			effect: extra.effect || batch.effect,
			parameter: extra.parameter || batch.parameter,
			value: extra.value !== undefined ? extra.value : batch.requestedValue,
			requestedValue: extra.value !== undefined ? extra.value : batch.requestedValue,
			type: extra.type || batch.type || "number",
			method: batch.method || extra.method || "setValue(value, true)",
			summary: batch.summary,
			selectedCount: batch.selectedCount,
			successfulCount: batch.successfulCount,
			failedCount: batch.failedCount,
			verifiedCount: batch.verifiedCount,
			clips: batch.clips,
			batch: batch.batch === true,
			clipParameter: extra.clipParameter === true || batch.clipParameter === true,
			parameterType: extra.parameterType || batch.parameterType || extra.type || batch.type,
			originalValue: extra.originalValue !== undefined ? extra.originalValue : batch.originalValue,
			timeVarying: extra.timeVarying !== undefined ? extra.timeVarying : batch.timeVarying,
			keyframesSupported: extra.keyframesSupported !== undefined ? extra.keyframesSupported : batch.keyframesSupported,
			scope: extra.scope || batch.scope,
			component: extra.component || batch.component,
			usedQE: extra.usedQE !== undefined ? extra.usedQE : (batch.usedQE !== undefined ? batch.usedQE : undefined),
			productionEnabled: extra.productionEnabled !== undefined ? extra.productionEnabled : batch.productionEnabled,
			uiKind: extra.uiKind || batch.uiKind,
			matchCount: extra.matchCount !== undefined ? extra.matchCount : batch.matchCount,
			componentMatchCount: extra.componentMatchCount !== undefined ? extra.componentMatchCount : batch.componentMatchCount,
			settersCalled: extra.settersCalled !== undefined ? extra.settersCalled : batch.settersCalled,
			choices: extra.choices || batch.choices,
			picker: extra.picker || batch.picker,
			reResolved: extra.reResolved !== undefined ? extra.reResolved : batch.reResolved
		};
		if (batch.actualValue !== undefined) {
			payload.actualValue = batch.actualValue;
			payload.readBack = batch.readBack !== undefined ? batch.readBack : batch.actualValue;
		}
		if (batch.debugSelection) {
			payload.debugSelection = batch.debugSelection;
		}
		if (batch.runtime) {
			payload.runtime = batch.runtime;
		}
		if (payload.ok) {
			payload.verified = true;
		} else {
			payload.reason = batch.reason || "WRITE_FAILED";
			payload.detail = batch.detail || "";
			payload.status = extra.status || payload.reason;
			payload.verified = false;
		}
		return payload;
	}

	function selectedCountOf(payload) {
		if (!payload) {
			return 0;
		}
		if (typeof payload.selectedCount === "number" && isFinite(payload.selectedCount)) {
			return payload.selectedCount;
		}
		if (payload.summary && typeof payload.summary.selected === "number") {
			return payload.summary.selected;
		}
		if (payload.debugSelection && typeof payload.debugSelection.videoCount === "number") {
			return payload.debugSelection.videoCount;
		}
		if (payload.clips && payload.clips.length) {
			return payload.clips.length;
		}
		return 0;
	}

	function isBatchResult(payload) {
		return selectedCountOf(payload) > 1 || !!(payload && payload.batch === true);
	}

	function formatCommandValue(value) {
		if (typeof value === "number" && value === Math.floor(value)) {
			return String(value);
		}
		if (value && typeof value === "object" && typeof value.length === "number" &&
				value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
			return String(value[0]) + " " + String(value[1]);
		}
		if (value && typeof value === "object" && typeof value.x === "number" && typeof value.y === "number") {
			return String(value.x) + " " + String(value.y);
		}
		if (value === true || value === false) {
			return String(value);
		}
		if (value === undefined || value === null) {
			return "";
		}
		return String(value);
	}

	function formatSuccessFooter(payload) {
		var effectName = (payload && payload.effect) || "Effect";
		var parameter = (payload && payload.parameter) || "Value";
		var value = payload && (payload.value !== undefined ? payload.value : payload.requestedValue);
		var count;
		var line;
		value = formatCommandValue(value);
		if (payload && payload.clipParameter) {
			line = "✓ " + parameter + (value !== "" ? " " + value : "");
		} else {
			line = "✓ " + effectName + " · " + parameter + " " + value;
		}
		count = selectedCountOf(payload);
		if (count > 1) {
			line += " · " + count + " clips";
		}
		return line;
	}

	return {
		failClip: failClip,
		fromWriterResult: fromWriterResult,
		summarize: summarize,
		noSelection: noSelection,
		run: run,
		toCommandPayload: toCommandPayload,
		selectedCountOf: selectedCountOf,
		isBatchResult: isBatchResult,
		formatSuccessFooter: formatSuccessFooter
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxBatchNumericExecutor = BatchNumericExecutor;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = BatchNumericExecutor;
}
