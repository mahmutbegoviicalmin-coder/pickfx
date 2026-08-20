(function () {
	var clip;
	var report;
	var row;
	var probe;
	var written;
	var beforeCount;
	var afterCount;
	var origRun;
	var runCalls;
	var classified;
	var PREMIERE_EFFECTS = [
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" }
	];

	function mockResolver() {
		return {
			readString: function (obj, key) {
				return obj && obj[key] !== undefined && obj[key] !== null ? String(obj[key]) : "";
			},
			collectionCount: function (col) {
				return { count: col && col.length ? col.length : 0, via: "length" };
			},
			collectionIndexBase: function () {
				return 0;
			},
			collectionItem: function (col, index) {
				return col[index];
			},
			inspectRealEnumOptions: function (param) {
				return (param && param.enumOptions) || [];
			}
		};
	}

	function numberParam(name, initial, extras) {
		var value = initial;
		extras = extras || {};
		return {
			displayName: name,
			matchName: extras.matchName !== undefined ? extras.matchName : "",
			min: extras.min,
			max: extras.max,
			getValueNames: extras.getValueNames,
			getValue: extras.getValue || function () {
				return value;
			},
			setValue: extras.setValue || function (next, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				value = next;
				return true;
			},
			isTimeVarying: extras.isTimeVarying || function () {
				return false;
			},
			areKeyframesSupported: function () {
				return true;
			}
		};
	}

	function audioClip(components, name) {
		return {
			name: name || "Audio A",
			mediaType: "Audio",
			components: components
		};
	}

	function videoClip(components) {
		return {
			name: "Video A",
			mediaType: "Video",
			components: components
		};
	}

	function byName(list, name) {
		var n;
		for (n = 0; n < (list ? list.length : 0); n++) {
			if (list[n] && list[n].displayName === name) {
				return list[n];
			}
		}
		return null;
	}

	if (typeof ConfirmedParameterWrites !== "undefined" && ConfirmedParameterWrites.resetSession) {
		ConfirmedParameterWrites.resetSession();
	}
	if (typeof $ === "undefined") {
		$ = {};
	}
	$._pickfxParameterResolver = mockResolver();

	assertEq("audio match on Audio TrackItem", AudioParameterDiscover.looksLikeAudioComponent("Anything", "", "Audio").matched, true);
	assertEq("audio match volume name without media", AudioParameterDiscover.looksLikeAudioComponent("Volume", "", "").matched, true);
	assertEq("audio reject motion", AudioParameterDiscover.looksLikeAudioComponent("Motion", "AE.ADBE Motion", "Video").matched, false);
	assertEq("audio reject lumetri", AudioParameterDiscover.looksLikeAudioComponent("Lumetri Color", "AE.ADBE Lumetri", "Video").matched, false);
	assertEq("audio reject opacity", AudioParameterDiscover.looksLikeAudioComponent("Opacity", "AE.ADBE Opacity", "Video").matched, false);

	clip = videoClip([{
		displayName: "Motion",
		matchName: "AE.ADBE Motion",
		properties: [numberParam("Scale", 100)]
	}]);
	report = AudioParameterDiscover.inspect(clip);
	assertEq("audio video selection ok", report.ok, false);
	assertEq("audio video selection reason", report.reason, "NO_AUDIO_SELECTION");
	assertEq("audio video usedQE", report.usedQE, false);
	assertEq("audio video production", report.productionEnabled, false);

	clip = audioClip([
		{
			displayName: "Volume",
			matchName: "",
			properties: [numberParam("Level", 0, { matchName: "", min: -96, max: 6 })]
		},
		{
			displayName: "Live Audio Foo",
			matchName: "",
			properties: [numberParam("Bar", 12, { matchName: "" })]
		}
	]);
	report = AudioParameterDiscover.inspect(clip);
	assertEq("audio inspect ok", report.ok, true);
	assertEq("audio inspect usedQE", report.usedQE, false);
	assertEq("audio inspect production", report.productionEnabled, false);
	assertEq("audio inspect writes", report.writesPerformed, false);
	assertEq("audio inspect clip media", report.clip.mediaType, "Audio");
	assert("audio inspect has Volume component", !!(report.components && report.components[0] && report.components[0].displayName === "Volume"));
	assert("audio inspect has live Foo component", !!(byName(report.parameters, "Bar")));
	row = byName(report.parameters, "Level");
	assertEq("audio level component display", row.componentDisplayName, "Volume");
	assertEq("audio level component match", row.componentMatchName, "");
	assertEq("audio level param display", row.displayName, "Level");
	assertEq("audio level param match", row.matchName, "");
	assertEq("audio level runtimeType", row.runtimeType, "number");
	assertEq("audio level currentValue", row.currentValue, 0);
	assertEq("audio level hasGetValue", row.hasGetValue, true);
	assertEq("audio level hasSetValue", row.hasSetValue, true);
	assertEq("audio level timeVarying", row.timeVarying, false);
	assertEq("audio level classification", row.classification, "NUMERIC_CANDIDATE");
	assertEq("audio level unambiguous", row.unambiguous, true);
	assertEq("audio level identity component", row.identity.componentDisplayName, "Volume");
	assertEq("audio level identity parameter", row.identity.parameterDisplayName, "Level");
	assert("audio candidate Level", !!byName(report.candidates, "Level"));
	assert("audio candidate Bar", !!byName(report.candidates, "Bar"));

	classified = NumericCandidateClassifier.classify({
		displayName: "Level",
		componentDisplayName: "Volume",
		runtimeType: "number",
		currentValue: 0,
		hasGetValue: true,
		hasSetValue: true,
		timeVarying: false
	});
	assertEq("audio classifier candidate", classified.status, "CANDIDATE");

	beforeCount = ConfirmedParameterWrites.all().length;
	written = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		componentMatchName: "",
		parameterDisplayName: "Level",
		parameterMatchName: ""
	});
	assertEq("audio write ok", written.ok, true);
	assertEq("audio write operation", written.operation, "audio.parameter.write.test");
	assertEq("audio write verifiedTest", written.verifiedTest, true);
	assertEq("audio write verifiedRestore", written.verifiedRestore, true);
	assertEq("audio write usedQE", written.usedQE, false);
	assertEq("audio write productionEnabled", written.productionEnabled, false);
	assertEq("audio write method", written.writeMethod, "ComponentParam.setValue(value, true)");
	assertEq("audio write original", written.originalValue, 0);
	assertEq("audio write restored", written.restoredValue, 0);
	assertEq("audio write live restored", clip.components[0].properties[0].getValue(), 0);
	assertEq("audio write identity component", written.identity.componentDisplayName, "Volume");
	assertEq("audio write identity parameter", written.identity.parameterDisplayName, "Level");
	assertEq("audio write not production", ConfirmedParameterWrites.isProductionEnabled("Level", "Volume"), false);
	assertEq("audio write not looked up", ConfirmedParameterWrites.lookup("Volume", "Level"), null);
	afterCount = ConfirmedParameterWrites.all().length;
	assertEq("audio write registry unchanged", afterCount, beforeCount);

	written = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Live Audio Foo",
		componentMatchName: "",
		parameterDisplayName: "Bar",
		parameterMatchName: ""
	});
	assertEq("audio live-name write ok", written.ok, true);
	assertEq("audio live-name restored", clip.components[1].properties[0].getValue(), 12);
	assertEq("audio live-name not registered", ConfirmedParameterWrites.lookup("Live Audio Foo", "Bar"), null);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [{
			displayName: "Fill",
			getValue: function () {
				return { r: 1, g: 0, b: 0 };
			},
			setValue: function () {},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	probe = AudioParameterWriteTest.run(clip, "Volume", "Fill");
	assertEq("audio color reject", probe.ok, false);
	assertEq("audio color reason", probe.reason, "COLOR_VALUE");
	assertEq("audio color setters", probe.settersCalled, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Level", 0, {
			isTimeVarying: function () {
				return true;
			}
		})]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio time varying reason", probe.reason, "TIME_VARYING");
	assertEq("audio time varying setters", probe.settersCalled, false);
	assertEq("audio time varying live", clip.components[0].properties[0].getValue(), 0);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [{
			displayName: "Level",
			setValue: function () {},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio missing getValue", probe.reason, "NO_GET_VALUE");
	assertEq("audio missing getValue setters", probe.settersCalled, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [{
			displayName: "Level",
			getValue: function () {
				return 0;
			},
			isTimeVarying: function () {
				return false;
			}
		}]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio missing setValue", probe.reason, "NO_SET_VALUE");
	assertEq("audio missing setValue setters", probe.settersCalled, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Mode", 1, {
			getValueNames: function () {
				return ["A", "B"];
			}
		})]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Mode"
	});
	assertEq("audio enum-like reason", probe.reason, "ENUM_LIKE_NUMBER");
	assertEq("audio enum-like setters", probe.settersCalled, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Locked", 5, { min: 5, max: 5 })]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Locked"
	});
	assertEq("audio no-safe-test-value", probe.reason, "NO_SAFE_TEST_VALUE");
	assertEq("audio no-safe setters", probe.settersCalled, false);
	assertEq("audio no-safe live", clip.components[0].properties[0].getValue(), 5);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Level", 0, {
			setValue: function (next, updateUI) {
				if (updateUI !== true) {
					return false;
				}
				return true;
			}
		})]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio verify fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("audio verify fail test", probe.verifiedTest, false);

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [(function () {
			var value = 0;
			return {
				displayName: "Level",
				matchName: "",
				getValue: function () {
					return value;
				},
				setValue: function (next, updateUI) {
					if (updateUI !== true) {
						return false;
					}
					if (next !== 0) {
						value = next;
					}
					return true;
				},
				isTimeVarying: function () {
					return false;
				}
			};
		}())]
	}]);
	probe = AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio restore fail", probe.reason, "VALUE_NOT_VERIFIED");
	assertEq("audio restore fail test", probe.verifiedTest, true);
	assertEq("audio restore fail restore", probe.verifiedRestore, false);

	(function () {
		var first = numberParam("Level", 0, { matchName: "" });
		var second = numberParam("Level", 1, { matchName: "" });
		var dual = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [first, second]
		}]);
		report = AudioParameterDiscover.inspect(dual);
		assertEq("audio dual level unambiguous", byName(report.candidates, "Level") && byName(report.candidates, "Level").unambiguous, false);
		probe = AudioParameterDiscover.resolve(dual, {
			componentDisplayName: "Volume",
			componentMatchName: "",
			parameterDisplayName: "Level",
			parameterMatchName: ""
		});
		assertEq("audio dual resolve ok", probe.ok, false);
		assertEq("audio dual resolve reason", probe.reason, "PARAMETER_NOT_FOUND");
		written = AudioParameterWriteTest.run(dual, {
			componentDisplayName: "Volume",
			componentMatchName: "",
			parameterDisplayName: "Level",
			parameterMatchName: ""
		});
		assertEq("audio dual write ok", written.ok, false);
		assertEq("audio dual write setters", written.settersCalled, false);
		assertEq("audio dual live first", first.getValue(), 0);
		assertEq("audio dual live second", second.getValue(), 1);
		assertEq("audio dual not registered", ConfirmedParameterWrites.lookup("Volume", "Level"), null);
	}());

	clip = audioClip([{
		displayName: "Volume",
		matchName: "",
		properties: [numberParam("Level", 0)]
	}]);
	probe = AudioParameterDiscover.resolve(clip, {
		parameterDisplayName: "Level"
	});
	assertEq("audio param-only identity rejected", probe.reason, "NO_SAFE_IDENTITY");

	beforeCount = ConfirmedParameterWrites.all().length;
	written = AudioParameterWriteTest.run(clip);
	assertEq("audio runAll ok", written.ok, true);
	assertEq("audio runAll production", written.productionEnabled, false);
	assertEq("audio runAll restored", clip.components[0].properties[0].getValue(), 0);
	assertEq("audio runAll registry unchanged", ConfirmedParameterWrites.all().length, beforeCount);

	origRun = ParameterWriteTest.run;
	runCalls = 0;
	ParameterWriteTest.run = function () {
		runCalls += 1;
		return origRun.apply(this, arguments);
	};
	AudioParameterWriteTest.run(clip, {
		componentDisplayName: "Volume",
		parameterDisplayName: "Level"
	});
	assertEq("audio write does not use ParameterWriteTest.run", runCalls, 0);
	ParameterWriteTest.run = origRun;

	(function () {
		var ignored;
		var threw;
		var stale;
		var missing;
		var applied;
		var calls;
		var keyCalls;
		var diagnosed;
		var hostPayload;
		var origFirst;
		var origSafe;
		var beforeReg;

		function ignoreParam(initial) {
			var value = initial;
			calls = [];
			keyCalls = 0;
			return {
				displayName: "Level",
				matchName: "",
				min: -96,
				max: 6,
				getValue: function () {
					return value;
				},
				setValue: function (next, updateUI) {
					calls.push({ argc: arguments.length, next: next, updateUI: updateUI });
					return true;
				},
				setValueAtKey: function () {
					keyCalls += 1;
					throw new Error("setValueAtKey must not be called");
				},
				isTimeVarying: function () {
					return false;
				}
			};
		}

		ignored = ignoreParam(1);
		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [ignored]
		}]);
		beforeReg = ConfirmedParameterWrites.all().length;
		diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assertEq("audio diagnose B operation", diagnosed.operation, "audio.parameter.setvalue.diagnose");
		assertEq("audio diagnose B probeRan", diagnosed.probeRan, true);
		assertEq("audio diagnose B settersCalled", diagnosed.settersCalled, true);
		assertEq("audio diagnose B usedQE", diagnosed.usedQE, false);
		assertEq("audio diagnose B production", diagnosed.productionEnabled, false);
		assertEq("audio diagnose B letter", diagnosed.conclusion.letter, "B");
		assertEq("audio diagnose B code", diagnosed.conclusion.code, "B_SETVALUE_IGNORED");
		assertEq("audio diagnose B flag", diagnosed.conclusion.B_setValueReturnsButPremiereIgnores, true);
		assertEq("audio diagnose B A", diagnosed.conclusion.A_setValueThrows, false);
		assertEq("audio diagnose B C", diagnosed.conclusion.C_getValueStaleOrCached, false);
		assertEq("audio diagnose B D", diagnosed.conclusion.D_requiresDifferentApi, false);
		assertEq("audio diagnose B before", diagnosed.valueImmediatelyBeforeSetValue, 1);
		assertEq("audio diagnose B test", diagnosed.testValuePassed, 2);
		assertEq("audio diagnose B after", diagnosed.valueImmediatelyAfterSetValue, 1);
		assertEq("audio diagnose B getValue", diagnosed.getValueAfter, 1);
		assertEq("audio diagnose B threw", diagnosed.setValueThrew, false);
		assertEq("audio diagnose B return typeof", diagnosed.setValueReturnTypeof, "boolean");
		assertEq("audio diagnose B return", diagnosed.setValueReturn, true);
		assertEq("audio diagnose B restore", diagnosed.restore.verifiedRestore, true);
		assertEq("audio diagnose B live", ignored.getValue(), 1);
		assertEq("audio diagnose B argc", calls.length > 0 && calls[0].argc, 2);
		assertEq("audio diagnose B updateUI", calls.length > 0 && calls[0].updateUI, true);
		assertEq("audio diagnose B no one-arg", diagnosed.setValueCall.oneArgumentCallNotAttempted, true);
		assertEq("audio diagnose B no setValueAtKey", keyCalls, 0);
		assertEq("audio diagnose B hostFunction", diagnosed.hostFunction, "debugAudioLevelSetValueDiagnose");
		assertEq("audio diagnose B runtime has setValue", diagnosed.runtimePath.indexOf("ComponentParam.setValue(value, true)") !== -1, true);
		assertEq("audio diagnose B registry", ConfirmedParameterWrites.all().length, beforeReg);
		assertEq("audio diagnose B not enabled", ConfirmedParameterWrites.isProductionEnabled("Level", "Volume"), false);

		threw = numberParam("Level", 1);
		threw.setValue = function () {
			throw new Error("host rejected setValue");
		};
		threw.setValueAtKey = function () {
			throw new Error("setValueAtKey must not be called");
		};
		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [threw]
		}]);
		diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assertEq("audio diagnose A letter", diagnosed.conclusion.letter, "A");
		assertEq("audio diagnose A code", diagnosed.conclusion.code, "A_SETVALUE_THREW");
		assertEq("audio diagnose A threw", diagnosed.setValueThrew, true);
		assert("audio diagnose A exception message", !!(diagnosed.setValueException &&
			String(diagnosed.setValueException.message || diagnosed.setValueException.text).indexOf("host rejected setValue") !== -1));
		assertEq("audio diagnose A after", diagnosed.valueImmediatelyAfterSetValue, 1);
		assertEq("audio diagnose A live", threw.getValue(), 1);
		assertEq("audio diagnose A usedQE", diagnosed.usedQE, false);

		(function () {
			var cached = 1;
			var stored = 1;
			stale = {
				displayName: "Level",
				matchName: "",
				getValue: function () {
					return cached;
				},
				getValueAtTime: function () {
					return stored;
				},
				setValue: function (next, updateUI) {
					if (updateUI !== true) {
						return false;
					}
					stored = next;
					return true;
				},
				setValueAtKey: function () {
					throw new Error("setValueAtKey must not be called");
				},
				isTimeVarying: function () {
					return false;
				}
			};
			clip = audioClip([{
				displayName: "Volume",
				matchName: "",
				properties: [stale]
			}]);
			diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip, {
				componentDisplayName: "Volume",
				parameterDisplayName: "Level"
			});
			assertEq("audio diagnose C letter", diagnosed.conclusion.letter, "C");
			assertEq("audio diagnose C code", diagnosed.conclusion.code, "C_GETVALUE_STALE");
			assertEq("audio diagnose C getValue", diagnosed.getValueAfter, 1);
			assertEq("audio diagnose C atTime", diagnosed.getValueAtTimeAfter, 2);
			assertEq("audio diagnose C stored restored", stored, 1);
			assertEq("audio diagnose C usedQE", diagnosed.usedQE, false);
		}());

		missing = {
			displayName: "Level",
			matchName: "",
			getValue: function () {
				return 1;
			},
			isTimeVarying: function () {
				return false;
			}
		};
		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [missing]
		}]);
		diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assertEq("audio diagnose D letter", diagnosed.conclusion.letter, "D");
		assertEq("audio diagnose D code", diagnosed.conclusion.code, "D_DIFFERENT_API");
		assertEq("audio diagnose D setters", diagnosed.settersCalled, false);
		assertEq("audio diagnose D live", missing.getValue(), 1);

		applied = numberParam("Level", 1);
		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [applied]
		}]);
		diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip);
		assertEq("audio diagnose empty identity Level", diagnosed.parameter, "Level");
		assertEq("audio diagnose applied code", diagnosed.conclusion.code, "SETVALUE_APPLIED");
		assertEq("audio diagnose applied letter", diagnosed.conclusion.letter, null);
		assertEq("audio diagnose applied live", applied.getValue(), 1);
		assertEq("audio diagnose applied restore", diagnosed.restore.verifiedRestore, true);

		clip = audioClip([
			{
				displayName: "Volume",
				matchName: "",
				properties: [numberParam("Level", 1)]
			},
			{
				displayName: "Internal Volume Mono",
				matchName: "",
				properties: [numberParam("Level", 0)]
			}
		]);
		diagnosed = AudioParameterWriteTest.diagnoseSetValue(clip);
		assertEq("audio diagnose dual Level rejected", diagnosed.ok, false);
		assertEq("audio diagnose dual Level reason", diagnosed.reason, "PARAMETER_NOT_FOUND");
		assertEq("audio diagnose dual Level probe", diagnosed.probeRan, false);
		assertEq("audio diagnose dual live first", clip.components[0].properties[0].getValue(), 1);
		assertEq("audio diagnose dual live second", clip.components[1].properties[0].getValue(), 0);

		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [ignoreParam(1)]
		}]);
		origRun = ParameterWriteTest.run;
		runCalls = 0;
		ParameterWriteTest.run = function () {
			runCalls += 1;
			return origRun.apply(this, arguments);
		};
		AudioParameterWriteTest.diagnoseSetValue(clip, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assertEq("audio diagnose does not use ParameterWriteTest.run", runCalls, 0);
		ParameterWriteTest.run = origRun;

		clip = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [ignoreParam(1)]
		}]);
		origFirst = $._pickfx && $._pickfx.firstSelectedAudioTrackItem;
		origSafe = $._pickfx && $._pickfx.jsonSafeParamResult;
		$._pickfx = $._pickfx || {};
		$._pickfx.firstSelectedAudioTrackItem = function () {
			return { ok: true, trackItem: clip };
		};
		$._pickfx.jsonSafeParamResult = function (result) {
			return result;
		};
		hostPayload = JSON.parse(AudioParameterWriteTest.hostDebugDiagnose({
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		}));
		assertEq("audio diagnose host letter", hostPayload.conclusion.letter, "B");
		assertEq("audio diagnose host path", hostPayload.hostFunction, "debugAudioLevelSetValueDiagnose");
		assertEq("audio diagnose host usedQE", hostPayload.usedQE, false);
		if (origFirst) {
			$._pickfx.firstSelectedAudioTrackItem = origFirst;
		}
		if (origSafe) {
			$._pickfx.jsonSafeParamResult = origSafe;
		}
	}());

	(function () {
		var beforeReg;
		var probed;
		var param;
		var clipCap;
		var byMethod;
		var i;

		function capParam(initial, opts) {
			var value = initial;
			var stored = initial;
			var varying = false;
			var keys = [];
			opts = opts || {};
			return {
				displayName: "Level",
				matchName: "",
				min: -96,
				max: 6,
				getValue: function () {
					return value;
				},
				getValueAtTime: function () {
					return stored;
				},
				setValue: function (next, updateUI) {
					if (opts.setValueWrites === true && updateUI === true) {
						value = next;
						stored = next;
					}
					return true;
				},
				setValueAtKey: function (time, next, updateUI) {
					if (opts.setValueAtKeyThrows === true) {
						throw new Error("setValueAtKey rejected");
					}
					if (opts.setValueAtKeyNeedsKey === true && keys.length === 0) {
						throw new Error("no key at time");
					}
					if (opts.setValueAtKeyWrites === true && updateUI === true) {
						stored = next;
						value = next;
					}
					return 0;
				},
				addKey: function (time) {
					if (opts.addKeyThrows === true) {
						throw new Error("addKey rejected");
					}
					keys.push(time);
					varying = true;
					return 0;
				},
				getKeys: function () {
					return keys.slice();
				},
				isTimeVarying: function () {
					return varying;
				},
				setTimeVarying: function (next) {
					if (opts.setTimeVaryingThrows === true) {
						throw new Error("setTimeVarying rejected");
					}
					varying = next === true;
					if (!varying) {
						keys = [];
					}
					return 0;
				},
				areKeyframesSupported: function () {
					return true;
				},
				removeKey: function () {
					keys = [];
					return 0;
				},
				setColorValue: function () {
					throw new Error("setColorValue must not be called");
				}
			};
		}

		function methodNamed(list, name) {
			for (i = 0; i < (list ? list.length : 0); i++) {
				if (list[i].method === name) {
					return list[i];
				}
			}
			return null;
		}

		param = capParam(1, {});
		clipCap = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [param]
		}]);
		clipCap.start = 0;
		beforeReg = ConfirmedParameterWrites.all().length;
		probed = AudioLevelCapabilityProbe.run(clipCap, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assertEq("audio cap ignored operation", probed.operation, "audio.parameter.capability.probe");
		assertEq("audio cap ignored probeRan", probed.probeRan, true);
		assertEq("audio cap ignored anyWrote", probed.anyMethodWrote, false);
		assertEq("audio cap ignored noneWrote", probed.noneWrote, true);
		assertEq("audio cap ignored usedQE", probed.usedQE, false);
		assertEq("audio cap ignored production", probed.productionEnabled, false);
		assertEq("audio cap ignored chosen", probed.productionSetterChosen, false);
		assertEq("audio cap ignored live", param.getValue(), 1);
		assertEq("audio cap ignored varying", param.isTimeVarying(), false);
		assertEq("audio cap ignored keys", param.getKeys().length, 0);
		byMethod = methodNamed(probed.attempts, "setValueAtKey");
		assertEq("audio cap ignored setValueAtKey class", byMethod.classification, "SUPPORTED_BUT_IGNORED");
		assertEq("audio cap ignored setValueAtKey restore", byMethod.restore.verified, true);
		byMethod = methodNamed(probed.attempts, "addKey+setValueAtKey");
		assertEq("audio cap ignored addKey class", byMethod.classification, "SUPPORTED_BUT_IGNORED");
		assertEq("audio cap ignored addKey restore", byMethod.restore.verified, true);
		byMethod = methodNamed(probed.attempts, "setTimeVarying");
		assert("audio cap ignored tv class", byMethod.classification === "SUPPORTED_BUT_IGNORED" || byMethod.classification === "SUPPORTED_AND_WRITES");
		assertEq("audio cap ignored tv restore varying", param.isTimeVarying(), false);
		assertEq("audio cap ignored registry", ConfirmedParameterWrites.all().length, beforeReg);
		assertEq("audio cap ignored not enabled", ConfirmedParameterWrites.isProductionEnabled("Level", "Volume"), false);

		param = capParam(1, { setValueAtKeyWrites: true });
		clipCap = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [param]
		}]);
		clipCap.start = 0;
		probed = AudioLevelCapabilityProbe.run(clipCap, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		byMethod = methodNamed(probed.attempts, "setValueAtKey");
		assertEq("audio cap writes setValueAtKey", byMethod.classification, "SUPPORTED_AND_WRITES");
		assertEq("audio cap writes any", probed.anyMethodWrote, true);
		assertEq("audio cap writes live restored", param.getValue(), 1);
		assertEq("audio cap writes varying restored", param.isTimeVarying(), false);
		byMethod = methodNamed(probed.attempts, "addKey+setValueAtKey");
		assertEq("audio cap writes skip addKey", byMethod.classification, "UNSAFE_TO_TEST");

		param = capParam(1, { setValueAtKeyNeedsKey: true, setValueAtKeyWrites: true });
		clipCap = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [param]
		}]);
		clipCap.start = 0;
		probed = AudioLevelCapabilityProbe.run(clipCap, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		byMethod = methodNamed(probed.attempts, "setValueAtKey");
		assertEq("audio cap key-first alone throws", byMethod.classification, "THROWS");
		byMethod = methodNamed(probed.attempts, "addKey+setValueAtKey");
		assertEq("audio cap key-first combo writes", byMethod.classification, "SUPPORTED_AND_WRITES");
		assertEq("audio cap key-first live restored", param.getValue(), 1);
		assertEq("audio cap key-first keys restored", param.getKeys().length, 0);
		assertEq("audio cap key-first varying restored", param.isTimeVarying(), false);

		param = capParam(1, { setValueAtKeyThrows: true, addKeyThrows: true, setTimeVaryingThrows: true });
		clipCap = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [param]
		}]);
		clipCap.start = 0;
		probed = AudioLevelCapabilityProbe.run(clipCap);
		assertEq("audio cap throws unique Level", probed.parameter, "Level");
		assertEq("audio cap throws setValueAtKey", methodNamed(probed.attempts, "setValueAtKey").classification, "THROWS");
		assertEq("audio cap throws addKey", methodNamed(probed.attempts, "addKey+setValueAtKey").classification, "THROWS");
		assertEq("audio cap throws tv", methodNamed(probed.attempts, "setTimeVarying").classification, "THROWS");
		assertEq("audio cap throws live", param.getValue(), 1);
		assertEq("audio cap throws noneWrote", probed.noneWrote, true);

		param = capParam(1, {});
		clipCap = audioClip([{
			displayName: "Volume",
			matchName: "",
			properties: [param]
		}]);
		clipCap.start = 0;
		probed = AudioLevelCapabilityProbe.run(clipCap, {
			componentDisplayName: "Volume",
			parameterDisplayName: "Level"
		});
		assert("audio cap extra setColorValue listed", (function () {
			var n;
			for (n = 0; n < probed.extraWriteMethods.length; n++) {
				if (probed.extraWriteMethods[n].name === "setColorValue") {
					return probed.extraWriteMethods[n].classification === "UNSAFE_TO_TEST" &&
						probed.extraWriteMethods[n].tested === false;
				}
			}
			return false;
		}()));
	}());

	assertEq("audio wiring button", AudioWriteTestWiring.BUTTON_ID, "test-audio-parameter-write-btn");
	assertEq("audio wiring host", AudioWriteTestWiring.HOST_FUNCTION, "debugAudioParameterWriteTest");
	assertEq("audio wiring resolver", AudioWriteTestWiring.RESOLVER_USED, "AudioParameterDiscover.resolve");
	assert("audio wiring eval is debug host", AudioWriteTestWiring.buildEvalScript({}).indexOf("$._pickfx.debugAudioParameterWriteTest(") !== -1);
	assertEq("audio wiring not generic", AudioWriteTestWiring.scriptCallsGenericParameterWrite(AudioWriteTestWiring.buildEvalScript({})), false);

	assertEq("audio seed registry still 26", ConfirmedParameterWrites.all().length, 26);
	assertEq("audio motion still production", ConfirmedParameterWrites.isProductionEnabled("Scale", "Motion"), true);
	assertEq("audio crop still production", ConfirmedParameterWrites.isProductionEnabled("Left", "Crop"), true);
	assertEq("audio opacity still production", ConfirmedParameterWrites.isProductionEnabled("Opacity", "Opacity"), true);
	assertEq("audio lumetri still production", ConfirmedParameterWrites.isProductionEnabled("Temperature", "Lumetri Color"), true);
	assertEq("audio volume not production", ConfirmedParameterWrites.lookup("Volume", "Level"), null);
	assertEq("audio volume not enabled", ConfirmedParameterWrites.isProductionEnabled("Level", "Volume"), false);
	assertEq("audio routing scale still clip", CommandParser.parseClipParameter("Scale 120", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("audio routing temperature still clip", CommandParser.parseClipParameter("Temperature 10", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("audio routing blur still effect", CommandParser.parseClipParameter("Gaussian Blur 50", PREMIERE_EFFECTS, {}).handledByEffectNumeric, true);
	assertEq("audio routing opacity still clip", CommandParser.parseClipParameter("Opacity 50", PREMIERE_EFFECTS, {}).isClipParameter, true);
	assertEq("audio routing crop left still clip", CommandParser.parseClipParameter("Crop Left 10", PREMIERE_EFFECTS, {}).isClipParameter, true);
}());
