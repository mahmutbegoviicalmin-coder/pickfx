(function () {
	var csInterface = new CSInterface();
	var resultEl = document.getElementById("result");
	var pingBtn = document.getElementById("ping-btn");
	var selectionBtn = document.getElementById("selection-btn");
	var discoverBtn = document.getElementById("discover-btn");
	var inspectEffectsBtn = document.getElementById("inspect-effects-btn");
	var inspectClipParamsBtn = document.getElementById("inspect-clip-params-btn");
	var inspectMotionScaleBtn = document.getElementById("inspect-motion-scale-btn");
	var testScaleSemanticsBtn = document.getElementById("test-scale-semantics-btn");
	var universalInspectBtn = document.getElementById("universal-inspect-btn");
	var scanNumericCandidatesBtn = document.getElementById("scan-numeric-candidates-btn");
	var findOpacityBtn = document.getElementById("find-opacity-btn");
	var findTypedBtn = document.getElementById("find-typed-btn");
	var inspectEffectInput = document.getElementById("inspect-effect-input");
	var inspectParameterInput = document.getElementById("inspect-parameter-input");
	var inspectComponentMatchInput = document.getElementById("inspect-component-match-input");
	var inspectParameterMatchInput = document.getElementById("inspect-parameter-match-input");
	var inspectParamBtn = document.getElementById("inspect-param-btn");
	var inspectAllParamsBtn = document.getElementById("inspect-all-params-btn");
	var inspectBooleanCandidateBtn = document.getElementById("inspect-boolean-candidate-btn");
	var testBooleanWriteBtn = document.getElementById("test-boolean-write-btn");
	var testMotionWriteBtn = document.getElementById("test-motion-write-btn");
	var testParameterWriteBtn = document.getElementById("test-parameter-write-btn");
	var testNumericParameterWriteBtn = document.getElementById("test-numeric-parameter-write-btn");
	var inspectColorParamsBtn = document.getElementById("inspect-color-params-btn");
	var inspectAudioParamsBtn = document.getElementById("inspect-audio-params-btn");
	var inspectEnumParamsBtn = document.getElementById("inspect-enum-params-btn");
	var diagnoseBlendModeBtn = document.getElementById("diagnose-blend-mode-btn");
	var inspectSaturationMatchesBtn = document.getElementById("inspect-saturation-matches-btn");
	var inspectLumetriIdentityBtn = document.getElementById("inspect-lumetri-identity-btn");
	var testColorParameterWriteBtn = document.getElementById("test-color-parameter-write-btn");
	var testAudioParameterWriteBtn = document.getElementById("test-audio-parameter-write-btn");
	var testEnumParameterWriteBtn = document.getElementById("test-enum-parameter-write-btn");
	var diagnoseAudioLevelSetValueBtn = document.getElementById("diagnose-audio-level-setvalue-btn");
	var probeAudioLevelCapabilityBtn = document.getElementById("probe-audio-level-capability-btn");
	var copyInspectJsonBtn = document.getElementById("copy-inspect-json-btn");
	var hostLoaded = false;
	var paramModulesLoaded = false;
	var refreshBtn = document.getElementById("refresh-btn");
	var applyBtn = document.getElementById("apply-btn");
	var searchInput = document.getElementById("search-input");
	var searchResults = document.getElementById("search-results");
	var indexStatus = document.getElementById("index-status");
	var applyStatus = document.getElementById("apply-status");
	var debugPanel = document.getElementById("debug-panel");
	var searchIcon = document.getElementById("search-icon");
	var settingsBtn = document.getElementById("settings-btn");
	var clearSearchBtn = document.getElementById("clear-search-btn");
	var countMark = document.getElementById("count-mark");
	var searchWrap = document.querySelector(".search-wrap");
	var barFooter = document.querySelector(".bar-footer");
	var commandBar = document.querySelector(".command-bar");
	var footerResultCount = document.getElementById("footer-result-count");
	var aliases = {};
	var currentMatches = [];
	var currentRows = [];
	var lastTypedScan = null;
	var selectedIndex = 0;
	var applying = false;
	var statusTimer = null;
	var leaveTimer = null;
	var FEEDBACK_MS = 1800;
	var LEAVE_MS = 160;
	var discoverToken = 0;
	var parameterCache = {};
	var lastEffectMatches = [];
	var lastParameterSuggestions = [];
	var lastIdentity = null;
	var lastCommandPreview = null;
	var lumetriPickerSession = null;
	var pendingClipCommand = null;

	if (searchIcon) {
		searchIcon.innerHTML = EffectIcons.search();
	}
	if (settingsBtn) {
		settingsBtn.innerHTML = EffectIcons.ellipsis ? EffectIcons.ellipsis() : EffectIcons.gear();
	}
	if (countMark) {
		countMark.innerHTML = EffectIcons.fxMark();
	}

	function hostJsxPath() {
		var root = csInterface.getSystemPath(SystemPath.EXTENSION);
		return (root + "/src/premiere/host.jsx").replace(/\\/g, "/");
	}

	function focusSearch() {
		searchInput.focus();
	}

	function showDebugJson(value) {
		writeJsonTo(resultEl, value);
	}

	function copyDebugJson() {
		var text = resultEl ? String(resultEl.textContent || "") : "";
		var ok = false;
		var area;
		if (!text || text === "Debug JSON") {
			if (copyInspectJsonBtn) {
				copyInspectJsonBtn.textContent = "Nothing to copy";
				setTimeout(function () {
					copyInspectJsonBtn.textContent = "Copy JSON";
				}, 1200);
			}
			return;
		}
		try {
			if (typeof cep !== "undefined" && cep.util && typeof cep.util.copyToClipboard === "function") {
				cep.util.copyToClipboard(text);
				ok = true;
			}
		} catch (ignoreCep) {}
		if (!ok) {
			try {
				area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "readonly");
				area.style.position = "fixed";
				area.style.left = "-9999px";
				document.body.appendChild(area);
				area.select();
				ok = document.execCommand("copy");
				document.body.removeChild(area);
			} catch (ignoreExec) {
				ok = false;
			}
		}
		if (copyInspectJsonBtn) {
			copyInspectJsonBtn.textContent = ok ? "Copied" : "Copy failed";
			setTimeout(function () {
				copyInspectJsonBtn.textContent = "Copy JSON";
			}, 1200);
		}
	}

	function writeJsonTo(el, value) {
		if (!el) {
			return;
		}
		if (typeof value === "string") {
			try {
				el.textContent = JSON.stringify(JSON.parse(value), null, 2);
				return;
			} catch (ignore) {
				el.textContent = value;
				return;
			}
		}
		el.textContent = JSON.stringify(value, null, 2);
	}

	function setInspectButtonReady(ready) {
		hostLoaded = !!ready;
		if (inspectEffectsBtn) {
			inspectEffectsBtn.disabled = !hostLoaded;
		}
		if (inspectClipParamsBtn) {
			inspectClipParamsBtn.disabled = !hostLoaded;
		}
		if (inspectMotionScaleBtn) {
			inspectMotionScaleBtn.disabled = !hostLoaded;
		}
		if (testScaleSemanticsBtn) {
			testScaleSemanticsBtn.disabled = !hostLoaded;
		}
		if (universalInspectBtn) {
			universalInspectBtn.disabled = !hostLoaded;
		}
		if (scanNumericCandidatesBtn) {
			scanNumericCandidatesBtn.disabled = !hostLoaded;
		}
		if (findOpacityBtn) {
			findOpacityBtn.disabled = !hostLoaded;
		}
		if (findTypedBtn) {
			findTypedBtn.disabled = !hostLoaded;
		}
		if (inspectBooleanCandidateBtn) {
			inspectBooleanCandidateBtn.disabled = !hostLoaded;
		}
		if (testBooleanWriteBtn) {
			testBooleanWriteBtn.disabled = !hostLoaded;
		}
		if (testMotionWriteBtn) {
			testMotionWriteBtn.disabled = !hostLoaded;
		}
		if (testParameterWriteBtn) {
			testParameterWriteBtn.disabled = !hostLoaded;
		}
		if (testNumericParameterWriteBtn) {
			testNumericParameterWriteBtn.disabled = !hostLoaded;
		}
		if (inspectColorParamsBtn) {
			inspectColorParamsBtn.disabled = !hostLoaded;
		}
		if (inspectAudioParamsBtn) {
			inspectAudioParamsBtn.disabled = !hostLoaded;
		}
		if (inspectEnumParamsBtn) {
			inspectEnumParamsBtn.disabled = !hostLoaded;
		}
		if (diagnoseBlendModeBtn) {
			diagnoseBlendModeBtn.disabled = !hostLoaded;
		}
		if (inspectSaturationMatchesBtn) {
			inspectSaturationMatchesBtn.disabled = !hostLoaded;
		}
		if (inspectLumetriIdentityBtn) {
			inspectLumetriIdentityBtn.disabled = !hostLoaded;
		}
		if (testColorParameterWriteBtn) {
			testColorParameterWriteBtn.disabled = !hostLoaded;
		}
		if (testAudioParameterWriteBtn) {
			testAudioParameterWriteBtn.disabled = !hostLoaded;
		}
		if (testEnumParameterWriteBtn) {
			testEnumParameterWriteBtn.disabled = !hostLoaded;
		}
		if (diagnoseAudioLevelSetValueBtn) {
			diagnoseAudioLevelSetValueBtn.disabled = !hostLoaded;
		}
		if (probeAudioLevelCapabilityBtn) {
			probeAudioLevelCapabilityBtn.disabled = !hostLoaded;
		}
	}

	function humanError(payload) {
		var firstError;
		if (payload && payload.reason === "NO_VIDEO_SELECTION") {
			return "Select a video clip first.";
		}
		if (payload && payload.reason === "NO_AUDIO_SELECTION") {
			return "Select an audio clip first.";
		}
		if (payload && payload.reason === "PARAMETER_NOT_FOUND") {
			return "Parameter not found.";
		}
		if (payload && payload.reason === "COLOR_WRITE_TEST_PATH_NOT_LOADED") {
			return "Couldn't complete that action.";
		}
		if (payload && payload.reason === "AUDIO_WRITE_TEST_PATH_NOT_LOADED") {
			return "Couldn't complete that action.";
		}
		if (payload && payload.reason === "ENUM_WRITE_TEST_PATH_NOT_LOADED") {
			return "Couldn't complete that action.";
		}
		if (payload && payload.reason === "BLEND_MODE_NOT_EXPOSED_AS_COMPONENT_PARAM") {
			return "Couldn't apply Blend Mode.";
		}
		if (payload && payload.reason === "BLEND_MODE_ENUM_METADATA_UNAVAILABLE") {
			return "Couldn't apply Blend Mode.";
		}
		if (payload && payload.reason === "BLEND_MODE_ENUM_METADATA_AVAILABLE") {
			return "Couldn't apply Blend Mode.";
		}
		if (payload && payload.reason === "AUDIO_SETVALUE_DIAGNOSE_NOT_LOADED") {
			return "Couldn't complete that action.";
		}
		if (payload && payload.reason === "AUDIO_CAPABILITY_PROBE_NOT_LOADED") {
			return "Couldn't complete that action.";
		}
		if (payload && payload.reason === "EFFECT_NOT_FOUND") {
			return "Effect not found.";
		}
		if (payload && payload.reason === "INVALID_VALUE") {
			return "Invalid value.";
		}
		if (payload && payload.reason === "OUT_OF_RANGE" || payload && payload.reason === "VALUE_OUT_OF_RANGE") {
			return "Value out of range.";
		}
		if (payload && payload.reason === "TYPE_NOT_WRITABLE" || payload && payload.reason === "UNSUPPORTED_TYPE") {
			return "Parameter type not writable yet.";
		}
		if (payload && payload.reason === "PARAMETER_NOT_WRITABLE") {
			return "Parameter is not writable.";
		}
		if (payload && payload.reason === "WRITE_FAILED") {
			return "Could not write parameter.";
		}
		if (payload && payload.reason === "ENUM_OPTION_NOT_FOUND") {
			return "Enum option not found.";
		}
		if (payload && payload.reason === "VERIFY_FAILED" || payload && payload.reason === "VALUE_NOT_VERIFIED") {
			return "Value could not be verified.";
		}
		if (payload && payload.reason === "PARAMETER_TIME_VARYING_UNSUPPORTED") {
			return "This parameter is time-varying.";
		}
		if (payload && payload.reason === "UNSUPPORTED_OPERATION") {
			return payload.status || "This operation is not writable.";
		}
		if (payload && payload.status) {
			if (/WRITE_FAILED|setValue|PremiereBridge|ComponentParam|productionEnabled|EvalScript|host\.jsx|\bQE\b/i.test(String(payload.status))) {
				return payload.effect ? ("Couldn't apply " + payload.effect + ".") : "Couldn't complete that action.";
			}
			return payload.status;
		}
		if (payload && payload.errors && payload.errors.length) {
			firstError = payload.errors[0];
			if (firstError.clip && firstError.reason) {
				return firstError.reason.replace(/\.$/, "") + " (" + firstError.clip + ").";
			}
			if (firstError.reason) {
				return firstError.reason;
			}
		}
		if (payload && payload.effect) {
			return "Could not apply " + payload.effect + ".";
		}
		return "Could not apply effect.";
	}

	function isLumetriPickerPayload(payload) {
		if (typeof LumetriPicker !== "undefined" && LumetriPicker.isPickerPayload) {
			return LumetriPicker.isPickerPayload(payload);
		}
		return !!(payload && (payload.uiKind === "choose-lumetri" || payload.uiKind === "choose-parameter"));
	}

	function appendLumetriPickerRow(choice, index) {
		var row = document.createElement("div");
		row.className = "result-row is-picker" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "lumetri-choice");
		appendRowBody(
			row,
			iconForLabel((choice && choice.displayName) || (choice && choice.title) || "Lumetri Color"),
			(choice && choice.title) || "Lumetri Color",
			(choice && choice.subtitle) || ""
		);
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push({
			kind: "lumetri-choice",
			choice: choice
		});
	}

	function renderLumetriPicker() {
		var i;
		var choices;
		if (!lumetriPickerSession || !lumetriPickerSession.isActive()) {
			return;
		}
		choices = lumetriPickerSession.choices || [];
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		lastEffectMatches = [];
		lastParameterSuggestions = [];
		appendSection(lumetriPickerSession.sectionTitle || "CHOOSE LUMETRI");
		selectedIndex = lumetriPickerSession.selectedIndex();
		for (i = 0; i < choices.length; i++) {
			appendLumetriPickerRow(choices[i], i);
		}
		updateSelectionHighlight();
		scrollSelectedIntoView();
	}

	function paintLumetriPicker(payload, clipCmd) {
		if (typeof LumetriPicker === "undefined" || !LumetriPicker.createSession) {
			pendingClipCommand = null;
			applyStatus.className = "is-info";
			applyStatus.textContent = visibleApplyMessage(payload).footer;
			setFooterFeedback(true);
			focusSearch();
			return;
		}
		lumetriPickerSession = LumetriPicker.createSession(payload, clipCmd);
		selectedIndex = 0;
		applyStatus.className = "";
		applyStatus.textContent = "";
		setFooterFeedback(false);
		renderLumetriPicker();
		focusSearch();
	}

	function confirmLumetriPicker() {
		var result;
		if (!lumetriPickerSession || !lumetriPickerSession.isActive()) {
			return;
		}
		result = lumetriPickerSession.confirm();
		lumetriPickerSession = null;
		if (!result || result.cancelled || !result.clipCmd) {
			renderSearch();
			return;
		}
		runClipParameterCommand(result.clipCmd);
	}

	function cancelLumetriPicker(silent) {
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			lumetriPickerSession.cancel();
		}
		lumetriPickerSession = null;
		pendingClipCommand = null;
		if (!silent) {
			renderSearch();
			applyStatus.className = "";
			applyStatus.textContent = "";
			setFooterFeedback(false);
			focusSearch();
		}
	}

	function showApplyFeedback(payload) {
		var name = (payload && payload.effect) ? payload.effect : "Effect";
		var applied = payload && payload.applied ? payload.applied : 0;
		var partial = payload && payload.clipParameter &&
			payload.successfulCount > 0 && payload.failedCount > 0;
		var msg;

		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}

		if (isLumetriPickerPayload(payload)) {
			paintLumetriPicker(payload, pendingClipCommand);
			return;
		}

		pendingClipCommand = null;

		if (payload && payload.ok && (payload.command || applied > 0)) {
			paintSuccessResult(payload);
			paintSuccessStatus(successFooter(payload));
			setFooterFeedback(true);
			schedulePaletteRestore();
			focusSearch();
			return;
		}

		if (payload && payload.clipParameter) {
			paintApplyResult(payload);
		} else if (payload && !payload.ok) {
			paintApplyResult(payload);
		}

		applyStatus.className = "";
		if (partial) {
			applyStatus.className = "is-warn";
			applyStatus.textContent = visibleApplyMessage(payload).footer;
			setFooterFeedback(true);
			statusTimer = setTimeout(function () {
				setFooterFeedback(false);
				statusTimer = null;
			}, FEEDBACK_MS);
			focusSearch();
			return;
		}

		msg = visibleApplyMessage(payload);
		applyStatus.className = "is-info";
		applyStatus.textContent = msg.footer;
		setFooterFeedback(true);
		focusSearch();
	}

	function visibleApplyMessage(payload) {
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.userFacingMessage) {
			return CommandPaletteState.userFacingMessage(payload);
		}
		return {
			title: humanError(payload),
			detail: "",
			footer: humanError(payload)
		};
	}

	function successFooter(payload) {
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.successView) {
			return CommandPaletteState.successView(payload).footer;
		}
		return "Applied successfully";
	}

	function successHoldMs() {
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.SUCCESS_HOLD_MS) {
			return CommandPaletteState.SUCCESS_HOLD_MS;
		}
		return FEEDBACK_MS;
	}

	function beginApplying() {
		var row = searchResults ? searchResults.querySelector(".result-row.is-selected") : null;
		var label = typeof CommandPaletteState !== "undefined" && CommandPaletteState.applyingLabel
			? CommandPaletteState.applyingLabel()
			: "Applying...";
		if (row) {
			row.classList.add("is-applying");
		}
		setApplying(true);
		applyStatus.className = "is-info is-applying-status";
		applyStatus.textContent = label;
		setFooterFeedback(true);
	}

	function schedulePaletteRestore() {
		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}
		statusTimer = setTimeout(function () {
			setFooterFeedback(false);
			if (!lumetriPickerSession || !lumetriPickerSession.isActive()) {
				renderSearch();
			}
			statusTimer = null;
		}, successHoldMs());
	}

	function formatCommandSuccess(payload) {
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.successHeadline) {
			return CommandPaletteState.successHeadline(payload);
		}
		return "✓ Command";
	}

	function escapeHtml(text) {
		return String(text == null ? "" : text)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function paintSuccessStatus(text) {
		var label = String(text || "").replace(/^✓\s*/, "");
		applyStatus.className = "is-ok";
		if (typeof EffectIcons !== "undefined" && EffectIcons.check) {
			applyStatus.innerHTML = '<span class="status-check">' + EffectIcons.check() +
				'</span><span class="status-copy">' + escapeHtml(label) + "</span>";
		} else {
			applyStatus.textContent = text;
		}
	}

	function setApplying(on) {
		if (!commandBar) {
			return;
		}
		if (on) {
			commandBar.classList.add("is-applying");
		} else {
			commandBar.classList.remove("is-applying");
		}
	}

	function setFooterFeedback(visible) {
		if (!barFooter) {
			return;
		}
		if (leaveTimer) {
			clearTimeout(leaveTimer);
			leaveTimer = null;
		}
		barFooter.classList.remove("is-leaving");
		if (visible) {
			barFooter.classList.add("has-feedback");
			barFooter.classList.remove("is-settling");
			if (barFooter.offsetWidth) {
				barFooter.classList.add("is-settling");
			}
		} else if (barFooter.classList.contains("has-feedback")) {
			barFooter.classList.remove("is-settling");
			barFooter.classList.add("is-leaving");
			leaveTimer = setTimeout(function () {
				barFooter.classList.remove("has-feedback");
				barFooter.classList.remove("is-leaving");
				if (applyStatus) {
					applyStatus.textContent = "";
					applyStatus.className = "";
				}
				leaveTimer = null;
			}, LEAVE_MS);
		} else {
			barFooter.classList.remove("has-feedback");
			barFooter.classList.remove("is-settling");
		}
	}

	function setDebugMode(enabled) {
		if (!debugPanel) {
			return;
		}
		if (enabled) {
			debugPanel.removeAttribute("hidden");
			document.body.classList.add("debug-mode");
			if (settingsBtn) {
				settingsBtn.classList.add("is-on");
			}
		} else {
			debugPanel.setAttribute("hidden", "hidden");
			document.body.classList.remove("debug-mode");
			if (settingsBtn) {
				settingsBtn.classList.remove("is-on");
			}
		}
	}

	function loadHost(done) {
		evalHostFile("/src/premiere/host.jsx", function (hostOk, hostPath) {
			if (!hostOk) {
				showDebugJson({
					ok: false,
					error: "Failed to load host.jsx",
					path: hostPath
				});
				applyStatus.className = "is-error";
				applyStatus.textContent = "Could not connect to Premiere.";
				setFooterFeedback(true);
				paramModulesLoaded = false;
				if (done) {
					done(false);
				}
				return;
			}

			evalHostFile("/src/core/TypedCandidateClassifier.js", function (classifierOk) {
				evalHostFile("/src/core/BooleanCandidateInspect.js", function (booleanInspectOk) {
					evalHostFile("/src/core/ParameterResolver.js", function (resolverOk) {
						evalHostFile("/src/core/ParameterEngine.js", function (engineOk) {
							evalHostFile("/src/core/ParameterWriter.js", function (writerOk) {
								paramModulesLoaded = !!(resolverOk && writerOk);
								if (!paramModulesLoaded) {
									showDebugJson({
										ok: false,
										error: "Failed to load ParameterResolver.js or ParameterWriter.js"
									});
								} else if (!engineOk) {
									showDebugJson({
										ok: false,
										error: "Failed to load ParameterEngine.js"
									});
								} else if (!classifierOk) {
									showDebugJson({
										ok: false,
										error: "Failed to load TypedCandidateClassifier.js"
									});
								} else if (!booleanInspectOk) {
									showDebugJson({
										ok: false,
										error: "Failed to load BooleanCandidateInspect.js"
									});
								}
								evalHostFile("/src/core/BooleanWriteTest.js", function (writeTestOk) {
									evalHostFile("/src/core/BatchNumericExecutor.js", function (batchOk) {
										evalHostFile("/src/core/PointValue.js", function (pointOk) {
											evalHostFile("/src/core/ParameterValueType.js", function (typeOk) {
												evalHostFile("/src/core/SpeedOperation.js", function (speedOk) {
													evalHostFile("/src/core/MotionParameterInspect.js", function (motionOk) {
														evalHostFile("/src/core/PointParameterWriter.js", function (pointWriterOk) {
																evalHostFile("/src/core/ClipParameterWriter.js", function (clipOk) {
																	evalHostFile("/src/core/MotionWriteTest.js", function (motionWriteOk) {
		var extraHost = [
			"/src/core/ConfirmedParameterWrites.js",
			"/src/core/SafeNumericTestValue.js",
			"/src/core/NumericCandidateClassifier.js",
			"/src/core/ParameterCapability.js",
			"/src/core/UniversalParameterInspect.js",
			"/src/core/UniversalParameterResolver.js",
			"/src/core/NumberParameterWriter.js",
			"/src/core/BooleanParameterWriter.js",
			"/src/core/ColorParameterWriter.js",
			"/src/core/EnumParameterWriter.js",
			"/src/core/StringParameterWriter.js",
			"/src/core/UniversalParameterWriter.js",
			"/src/core/NumericCandidateScan.js",
			"/src/core/ParameterWriteTest.js",
			"/src/core/ColorWriteTestWiring.js",
			"/src/core/ColorParameterDiscover.js",
			"/src/core/LumetriPicker.js",
			"/src/core/LumetriInstanceIdentityInspect.js",
			"/src/core/ColorParameterWriteTest.js",
			"/src/core/AudioWriteTestWiring.js",
			"/src/core/AudioParameterDiscover.js",
			"/src/core/AudioParameterWriteTest.js",
			"/src/core/AudioLevelCapabilityProbe.js",
			"/src/core/EnumWriteTestWiring.js",
			"/src/core/EnumParameterDiscover.js",
			"/src/core/EnumParameterWriteTest.js",
			"/src/core/BlendModeDiagnostic.js",
			"/src/core/MotionScaleDiscover.js",
			"/src/core/MotionScaleSemanticsTest.js"
		];
																		function loadExtra(index) {
																			if (index >= extraHost.length) {
																				if (!writeTestOk) {
																					showDebugJson({
																						ok: false,
																						error: "Failed to load BooleanWriteTest.js"
																					});
																				} else if (!batchOk) {
																					showDebugJson({
																						ok: false,
																						error: "Failed to load BatchNumericExecutor.js"
																					});
																				} else if (!pointOk || !typeOk || !speedOk || !motionOk || !pointWriterOk || !clipOk || !motionWriteOk) {
																					showDebugJson({
																						ok: false,
																						error: "Failed to load clip parameter modules"
																					});
																				}
																				if (done) {
																					done(true);
																				}
																				return;
																			}
																			evalHostFile(extraHost[index], function (extraOk, extraPath, extraResult) {
																				if (!extraOk) {
																					showDebugJson({
																						ok: false,
																						error: "Failed to load " + extraHost[index],
																						path: extraPath || extraHost[index],
																						evalResult: extraResult
																					});
																				}
																				loadExtra(index + 1);
																			});
																		}
																		loadExtra(0);
																	});
																});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	}

	function evalHostFile(relativePath, done) {
		var root = csInterface.getSystemPath(SystemPath.EXTENSION);
		var path = (root + relativePath).replace(/\\/g, "/");
		var script = '$.evalFile("' + path.replace(/"/g, '\\"') + '")';
		csInterface.evalScript(script, function (result) {
			done(result !== EvalScript_ErrMessage, path, result);
		});
	}

	function loadAliases(done) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "../data/aliases.json", true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status === 200 || xhr.status === 0) {
				try {
					aliases = JSON.parse(xhr.responseText) || {};
				} catch (ignore) {
					aliases = {};
				}
			}
			done();
		};
		xhr.onerror = function () {
			aliases = {};
			done();
		};
		xhr.send();
	}

	function updateIndexStatus() {
		if (!indexStatus) {
			return;
		}
		indexStatus.textContent = "";
		indexStatus.className = "effect-count vis-hidden";
	}

	function effectsFromNames(names) {
		var effects = [];
		var i;
		var found;
		for (i = 0; i < names.length; i++) {
			found = EffectRegistry.findByPremiereName(names[i]);
			if (found) {
				effects.push(found);
			}
		}
		return effects;
	}

	function selectedRow() {
		if (!currentRows.length) {
			return null;
		}
		if (selectedIndex < 0 || selectedIndex >= currentRows.length) {
			return null;
		}
		return currentRows[selectedIndex];
	}

	function selectedEffect() {
		var row = selectedRow();
		if (!row) {
			return null;
		}
		return row.effect || null;
	}

	function scrollSelectedIntoView() {
		var selected = searchResults.querySelector(".is-selected");
		if (selected && selected.scrollIntoView) {
			selected.scrollIntoView({ block: "nearest" });
		}
		syncFooterMeta();
	}

	function appendSection(title) {
		var label = document.createElement("div");
		label.className = "section-label";
		label.textContent = title;
		searchResults.appendChild(label);
	}

	function staggerRow(row, index) {
		var delay = Math.min(index, 12) * 22 + "ms";
		row.style.webkitAnimationDelay = delay;
		row.style.animationDelay = delay;
	}

	function syncStageMode(hasQuery, hasRows) {
		if (!commandBar) {
			return;
		}
		commandBar.classList.toggle("is-centered", !hasQuery && !hasRows);
		commandBar.classList.toggle("is-searching", !!hasQuery);
	}

	function syncFooterMeta() {
		var n;
		if (!footerResultCount) {
			return;
		}
		n = currentRows.length;
		if (!n) {
			footerResultCount.textContent = "";
			return;
		}
		footerResultCount.textContent = n === 1 ? "1 effect" : n + " effects";
	}

	function appendKbd(row) {
		var action = document.createElement("span");
		action.className = "result-action";
		action.innerHTML = 'Apply <span class="keycap">↵</span>';
		row.appendChild(action);
	}

	function iconForLabel(name) {
		var category = "generic";
		if (typeof EffectIconResolver !== "undefined" && EffectIconResolver.resolve) {
			category = EffectIconResolver.resolve(name);
		}
		if (typeof EffectIcons !== "undefined" && EffectIcons.category) {
			return EffectIcons.category(category);
		}
		return "";
	}

	function appendRowBody(row, iconHtml, title, subtitle) {
		var well = document.createElement("span");
		var icon = document.createElement("span");
		var body = document.createElement("div");
		var nameEl = document.createElement("span");
		var subEl;

		well.className = "icon-well";
		icon.className = "effect-icon";
		icon.innerHTML = iconHtml;
		well.appendChild(icon);
		body.className = "result-body";
		nameEl.className = "effect-name";
		nameEl.textContent = title;
		body.appendChild(nameEl);
		if (subtitle) {
			subEl = document.createElement("span");
			subEl.className = "result-sub";
			subEl.textContent = subtitle;
			body.appendChild(subEl);
		}
		row.appendChild(well);
		row.appendChild(body);
		return nameEl;
	}

	function appendRow(effect, index) {
		var row = document.createElement("div");
		var heart = document.createElement("button");
		var favorite = FavoritesStore.has(effect.premiereName);

		row.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "effect");

		appendRowBody(row, iconForLabel(effect.name), effect.name, "Video Effect");

		heart.className = "heart-btn" + (favorite ? " is-on" : "");
		heart.type = "button";
		heart.setAttribute("data-action", "favorite");
		heart.setAttribute("data-name", effect.premiereName);
		heart.setAttribute("aria-label", favorite ? "Remove favorite" : "Add favorite");
		heart.innerHTML = EffectIcons.heart(favorite);

		row.appendChild(heart);
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push({
			kind: "effect",
			effect: effect
		});
	}

	function appendRecentCommandRow(entry, index) {
		var row = document.createElement("div");
		var iconSource = (entry && (entry.parameter || entry.name || entry.title || entry.query)) || "";

		row.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "recent-command");
		row.setAttribute("data-query", entry.query);

		appendRowBody(row, iconForLabel(iconSource), entry.title || entry.query, "Recent");
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push({
			kind: "recent-command",
			query: entry.query,
			name: entry.name,
			parameter: entry.parameter,
			value: entry.value
		});
	}

	function rememberRecent(payload, effectName) {
		var query = String(searchInput.value || "").replace(/^\s+|\s+$/g, "");
		var name = effectName || (payload && payload.effect) || "";
		var label = query;
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.recentLabel) {
			label = CommandPaletteState.recentLabel(payload, query);
		}
		if (payload && payload.ok && payload.command && (label || query)) {
			RecentStore.add({
				kind: "command",
				query: label || query,
				title: label || query,
				name: name,
				parameter: payload.parameter || "",
				value: payload.value !== undefined ? payload.value : payload.requestedValue
			});
			return;
		}
		if (payload && payload.ok && name) {
			RecentStore.add({
				kind: "effect",
				name: name
			});
		}
	}

	function appendParameterRow(effect, param, index) {
		var row = document.createElement("div");
		var parentName = effect && effect.name ? effect.name : "Effect";

		row.className = "result-row is-param" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "parameter");
		row.setAttribute("data-parameter", param.displayName);

		appendRowBody(row, iconForLabel(param.displayName || parentName), param.displayName, parentName + " parameter");
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push({
			kind: "parameter",
			effect: effect,
			displayName: param.displayName
		});
	}

	function paintEmpty(message, kind, detail) {
		var empty = document.createElement("div");
		var copy;
		var hint;
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		lastEffectMatches = [];
		if (kind === "idle") {
			syncStageMode(false, false);
			selectedIndex = 0;
			syncFooterMeta();
			return;
		}
		empty.className = "result-empty";
		copy = document.createElement("div");
		copy.className = "empty-title";
		copy.textContent = message;
		empty.appendChild(copy);
		if (detail) {
			hint = document.createElement("div");
			hint.className = "empty-copy";
			hint.textContent = detail;
			empty.appendChild(hint);
		}
		searchResults.appendChild(empty);
		syncStageMode(true, false);
		selectedIndex = 0;
		syncFooterMeta();
	}

	function appendText(parent, className, text) {
		var el = document.createElement("div");
		el.className = className;
		el.textContent = text;
		parent.appendChild(el);
		return el;
	}

	function paintParameterCommand(preview) {
		var card = document.createElement("div");
		var well = document.createElement("span");
		var icon = document.createElement("span");
		var body = document.createElement("div");
		var i;

		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [{
			kind: "command",
			preview: preview,
			clipCmd: preview.clipCmd
		}];
		lastEffectMatches = [];
		lastParameterSuggestions = [];
		selectedIndex = 0;

		card.className = "result-row command-result is-selected" + (preview.reason === "INVALID_VALUE" ? " is-invalid" : "");
		card.setAttribute("data-index", "0");
		card.setAttribute("data-kind", "command");

		well.className = "icon-well";
		icon.className = "effect-icon";
		icon.innerHTML = iconForLabel(preview.parameter || preview.title || "parameter");
		well.appendChild(icon);
		body.className = "command-result-body";
		appendText(body, "command-result-title", preview.title || preview.parameter || "Parameter");
		if (preview.subtitle) {
			appendText(body, "command-result-sub", preview.subtitle);
		}
		if (preview.valueLines && preview.valueLines.length) {
			for (i = 0; i < preview.valueLines.length; i++) {
				appendText(body, "command-result-value", preview.valueLines[i]);
			}
		}
		card.appendChild(well);
		card.appendChild(body);
		appendKbd(card);
		staggerRow(card, 0);
		searchResults.appendChild(card);
		syncFooterMeta();
		syncStageMode(true, true);
	}

	function paintSuccessResult(payload) {
		var view;
		var card;
		var well;
		var icon;
		var body;
		var title;
		view = typeof CommandPaletteState !== "undefined" && CommandPaletteState.successView
			? CommandPaletteState.successView(payload)
			: {
				title: formatCommandSuccess(payload),
				detail: "Applied successfully"
			};
		title = String(view.title || "").replace(/^✓\s*/, "");
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [{
			kind: "command-result",
			payload: payload,
			preview: lastCommandPreview,
			success: true
		}];
		selectedIndex = 0;
		card = document.createElement("div");
		card.className = "result-row command-result is-selected is-ok is-success";
		card.setAttribute("data-index", "0");
		card.setAttribute("data-kind", "command-result");
		icon = document.createElement("span");
		icon.className = "effect-icon";
		if (typeof EffectIcons !== "undefined" && EffectIcons.check) {
			icon.innerHTML = EffectIcons.check();
		}
		well = document.createElement("span");
		well.className = "icon-well";
		well.appendChild(icon);
		body = document.createElement("div");
		body.className = "command-result-body";
		appendText(body, "command-result-title", title);
		if (view.detail) {
			appendText(body, "command-result-sub", view.detail);
		}
		card.appendChild(well);
		card.appendChild(body);
		staggerRow(card, 0);
		searchResults.appendChild(card);
		syncFooterMeta();
		syncStageMode(true, true);
	}

	function paintApplyResult(payload) {
		var card;
		var well;
		var icon;
		var body;
		var result;
		var msg;
		var headline;
		var detail;
		var state;
		result = typeof CommandPreview !== "undefined" && CommandPreview.fromApply
			? CommandPreview.fromApply(payload)
			: { state: "error" };
		msg = visibleApplyMessage(payload);
		headline = msg.title || (result && result.headline) || "Couldn't apply the command";
		detail = msg.detail || (result && result.detail) || "";
		if (typeof CommandPaletteState !== "undefined" && CommandPaletteState.sanitizeVisibleText) {
			headline = CommandPaletteState.sanitizeVisibleText(headline);
			detail = CommandPaletteState.sanitizeVisibleText(detail);
		}
		state = result && result.state ? result.state : "error";
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [{
			kind: "command-result",
			payload: payload,
			preview: lastCommandPreview
		}];
		selectedIndex = 0;
		card = document.createElement("div");
		card.className = "result-row command-result is-selected" +
			(state === "warn" ? " is-warn" : " is-info");
		card.setAttribute("data-index", "0");
		card.setAttribute("data-kind", "command-result");
		icon = document.createElement("span");
		icon.className = "effect-icon";
		if (typeof EffectIcons !== "undefined" && EffectIcons.info) {
			icon.innerHTML = EffectIcons.info();
		} else if (typeof EffectIcons !== "undefined" && EffectIcons.custom) {
			icon.innerHTML = EffectIcons.custom();
		}
		well = document.createElement("span");
		well.className = "icon-well";
		well.appendChild(icon);
		body = document.createElement("div");
		body.className = "command-result-body";
		appendText(body, "command-result-title", headline);
		if (detail) {
			appendText(body, "command-result-sub", detail);
		}
		card.appendChild(well);
		card.appendChild(body);
		staggerRow(card, 0);
		searchResults.appendChild(card);
		syncFooterMeta();
		syncStageMode(true, true);
	}

	function paintCustomFallback(state) {
		var row = document.createElement("div");
		var query = state && state.title ? state.title : String(searchInput.value || "");

		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		lastEffectMatches = [];
		lastParameterSuggestions = [];
		selectedIndex = 0;

		appendSection(state && state.section ? state.section : "CUSTOM");
		row.className = "result-row is-custom is-selected";
		row.setAttribute("data-index", "0");
		row.setAttribute("data-kind", "custom");
		appendRowBody(
			row,
			typeof EffectIcons !== "undefined" && EffectIcons.custom ? EffectIcons.custom() : "",
			query,
			state && state.subtitle ? state.subtitle : "Custom command"
		);
		appendKbd(row);
		staggerRow(row, 0);
		searchResults.appendChild(row);
		currentRows.push({
			kind: "custom",
			query: query
		});
		syncFooterMeta();
		syncStageMode(true, true);
	}

	function paintUnsupportedNotice(msg) {
		var card = document.createElement("div");
		var well = document.createElement("span");
		var icon = document.createElement("span");
		var body = document.createElement("div");

		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [{
			kind: "command-result",
			unsupported: true
		}];
		selectedIndex = 0;
		card.className = "result-row command-result is-selected is-unsupported";
		card.setAttribute("data-index", "0");
		card.setAttribute("data-kind", "command-result");
		well.className = "icon-well";
		icon.className = "effect-icon";
		if (typeof EffectIcons !== "undefined" && EffectIcons.info) {
			icon.innerHTML = EffectIcons.info();
		} else if (typeof EffectIcons !== "undefined" && EffectIcons.custom) {
			icon.innerHTML = EffectIcons.custom();
		}
		well.appendChild(icon);
		body.className = "command-result-body";
		appendText(body, "command-result-title", msg && msg.title ? msg.title : "Command not supported yet");
		appendText(body, "command-result-sub", msg && msg.detail ? msg.detail : "Try searching for an effect or parameter.");
		card.appendChild(well);
		card.appendChild(body);
		searchResults.appendChild(card);
	}

	function showUnsupportedCustomFeedback(query) {
		var msg = typeof CommandPaletteState !== "undefined" && CommandPaletteState.unsupportedFeedback
			? CommandPaletteState.unsupportedFeedback()
			: {
				title: "Command not supported yet",
				detail: "Try searching for an effect or parameter.",
				footer: "Command not supported yet"
			};
		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}
		applyStatus.className = "is-info";
		applyStatus.textContent = msg.footer;
		setFooterFeedback(true);
		paintUnsupportedNotice(msg);
		showDebugJson({
			ok: false,
			reason: "UNSUPPORTED_TYPE",
			status: "UNSUPPORTED_TYPE",
			uiKind: "unsupported-custom",
			query: query || String(searchInput.value || "")
		});
		statusTimer = setTimeout(function () {
			setFooterFeedback(false);
			renderSearch();
			statusTimer = null;
		}, FEEDBACK_MS);
		focusSearch();
	}

	function paletteStateForQuery(query) {
		var effects = EffectRegistry.getEffects();
		var preview;
		var searchQuery;
		var matches = [];
		preview = typeof CommandPreview !== "undefined" && CommandPreview.fromQuery
			? CommandPreview.fromQuery(query, effects, aliases)
			: { kind: "effect-search" };
		searchQuery = CommandParser.searchQuery(query, effects, aliases);
		if (EffectSearch.normalize(searchQuery) && preview.kind !== "parameter-command" && preview.kind !== "unknown-command") {
			matches = EffectSearch.search(searchQuery, effects, aliases);
		}
		if (typeof CommandPaletteState === "undefined" || !CommandPaletteState.fromInputs) {
			return {
				kind: preview.kind === "parameter-command" || preview.kind === "effect-command" || matches.length ? "supported" : "custom",
				showCustom: !(preview.kind === "parameter-command" || preview.kind === "effect-command" || matches.length),
				shouldExecute: preview.kind === "parameter-command" || preview.kind === "effect-command" || !!matches.length,
				query: query
			};
		}
		return CommandPaletteState.fromInputs(query, preview, matches);
	}

	function paintResults(matches, parameters, identity) {
		var i;
		var effect;
		var paramMatch;
		var wanted;

		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];

		if (!matches.length) {
			paintEmpty("No effects found", "none", "Try another search.");
			return;
		}

		appendSection("Results");
		for (i = 0; i < matches.length; i++) {
			appendRow(matches[i].effect, currentRows.length);
			currentMatches.push(matches[i].effect);
		}

		if (parameters && parameters.length && identity && identity.effect) {
			try {
				appendSection("Parameters");
				effect = identity.effect;
				for (i = 0; i < parameters.length; i++) {
					appendParameterRow(effect, parameters[i], currentRows.length);
				}
				if (identity.parameterQuery) {
					wanted = String(identity.parameterQuery).toLowerCase();
					paramMatch = -1;
					for (i = 0; i < parameters.length; i++) {
						if (parameters[i] && String(parameters[i].displayName || "").toLowerCase() === wanted) {
							paramMatch = i;
							break;
						}
					}
					if (paramMatch >= 0) {
						selectedIndex = matches.length + paramMatch;
					}
				}
			} catch (ignoreParams) {}
		}

		if (selectedIndex >= currentRows.length) {
			selectedIndex = Math.max(0, currentRows.length - 1);
		}
		scrollSelectedIntoView();
	}

	function shouldDiscoverParameters(identity) {
		return !!(
			identity &&
			!identity.isCommand &&
			identity.effect &&
			paramModulesLoaded
		);
	}

	function requestParameterSuggestions(identity) {
		var effectName;
		var cached;
		var token;

		if (!shouldDiscoverParameters(identity)) {
			lastParameterSuggestions = [];
			return;
		}

		effectName = identity.effect.premiereName;

		try {
			cached = parameterCache[effectName];
			if (cached && cached.ok) {
				lastParameterSuggestions = ParameterDiscovery.matching(
					cached.parameters,
					identity.parameterQuery
				);
				return;
			}
		} catch (ignoreCache) {
			lastParameterSuggestions = [];
			return;
		}

		lastParameterSuggestions = [];
		token = ++discoverToken;
		PremiereBridge.listEffectParameters(csInterface, effectName, function (listed) {
			var filtered;
			try {
				if (token !== discoverToken) {
					return;
				}
				if (!listed || !listed.ok || !listed.parameters) {
					lastParameterSuggestions = [];
					return;
				}
				filtered = ParameterDiscovery.userFacing(listed.parameters);
				parameterCache[effectName] = {
					ok: true,
					parameters: filtered
				};
				if (!lastIdentity || !lastIdentity.effect || lastIdentity.effect.premiereName !== effectName) {
					return;
				}
				lastParameterSuggestions = ParameterDiscovery.matching(
					filtered,
					lastIdentity.parameterQuery
				);
				paintResults(lastEffectMatches, lastParameterSuggestions, lastIdentity);
				syncStageMode(true, currentRows.length > 0);
			} catch (ignoreDiscover) {
				lastParameterSuggestions = [];
				try {
					paintResults(lastEffectMatches, [], lastIdentity);
					syncStageMode(true, currentRows.length > 0);
				} catch (ignorePaint) {}
			}
		});
	}

	function renderSearch() {
		var effects = EffectRegistry.getEffects();
		var identity = CommandParser.identify(searchInput.value, effects, aliases);
		var query = CommandParser.searchQuery(searchInput.value, effects, aliases);
		var recent;
		var favorites;
		var matches;
		var i;
		var found;
		var preview;
		var paletteState;

		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			renderLumetriPicker();
			return;
		}

		lastIdentity = identity;
		discoverToken += 1;
		lastCommandPreview = null;

		if (typeof CommandPreview !== "undefined" && CommandPreview.fromQuery) {
			preview = CommandPreview.fromQuery(searchInput.value, effects, aliases);
			lastCommandPreview = preview;
			if (preview.kind === "parameter-command") {
				paintParameterCommand(preview);
				return;
			}
		}

		if (!EffectSearch.normalize(query)) {
			searchResults.innerHTML = "";
			currentMatches = [];
			currentRows = [];
			lastEffectMatches = [];
			lastParameterSuggestions = [];

			recent = RecentStore.list();
			favorites = effectsFromNames(FavoritesStore.list());

			if (recent.length) {
				appendSection("Recent");
				for (i = 0; i < recent.length; i++) {
					if (recent[i] && recent[i].kind === "command" && recent[i].query) {
						appendRecentCommandRow(recent[i], currentRows.length);
					} else if (recent[i] && recent[i].name) {
						found = EffectRegistry.findByPremiereName(recent[i].name);
						if (found) {
							appendRow(found, currentRows.length);
							currentMatches.push(found);
						}
					}
				}
			}

			if (favorites.length) {
				appendSection("Favorites");
				for (i = 0; i < favorites.length; i++) {
					appendRow(favorites[i], currentRows.length);
					currentMatches.push(favorites[i]);
				}
			}

			if (!currentRows.length) {
				paintEmpty("Search effects or commands", "idle");
			} else {
				syncStageMode(false, true);
			}

			if (selectedIndex >= currentRows.length) {
				selectedIndex = Math.max(0, currentRows.length - 1);
			}
			scrollSelectedIntoView();
			return;
		}

		matches = EffectSearch.search(query, effects, aliases);
		lastEffectMatches = matches;
		paletteState = typeof CommandPaletteState !== "undefined" && CommandPaletteState.fromInputs
			? CommandPaletteState.fromInputs(searchInput.value, preview || lastCommandPreview, matches)
			: null;
		if (paletteState && paletteState.showCustom) {
			lastParameterSuggestions = [];
			paintCustomFallback(paletteState);
			return;
		}
		if (!paletteState && !matches.length) {
			lastParameterSuggestions = [];
			paintCustomFallback({
				title: String(searchInput.value || "").replace(/^\s+|\s+$/g, ""),
				subtitle: "Custom command",
				section: "CUSTOM"
			});
			return;
		}
		requestParameterSuggestions(identity);
		if (!matches.length) {
			lastParameterSuggestions = [];
		}
		paintResults(matches, lastParameterSuggestions, identity);
		syncStageMode(true, currentRows.length > 0);
	}

	function completeSelectedParameter() {
		var row = selectedRow();
		if (!row || row.kind !== "parameter" || !row.effect || !row.displayName) {
			return false;
		}
		searchInput.value = row.effect.name + " " + row.displayName;
		selectedIndex = 0;
		renderSearch();
		focusSearch();
		if (searchInput.setSelectionRange) {
			searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
		}
		return true;
	}

	function updateSelectionHighlight() {
		var rows = searchResults.querySelectorAll(".result-row");
		var i;
		for (i = 0; i < rows.length; i++) {
			if (i === selectedIndex) {
				rows[i].className = rows[i].className.replace(/\s*is-selected\b/g, "") + " is-selected";
			} else {
				rows[i].className = rows[i].className.replace(/\s*is-selected\b/g, "");
			}
		}
		scrollSelectedIntoView();
	}

	function moveSelection(delta) {
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			selectedIndex = lumetriPickerSession.move(delta);
			updateSelectionHighlight();
			focusSearch();
			return;
		}
		if (!currentRows.length) {
			return;
		}
		selectedIndex = (selectedIndex + delta + currentRows.length) % currentRows.length;
		updateSelectionHighlight();
		focusSearch();
	}

	function resultItemFromEvent(event) {
		var target = event.target;
		while (target && target !== searchResults && !(target.getAttribute && target.getAttribute("data-index"))) {
			target = target.parentNode;
		}
		if (!target || !target.getAttribute || !target.getAttribute("data-index")) {
			return null;
		}
		return target;
	}

	function isFavoriteControl(target) {
		while (target && target !== searchResults) {
			if (target.getAttribute && target.getAttribute("data-action") === "favorite") {
				return target;
			}
			target = target.parentNode;
		}
		return null;
	}

	function applySelectedEffect() {
		var row = selectedRow();
		var effect;
		var typed;

		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			confirmLumetriPicker();
			return;
		}

		if (row && row.kind === "parameter") {
			completeSelectedParameter();
			return;
		}
		if (row && row.kind === "recent-command") {
			typed = String(searchInput.value || "").replace(/^\s+|\s+$/g, "");
			if (row.query && typed !== row.query) {
				searchInput.value = row.query;
				applyFromSearchInput();
				return;
			}
			showApplyFeedback({
				ok: false,
				status: "No matching command."
			});
			return;
		}
		if (row && row.kind === "custom") {
			showUnsupportedCustomFeedback(row.query);
			return;
		}
		if (row && (row.kind === "command" || row.kind === "command-result")) {
			applyFromSearchInput();
			return;
		}

		effect = selectedEffect();

		if (applying) {
			return;
		}

		if (!effect) {
			showApplyFeedback({
				ok: false,
				status: "No effect selected."
			});
			showDebugJson({
				ok: false,
				reason: "NO_EFFECT_SELECTED",
				status: "No effect selected."
			});
			return;
		}

		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();

		EffectExecutor.applyEffect(csInterface, effect.premiereName, function (payload) {
			applying = false;
			setApplying(false);
			if (applyBtn) {
				applyBtn.disabled = false;
			}
			if (payload && payload.ok && payload.applied > 0) {
				rememberRecent(payload, effect.premiereName);
				delete parameterCache[effect.premiereName];
				if (!EffectSearch.normalize(searchInput.value)) {
					selectedIndex = 0;
					renderSearch();
				}
			}
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
	}

	function leftoverHasTypedValue(leftover) {
		if (typeof CommandParser.hasTypedValue === "function") {
			return CommandParser.hasTypedValue(leftover);
		}
		return false;
	}

	function tryTypedCommand() {
		var classified;
		var leftover;
		var effect;

		if (applying || !paramModulesLoaded || typeof CommandExecutor.runTyped !== "function") {
			return false;
		}

		if (typeof CommandParser.classify === "function") {
			classified = CommandParser.classify(searchInput.value, EffectRegistry.getEffects(), aliases);
			if (!classified || classified.kind !== "typed" || !classified.effect) {
				return false;
			}
			leftover = classified.leftover || classified.parameterQuery;
			effect = classified.effect;
		} else {
			classified = CommandParser.identify(searchInput.value, EffectRegistry.getEffects(), aliases);
			if (!classified || classified.isCommand || !classified.effect || !classified.parameterQuery) {
				return false;
			}
			leftover = classified.parameterQuery;
			effect = classified.effect;
			if (!leftoverHasTypedValue(leftover)) {
				return false;
			}
		}

		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();

		CommandExecutor.runTyped(csInterface, effect, leftover, function (payload) {
			applying = false;
			setApplying(false);
			if (applyBtn) {
				applyBtn.disabled = false;
			}
			if (payload && payload.ok) {
				rememberRecent(payload, effect.premiereName);
				delete parameterCache[effect.premiereName];
			}
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
		return true;
	}

	function runParsedCommand(parsed) {
		var effect = parsed.effect || selectedEffect();
		var matches;
		var parameterName = parsed.parameterQuery || "";

		if (applying) {
			return;
		}

		if (typeof parsed.value !== "number" || !isFinite(parsed.value)) {
			showApplyFeedback({
				ok: false,
				command: true,
				reason: "INVALID_VALUE",
				status: "Invalid value."
			});
			return;
		}

		if (!effect) {
			matches = EffectSearch.search(parsed.effectQuery, EffectRegistry.getEffects(), aliases);
			if (matches.length) {
				effect = matches[0].effect;
			}
		}

		if (!effect) {
			showApplyFeedback({
				ok: false,
				command: true,
				reason: "EFFECT_NOT_FOUND",
				status: "Effect not found."
			});
			return;
		}

		if (!paramModulesLoaded) {
			showApplyFeedback({
				ok: false,
				command: true,
				status: "Could not write parameter."
			});
			return;
		}

		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();

		CommandExecutor.run(csInterface, effect, parsed.value, parameterName, function (payload) {
			applying = false;
			setApplying(false);
			if (applyBtn) {
				applyBtn.disabled = false;
			}
			if (payload && payload.ok) {
				rememberRecent(payload, effect.premiereName);
				delete parameterCache[effect.premiereName];
			}
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
	}

	function runClipParameterCommand(clipCmd) {
		if (applying) {
			return;
		}
		if (!paramModulesLoaded || typeof CommandExecutor.runClipParameter !== "function") {
			showApplyFeedback({
				ok: false,
				command: true,
				reason: "WRITE_FAILED",
				status: "Could not write parameter."
			});
			return;
		}
		pendingClipCommand = clipCmd;
		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();
		CommandExecutor.runClipParameter(csInterface, clipCmd, function (payload) {
			applying = false;
			setApplying(false);
			if (applyBtn) {
				applyBtn.disabled = false;
			}
			if (payload && payload.ok) {
				rememberRecent(payload, clipCmd.parameterQuery);
			}
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
	}

	function applyFromSearchInput() {
		var parsed;
		var classified;
		var clipCmd;
		var row;
		var paletteState;
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			confirmLumetriPicker();
			return;
		}
		row = selectedRow();
		if (row && row.kind === "recent-command" && row.query) {
			if (!String(searchInput.value || "").replace(/^\s+|\s+$/g, "")) {
				searchInput.value = row.query;
			}
		}
		if (row && row.kind === "custom") {
			showUnsupportedCustomFeedback(row.query);
			return;
		}
		paletteState = paletteStateForQuery(searchInput.value);
		if (paletteState && paletteState.kind === "custom") {
			showUnsupportedCustomFeedback(paletteState.query);
			return;
		}
		parsed = CommandParser.parse(
			searchInput.value,
			EffectRegistry.getEffects(),
			aliases
		);
		if (parsed.isCommand && parsed.effect) {
			runParsedCommand(parsed);
			return;
		}
		if (typeof CommandParser.parseClipParameter === "function") {
			clipCmd = CommandParser.parseClipParameter(
				searchInput.value,
				EffectRegistry.getEffects(),
				aliases
			);
			if (clipCmd && clipCmd.isClipParameter) {
				runClipParameterCommand(clipCmd);
				return;
			}
		}
		if (parsed.isCommand) {
			runParsedCommand(parsed);
			return;
		}
		if (typeof CommandParser.classify === "function") {
			classified = CommandParser.classify(
				searchInput.value,
				EffectRegistry.getEffects(),
				aliases
			);
			if (classified && classified.kind === "typed") {
				if (!tryTypedCommand()) {
					showApplyFeedback({
						ok: false,
						command: true,
						reason: "PARAMETER_NOT_FOUND",
						status: "Parameter not found."
					});
					showDebugJson({
						ok: false,
						command: true,
						reason: "PARAMETER_NOT_FOUND",
						status: "Parameter not found."
					});
				}
				return;
			}
		}
		if (completeSelectedParameter()) {
			return;
		}
		if (tryTypedCommand()) {
			return;
		}
		applySelectedEffect();
	}

	function clearSearch() {
		cancelLumetriPicker(true);
		searchInput.value = "";
		selectedIndex = 0;
		renderSearch();
		applyStatus.textContent = "";
		applyStatus.className = "";
		setFooterFeedback(false);
		focusSearch();
	}

	function loadEffectIndex(done) {
		if (indexStatus) {
			indexStatus.textContent = "";
			indexStatus.className = "effect-count vis-hidden";
		}
		PremiereBridge.listVideoEffectNames(csInterface, function (payload) {
			if (!payload || !payload.ok) {
				applyStatus.className = "is-error";
				applyStatus.textContent = "Could not load effect index.";
				setFooterFeedback(true);
				showDebugJson(payload);
				if (done) {
					done(false);
				}
				return;
			}

			EffectRegistry.loadFromNames(payload.names || []);
			updateIndexStatus();
			renderSearch();
			if (done) {
				done(true);
			}
		});
	}

	function pingPremiere() {
		csInterface.evalScript("$._pickfx.ping()", function (result) {
			if (result === EvalScript_ErrMessage) {
				showDebugJson({ ok: false, error: "EvalScript error. host.jsx may not be loaded." });
				return;
			}
			showDebugJson(result);
		});
	}

	function getSelection() {
		csInterface.evalScript("$._pickfx.getSelection()", function (result) {
			if (result === EvalScript_ErrMessage) {
				showDebugJson({ ok: false, error: "EvalScript error. host.jsx may not be loaded." });
				return;
			}
			showDebugJson(result);
		});
	}

	function discoverEffects() {
		csInterface.evalScript("$._pickfx.discoverEffects()", function (result) {
			if (result === EvalScript_ErrMessage) {
				showDebugJson({ ok: false, error: "EvalScript error. host.jsx may not be loaded." });
				return;
			}
			showDebugJson(result);
		});
	}

	function inspectSelectedEffects() {
		if (!hostLoaded) {
			showDebugJson({
				ok: false,
				error: "host.jsx is not loaded yet."
			});
			return;
		}

		csInterface.evalScript("$._pickfx.inspectSelectedEffects()", function (result) {
			if (result === EvalScript_ErrMessage) {
				showDebugJson({
					ok: false,
					error: result
				});
				return;
			}
			showDebugJson(result);
		});
	}

	function findTypedCandidates() {
		if (!hostLoaded) {
			showDebugJson({
				ok: false,
				error: "host.jsx is not loaded yet."
			});
			return;
		}
		if (typeof PremiereBridge.findTypedCandidates !== "function") {
			showDebugJson({
				ok: false,
				error: "Find typed candidates is not available. Reload the panel."
			});
			return;
		}
		PremiereBridge.findTypedCandidates(csInterface, function (payload) {
			lastTypedScan = payload;
			showDebugJson(payload);
		});
	}

	function debugInspectFieldText(el) {
		var typed;
		var placeholder;
		if (!el) {
			return { text: "", source: "missing-element", raw: "", placeholder: "" };
		}
		typed = String(el.value || "").replace(/^\s+|\s+$/g, "");
		placeholder = String(el.getAttribute("placeholder") || "").replace(/^\s+|\s+$/g, "");
		if (typed) {
			return { text: typed, source: "value", raw: String(el.value || ""), placeholder: placeholder };
		}
		if (placeholder) {
			return { text: placeholder, source: "placeholder", raw: String(el.value || ""), placeholder: placeholder };
		}
		return { text: "", source: "empty", raw: String(el.value || ""), placeholder: placeholder };
	}

	function debugInspectLog(extra) {
		var effectEl = document.getElementById("inspect-effect-input");
		var paramEl = document.getElementById("inspect-parameter-input");
		var effectField = debugInspectFieldText(effectEl);
		var paramField = debugInspectFieldText(paramEl);
		var identity = CommandParser.identify(searchInput.value, EffectRegistry.getEffects(), aliases);
		var selected = selectedEffect();
		var source = "none";
		var effectName = "";
		var parameterName = "";
		var log;

		if (effectField.text) {
			source = "inspect-effect-input." + effectField.source;
			effectName = effectField.text;
		} else if (identity && identity.effect && identity.effect.premiereName) {
			source = "CommandParser.identify().effect.premiereName";
			effectName = identity.effect.premiereName;
		} else if (selected && selected.premiereName) {
			source = "selectedEffect().premiereName";
			effectName = selected.premiereName;
		}

		if (paramField.text) {
			parameterName = paramField.text;
		} else if (identity && identity.parameterQuery) {
			parameterName = identity.parameterQuery;
		}

		log = {
			effectInputId: "inspect-effect-input",
			effectInputFound: !!effectEl,
			effectInputValue: effectField.raw,
			effectInputPlaceholder: effectField.placeholder,
			effectNameEmptyAfterTrim: !String(effectField.raw || "").replace(/^\s+|\s+$/g, ""),
			parameterInputId: "inspect-parameter-input",
			parameterInputFound: !!paramEl,
			parameterInputValue: paramField.raw,
			parameterNameEmptyAfterTrim: !String(paramField.raw || "").replace(/^\s+|\s+$/g, ""),
			searchInputValue: searchInput ? String(searchInput.value || "") : "",
			identityEffect: identity && identity.effect ? identity.effect.premiereName : null,
			identityParameterQuery: identity ? identity.parameterQuery : null,
			selectedRowEffect: selected ? selected.premiereName : null,
			effectNameSource: source,
			effectNameUsed: effectName,
			parameterNameUsed: parameterName,
			effectResolvePath: "panel.js debugInspectLog → PremiereBridge.inspect* → $._pickfx.inspect* → $._pickfx.firstSelectedVideoTrackItem() → $._pickfxParameterResolver.inspect*",
			selectedClipPath: "$._pickfx.firstSelectedVideoTrackItem() in host.jsx inspectParameter / inspectEffectParameters (same helper as listEffectParameters)",
			bridgeInspectAll: typeof PremiereBridge.inspectEffectParameters,
			bridgeInspectOne: typeof PremiereBridge.inspectParameter
		};
		if (extra) {
			log.extra = extra;
		}
		try {
			console.log("[PickFX DEBUG inspect]", extra || "", log);
		} catch (ignoreLog) {}
		return {
			effectName: effectName,
			parameterName: parameterName,
			log: log
		};
	}

	function syncDebugInspectFields(effectName, parameterName) {
		var effectEl = document.getElementById("inspect-effect-input") || inspectEffectInput;
		var paramEl = document.getElementById("inspect-parameter-input") || inspectParameterInput;
		if (effectEl && effectName && !String(effectEl.value || "").replace(/^\s+|\s+$/g, "")) {
			effectEl.value = effectName;
		}
		if (paramEl && parameterName && !String(paramEl.value || "").replace(/^\s+|\s+$/g, "")) {
			paramEl.value = parameterName;
		}
	}

	function attachInspectSelectionDebug(log, selection) {
		var clips;
		var first;
		log.selection = selection;
		clips = selection && selection.videoClips;
		first = clips && clips[0];
		log.selectedClipExists = !!(first);
		log.selectedClipName = first ? first.name : null;
		log.selectedClipMediaType = first ? first.mediaType : null;
		log.selectedClipObject = first || null;
	}

	function compactBooleanCandidates(candidates) {
		var out = [];
		var i;
		var row;
		if (!candidates || !candidates.length) {
			return out;
		}
		for (i = 0; i < candidates.length; i++) {
			row = candidates[i];
			if (!row) {
				continue;
			}
			out.push({
				effect: row.effect || "",
				parameter: row.parameter || ""
			});
		}
		return out;
	}

	function booleanCandidateTarget() {
		var ctx = debugInspectLog("inspectBooleanCandidate");
		var effectEl = document.getElementById("inspect-effect-input");
		var paramEl = document.getElementById("inspect-parameter-input");
		var effectTyped = String(effectEl && effectEl.value || "").replace(/^\s+|\s+$/g, "");
		var paramTyped = String(paramEl && paramEl.value || "").replace(/^\s+|\s+$/g, "");
		var candidates = lastTypedScan && lastTypedScan.booleanCandidates ?
			lastTypedScan.booleanCandidates : [];
		var i;
		var row;

		if (candidates.length) {
			for (i = 0; i < candidates.length; i++) {
				row = candidates[i];
				if (row && row.effect === effectTyped && row.parameter === paramTyped) {
					return {
						ok: true,
						effect: row.effect,
						parameter: row.parameter,
						source: "candidate-matching-fields",
						log: ctx.log
					};
				}
			}
			if (candidates.length === 1 && candidates[0] &&
					candidates[0].effect && candidates[0].parameter) {
				return {
					ok: true,
					effect: candidates[0].effect,
					parameter: candidates[0].parameter,
					source: "single-boolean-candidate",
					log: ctx.log
				};
			}
			return {
				ok: false,
				error: "Set Effect and Parameter to one boolean candidate from Find typed candidates.",
				booleanCandidates: compactBooleanCandidates(candidates),
				debug: ctx.log
			};
		}

		if (effectTyped && paramTyped) {
			return {
				ok: true,
				effect: effectTyped,
				parameter: paramTyped,
				source: "debug-fields",
				log: ctx.log
			};
		}

		return {
			ok: false,
			error: "Run Find typed candidates, or enter effect and parameter from a boolean candidate.",
			debug: ctx.log
		};
	}

	function inspectBooleanCandidate() {
		var target;
		var effectEl;
		var paramEl;
		if (!hostLoaded) {
			showDebugJson({
				ok: false,
				error: "host.jsx is not loaded yet."
			});
			return;
		}
		if (typeof PremiereBridge.inspectBooleanCandidate !== "function") {
			showDebugJson({
				ok: false,
				error: "Inspect boolean candidate is not available. Reload the panel."
			});
			return;
		}
		target = booleanCandidateTarget();
		if (!target.ok) {
			showDebugJson(target);
			return;
		}
		effectEl = document.getElementById("inspect-effect-input") || inspectEffectInput;
		paramEl = document.getElementById("inspect-parameter-input") || inspectParameterInput;
		if (effectEl) {
			effectEl.value = target.effect;
		}
		if (paramEl) {
			paramEl.value = target.parameter;
		}
		PremiereBridge.inspectBooleanCandidate(csInterface, target.effect, target.parameter, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debug = target.log;
				payload.candidateSource = target.source;
				if (payload.ok && !payload.conclusions && typeof BooleanCandidateInspect !== "undefined") {
					payload.exposedFields = BooleanCandidateInspect.collectExposedFields(payload);
					payload.conclusions = BooleanCandidateInspect.conclude(payload);
				}
			}
			showDebugJson(payload);
		});
	}

	function booleanWriteTarget() {
		var ctx = debugInspectLog("testBooleanWrite");
		var effectEl = document.getElementById("inspect-effect-input");
		var paramEl = document.getElementById("inspect-parameter-input");
		var effectTyped = String(effectEl && effectEl.value || "").replace(/^\s+|\s+$/g, "");
		var paramTyped = String(paramEl && paramEl.value || "").replace(/^\s+|\s+$/g, "");
		var candidates = lastTypedScan && lastTypedScan.booleanCandidates ?
			lastTypedScan.booleanCandidates : [];
		var i;
		var row;
		var validated;

		if (!candidates.length) {
			return {
				ok: false,
				error: "Run Find typed candidates and select a boolean candidate first.",
				debug: ctx.log
			};
		}

		for (i = 0; i < candidates.length; i++) {
			row = candidates[i];
			if (row && row.effect === effectTyped && row.parameter === paramTyped) {
				validated = typeof BooleanWriteTest !== "undefined" ?
					BooleanWriteTest.validateCandidate(row) : null;
				if (validated && !validated.ok) {
					return {
						ok: false,
						stage: validated.stage,
						error: validated.detail,
						effect: row.effect,
						parameter: row.parameter,
						type: row.type,
						debug: ctx.log
					};
				}
				if (row.type !== "boolean") {
					return {
						ok: false,
						stage: "VALIDATE_TYPE",
						error: 'Candidate type must be exactly "boolean".',
						effect: row.effect,
						parameter: row.parameter,
						type: row.type,
						debug: ctx.log
					};
				}
				if (!paramTyped) {
					return {
						ok: false,
						stage: "VALIDATE_DISPLAY_NAME",
						error: "Parameter displayName is required.",
						debug: ctx.log
					};
				}
				return {
					ok: true,
					effect: row.effect,
					parameter: row.parameter,
					type: row.type,
					source: "typed-candidate",
					log: ctx.log
				};
			}
		}

		return {
			ok: false,
			error: "Set Effect and Parameter to one boolean candidate from Find typed candidates.",
			booleanCandidates: compactBooleanCandidates(candidates),
			debug: ctx.log
		};
	}

	function testBooleanWrite() {
		var target;
		if (!hostLoaded) {
			showDebugJson({
				ok: false,
				error: "host.jsx is not loaded yet.",
				settersCalled: false,
				usedQE: false,
				method: "setValue(value, true)"
			});
			return;
		}
		if (typeof PremiereBridge.testBooleanWrite !== "function") {
			showDebugJson({
				ok: false,
				error: "Test Boolean Write is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false,
				method: "setValue(value, true)"
			});
			return;
		}
		target = booleanWriteTarget();
		if (!target.ok) {
			target.settersCalled = false;
			target.usedQE = false;
			target.method = "setValue(value, true)";
			showDebugJson(target);
			return;
		}
		PremiereBridge.testBooleanWrite(
			csInterface,
			target.effect,
			target.parameter,
			target.type,
			function (payload) {
				if (payload && typeof payload === "object") {
					payload.debug = target.log;
					payload.candidateSource = target.source;
					payload.usedQE = false;
				}
				showDebugJson(payload);
			}
		);
	}

	function testMotionWrite() {
		if (!hostLoaded) {
			showDebugJson({
				ok: false,
				operation: "motion.write.test",
				error: "host.jsx is not loaded yet.",
				verified: false,
				usedQE: false
			});
			return;
		}
		if (typeof PremiereBridge.testMotionWrite !== "function") {
			showDebugJson({
				ok: false,
				operation: "motion.write.test",
				error: "Test Motion Write is not available. Reload the panel.",
				verified: false,
				usedQE: false
			});
			return;
		}
		PremiereBridge.testMotionWrite(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.usedQE = false;
				payload.operation = payload.operation || "motion.write.test";
			}
			showDebugJson(payload);
		});
	}

	function inspectOneParameter() {
		var ctx = debugInspectLog("inspectOneParameter");
		var effectName = ctx.effectName;
		var parameterName = ctx.parameterName;
		if (!effectName || !parameterName) {
			showDebugJson({
				ok: false,
				error: "Enter an effect name and parameter displayName. Select a clip that already has the effect.",
				debug: ctx.log
			});
			return;
		}
		syncDebugInspectFields(effectName, parameterName);
		PremiereBridge.inspectParameter(csInterface, effectName, parameterName, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debug = ctx.log;
			}
			showDebugJson(payload);
		});
	}

	function inspectAllParameters() {
		var ctx = debugInspectLog("inspectAllParameters");
		var effectName = ctx.effectName;
		if (!effectName) {
			csInterface.evalScript("$._pickfx.getSelection()", function (result) {
				var selection;
				try {
					selection = JSON.parse(result);
				} catch (ignore) {
					selection = { raw: result };
				}
				attachInspectSelectionDebug(ctx.log, selection);
				showDebugJson({
					ok: false,
					error: "Enter an effect name. Select a clip that already has the effect.",
					debug: ctx.log
				});
			});
			return;
		}
		syncDebugInspectFields(effectName, ctx.parameterName);
		if (typeof PremiereBridge.inspectEffectParameters !== "function") {
			showDebugJson({
				ok: false,
				error: "Inspect all is not available. Reload the panel.",
				debug: ctx.log
			});
			return;
		}
		PremiereBridge.inspectEffectParameters(csInterface, effectName, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debug = ctx.log;
			}
			showDebugJson(payload);
		});
	}

	function inspectClipParameters() {
		if (typeof PremiereBridge.inspectClipParameters !== "function") {
			showDebugJson({
				ok: false,
				error: "Inspect clip parameters is not available. Reload the panel."
			});
			return;
		}
		PremiereBridge.inspectClipParameters(csInterface, function (payload) {
			showDebugJson(payload);
		});
	}

	function inspectMotionScale() {
		if (typeof PremiereBridge.inspectMotionScale !== "function") {
			showDebugJson({
				ok: false,
				operation: "motion.scale.discover",
				error: "Inspect Motion Scale is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		PremiereBridge.inspectMotionScale(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.settersCalled = false;
				payload.usedQE = false;
				payload.operation = payload.operation || "motion.scale.discover";
			}
			showDebugJson(payload);
		});
	}

	function testScaleSemantics() {
		if (typeof PremiereBridge.testMotionScaleSemantics !== "function") {
			showDebugJson({
				ok: false,
				operation: "motion.scale.semantics.test",
				error: "Test Scale Semantics is not available. Reload the panel.",
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.testMotionScaleSemantics(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.usedQE = false;
				payload.productionEnabled = false;
				payload.operation = payload.operation || "motion.scale.semantics.test";
			}
			showDebugJson(payload);
		});
	}

	function inspectUniversalParameters() {
		if (typeof PremiereBridge.inspectUniversalParameters !== "function") {
			showDebugJson({
				ok: false,
				error: "Universal inspect is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		PremiereBridge.inspectUniversalParameters(csInterface, function (payload) {
			showDebugJson(payload);
		});
	}

	function scanNumericCandidates() {
		if (typeof PremiereBridge.scanNumericCandidates !== "function") {
			showDebugJson({
				ok: false,
				operation: "numeric.candidate.scan",
				error: "Scan Numeric Candidates is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		PremiereBridge.scanNumericCandidates(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "numeric.candidate.scan";
				payload.settersCalled = false;
				payload.usedQE = false;
			}
			showDebugJson(payload);
		});
	}

	function testParameterWrite() {
		var ctx;
		if (typeof PremiereBridge.testParameterWrite !== "function") {
			showDebugJson({
				ok: false,
				operation: "parameter.write.test",
				error: "Test Parameter Write is not available. Reload the panel.",
				verified: false,
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		ctx = debugInspectLog("testParameterWrite");
		PremiereBridge.testParameterWrite(csInterface, ctx.effectName, ctx.parameterName, function (payload) {
			if (payload && typeof payload === "object") {
				payload.usedQE = false;
				payload.operation = payload.operation || "parameter.write.test";
			}
			showDebugJson(payload);
		});
	}

	function testNumericParameterWrite() {
		var ctx;
		if (typeof PremiereBridge.testNumericParameterWrite !== "function") {
			showDebugJson({
				ok: false,
				operation: "numeric.parameter.write.test",
				error: "Test Numeric Parameter Write is not available. Reload the panel.",
				verified: false,
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		ctx = debugInspectLog("testNumericParameterWrite");
		PremiereBridge.testNumericParameterWrite(csInterface, ctx.effectName, ctx.parameterName, function (payload) {
			if (payload && typeof payload === "object") {
				payload.usedQE = false;
				payload.operation = payload.operation || "numeric.parameter.write.test";
			}
			showDebugJson(payload);
		});
	}

	function inspectColorParameters() {
		if (typeof PremiereBridge.inspectColorParameters !== "function") {
			showDebugJson({
				ok: false,
				operation: "color.parameter.discover",
				error: "Inspect Color Parameters is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.inspectColorParameters(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "color.parameter.discover";
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
			}
			showDebugJson(payload);
		});
	}

	function inspectLumetriInstanceIdentity() {
		if (typeof PremiereBridge.inspectLumetriInstanceIdentity !== "function") {
			showDebugJson({
				ok: false,
				operation: "lumetri.instance.identity.inspect",
				error: "Inspect Lumetri Instance Identity is not available. Reload the panel.",
				readOnly: true,
				settersCalled: false,
				writesPerformed: false,
				usedQE: false,
				productionEnabled: false,
				chosen: false
			});
			return;
		}
		PremiereBridge.inspectLumetriInstanceIdentity(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "lumetri.instance.identity.inspect";
				payload.readOnly = true;
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
				payload.chosen = false;
			}
			showDebugJson(payload);
		});
	}

	function inspectSaturationMatches() {
		if (typeof PremiereBridge.inspectSaturationMatches !== "function") {
			showDebugJson({
				ok: false,
				operation: "color.saturation.matches",
				error: "Inspect Saturation Matches is not available. Reload the panel.",
				settersCalled: false,
				writesPerformed: false,
				usedQE: false,
				productionEnabled: false,
				matchCount: 0,
				matches: []
			});
			return;
		}
		PremiereBridge.inspectSaturationMatches(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "color.saturation.matches";
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
			}
			showDebugJson(payload);
		});
	}

	function invokeColorParameterWriteTest(event) {
		var ident;
		var wired;
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		window.__pickfxColorWriteButtonClicked = true;
		wired = typeof ColorWriteTestWiring !== "undefined" ? ColorWriteTestWiring : null;
		ident = {
			componentDisplayName: debugInspectFieldText(inspectEffectInput).text,
			componentMatchName: inspectComponentMatchInput
				? String(inspectComponentMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterDisplayName: inspectParameterInput
				? String(inspectParameterInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterMatchName: inspectParameterMatchInput
				? String(inspectParameterMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			debugButtonClicked: true,
			buttonId: "test-color-parameter-write-btn",
			handler: "invokeColorParameterWriteTest",
			bridgePath: "color-parameter-write-test"
		};
		if (!ident.componentMatchName && inspectComponentMatchInput) {
			ident.componentMatchName = String(inspectComponentMatchInput.getAttribute("placeholder") || "").replace(/^\s+|\s+$/g, "");
		}
		if (wired) {
			ident = wired.normalizeIdent(ident);
		} else {
			ident.debugButton = {
				clicked: true,
				id: "test-color-parameter-write-btn",
				handler: "invokeColorParameterWriteTest"
			};
		}
		if (typeof PremiereBridge.testColorParameterWrite !== "function") {
			showDebugJson(wired ? wired.notLoadedPayload(ident) : {
				ok: false,
				operation: "color.parameter.write.test",
				reason: "COLOR_WRITE_TEST_PATH_NOT_LOADED",
				error: "PremiereBridge.testColorParameterWrite is not available. Reload the panel.",
				runtimePath: "panel.js missing PremiereBridge.testColorParameterWrite",
				resolverUsed: "none",
				globalSearchUsed: false,
				bridgePath: "color-parameter-write-test",
				hostFunction: "debugColorParameterWriteTest",
				debugButton: ident.debugButton,
				debugButtonClicked: true,
				buttonId: "test-color-parameter-write-btn",
				handler: "invokeColorParameterWriteTest",
				colorWriteTestLoaded: false,
				colorWriteTestFunctionAvailable: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.testColorParameterWrite(csInterface, ident, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debugButton = payload.debugButton || ident.debugButton;
				payload.debugButtonClicked = true;
				payload.buttonId = payload.buttonId || "test-color-parameter-write-btn";
				payload.handler = payload.handler || "invokeColorParameterWriteTest";
				payload.bridgePath = payload.bridgePath || "color-parameter-write-test";
				payload.hostFunction = payload.hostFunction || "debugColorParameterWriteTest";
				payload.usedQE = false;
				payload.productionEnabled = false;
				if (payload.operation === "parameter.write.test") {
					payload.wrongPath = true;
					payload.detail = (payload.detail ? payload.detail + " " : "") +
						"Color button reached ParameterWriteTest / UniversalParameterResolver instead of ColorParameterWriteTest.";
				} else {
					payload.operation = payload.operation || "color.parameter.write.test";
					payload.globalSearchUsed = false;
				}
			}
			showDebugJson(payload);
		});
	}

	function inspectAudioParameters() {
		if (typeof PremiereBridge.inspectAudioParameters !== "function") {
			showDebugJson({
				ok: false,
				operation: "audio.parameter.discover",
				error: "Inspect Audio Parameters is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.inspectAudioParameters(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "audio.parameter.discover";
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
			}
			showDebugJson(payload);
		});
	}

	function inspectEnumParameters() {
		if (typeof PremiereBridge.inspectEnumParameters !== "function") {
			showDebugJson({
				ok: false,
				operation: "enum.parameter.discover",
				error: "Inspect Enum Parameters is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.inspectEnumParameters(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "enum.parameter.discover";
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
			}
			showDebugJson(payload);
		});
	}

	function diagnoseBlendMode() {
		if (typeof PremiereBridge.diagnoseBlendMode !== "function") {
			showDebugJson({
				ok: false,
				operation: "blendmode.parameter.diagnose",
				error: "Diagnose Blend Mode is not available. Reload the panel.",
				settersCalled: false,
				usedQE: false,
				productionEnabled: false,
				readOnly: true
			});
			return;
		}
		PremiereBridge.diagnoseBlendMode(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "blendmode.parameter.diagnose";
				payload.settersCalled = false;
				payload.writesPerformed = false;
				payload.usedQE = false;
				payload.productionEnabled = false;
				payload.readOnly = true;
			}
			showDebugJson(payload);
		});
	}

	function invokeEnumParameterWriteTest(event) {
		var ident;
		var wired;
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		window.__pickfxEnumWriteButtonClicked = true;
		wired = typeof EnumWriteTestWiring !== "undefined" ? EnumWriteTestWiring : null;
		ident = {
			componentDisplayName: inspectEffectInput
				? String(inspectEffectInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			componentMatchName: inspectComponentMatchInput
				? String(inspectComponentMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterDisplayName: inspectParameterInput
				? String(inspectParameterInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterMatchName: inspectParameterMatchInput
				? String(inspectParameterMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			debugButtonClicked: true,
			buttonId: "test-enum-parameter-write-btn",
			handler: "invokeEnumParameterWriteTest",
			bridgePath: "enum-parameter-write-test"
		};
		if (wired) {
			ident = wired.normalizeIdent(ident);
		} else {
			ident.debugButton = {
				clicked: true,
				id: "test-enum-parameter-write-btn",
				handler: "invokeEnumParameterWriteTest"
			};
		}
		if (typeof PremiereBridge.testEnumParameterWrite !== "function") {
			showDebugJson(wired ? wired.notLoadedPayload(ident) : {
				ok: false,
				operation: "enum.parameter.write.test",
				reason: "ENUM_WRITE_TEST_PATH_NOT_LOADED",
				error: "PremiereBridge.testEnumParameterWrite is not available. Reload the panel.",
				runtimePath: "panel.js missing PremiereBridge.testEnumParameterWrite",
				resolverUsed: "none",
				globalSearchUsed: false,
				bridgePath: "enum-parameter-write-test",
				hostFunction: "debugEnumParameterWriteTest",
				debugButton: ident.debugButton,
				debugButtonClicked: true,
				buttonId: "test-enum-parameter-write-btn",
				handler: "invokeEnumParameterWriteTest",
				enumWriteTestLoaded: false,
				enumWriteTestFunctionAvailable: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.testEnumParameterWrite(csInterface, ident, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debugButton = payload.debugButton || ident.debugButton;
				payload.debugButtonClicked = true;
				payload.buttonId = payload.buttonId || "test-enum-parameter-write-btn";
				payload.handler = payload.handler || "invokeEnumParameterWriteTest";
				payload.bridgePath = payload.bridgePath || "enum-parameter-write-test";
				payload.hostFunction = payload.hostFunction || "debugEnumParameterWriteTest";
				payload.usedQE = false;
				payload.productionEnabled = false;
				if (payload.operation === "parameter.write.test") {
					payload.wrongPath = true;
					payload.detail = (payload.detail ? payload.detail + " " : "") +
						"Enum button reached ParameterWriteTest / UniversalParameterResolver instead of EnumParameterWriteTest.";
				} else {
					payload.operation = payload.operation || "enum.parameter.write.test";
					payload.globalSearchUsed = false;
				}
			}
			showDebugJson(payload);
		});
	}

	function invokeAudioParameterWriteTest(event) {
		var ident;
		var wired;
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		window.__pickfxAudioWriteButtonClicked = true;
		wired = typeof AudioWriteTestWiring !== "undefined" ? AudioWriteTestWiring : null;
		ident = {
			componentDisplayName: inspectEffectInput
				? String(inspectEffectInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			componentMatchName: inspectComponentMatchInput
				? String(inspectComponentMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterDisplayName: inspectParameterInput
				? String(inspectParameterInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterMatchName: inspectParameterMatchInput
				? String(inspectParameterMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			debugButtonClicked: true,
			buttonId: "test-audio-parameter-write-btn",
			handler: "invokeAudioParameterWriteTest",
			bridgePath: "audio-parameter-write-test"
		};
		if (wired) {
			ident = wired.normalizeIdent(ident);
		} else {
			ident.debugButton = {
				clicked: true,
				id: "test-audio-parameter-write-btn",
				handler: "invokeAudioParameterWriteTest"
			};
		}
		if (typeof PremiereBridge.testAudioParameterWrite !== "function") {
			showDebugJson(wired ? wired.notLoadedPayload(ident) : {
				ok: false,
				operation: "audio.parameter.write.test",
				reason: "AUDIO_WRITE_TEST_PATH_NOT_LOADED",
				error: "PremiereBridge.testAudioParameterWrite is not available. Reload the panel.",
				runtimePath: "panel.js missing PremiereBridge.testAudioParameterWrite",
				resolverUsed: "none",
				globalSearchUsed: false,
				bridgePath: "audio-parameter-write-test",
				hostFunction: "debugAudioParameterWriteTest",
				debugButton: ident.debugButton,
				debugButtonClicked: true,
				buttonId: "test-audio-parameter-write-btn",
				handler: "invokeAudioParameterWriteTest",
				audioWriteTestLoaded: false,
				audioWriteTestFunctionAvailable: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.testAudioParameterWrite(csInterface, ident, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debugButton = payload.debugButton || ident.debugButton;
				payload.debugButtonClicked = true;
				payload.buttonId = payload.buttonId || "test-audio-parameter-write-btn";
				payload.handler = payload.handler || "invokeAudioParameterWriteTest";
				payload.bridgePath = payload.bridgePath || "audio-parameter-write-test";
				payload.hostFunction = payload.hostFunction || "debugAudioParameterWriteTest";
				payload.usedQE = false;
				payload.productionEnabled = false;
				if (payload.operation === "parameter.write.test") {
					payload.wrongPath = true;
					payload.detail = (payload.detail ? payload.detail + " " : "") +
						"Audio button reached ParameterWriteTest / UniversalParameterResolver instead of AudioParameterWriteTest.";
				} else {
					payload.operation = payload.operation || "audio.parameter.write.test";
					payload.globalSearchUsed = false;
				}
			}
			showDebugJson(payload);
		});
	}

	function invokeAudioLevelSetValueDiagnose(event) {
		var ident;
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		window.__pickfxAudioLevelDiagnoseButtonClicked = true;
		ident = {
			componentDisplayName: inspectEffectInput
				? String(inspectEffectInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			componentMatchName: inspectComponentMatchInput
				? String(inspectComponentMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterDisplayName: inspectParameterInput
				? String(inspectParameterInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterMatchName: inspectParameterMatchInput
				? String(inspectParameterMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			debugButtonClicked: true,
			buttonId: "diagnose-audio-level-setvalue-btn",
			handler: "invokeAudioLevelSetValueDiagnose",
			bridgePath: "audio-level-setvalue-diagnose",
			debugButton: {
				clicked: true,
				id: "diagnose-audio-level-setvalue-btn",
				handler: "invokeAudioLevelSetValueDiagnose"
			}
		};
		if (typeof PremiereBridge.diagnoseAudioLevelSetValue !== "function") {
			showDebugJson({
				ok: false,
				operation: "audio.parameter.setvalue.diagnose",
				reason: "AUDIO_SETVALUE_DIAGNOSE_NOT_LOADED",
				error: "PremiereBridge.diagnoseAudioLevelSetValue is not available. Reload the panel.",
				runtimePath: "panel.js missing PremiereBridge.diagnoseAudioLevelSetValue",
				resolverUsed: "none",
				globalSearchUsed: false,
				bridgePath: "audio-level-setvalue-diagnose",
				hostFunction: "debugAudioLevelSetValueDiagnose",
				debugButton: ident.debugButton,
				debugButtonClicked: true,
				buttonId: "diagnose-audio-level-setvalue-btn",
				handler: "invokeAudioLevelSetValueDiagnose",
				probeRan: false,
				verified: false,
				settersCalled: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.diagnoseAudioLevelSetValue(csInterface, ident, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debugButton = payload.debugButton || ident.debugButton;
				payload.debugButtonClicked = true;
				payload.buttonId = payload.buttonId || "diagnose-audio-level-setvalue-btn";
				payload.handler = payload.handler || "invokeAudioLevelSetValueDiagnose";
				payload.bridgePath = payload.bridgePath || "audio-level-setvalue-diagnose";
				payload.hostFunction = payload.hostFunction || "debugAudioLevelSetValueDiagnose";
				payload.operation = payload.operation || "audio.parameter.setvalue.diagnose";
				payload.usedQE = false;
				payload.productionEnabled = false;
			}
			showDebugJson(payload);
		});
	}

	function invokeAudioLevelCapabilityProbe(event) {
		var ident;
		if (event && event.preventDefault) {
			event.preventDefault();
		}
		window.__pickfxAudioLevelCapabilityButtonClicked = true;
		ident = {
			componentDisplayName: inspectEffectInput
				? String(inspectEffectInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			componentMatchName: inspectComponentMatchInput
				? String(inspectComponentMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterDisplayName: inspectParameterInput
				? String(inspectParameterInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			parameterMatchName: inspectParameterMatchInput
				? String(inspectParameterMatchInput.value || "").replace(/^\s+|\s+$/g, "")
				: "",
			debugButtonClicked: true,
			buttonId: "probe-audio-level-capability-btn",
			handler: "invokeAudioLevelCapabilityProbe",
			bridgePath: "audio-level-capability-probe",
			debugButton: {
				clicked: true,
				id: "probe-audio-level-capability-btn",
				handler: "invokeAudioLevelCapabilityProbe"
			}
		};
		if (typeof PremiereBridge.probeAudioLevelCapability !== "function") {
			showDebugJson({
				ok: false,
				operation: "audio.parameter.capability.probe",
				reason: "AUDIO_CAPABILITY_PROBE_NOT_LOADED",
				error: "PremiereBridge.probeAudioLevelCapability is not available. Reload the panel.",
				runtimePath: "panel.js missing PremiereBridge.probeAudioLevelCapability",
				hostFunction: "debugAudioLevelCapabilityProbe",
				bridgePath: "audio-level-capability-probe",
				debugButton: ident.debugButton,
				probeRan: false,
				anyMethodWrote: false,
				usedQE: false,
				productionEnabled: false
			});
			return;
		}
		PremiereBridge.probeAudioLevelCapability(csInterface, ident, function (payload) {
			if (payload && typeof payload === "object") {
				payload.debugButton = payload.debugButton || ident.debugButton;
				payload.buttonId = payload.buttonId || "probe-audio-level-capability-btn";
				payload.handler = payload.handler || "invokeAudioLevelCapabilityProbe";
				payload.bridgePath = payload.bridgePath || "audio-level-capability-probe";
				payload.hostFunction = payload.hostFunction || "debugAudioLevelCapabilityProbe";
				payload.operation = payload.operation || "audio.parameter.capability.probe";
				payload.usedQE = false;
				payload.productionEnabled = false;
				payload.productionSetterChosen = false;
			}
			showDebugJson(payload);
		});
	}

	function findOpacityParameter() {
		if (typeof PremiereBridge.findOpacityParameter !== "function") {
			showDebugJson({
				ok: false,
				error: "Find Opacity is not available. Reload the panel.",
				query: "Opacity",
				matches: [],
				settersCalled: false,
				usedQE: false
			});
			return;
		}
		PremiereBridge.findOpacityParameter(csInterface, function (payload) {
			showDebugJson(payload);
		});
	}

	searchInput.addEventListener("input", function () {
		selectedIndex = 0;
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			cancelLumetriPicker(true);
		}
		renderSearch();
	});

	searchInput.addEventListener("focus", function () {
		if (searchWrap) {
			searchWrap.classList.add("is-focused");
		}
	});

	searchInput.addEventListener("blur", function () {
		if (searchWrap) {
			searchWrap.classList.remove("is-focused");
		}
	});

	searchInput.addEventListener("keydown", function (event) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			moveSelection(1);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			moveSelection(-1);
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			applyFromSearchInput();
			return;
		}
		if (event.key === "Escape") {
			event.preventDefault();
			if (lumetriPickerSession && lumetriPickerSession.isActive()) {
				cancelLumetriPicker(false);
				return;
			}
			clearSearch();
		}
	});

	if (settingsBtn) {
		settingsBtn.addEventListener("click", function () {
			setDebugMode(debugPanel && debugPanel.hasAttribute("hidden"));
			focusSearch();
		});
	}

	if (clearSearchBtn) {
		clearSearchBtn.addEventListener("click", function () {
			clearSearch();
		});
	}

	document.addEventListener("keydown", function (event) {
		if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
			event.preventDefault();
			setDebugMode(debugPanel && debugPanel.hasAttribute("hidden"));
			focusSearch();
		}
	});

	searchResults.addEventListener("mousedown", function (event) {
		event.preventDefault();
	});

	searchResults.addEventListener("mouseover", function (event) {
		var item;
		var nextIndex;
		if (isFavoriteControl(event.target)) {
			return;
		}
		item = resultItemFromEvent(event);
		if (!item) {
			return;
		}
		nextIndex = parseInt(item.getAttribute("data-index"), 10);
		if (isNaN(nextIndex) || nextIndex === selectedIndex) {
			return;
		}
		selectedIndex = nextIndex;
		updateSelectionHighlight();
	});

	searchResults.addEventListener("click", function (event) {
		var heart = isFavoriteControl(event.target);
		var item;
		var name;
		var query;

		if (heart) {
			name = heart.getAttribute("data-name");
			if (name) {
				FavoritesStore.toggle(name);
				renderSearch();
			}
			focusSearch();
			return;
		}

		item = resultItemFromEvent(event);
		if (!item) {
			return;
		}
		selectedIndex = parseInt(item.getAttribute("data-index"), 10) || 0;
		if (item.getAttribute("data-kind") === "lumetri-choice") {
			if (lumetriPickerSession && lumetriPickerSession.isActive()) {
				lumetriPickerSession.selectIndex(selectedIndex);
			}
			confirmLumetriPicker();
			return;
		}
		if (item.getAttribute("data-kind") === "parameter") {
			completeSelectedParameter();
			return;
		}
		if (item.getAttribute("data-kind") === "recent-command") {
			query = item.getAttribute("data-query") || "";
			if (query) {
				searchInput.value = query;
				selectedIndex = 0;
				renderSearch();
			}
			focusSearch();
			return;
		}
		updateSelectionHighlight();
		focusSearch();
	});

	searchResults.addEventListener("dblclick", function (event) {
		var item;
		if (isFavoriteControl(event.target)) {
			return;
		}
		item = resultItemFromEvent(event);
		if (!item) {
			return;
		}
		selectedIndex = parseInt(item.getAttribute("data-index"), 10) || 0;
		if (item.getAttribute("data-kind") === "lumetri-choice") {
			if (lumetriPickerSession && lumetriPickerSession.isActive()) {
				lumetriPickerSession.selectIndex(selectedIndex);
			}
			confirmLumetriPicker();
			return;
		}
		if (item.getAttribute("data-kind") === "parameter") {
			completeSelectedParameter();
			return;
		}
		updateSelectionHighlight();
		applySelectedEffect();
	});

	if (applyBtn) {
		applyBtn.addEventListener("click", applySelectedEffect);
	}
	if (refreshBtn) {
		refreshBtn.addEventListener("click", function () {
			loadEffectIndex();
		});
	}
	if (pingBtn) {
		pingBtn.addEventListener("click", pingPremiere);
	}
	if (selectionBtn) {
		selectionBtn.addEventListener("click", getSelection);
	}
	if (discoverBtn) {
		discoverBtn.addEventListener("click", discoverEffects);
	}
	if (inspectEffectsBtn) {
		inspectEffectsBtn.disabled = true;
		inspectEffectsBtn.addEventListener("click", inspectSelectedEffects);
	}
	if (inspectClipParamsBtn) {
		inspectClipParamsBtn.disabled = true;
		inspectClipParamsBtn.addEventListener("click", inspectClipParameters);
	}
	if (inspectMotionScaleBtn) {
		inspectMotionScaleBtn.disabled = true;
		inspectMotionScaleBtn.addEventListener("click", inspectMotionScale);
	}
	if (testScaleSemanticsBtn) {
		testScaleSemanticsBtn.disabled = true;
		testScaleSemanticsBtn.addEventListener("click", testScaleSemantics);
	}
	if (universalInspectBtn) {
		universalInspectBtn.disabled = true;
		universalInspectBtn.addEventListener("click", inspectUniversalParameters);
	}
	if (scanNumericCandidatesBtn) {
		scanNumericCandidatesBtn.disabled = true;
		scanNumericCandidatesBtn.addEventListener("click", scanNumericCandidates);
	}
	if (findOpacityBtn) {
		findOpacityBtn.disabled = true;
		findOpacityBtn.addEventListener("click", findOpacityParameter);
	}
	if (findTypedBtn) {
		findTypedBtn.disabled = true;
		findTypedBtn.addEventListener("click", findTypedCandidates);
	}
	if (inspectBooleanCandidateBtn) {
		inspectBooleanCandidateBtn.disabled = true;
		inspectBooleanCandidateBtn.addEventListener("click", inspectBooleanCandidate);
	}
	if (testBooleanWriteBtn) {
		testBooleanWriteBtn.disabled = true;
		testBooleanWriteBtn.addEventListener("click", testBooleanWrite);
	}
	if (testMotionWriteBtn) {
		testMotionWriteBtn.disabled = true;
		testMotionWriteBtn.addEventListener("click", testMotionWrite);
	}
	if (testParameterWriteBtn) {
		testParameterWriteBtn.disabled = true;
		testParameterWriteBtn.addEventListener("click", testParameterWrite);
	}
	if (testNumericParameterWriteBtn) {
		testNumericParameterWriteBtn.disabled = true;
		testNumericParameterWriteBtn.addEventListener("click", testNumericParameterWrite);
	}
	if (inspectColorParamsBtn) {
		inspectColorParamsBtn.disabled = true;
		inspectColorParamsBtn.addEventListener("click", inspectColorParameters);
	}
	if (inspectAudioParamsBtn) {
		inspectAudioParamsBtn.disabled = true;
		inspectAudioParamsBtn.addEventListener("click", inspectAudioParameters);
	}
	if (inspectEnumParamsBtn) {
		inspectEnumParamsBtn.disabled = true;
		inspectEnumParamsBtn.addEventListener("click", inspectEnumParameters);
	}
	if (diagnoseBlendModeBtn) {
		diagnoseBlendModeBtn.disabled = true;
		diagnoseBlendModeBtn.addEventListener("click", diagnoseBlendMode);
	}
	if (inspectSaturationMatchesBtn) {
		inspectSaturationMatchesBtn.disabled = true;
		inspectSaturationMatchesBtn.addEventListener("click", inspectSaturationMatches);
	}
	if (inspectLumetriIdentityBtn) {
		inspectLumetriIdentityBtn.disabled = true;
		inspectLumetriIdentityBtn.addEventListener("click", inspectLumetriInstanceIdentity);
	}
	window.__pickfxInvokeColorParameterWriteTest = invokeColorParameterWriteTest;
	if (testColorParameterWriteBtn) {
		testColorParameterWriteBtn.disabled = true;
		testColorParameterWriteBtn.onclick = invokeColorParameterWriteTest;
	}
	window.__pickfxInvokeAudioParameterWriteTest = invokeAudioParameterWriteTest;
	if (testAudioParameterWriteBtn) {
		testAudioParameterWriteBtn.disabled = true;
		testAudioParameterWriteBtn.onclick = invokeAudioParameterWriteTest;
	}
	window.__pickfxInvokeEnumParameterWriteTest = invokeEnumParameterWriteTest;
	if (testEnumParameterWriteBtn) {
		testEnumParameterWriteBtn.disabled = true;
		testEnumParameterWriteBtn.onclick = invokeEnumParameterWriteTest;
	}
	window.__pickfxInvokeAudioLevelSetValueDiagnose = invokeAudioLevelSetValueDiagnose;
	if (diagnoseAudioLevelSetValueBtn) {
		diagnoseAudioLevelSetValueBtn.disabled = true;
		diagnoseAudioLevelSetValueBtn.onclick = invokeAudioLevelSetValueDiagnose;
	}
	window.__pickfxInvokeAudioLevelCapabilityProbe = invokeAudioLevelCapabilityProbe;
	if (probeAudioLevelCapabilityBtn) {
		probeAudioLevelCapabilityBtn.disabled = true;
		probeAudioLevelCapabilityBtn.onclick = invokeAudioLevelCapabilityProbe;
	}
	if (inspectParamBtn) {
		inspectParamBtn.addEventListener("click", inspectOneParameter);
	}
	if (inspectAllParamsBtn) {
		inspectAllParamsBtn.addEventListener("click", inspectAllParameters);
	}
	if (copyInspectJsonBtn) {
		copyInspectJsonBtn.addEventListener("click", copyDebugJson);
	}

	loadHost(function (loaded) {
		setInspectButtonReady(loaded);
		focusSearch();
		if (!loaded) {
			return;
		}
		loadAliases(function () {
			loadEffectIndex(function () {
				focusSearch();
			});
		});
	});

	setTimeout(focusSearch, 50);
}());
