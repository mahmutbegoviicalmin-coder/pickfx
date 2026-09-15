var TerminalMotionCapability = (function () {
	var EPSILON = 0.0001;
	var WRITE_PATH = "ConfirmedParameterWrites.write";
	var SPECS = [
		{
			id: "motion.opacity",
			property: "OPACITY",
			componentDisplayName: "Opacity",
			componentMatchName: "AE.ADBE Opacity",
			parameterDisplayName: "Opacity",
			type: "number",
			testValue: 50,
			commandName: "opacity",
			percentCommand: true
		},
		{
			id: "motion.scale",
			property: "SCALE",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Scale",
			type: "number",
			testValue: 120,
			commandName: "scale",
			percentCommand: true
		},
		{
			id: "motion.rotation",
			property: "ROTATION",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Rotation",
			type: "number",
			testValue: 15,
			commandName: "rotation",
			percentCommand: false
		},
		{
			id: "motion.position",
			property: "POSITION",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Position",
			type: "point",
			testValue: [100, 50],
			commandName: "position",
			percentCommand: false
		},
		{
			id: "motion.anchor-point",
			property: "ANCHOR_POINT",
			componentDisplayName: "Motion",
			componentMatchName: "AE.ADBE Motion",
			parameterDisplayName: "Anchor Point",
			type: "point",
			testValue: [0.55, 0.5],
			commandName: "anchor point",
			percentCommand: false
		}
	];

	function copyArray(value) {
		var output = [];
		var i;
		for (i = 0; value && i < value.length; i++) {
			output.push(value[i]);
		}
		return output;
	}

	function definition(capabilityId) {
		var i;
		for (i = 0; i < SPECS.length; i++) {
			if (SPECS[i].id === capabilityId) {
				return SPECS[i];
			}
		}
		return null;
	}

	function pointSnapshot(value) {
		var inspected;
		if (typeof PointValue !== "undefined" &&
				PointValue.inspect) {
			inspected = PointValue.inspect(value);
			if (inspected && inspected.ok) {
				return {
					ok: true,
					x: inspected.x,
					y: inspected.y,
					value: [inspected.x, inspected.y],
					shape: inspected.shape
				};
			}
		}
		try {
			if (value &&
					typeof value[0] === "number" &&
					typeof value[1] === "number") {
				return {
					ok: true,
					x: value[0],
					y: value[1],
					value: [value[0], value[1]],
					shape: "index0"
				};
			}
		} catch (ignore) {}
		return {
			ok: false,
			reason: "UNSUPPORTED_TYPE"
		};
	}

	function valuesEqual(type, actual, expected) {
		var point;
		if (type === "number") {
			return typeof actual === "number" &&
				typeof expected === "number" &&
				isFinite(actual) &&
				isFinite(expected) &&
				(
					actual === expected ||
					Math.abs(actual - expected) <= EPSILON
				);
		}
		if (type === "point") {
			point = pointSnapshot(actual);
			return point.ok === true &&
				Math.abs(point.x - expected[0]) <= EPSILON &&
				Math.abs(point.y - expected[1]) <= EPSILON;
		}
		return false;
	}

	function resolveParameter(trackItem, spec) {
		var resolver;
		if (!trackItem || !spec) {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND"
			};
		}
		if (spec.componentDisplayName === "Motion") {
			resolver = typeof $ !== "undefined"
				? $._pickfxParameterResolver
				: null;
			if (!resolver ||
					typeof resolver.resolveMotionParameter !== "function") {
				return {
					ok: false,
					reason: "PARAMETER_NOT_FOUND",
					detail:
						"Motion ParameterResolver is unavailable."
				};
			}
			return resolver.resolveMotionParameter(
				trackItem,
				spec.parameterDisplayName
			);
		}
		resolver = typeof $ !== "undefined"
			? $._pickfxUniversalParameterResolver
			: (
				typeof UniversalParameterResolver !== "undefined"
					? UniversalParameterResolver
					: null
			);
		if (!resolver || typeof resolver.resolve !== "function") {
			return {
				ok: false,
				reason: "PARAMETER_NOT_FOUND",
				detail:
					"UniversalParameterResolver is unavailable."
			};
		}
		return resolver.resolve(
			trackItem,
			spec.parameterDisplayName,
			spec.componentMatchName
		);
	}

	function readResolved(resolved, spec) {
		var value;
		var point;
		if (!resolved || !resolved.ok || !resolved._param) {
			return {
				ok: false,
				reason:
					(resolved && resolved.reason) ||
					"PARAMETER_NOT_FOUND",
				detail: resolved && resolved.detail
			};
		}
		try {
			value = resolved._param.getValue();
		} catch (error) {
			return {
				ok: false,
				reason: "READ_BACK_FAILED",
				error: String(error)
			};
		}
		if (spec.type === "number") {
			if (typeof value !== "number" || !isFinite(value)) {
				return {
					ok: false,
					reason: "UNSUPPORTED_TYPE",
					liveType: typeof value
				};
			}
			return {
				ok: true,
				value: value,
				jsonValue: value,
				type: "number"
			};
		}
		point = pointSnapshot(value);
		if (!point.ok) {
			return point;
		}
		return {
			ok: true,
			value: value,
			jsonValue: point.value,
			type: "point",
			shape: point.shape
		};
	}

	function inspect(trackItem, capabilityId) {
		var spec = definition(capabilityId);
		var entry;
		var resolved;
		var read;
		if (!spec) {
			return {
				ok: false,
				reason: "CAPABILITY_NOT_FOUND",
				capabilityId: String(capabilityId || "")
			};
		}
		entry = typeof ConfirmedParameterWrites !== "undefined" &&
			ConfirmedParameterWrites.lookup
			? ConfirmedParameterWrites.lookup(
				spec.componentDisplayName,
				spec.parameterDisplayName,
				spec.type
			)
			: null;
		resolved = resolveParameter(trackItem, spec);
		read = readResolved(resolved, spec);
		return {
			ok: !!(
				entry &&
				entry.productionEnabled === true &&
				read.ok === true
			),
			operation: "terminal.motion.inspect",
			capabilityId: spec.id,
			property: spec.property,
			component: spec.componentDisplayName,
			componentMatchName: spec.componentMatchName,
			parameter: spec.parameterDisplayName,
			type: spec.type,
			currentValue: read.jsonValue,
			pointShape: read.shape,
			readBackSupported: read.ok === true,
			writerRegistered:
				!!entry && entry.productionEnabled === true,
			writerPath: WRITE_PATH,
			reason: read.ok ? "" : read.reason,
			detail: read.detail || "",
			settersCalled: false,
			usedQE: false
		};
	}

	function requestFor(spec, original) {
		var value;
		if (spec.type === "number") {
			value = spec.testValue;
			if (valuesEqual("number", original.jsonValue, value)) {
				if (spec.property === "OPACITY") {
					value = original.jsonValue >= 1
						? original.jsonValue - 1
						: original.jsonValue + 1;
				} else {
					value = original.jsonValue + 1;
				}
			}
			return value;
		}
		value = copyArray(spec.testValue);
		if (valuesEqual("point", original.value, value)) {
			value = [
				original.jsonValue[0] + 0.01,
				original.jsonValue[1]
			];
		}
		return value;
	}

	function inputFor(spec, value) {
		if (spec.type === "point") {
			return {
				numbers: [value[0], value[1]],
				value: [value[0], value[1]]
			};
		}
		return {
			numbers: [value],
			value: value
		};
	}

	function commandFor(spec, value) {
		if (spec.type === "point") {
			return spec.commandName + " x " +
				String(value[0]) + " y " + String(value[1]);
		}
		return spec.commandName + " " + String(value) +
			(spec.percentCommand ? "%" : "");
	}

	function validate(trackItem, capabilityId) {
		var spec = definition(capabilityId);
		var resolved;
		var original;
		var requested;
		var written;
		var afterResolved;
		var after;
		var restored;
		var finalResolved;
		var finalRead;
		var verifiedTest;
		var verifiedRestore;
		var entry;
		if (!spec) {
			return {
				ok: false,
				reason: "CAPABILITY_NOT_FOUND",
				capabilityId: String(capabilityId || "")
			};
		}
		entry = typeof ConfirmedParameterWrites !== "undefined" &&
			ConfirmedParameterWrites.lookup
			? ConfirmedParameterWrites.lookup(
				spec.componentDisplayName,
				spec.parameterDisplayName,
				spec.type
			)
			: null;
		if (!entry || entry.productionEnabled !== true) {
			return {
				ok: false,
				reason: "WRITER_NOT_CONFIRMED",
				capabilityId: spec.id,
				settersCalled: false,
				usedQE: false
			};
		}
		resolved = resolveParameter(trackItem, spec);
		original = readResolved(resolved, spec);
		if (!original.ok) {
			return {
				ok: false,
				reason: original.reason,
				detail: original.detail || "",
				capabilityId: spec.id,
				settersCalled: false,
				usedQE: false
			};
		}
		requested = requestFor(spec, original);
		written = ConfirmedParameterWrites.write(
			trackItem,
			spec.parameterDisplayName,
			inputFor(spec, requested),
			spec.componentMatchName
		);
		afterResolved = resolveParameter(trackItem, spec);
		after = readResolved(afterResolved, spec);
		verifiedTest = !!(
			written &&
			written.ok === true &&
			written.verified === true &&
			after.ok === true &&
			valuesEqual(spec.type, after.value, requested)
		);
		restored = ConfirmedParameterWrites.write(
			trackItem,
			spec.parameterDisplayName,
			inputFor(spec, original.jsonValue),
			spec.componentMatchName
		);
		finalResolved = resolveParameter(trackItem, spec);
		finalRead = readResolved(finalResolved, spec);
		verifiedRestore = !!(
			restored &&
			restored.ok === true &&
			restored.verified === true &&
			finalRead.ok === true &&
			valuesEqual(
				spec.type,
				finalRead.value,
				original.jsonValue
			)
		);
		return {
			ok: verifiedTest && verifiedRestore,
			operation: "terminal.motion.live-validation",
			capabilityId: spec.id,
			capabilityType: "MOTION",
			property: spec.property,
			component: spec.componentDisplayName,
			componentMatchName: spec.componentMatchName,
			parameter: spec.parameterDisplayName,
			type: spec.type,
			before: original.jsonValue,
			requested: requested,
			after: after.jsonValue,
			restoredValue: finalRead.jsonValue,
			verifiedTest: verifiedTest,
			verifiedRestore: verifiedRestore,
			verified: verifiedTest && verifiedRestore,
			cleanupVerified: verifiedRestore,
			commandExample: verifiedTest
				? commandFor(spec, requested)
				: "",
			writerPath: WRITE_PATH,
			writeResult: written,
			restoreResult: restored,
			readBackSupported:
				after.ok === true && finalRead.ok === true,
			settersCalled: !!(
				(written && written.settersCalled !== false) ||
				(restored && restored.settersCalled !== false)
			),
			usedQE: false,
			reason: !verifiedTest
				? (
					(written && written.reason) ||
					"WRITE_NOT_VERIFIED"
				)
				: (
					!verifiedRestore
						? (
							(restored && restored.reason) ||
							"RESTORE_FAILED"
						)
						: ""
				)
		};
	}

	function inspectAll(trackItem) {
		var rows = [];
		var i;
		for (i = 0; i < SPECS.length; i++) {
			rows.push(inspect(trackItem, SPECS[i].id));
		}
		return rows;
	}

	function definitions() {
		var rows = [];
		var i;
		for (i = 0; i < SPECS.length; i++) {
			rows.push({
				id: SPECS[i].id,
				property: SPECS[i].property,
				componentDisplayName:
					SPECS[i].componentDisplayName,
				componentMatchName:
					SPECS[i].componentMatchName,
				parameterDisplayName:
					SPECS[i].parameterDisplayName,
				type: SPECS[i].type,
				testValue: SPECS[i].type === "point"
					? copyArray(SPECS[i].testValue)
					: SPECS[i].testValue,
				commandName: SPECS[i].commandName,
				percentCommand:
					SPECS[i].percentCommand === true
			});
		}
		return rows;
	}

	return {
		EPSILON: EPSILON,
		WRITE_PATH: WRITE_PATH,
		definition: definition,
		definitions: definitions,
		valuesEqual: valuesEqual,
		resolveParameter: resolveParameter,
		inspect: inspect,
		inspectAll: inspectAll,
		validate: validate,
		commandFor: commandFor
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxTerminalMotionCapability =
		TerminalMotionCapability;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = TerminalMotionCapability;
}
