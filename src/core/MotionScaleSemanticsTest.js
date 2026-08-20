var MotionScaleSemanticsTest = (function () {
	var OPERATION = "motion.scale.semantics.test";
	var WRITE_METHOD = "ComponentParam.setValue(value, true)";
	var MOTION_DISPLAY = "Motion";
	var MOTION_MATCH = "AE.ADBE Motion";
	var NUMBER_EPS = 0.0001;
	var SCALE_WIDTH_TEST = 80;
	var SCALE_TEST = 120;

	function resolver() {
		if (typeof $._pickfxParameterResolver !== "undefined") {
			return $._pickfxParameterResolver;
		}
		return null;
	}

	function numbersClose(a, b) {
		if (typeof a !== "number" || typeof b !== "number" || !isFinite(a) || !isFinite(b)) {
			return false;
		}
		if (a === b) {
			return true;
		}
		return Math.abs(a - b) <= NUMBER_EPS;
	}

	function fail(reason, extra) {
		var payload = {
			ok: false,
			operation: OPERATION,
			reason: reason || "WRITE_FAILED",
			verified: false,
			writeMethod: WRITE_METHOD,
			settersCalled: false,
			usedQE: false,
			productionEnabled: false
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

	function isTimeVarying(param) {
		try {
			return typeof param.isTimeVarying === "function" && param.isTimeVarying() === true;
		} catch (e) {
			return false;
		}
	}

	function readValue(param) {
		try {
			return { ok: true, value: param.getValue() };
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}

	function writeValue(param, value) {
		try {
			if (typeof param.setValue !== "function") {
				return { ok: false, reason: "PARAMETER_NOT_WRITABLE", requested: value };
			}
			param.setValue(value, true);
			return { ok: true, requested: value, settersCalled: true };
		} catch (e) {
			return {
				ok: false,
				reason: "WRITE_FAILED",
				requested: value,
				error: String(e),
				settersCalled: true
			};
		}
	}

	function verifyNumber(requested, actual) {
		return numbersClose(requested, actual);
	}

	function verifyBoolean(requested, actual) {
		return requested === actual;
	}

	function safeNumber(current, preferred) {
		if (typeof current === "number" && current === preferred) {
			if (preferred === 0) {
				return 1;
			}
			return preferred - 1;
		}
		return preferred;
	}

	function findMotionComponent(trackItem) {
		var res = resolver();
		var components;
		var countInfo;
		var indexBase;
		var i;
		var component;
		var displayName;
		var matchName;
		var preferred;
		var named;
		if (!res) {
			return { ok: false, reason: "WRITE_FAILED", detail: "ParameterResolver is not loaded." };
		}
		if (!trackItem) {
			return { ok: false, reason: "NO_VIDEO_SELECTION", detail: "No TrackItem was provided." };
		}
		try {
			components = trackItem.components;
		} catch (compErr) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "TrackItem.components threw: " + String(compErr) };
		}
		countInfo = res.collectionCount(components);
		if (countInfo.count < 0) {
			return { ok: false, reason: "PARAMETER_NOT_FOUND", detail: "Could not read components." };
		}
		indexBase = res.collectionIndexBase(components, countInfo.count);
		preferred = null;
		named = null;
		for (i = 0; i < countInfo.count; i++) {
			component = res.collectionItem(components, i, indexBase);
			displayName = res.readString(component, "displayName") || "";
			matchName = res.readString(component, "matchName") || "";
			if (displayName !== MOTION_DISPLAY) {
				continue;
			}
			if (!named) {
				named = { component: component, displayName: displayName, matchName: matchName };
			}
			if (matchName === MOTION_MATCH) {
				preferred = { component: component, displayName: displayName, matchName: matchName };
				break;
			}
		}
		if (preferred) {
			return { ok: true, displayName: preferred.displayName, matchName: preferred.matchName, component: preferred.component };
		}
		if (named) {
			return { ok: true, displayName: named.displayName, matchName: named.matchName, component: named.component };
		}
		return {
			ok: false,
			reason: "PARAMETER_NOT_FOUND",
			detail: 'No component with displayName "' + MOTION_DISPLAY + '".'
		};
	}

	function findParamByDisplayName(component, wanted) {
		var res = resolver();
		var props;
		var propertyCount;
		var propertyBase;
		var i;
		var param;
		var name;
		if (!res || !component) {
			return null;
		}
		try {
			props = component.properties;
		} catch (ignoreProps) {
			return null;
		}
		propertyCount = res.collectionCount(props);
		if (propertyCount.count < 0) {
			return null;
		}
		propertyBase = res.collectionIndexBase(props, propertyCount.count);
		for (i = 0; i < propertyCount.count; i++) {
			param = res.collectionItem(props, i, propertyBase);
			name = res.readString(param, "displayName") || "";
			if (name === wanted) {
				return param;
			}
		}
		return null;
	}

	function readTrio(scaleParam, widthParam, uniformParam) {
		var scale = readValue(scaleParam);
		var width = readValue(widthParam);
		var uniform = readValue(uniformParam);
		return {
			ok: scale.ok && width.ok && uniform.ok,
			scale: scale.ok ? scale.value : undefined,
			scaleWidth: width.ok ? width.value : undefined,
			uniformScale: uniform.ok ? uniform.value : undefined,
			errors: {
				scale: scale.ok ? undefined : scale.error,
				scaleWidth: width.ok ? undefined : width.error,
				uniformScale: uniform.ok ? undefined : uniform.error
			}
		};
	}

	function snapshotWrite(name, requested, before, after, verified, extra) {
		var row = {
			parameter: name,
			requested: requested,
			before: before,
			after: after,
			verified: verified === true,
			writeMethod: WRITE_METHOD
		};
		var key;
		if (extra) {
			for (key in extra) {
				if (extra.hasOwnProperty(key)) {
					row[key] = extra[key];
				}
			}
		}
		return row;
	}

	function run(trackItem) {
		var motion;
		var scaleParam;
		var widthParam;
		var uniformParam;
		var originals;
		var afterUnlink;
		var afterWidth;
		var afterScale;
		var restored;
		var unlinkWrite;
		var widthWrite;
		var scaleWrite;
		var restoreUnlink;
		var restoreScale;
		var restoreWidth;
		var restoreUniform;
		var scaleWidthTest;
		var scaleTest;
		var settersCalled;
		var steps;
		var missing;
		var timeVarying;

		motion = findMotionComponent(trackItem);
		if (!motion.ok) {
			return fail(motion.reason || "PARAMETER_NOT_FOUND", {
				detail: motion.detail || "",
				usedQE: false
			});
		}

		scaleParam = findParamByDisplayName(motion.component, "Scale");
		widthParam = findParamByDisplayName(motion.component, "Scale Width");
		uniformParam = findParamByDisplayName(motion.component, "Uniform Scale");
		missing = [];
		if (!scaleParam) {
			missing.push("Scale");
		}
		if (!widthParam) {
			missing.push("Scale Width");
		}
		if (!uniformParam) {
			missing.push("Uniform Scale");
		}
		if (missing.length) {
			return fail("PARAMETER_NOT_FOUND", {
				detail: "Missing Motion parameter displayName: " + missing.join(", ") + ".",
				component: motion.displayName,
				componentMatchName: motion.matchName,
				missing: missing,
				usedQE: false
			});
		}

		timeVarying = {
			scale: isTimeVarying(scaleParam),
			scaleWidth: isTimeVarying(widthParam),
			uniformScale: isTimeVarying(uniformParam)
		};
		if (timeVarying.scale || timeVarying.scaleWidth || timeVarying.uniformScale) {
			originals = readTrio(scaleParam, widthParam, uniformParam);
			return fail("PARAMETER_TIME_VARYING_UNSUPPORTED", {
				detail: "A Scale-family parameter is time-varying. No writes were performed.",
				component: motion.displayName,
				componentMatchName: motion.matchName,
				originals: {
					scale: originals.scale,
					scaleWidth: originals.scaleWidth,
					uniformScale: originals.uniformScale
				},
				timeVarying: timeVarying,
				settersCalled: false,
				usedQE: false
			});
		}

		originals = readTrio(scaleParam, widthParam, uniformParam);
		if (!originals.ok) {
			return fail("WRITE_FAILED", {
				detail: "getValue() failed while reading originals.",
				originals: originals,
				usedQE: false
			});
		}

		scaleWidthTest = safeNumber(originals.scaleWidth, SCALE_WIDTH_TEST);
		scaleTest = safeNumber(originals.scale, SCALE_TEST);
		settersCalled = false;
		steps = [];

		unlinkWrite = writeValue(uniformParam, false);
		settersCalled = settersCalled || unlinkWrite.settersCalled === true;
		afterUnlink = readTrio(scaleParam, widthParam, uniformParam);
		steps.push({
			name: "set Uniform Scale false",
			write: snapshotWrite(
				"Uniform Scale",
				false,
				originals.uniformScale,
				afterUnlink.uniformScale,
				verifyBoolean(false, afterUnlink.uniformScale),
				{ writeOk: unlinkWrite.ok, error: unlinkWrite.error, reason: unlinkWrite.reason }
			),
			readBack: {
				scale: afterUnlink.scale,
				scaleWidth: afterUnlink.scaleWidth,
				uniformScale: afterUnlink.uniformScale
			}
		});

		widthWrite = writeValue(widthParam, scaleWidthTest);
		settersCalled = settersCalled || widthWrite.settersCalled === true;
		afterWidth = readTrio(scaleParam, widthParam, uniformParam);
		steps.push({
			name: "set Scale Width " + String(scaleWidthTest),
			write: snapshotWrite(
				"Scale Width",
				scaleWidthTest,
				afterUnlink.scaleWidth,
				afterWidth.scaleWidth,
				verifyNumber(scaleWidthTest, afterWidth.scaleWidth),
				{ writeOk: widthWrite.ok, error: widthWrite.error, reason: widthWrite.reason }
			),
			readBack: {
				scale: afterWidth.scale,
				scaleWidth: afterWidth.scaleWidth,
				uniformScale: afterWidth.uniformScale
			},
			coupled: {
				scaleChanged: afterWidth.scale !== afterUnlink.scale,
				uniformScaleChanged: afterWidth.uniformScale !== afterUnlink.uniformScale
			}
		});

		scaleWrite = writeValue(scaleParam, scaleTest);
		settersCalled = settersCalled || scaleWrite.settersCalled === true;
		afterScale = readTrio(scaleParam, widthParam, uniformParam);
		steps.push({
			name: "set Scale " + String(scaleTest),
			write: snapshotWrite(
				"Scale",
				scaleTest,
				afterWidth.scale,
				afterScale.scale,
				verifyNumber(scaleTest, afterScale.scale),
				{ writeOk: scaleWrite.ok, error: scaleWrite.error, reason: scaleWrite.reason }
			),
			readBack: {
				scale: afterScale.scale,
				scaleWidth: afterScale.scaleWidth,
				uniformScale: afterScale.uniformScale
			},
			coupled: {
				scaleWidthChanged: afterScale.scaleWidth !== afterWidth.scaleWidth,
				uniformScaleChanged: afterScale.uniformScale !== afterWidth.uniformScale
			}
		});

		restoreUnlink = writeValue(uniformParam, false);
		settersCalled = settersCalled || restoreUnlink.settersCalled === true;
		restoreScale = writeValue(scaleParam, originals.scale);
		settersCalled = settersCalled || restoreScale.settersCalled === true;
		restoreWidth = writeValue(widthParam, originals.scaleWidth);
		settersCalled = settersCalled || restoreWidth.settersCalled === true;
		restoreUniform = writeValue(uniformParam, originals.uniformScale);
		settersCalled = settersCalled || restoreUniform.settersCalled === true;
		restored = readTrio(scaleParam, widthParam, uniformParam);

		steps.push({
			name: "restore originals",
			restoreSequence: [
				"Uniform Scale false",
				"Scale " + String(originals.scale),
				"Scale Width " + String(originals.scaleWidth),
				"Uniform Scale " + String(originals.uniformScale)
			],
			readBack: {
				scale: restored.scale,
				scaleWidth: restored.scaleWidth,
				uniformScale: restored.uniformScale
			},
			verifiedRestore: {
				scale: verifyNumber(originals.scale, restored.scale),
				scaleWidth: verifyNumber(originals.scaleWidth, restored.scaleWidth),
				uniformScale: verifyBoolean(originals.uniformScale, restored.uniformScale)
			}
		});

		return {
			ok: steps[0].write.verified === true &&
				steps[1].write.verified === true &&
				steps[2].write.verified === true &&
				steps[3].verifiedRestore.scale === true &&
				steps[3].verifiedRestore.scaleWidth === true &&
				steps[3].verifiedRestore.uniformScale === true,
			operation: OPERATION,
			component: {
				displayName: motion.displayName,
				matchName: motion.matchName
			},
			parameters: ["Scale", "Scale Width", "Uniform Scale"],
			originals: {
				scale: originals.scale,
				scaleWidth: originals.scaleWidth,
				uniformScale: originals.uniformScale
			},
			testValues: {
				uniformScale: false,
				scaleWidth: scaleWidthTest,
				scale: scaleTest
			},
			steps: steps,
			restored: {
				scale: restored.scale,
				scaleWidth: restored.scaleWidth,
				uniformScale: restored.uniformScale
			},
			verifiedRestore: steps[3].verifiedRestore,
			verified: steps[0].write.verified === true &&
				steps[1].write.verified === true &&
				steps[2].write.verified === true &&
				steps[3].verifiedRestore.scale === true &&
				steps[3].verifiedRestore.scaleWidth === true &&
				steps[3].verifiedRestore.uniformScale === true,
			writeMethod: WRITE_METHOD,
			settersCalled: settersCalled,
			usedQE: false,
			productionEnabled: false
		};
	}

	return {
		run: run,
		safeNumber: safeNumber
	};
}());

if (typeof $ !== "undefined") {
	$._pickfxMotionScaleSemanticsTest = MotionScaleSemanticsTest;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = MotionScaleSemanticsTest;
}
