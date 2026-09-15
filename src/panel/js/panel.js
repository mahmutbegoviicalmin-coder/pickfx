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
	var discoverEffectRegistryBtn = document.getElementById("discover-effect-registry-btn");
	var registryVerifyBtn = document.getElementById("registry-verify-btn");
	var registryStartBtn = document.getElementById("registry-start-btn");
	var terminalValidationRunBtn = document.getElementById("terminal-validation-run-btn");
	var terminalPromotionRunBtn = document.getElementById("terminal-promotion-run-btn");
	var researchBaselineCleanupBtn = document.getElementById("research-baseline-cleanup-btn");
	var registryPauseBtn = document.getElementById("registry-pause-btn");
	var registryResumeBtn = document.getElementById("registry-resume-btn");
	var registryProgressEl = document.getElementById("registry-progress");
	var registryCurrentEl = document.getElementById("registry-current");
	var registryStatusEl = document.getElementById("registry-status");
	var REGISTRY_STORE_KEY = "pickfx.research.registry.v1";
	var registryRun = {
		active: false,
		paused: false,
		busy: false,
		candidates: [],
		index: 0,
		registry: null
	};
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
	var valueInput = document.getElementById("value-input");
	var paletteValueStage = document.getElementById("palette-value-stage");
	var paletteEffectLabel = document.getElementById("palette-effect-label");
	var paletteParameterLabel = document.getElementById("palette-parameter-label");
	var searchResults = document.getElementById("search-results");
	var indexStatus = document.getElementById("index-status");
	var applyStatus = document.getElementById("apply-status");
	var debugPanel = document.getElementById("debug-panel");
	var searchIcon = document.getElementById("search-icon");
	var settingsBtn = document.getElementById("settings-btn");
	var presetsBtn = document.getElementById("presets-btn");
	var presetsView = document.getElementById("presets-view");
	var presetsBackBtn = document.getElementById("presets-back-btn");
	var presetsCaptureBtn = document.getElementById("presets-capture-btn");
	var presetsTitle = document.getElementById("presets-title");
	var presetsBody = document.getElementById("presets-body");
	var clearSearchBtn = document.getElementById("clear-search-btn");
	var countMark = document.getElementById("count-mark");
	var searchWrap = document.querySelector(".search-wrap");
	var barFooter = document.querySelector(".bar-footer");
	var commandBar = document.querySelector(".command-bar");
	var footerResultCount = document.getElementById("footer-result-count");
	var aliases = {};
	var currentMatches = [];
	var currentRows = [];
	var presetLibrary = [];
	var presetViewMode = "";
	var captureState = null;
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
	var terminalRegistry = null;
	var terminalRegistryStatus = "not-loaded";
	var productionTerminalRegistry = null;
	var productionTerminalRegistryStatus = "not-loaded";
	var readinessAudit = null;
	var readinessAuditStatus = "not-loaded";
	var discoveryCatalog = null;
	var lastDiscoveryBrowser = null;
	var discoveryLiveToken = 0;
	var terminalValidationRunning = false;
	var terminalValidationLastResult = null;
	var terminalAuditLastResult = null;
	var terminalExhaustiveLastResult = null;
	var terminalPromotionLastResult = null;
	var terminalCapabilityLastResult = null;
	var keyboardShortcutStatus = {
		ok: false,
		scope: "FOCUSED_CEP_PANEL_ONLY",
		global: false
	};
	var paletteFlow = typeof PaletteFlow !== "undefined" && PaletteFlow.create
		? PaletteFlow.create()
		: { mode: "search", selectedIndex: 0 };
	var effectIndexState = typeof EffectIndexState !== "undefined"
		? EffectIndexState.create()
		: { status: "idle", attempt: 0 };
	var effectIndexTimer = null;

	if (searchIcon) {
		searchIcon.innerHTML = EffectIcons.search();
	}
	if (settingsBtn) {
		settingsBtn.innerHTML = EffectIcons.ellipsis ? EffectIcons.ellipsis() : EffectIcons.gear();
	}
	if (presetsBtn && EffectIcons.library) {
		presetsBtn.innerHTML = EffectIcons.library();
	}
	if (presetsBackBtn && EffectIcons.back) {
		presetsBackBtn.innerHTML = EffectIcons.back();
	}
	if (presetsCaptureBtn && EffectIcons.plus) {
		presetsCaptureBtn.innerHTML = EffectIcons.plus();
	}
	if (countMark) {
		countMark.innerHTML = EffectIcons.fxMark();
	}

	function hostJsxPath() {
		var root = csInterface.getSystemPath(SystemPath.EXTENSION);
		return (root + "/src/premiere/host.jsx").replace(/\\/g, "/");
	}

	var searchEpoch = 0;
	var focusTransition = 0;
	var pendingFocusFrame = null;

	function setSearchQuery(next) {
		if (!searchInput) {
			return;
		}
		searchInput.value = next == null ? "" : String(next);
	}

	function invalidatePaletteFocus() {
		focusTransition += 1;
		if (pendingFocusFrame !== null && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(pendingFocusFrame);
		}
		pendingFocusFrame = null;
		return focusTransition;
	}

	function ownsPaletteFocus(el) {
		var target = typeof PaletteFlow !== "undefined" && PaletteFlow.focusTarget
			? PaletteFlow.focusTarget(paletteFlow)
			: "search";
		if (target === "search") {
			return el === searchInput;
		}
		if (target === "value") {
			return el === valueInput;
		}
		if (target === "results") {
			return el === searchResults;
		}
		return false;
	}

	function focusElement(el, selectExisting) {
		var requestVersion = focusTransition;
		function apply() {
			if (!el || requestVersion !== focusTransition ||
					!ownsPaletteFocus(el) || el.disabled) {
				return false;
			}
			try {
				el.focus();
			} catch (ignoreFocus) {}
			if (selectExisting && typeof el.select === "function") {
				try {
					el.select();
				} catch (ignoreSelect) {}
			} else if (!selectExisting && el === valueInput && el.selectionStart !== undefined) {
				try {
					el.selectionStart = el.value.length;
					el.selectionEnd = el.value.length;
				} catch (ignoreCaret) {}
			}
			return document.activeElement === el;
		}
		if (apply()) {
			return;
		}
		if (typeof requestAnimationFrame === "function") {
			pendingFocusFrame = requestAnimationFrame(function () {
				pendingFocusFrame = null;
				apply();
			});
		}
	}

	function focusSearch(selectExisting) {
		focusElement(searchInput, selectExisting);
	}

	function focusValue(selectExisting) {
		focusElement(valueInput, selectExisting === false ? false : true);
	}

	function focusResults() {
		if (!searchResults) {
			return;
		}
		if (!searchResults.getAttribute("tabindex")) {
			searchResults.setAttribute("tabindex", "-1");
		}
		focusElement(searchResults, false);
	}

	function applyPaletteFocus() {
		var target = typeof PaletteFlow !== "undefined" && PaletteFlow.focusTarget
			? PaletteFlow.focusTarget(paletteFlow)
			: "search";
		if (target === "value") {
			focusValue(true);
			return;
		}
		if (target === "results") {
			focusResults();
			return;
		}
		if (target === "none") {
			return;
		}
		focusSearch();
	}

	function transitionPalette(next, options) {
		options = options || {};
		paletteFlow = next;
		invalidatePaletteFocus();
		syncPaletteChrome();
		if (options.render === "search") {
			renderSearch();
		} else if (options.render === "flow") {
			renderPaletteFlow();
		}
		if (options.focus !== false) {
			applyPaletteFocus();
		}
		return paletteFlow;
	}

	function writeActionDebugToDesktop(payload) {
		var docs;
		var desktop;
		var path;
		var text;
		if (!payload) {
			return;
		}
		try {
			text = JSON.stringify(payload, null, 2);
		} catch (serErr) {
			try {
				text = JSON.stringify({
					ok: false,
					stringifyError: String(serErr),
					runtime: payload.runtime || null
				}, null, 2);
			} catch (ignore) {
				return;
			}
		}
		try {
			if (!csInterface || typeof csInterface.getSystemPath !== "function" ||
					typeof SystemPath === "undefined") {
				return;
			}
			docs = String(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS) || "").replace(/\\/g, "/");
			desktop = docs.replace(/\/Documents\/?$/, "/Desktop");
			path = desktop + "/action-debug-panel.json";
			if (window.cep && window.cep.fs && typeof window.cep.fs.writeFile === "function") {
				window.cep.fs.writeFile(path, text);
			}
		} catch (ignoreWrite) {}
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
		if (discoverEffectRegistryBtn) {
			discoverEffectRegistryBtn.disabled = !hostLoaded;
		}
		if (registryVerifyBtn) {
			registryVerifyBtn.disabled = !hostLoaded;
		}
		if (registryStartBtn) {
			registryStartBtn.disabled = !hostLoaded;
		}
		if (terminalValidationRunBtn) {
			terminalValidationRunBtn.disabled = !hostLoaded;
		}
		if (terminalPromotionRunBtn) {
			terminalPromotionRunBtn.disabled = !hostLoaded;
		}
		if (researchBaselineCleanupBtn) {
			researchBaselineCleanupBtn.disabled = !hostLoaded;
		}
		if (registryPauseBtn) {
			registryPauseBtn.disabled = !hostLoaded;
		}
		if (registryResumeBtn) {
			registryResumeBtn.disabled = !hostLoaded;
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
		var partial = payload && (payload.clipParameter || payload.action || payload.preset) &&
			payload.successfulCount > 0 && payload.failedCount > 0;
		var msg;

		if (payload && payload.action) {
			writeActionDebugToDesktop(payload);
		}

		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}

		if (isLumetriPickerPayload(payload)) {
			paintLumetriPicker(payload, pendingClipCommand);
			return;
		}

		pendingClipCommand = null;

		if (payload && payload.ok && (payload.command || payload.action || payload.preset || applied > 0)) {
			if (typeof PaletteFlow !== "undefined") {
				setSearchQuery("");
				selectedIndex = 0;
				transitionPalette(
					PaletteFlow.toSearch(paletteFlow),
					{ focus: false }
				);
			}
			paintSuccessResult(payload);
			paintSuccessStatus(successFooter(payload));
			setFooterFeedback(true);
			schedulePaletteRestore();
			applyPaletteFocus();
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
		var epoch = searchEpoch;
		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}
		statusTimer = setTimeout(function () {
			setFooterFeedback(false);
			if (searchEpoch !== epoch) {
				if (typeof PaletteFlow !== "undefined" && paletteMode() !== "search") {
					resetPaletteToSearch(true);
				}
				if (!lumetriPickerSession || !lumetriPickerSession.isActive()) {
					renderSearch();
					focusSearch();
				}
				statusTimer = null;
				return;
			}
			resetPaletteToSearch(false);
			if (!lumetriPickerSession || !lumetriPickerSession.isActive()) {
				renderSearch();
				focusSearch();
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
							evalHostFile("/src/core/ParameterReadBack.js", function () {
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
			"/src/core/ParameterReadBack.js",
			"/src/core/ConfirmedParameterWrites.js",
			"/src/core/KeyframeEngine.js",
			"/src/core/SafeNumericTestValue.js",
			"/src/core/NumericCandidateClassifier.js",
			"/src/core/ParameterCapability.js",
			"/src/core/UniversalParameterInspect.js",
			"/src/core/EffectRegistryDiscovery.js",
			"/src/core/EffectRegistryBuilder.js",
			"/src/core/UniversalParameterResolver.js",
			"/src/core/NumberParameterWriter.js",
			"/src/core/BooleanParameterWriter.js",
			"/src/core/ColorParameterWriter.js",
			"/src/core/EnumParameterWriter.js",
			"/src/core/StringParameterWriter.js",
			"/src/core/UniversalParameterWriter.js",
			"/src/core/ParameterResolver.js",
			"/src/core/ParameterWriter.js",
			"/src/core/PresetCapability.js",
			"/src/core/PresetSchema.js",
			"/src/core/PresetHost.js",
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
			"/src/core/MotionScaleSemanticsTest.js",
			"/src/core/TerminalClipCapability.js",
			"/src/core/TerminalMotionCapability.js",
			"/src/core/TerminalTransitionCapability.js",
			"/src/core/ResearchBaselineCleanup.js",
			"/src/premiere/research-registry-host.jsx"
		];
		var RESEARCH_HOST_ONLY = {
			"/src/core/EffectRegistryDiscovery.js": true,
			"/src/core/EffectRegistryBuilder.js": true,
			"/src/core/ParameterWriteTest.js": true,
			"/src/core/ColorWriteTestWiring.js": true,
			"/src/core/LumetriInstanceIdentityInspect.js": true,
			"/src/core/ColorParameterWriteTest.js": true,
			"/src/core/AudioWriteTestWiring.js": true,
			"/src/core/AudioParameterDiscover.js": true,
			"/src/core/AudioParameterWriteTest.js": true,
			"/src/core/AudioLevelCapabilityProbe.js": true,
			"/src/core/EnumWriteTestWiring.js": true,
			"/src/core/EnumParameterDiscover.js": true,
			"/src/core/EnumParameterWriteTest.js": true,
			"/src/core/BlendModeDiagnostic.js": true,
			"/src/core/MotionScaleDiscover.js": true,
			"/src/core/MotionScaleSemanticsTest.js": true,
			"/src/core/ResearchBaselineCleanup.js": true,
			"/src/premiere/research-registry-host.jsx": true
		};
		function shouldSkipResearchHost(path) {
			return !debugPanel && RESEARCH_HOST_ONLY[path] === true;
		}
																		function finishHostLoad() {
																			function complete(loaded) {
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
																					done(loaded !== false);
																				}
																			}
																			if (typeof PremiereBridge !== "undefined" &&
																					typeof PremiereBridge.ensureActionHost === "function") {
																				PremiereBridge.ensureActionHost(csInterface, function (host) {
																					if (!host || !host.ok) {
																						showDebugJson({
																							ok: false,
																							error: "Actions host is not ready",
																							host: host || null
																						});
																					}
																					complete(true);
																				});
																				return;
																			}
																			complete(true);
																		}
																		function ensureResearchBuilderLoaded(after) {
																			csInterface.evalScript(
																				'(function(){try{var b=$._pickfxEffectRegistryBuilder;if(!b&&$._pickfx){b=$._pickfx.effectRegistryBuilder;}if(typeof EffectRegistryBuilder!=="undefined"){b=b||EffectRegistryBuilder;}return (b&&typeof b.validateEnvironment==="function"&&typeof b.processOne==="function")?"1":"0";}catch(e){return"0";}})()',
																				function (loaded) {
																					if (loaded === "1") {
																						after();
																						return;
																					}
																					evalHostSource("/src/core/EffectRegistryBuilder.js", function () {
																						after();
																					});
																				}
																			);
																		}
																		function loadExtra(index) {
																			if (index >= extraHost.length) {
																				if (debugPanel) {
																					ensureResearchBuilderLoaded(finishHostLoad);
																				} else {
																					finishHostLoad();
																				}
																				return;
																			}
																			if (shouldSkipResearchHost(extraHost[index])) {
																				loadExtra(index + 1);
																				return;
																			}
																			evalHostModule(extraHost[index], function (extraOk, extraPath, extraResult) {
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

	function evalHostSource(relativePath, done) {
		var root = csInterface.getSystemPath(SystemPath.EXTENSION);
		var path = (root + relativePath).replace(/\\/g, "/");
		var escaped = path.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		var script = '(function(){var f,s;try{f=new File("' + escaped +
			'");if(!f.exists){return "missing";}f.encoding="UTF8";if(!f.open("r")){return "open-failed";}s=f.read();f.close();eval(s);' +
			'if(typeof EffectRegistryBuilder!=="undefined"){$._pickfxEffectRegistryBuilder=EffectRegistryBuilder;try{if($._pickfx){$._pickfx.effectRegistryBuilder=EffectRegistryBuilder;}}catch(e1){}}' +
			'return ($._pickfxEffectRegistryBuilder&&typeof $._pickfxEffectRegistryBuilder.validateEnvironment==="function")?"ok":"no-global";}catch(e){try{f.close();}catch(e2){}return String(e);}})()';
		csInterface.evalScript(script, function (result) {
			done(result === "ok", path, result);
		});
	}

	function evalHostModule(relativePath, done) {
		if (relativePath === "/src/core/EffectRegistryBuilder.js") {
			evalHostSource(relativePath, done);
			return;
		}
		evalHostFile(relativePath, done);
	}

	function loadTerminalRegistry(done) {
		var xhr = new XMLHttpRequest();
		terminalRegistryStatus = "loading";
		xhr.open("GET", "../data/terminal-registry.generated.json?v=phase3-terminal-20260822", true);
		xhr.onreadystatechange = function () {
			var parsed;
			var validated;
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status !== 200 && xhr.status !== 0) {
				terminalRegistry = null;
				terminalRegistryStatus = "unavailable";
				if (done) {
					done(false);
				}
				return;
			}
			try {
				parsed = JSON.parse(xhr.responseText);
				validated = typeof TerminalRegistryAdapter !== "undefined" &&
					TerminalRegistryAdapter.validateCompiled
					? TerminalRegistryAdapter.validateCompiled(parsed)
					: { ok: false };
				if (!validated.ok) {
					throw new Error(validated.reason || "Generated registry is invalid.");
				}
				terminalRegistry = parsed;
				terminalRegistryStatus = "ready";
				if (done) {
					done(true);
				}
			} catch (ignoreRegistry) {
				terminalRegistry = null;
				terminalRegistryStatus = "invalid";
				if (done) {
					done(false);
				}
			}
		};
		xhr.onerror = function () {
			terminalRegistry = null;
			terminalRegistryStatus = "unavailable";
			if (done) {
				done(false);
			}
		};
		xhr.send();
	}

	function applyProductionTerminalRegistry(parsed, done) {
		var validated = typeof TerminalProductionRegistry !== "undefined" &&
			TerminalProductionRegistry.validate
			? TerminalProductionRegistry.validate(parsed)
			: { ok: false };
		if (!validated.ok) {
			throw new Error(
				validated.reason || "Production terminal registry is invalid."
			);
		}
		productionTerminalRegistry = parsed;
		productionTerminalRegistryStatus = "ready";
		buildDiscoveryCatalog();
		renderSearch();
		if (done) {
			done(true);
		}
	}

	function fetchProductionTerminalRegistry(url, onSuccess, onFailure) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.onreadystatechange = function () {
			var parsed;
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status !== 200 && xhr.status !== 0) {
				onFailure("unavailable");
				return;
			}
			try {
				parsed = JSON.parse(xhr.responseText);
				onSuccess(parsed);
			} catch (ignoreParse) {
				onFailure("invalid");
			}
		};
		xhr.onerror = function () {
			onFailure("unavailable");
		};
		xhr.send();
	}

	function loadProductionTerminalRegistry(done) {
		productionTerminalRegistryStatus = "loading";
		fetchProductionTerminalRegistry(
			"../data/terminal-registry.production.v2.json?v=phase8-production-v2-20260823",
			function (parsed) {
				try {
					applyProductionTerminalRegistry(parsed, done);
				} catch (ignoreV2) {
					fetchProductionTerminalRegistry(
						"../data/terminal-registry.production.json?v=phase7-production-20260822",
						function (fallback) {
							try {
								applyProductionTerminalRegistry(fallback, done);
							} catch (ignoreV1) {
								productionTerminalRegistry = null;
								productionTerminalRegistryStatus = "invalid";
								if (done) {
									done(false);
								}
							}
						},
						function (status) {
							productionTerminalRegistry = null;
							productionTerminalRegistryStatus = status;
							if (done) {
								done(false);
							}
						}
					);
				}
			},
			function () {
				fetchProductionTerminalRegistry(
					"../data/terminal-registry.production.json?v=phase7-production-20260822",
					function (fallback) {
						try {
							applyProductionTerminalRegistry(fallback, done);
						} catch (ignoreV1) {
							productionTerminalRegistry = null;
							productionTerminalRegistryStatus = "invalid";
							if (done) {
								done(false);
							}
						}
					},
					function (status) {
						productionTerminalRegistry = null;
						productionTerminalRegistryStatus = status;
						if (done) {
							done(false);
						}
					}
				);
			}
		);
	}

	function buildDiscoveryCatalog() {
		if (typeof TerminalEffectDiscovery === "undefined" ||
				!TerminalEffectDiscovery.buildCustomer ||
				!productionTerminalRegistry) {
			discoveryCatalog = null;
			return;
		}
		discoveryCatalog = TerminalEffectDiscovery.buildCustomer(
			productionTerminalRegistry
		);
	}

	function isCustomerTerminalCatalog() {
		return !!(discoveryCatalog &&
			typeof TerminalEffectDiscovery !== "undefined" &&
			TerminalEffectDiscovery.isCustomerCatalog &&
			TerminalEffectDiscovery.isCustomerCatalog(discoveryCatalog));
	}

	function seedRegistryFromCatalog() {
		var names;
		var i;
		var effect;
		if (typeof EffectRegistry === "undefined" ||
				(typeof EffectRegistry.uniqueCount === "function" &&
					EffectRegistry.uniqueCount() > 0)) {
			return false;
		}
		if (!discoveryCatalog || !discoveryCatalog.effects || !discoveryCatalog.effects.length) {
			return false;
		}
		names = [];
		for (i = 0; i < discoveryCatalog.effects.length; i++) {
			effect = discoveryCatalog.effects[i];
			if (effect && (effect.premiereName || effect.displayName || effect.name)) {
				names.push(effect.premiereName || effect.displayName || effect.name);
			}
		}
		if (!names.length) {
			return false;
		}
		EffectRegistry.loadFromNames(names);
		return true;
	}

	function loadCustomerCatalog(done) {
		loadProductionTerminalRegistry(function () {
			loadTerminalRegistry(function () {
				loadReadinessAudit(function () {
					buildDiscoveryCatalog();
					seedRegistryFromCatalog();
					paintIndexState();
					renderSearch();
					if (done) {
						done();
					}
				});
			});
		});
	}

	function startHostAndIndex(attempt) {
		loadHost(function (loaded) {
			setInspectButtonReady(loaded);
			if (!loaded) {
				if ((attempt || 1) < 6) {
					setTimeout(function () {
						startHostAndIndex((attempt || 1) + 1);
					}, 400 * (attempt || 1));
				}
				return;
			}
			loadAliases(function () {
				loadEffectIndex(function () {
					seedRegistryFromCatalog();
					reloadPresetLibrary();
					renderSearch();
					focusSearch();
				});
			});
		});
	}

	function customerEffectVisible(name) {
		var query = String(name || "").replace(/^\s+|\s+$/g, "");
		var i;
		if (!discoveryCatalog || !discoveryCatalog.effects || !query) {
			return false;
		}
		for (i = 0; i < discoveryCatalog.effects.length; i++) {
			if (String(discoveryCatalog.effects[i].displayName) === query ||
					String(discoveryCatalog.effects[i].premiereName) === query) {
				return true;
			}
		}
		return false;
	}

	function loadReadinessAudit(done) {
		var xhr = new XMLHttpRequest();
		readinessAuditStatus = "loading";
		xhr.open(
			"GET",
			"../data/terminal-registry.production-readiness-audit.json?v=phase8-discovery-20260823",
			true
		);
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status !== 200 && xhr.status !== 0) {
				readinessAudit = null;
				readinessAuditStatus = "unavailable";
				buildDiscoveryCatalog();
				if (done) {
					done(false);
				}
				return;
			}
			try {
				readinessAudit = JSON.parse(xhr.responseText);
				readinessAuditStatus = "ready";
				buildDiscoveryCatalog();
				if (done) {
					done(true);
				}
			} catch (ignoreAudit) {
				readinessAudit = null;
				readinessAuditStatus = "invalid";
				buildDiscoveryCatalog();
				if (done) {
					done(false);
				}
			}
		};
		xhr.onerror = function () {
			readinessAudit = null;
			readinessAuditStatus = "unavailable";
			buildDiscoveryCatalog();
			if (done) {
				done(false);
			}
		};
		xhr.send();
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

	function clipControlItems() {
		if (typeof ClipControlCatalog === "undefined" || !ClipControlCatalog.list) {
			return [];
		}
		return ClipControlCatalog.list(productionTerminalRegistry);
	}

	function catalogItemVisible(name, effect) {
		if (effect && effect.kind === "action") {
			return true;
		}
		if (typeof ActionRegistry !== "undefined" && ActionRegistry.findByName &&
				ActionRegistry.findByName(name)) {
			return true;
		}
		if (effect && effect.kind === "clip-control") {
			return true;
		}
		if (typeof ClipControlCatalog !== "undefined" &&
				ClipControlCatalog.has &&
				ClipControlCatalog.has(name, productionTerminalRegistry)) {
			return true;
		}
		if (isCustomerTerminalCatalog()) {
			return customerEffectVisible(name);
		}
		return true;
	}

	function effectsFromNames(names) {
		var effects = [];
		var i;
		var found;
		for (i = 0; i < names.length; i++) {
			found = EffectRegistry.findByPremiereName(names[i]);
			if (!found && typeof ClipControlCatalog !== "undefined" && ClipControlCatalog.find) {
				found = ClipControlCatalog.find(names[i], productionTerminalRegistry);
			}
			if (found) {
				effects.push(found);
			}
		}
		return effects;
	}

	function selectedRow() {
		var index = selectedIndex;
		if (!currentRows.length) {
			return null;
		}
		if (typeof PaletteFlow !== "undefined" && paletteMode() !== "search" &&
				paletteFlow && typeof paletteFlow.selectedIndex === "number") {
			index = paletteFlow.selectedIndex;
		}
		if (index < 0 || index >= currentRows.length) {
			return null;
		}
		return currentRows[index];
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

	function appendSection(title, count) {
		var label = document.createElement("div");
		label.className = "section-label";
		label.textContent = count != null ? title + " · " + count : title;
		searchResults.appendChild(label);
	}

	function browseVisibleEffects() {
		var effects = EffectRegistry.getEffects() || [];
		var seen = {};
		var list = [];
		var i;
		var effect;
		var name;
		var catalog;
		var clips;

		function take(next) {
			var key;
			if (!next) {
				return;
			}
			key = String(next.premiereName || next.name || next.displayName || "");
			if (!key || seen[key]) {
				return;
			}
			if (!catalogItemVisible(key, next)) {
				return;
			}
			seen[key] = true;
			seen[String(next.name || "")] = true;
			list.push(next);
		}

		clips = clipControlItems();
		for (i = 0; i < clips.length; i++) {
			take(clips[i]);
		}
		for (i = 0; i < effects.length; i++) {
			take(effects[i]);
		}
		catalog = discoveryCatalog && discoveryCatalog.effects ? discoveryCatalog.effects : [];
		for (i = 0; i < catalog.length; i++) {
			effect = catalog[i];
			name = effect && (effect.premiereName || effect.displayName || effect.name);
			if (!name) {
				continue;
			}
			take(EffectRegistry.findByPremiereName(name) || {
				name: effect.displayName || name,
				displayName: effect.displayName || name,
				premiereName: name
			});
		}
		return list;
	}

	function appendGroupedEffects(effects, usedNames) {
		var groups;
		var visible;
		var group;
		var effect;
		var name;
		var i;
		var j;
		if (!effects || !effects.length || typeof EffectCatalogBrowse === "undefined") {
			for (i = 0; i < (effects || []).length; i++) {
				effect = effects[i];
				name = effect && (effect.premiereName || effect.name);
				if (!effect || (usedNames && name && usedNames[name])) {
					continue;
				}
				appendRow(effect, currentRows.length);
				currentMatches.push(effect);
				if (usedNames && name) {
					usedNames[name] = true;
				}
			}
			return;
		}
		groups = EffectCatalogBrowse.group(effects);
		for (i = 0; i < groups.length; i++) {
			group = groups[i];
			visible = [];
			for (j = 0; j < group.effects.length; j++) {
				effect = group.effects[j];
				name = effect.premiereName || effect.name;
				if (usedNames && name && usedNames[name]) {
					continue;
				}
				visible.push(effect);
			}
			if (!visible.length) {
				continue;
			}
			appendSection(group.title, visible.length);
			for (j = 0; j < visible.length; j++) {
				effect = visible[j];
				name = effect.premiereName || effect.name;
				appendRow(effect, currentRows.length);
				currentMatches.push(effect);
				if (usedNames && name) {
					usedNames[name] = true;
				}
			}
		}
	}

	function staggerRow(row, index) {
		if (index > 16) {
			row.style.webkitAnimation = "none";
			row.style.animation = "none";
			return;
		}
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
		if (footerResultCount) {
			footerResultCount.textContent = "";
		}
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

	function presetStoreOptions() {
		var userId = "";
		if (typeof PanelEntitlement !== "undefined" && PanelEntitlement.currentUserId) {
			userId = PanelEntitlement.currentUserId();
		}
		return { csInterface: csInterface, userId: userId };
	}

	function reloadPresetLibrary() {
		var listed;
		if (typeof PresetStore === "undefined" || !PresetStore.list) {
			presetLibrary = [];
			return { ok: true, presets: [], ignored: [] };
		}
		try {
			listed = PresetStore.list(presetStoreOptions());
		} catch (ignoreList) {
			presetLibrary = [];
			return { ok: true, presets: [], ignored: [] };
		}
		presetLibrary = listed && listed.presets ? listed.presets : [];
		return listed || { ok: true, presets: presetLibrary, ignored: [] };
	}

	if (typeof PanelEntitlement !== "undefined" && PanelEntitlement.onAccountChange) {
		PanelEntitlement.onAccountChange(function () {
			reloadPresetLibrary();
			if (presetViewMode === "library") {
				renderPresetLibrary();
			}
		});
	}

	function isPresetsViewOpen() {
		return presetViewMode === "library" || presetViewMode === "capture";
	}

	function setPresetsView(mode) {
		presetViewMode = mode || "";
		if (commandBar) {
			commandBar.classList.toggle("is-presets-view", isPresetsViewOpen());
		}
		if (presetsView) {
			if (isPresetsViewOpen()) {
				presetsView.removeAttribute("hidden");
			} else {
				presetsView.setAttribute("hidden", "hidden");
			}
		}
		if (presetsBtn) {
			presetsBtn.classList.toggle("is-on", isPresetsViewOpen());
		}
	}

	function closePresetLibrary() {
		captureState = null;
		setPresetsView("");
		if (presetsTitle) {
			presetsTitle.textContent = "My Presets";
		}
		focusSearch();
	}

	function presetSubtitle(preset) {
		if (typeof PresetSearch !== "undefined" && PresetSearch.subtitle) {
			return PresetSearch.subtitle(preset);
		}
		return "PickFX Preset";
	}

	function appendPresetSearchRow(preset, index) {
		var row = document.createElement("div");
		row.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "preset");
		row.setAttribute("data-preset-id", preset.id || "");
		appendRowBody(
			row,
			(typeof EffectIcons !== "undefined" && EffectIcons.library)
				? EffectIcons.library()
				: iconForLabel(preset.name),
			preset.name,
			presetSubtitle(preset)
		);
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push({ kind: "preset", preset: preset });
	}

	function applyLoadedPreset(preset) {
		if (!preset) {
			return;
		}
		if (!requireProductAccess()) {
			return;
		}
		if (applying) {
			return;
		}
		if (typeof PresetExecutor === "undefined" || !PresetExecutor.apply) {
			showApplyFeedback({
				ok: false,
				preset: true,
				command: true,
				reason: "WRITE_FAILED",
				status: "Couldn't apply that look."
			});
			return;
		}
		applying = true;
		beginApplying();
		PresetExecutor.apply(csInterface, preset, function (payload) {
			applying = false;
			setApplying(false);
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
	}

	function renderPresetLibrary() {
		var i;
		var row;
		var actions;
		var listed;
		if (!presetsBody || !presetsTitle) {
			return;
		}
		listed = reloadPresetLibrary();
		presetsTitle.textContent = "My Presets";
		if (presetsCaptureBtn) {
			presetsCaptureBtn.removeAttribute("hidden");
		}
		presetsBody.innerHTML = "";
		if (listed && listed.ok === false && listed.reason === "PRESET_STORAGE_UNAVAILABLE") {
			paintPresetNote(listed.detail || "PickFX can’t save presets in this environment.");
			return;
		}
		if (!presetLibrary.length) {
			paintPresetNote("Capture a look from one selected clip.");
			return;
		}
		for (i = 0; i < presetLibrary.length; i++) {
			row = document.createElement("div");
			row.className = "result-row";
			row.setAttribute("data-preset-id", presetLibrary[i].id);
			appendRowBody(
				row,
				EffectIcons.library ? EffectIcons.library() : iconForLabel(presetLibrary[i].name),
				presetLibrary[i].name,
				(typeof PresetSchema !== "undefined" ? PresetSchema.effectCount(presetLibrary[i]) : presetLibrary[i].components.length) +
					" effects"
			);
			actions = document.createElement("div");
			actions.className = "preset-row-actions";
			actions.appendChild(presetTextButton("Apply", "apply", presetLibrary[i].id));
			actions.appendChild(presetTextButton("Rename", "rename", presetLibrary[i].id));
			actions.appendChild(presetTextButton("Delete", "delete", presetLibrary[i].id));
			row.appendChild(actions);
			presetsBody.appendChild(row);
		}
	}

	function presetTextButton(label, action, id) {
		var btn = document.createElement("button");
		btn.type = "button";
		btn.className = "preset-action";
		btn.setAttribute("data-preset-action", action);
		btn.setAttribute("data-preset-id", id);
		btn.textContent = label;
		return btn;
	}

	function paintPresetNote(text, className) {
		var note = document.createElement("p");
		note.className = className || "preset-note";
		note.textContent = text;
		presetsBody.appendChild(note);
	}

	function findPresetById(id) {
		var i;
		for (i = 0; i < presetLibrary.length; i++) {
			if (presetLibrary[i].id === id) {
				return presetLibrary[i];
			}
		}
		return null;
	}

	function openPresetLibrary() {
		if (!requireProductAccess()) {
			return;
		}
		captureState = null;
		setPresetsView("library");
		renderPresetLibrary();
	}

	function startCapturePreset() {
		if (!requireProductAccess()) {
			return;
		}
		if (typeof PresetCapture === "undefined" || !PresetCapture.listComponents) {
			showApplyFeedback({
				ok: false,
				preset: true,
				reason: "WRITE_FAILED",
				status: "Couldn't capture that look."
			});
			return;
		}
		setPresetsView("capture");
		if (presetsTitle) {
			presetsTitle.textContent = "Capture Preset";
		}
		if (presetsCaptureBtn) {
			presetsCaptureBtn.setAttribute("hidden", "hidden");
		}
		presetsBody.innerHTML = "";
		paintPresetNote("Reading selected clip...");
		PresetCapture.listComponents(csInterface, function (listed) {
			var i;
			var selected = {};
			if (!listed || !listed.ok) {
				presetsBody.innerHTML = "";
				paintPresetNote(visibleApplyMessage(listed || {
					ok: false,
					reason: "NO_VIDEO_SELECTION"
				}).title);
				return;
			}
			captureState = {
				session: listed.session,
				clipName: listed.clipName,
				components: listed.components || [],
				selected: selected,
				name: "",
				conflict: null
			};
			for (i = 0; i < captureState.components.length; i++) {
				selected[String(i)] = typeof PresetCapture.defaultChecked === "function"
					? PresetCapture.defaultChecked(captureState.components[i])
					: captureState.components[i].kind !== "intrinsic" &&
						captureState.components[i].captureStatus !== "unsupported";
			}
			renderCaptureForm();
		});
	}

	function renderCaptureForm() {
		var i;
		var component;
		var row;
		var check;
		var skippedLine;
		var input;
		var saveBtn;
		var selectedIndexes;
		if (!captureState || !presetsBody) {
			return;
		}
		presetsBody.innerHTML = "";
		paintPresetNote("Selected clip: " + (captureState.clipName || "Untitled"), "preset-clip-label");
		for (i = 0; i < captureState.components.length; i++) {
			component = captureState.components[i];
			row = document.createElement("div");
			row.className = "result-row" + (component.captureStatus === "unsupported" ? " is-disabled" : "");
			row.setAttribute("data-capture-index", String(i));
			check = document.createElement("span");
			check.className = "preset-check" + (captureState.selected[String(i)] ? " is-on" : "");
			if (captureState.selected[String(i)] && EffectIcons.check) {
				check.innerHTML = EffectIcons.check();
			}
			row.appendChild(check);
			appendRowBody(
				row,
				iconForLabel(component.displayName),
				component.displayName,
				typeof PresetCapture !== "undefined" && PresetCapture.parameterLine
					? PresetCapture.parameterLine(component)
					: ""
			);
			if (component.captureStatus === "unsupported" || component.skippedCount) {
				skippedLine = document.createElement("span");
				skippedLine.className = "result-sub preset-unsupported";
				if (component.skippedReasons && component.skippedReasons.length &&
						component.captureStatus !== "unsupported") {
					skippedLine.textContent = component.skippedReasons.map(function (row) {
						return (row.displayName || "Parameter") + ": " + (row.reason || "");
					}).join(" · ");
				} else {
					skippedLine.textContent = component.limitation ||
						(component.skippedCount ? component.skippedCount + " skipped" : "");
				}
				row.appendChild(skippedLine);
			}
			presetsBody.appendChild(row);
		}
		if (captureState.conflict) {
			paintPresetNote("A preset named \"" + captureState.conflict.existing.name + "\" already exists.");
			presetsBody.appendChild(presetTextButton("Replace", "replace-name", captureState.conflict.existing.id));
			presetsBody.appendChild(presetTextButton("Choose another name", "rename-conflict", ""));
		}
		input = document.createElement("input");
		input.className = "preset-name-input";
		input.type = "text";
		input.placeholder = "Preset name";
		input.value = captureState.name || "";
		input.id = "preset-name-input";
		presetsBody.appendChild(input);
		saveBtn = document.createElement("button");
		saveBtn.type = "button";
		saveBtn.className = "preset-save-btn";
		saveBtn.textContent = "Save Preset";
		saveBtn.id = "preset-save-btn";
		selectedIndexes = selectedCaptureIndexes();
		saveBtn.disabled = !(typeof PresetCapture !== "undefined" && PresetCapture.canSave
			? PresetCapture.canSave(captureState.name, captureState.components, captureState.selected)
			: selectedIndexes.length);
		presetsBody.appendChild(saveBtn);
		input.addEventListener("input", function () {
			captureState.name = input.value;
			saveBtn.disabled = !(typeof PresetCapture !== "undefined" && PresetCapture.canSave
				? PresetCapture.canSave(captureState.name, captureState.components, captureState.selected)
				: selectedIndexes.length && PresetSchema.normalizeName(captureState.name));
		});
	}

	function selectedCaptureIndexes() {
		var indexes = [];
		var i;
		if (!captureState) {
			return indexes;
		}
		for (i = 0; i < captureState.components.length; i++) {
			if (captureState.selected[String(i)] && (
					typeof PresetCapture !== "undefined" && PresetCapture.isReplayable
						? PresetCapture.isReplayable(captureState.components[i])
						: captureState.components[i].captureStatus !== "unsupported"
				)) {
				indexes.push(i);
			}
		}
		return indexes;
	}

	function saveCapturedPreset(replaceId) {
		var indexes;
		var name;
		if (!captureState) {
			return;
		}
		name = typeof PresetSchema !== "undefined"
			? PresetSchema.normalizeName(captureState.name)
			: String(captureState.name || "").replace(/^\s+|\s+$/g, "");
		if (!name) {
			showApplyFeedback({
				ok: false,
				preset: true,
				reason: "EMPTY_NAME",
				status: "Name this preset"
			});
			return;
		}
		indexes = selectedCaptureIndexes();
		if (!indexes.length) {
			showApplyFeedback({
				ok: false,
				preset: true,
				reason: "EMPTY_PRESET",
				status: "Nothing to save"
			});
			return;
		}
		if (typeof PresetCapture === "undefined") {
			return;
		}
		paintPresetNote("Capturing...");
		PresetCapture.captureComponents(csInterface, captureState.session, indexes, function (captured) {
			var built;
			var saved;
			var counts;
			if (!captured || !captured.ok) {
				showApplyFeedback(captured || {
					ok: false,
					preset: true,
					reason: "WRITE_FAILED"
				});
				renderCaptureForm();
				return;
			}
			built = PresetCapture.assemble(name, captured.components);
			if (!built.ok) {
				showApplyFeedback(built);
				renderCaptureForm();
				return;
			}
			saved = PresetStore.save(built.preset, {
				csInterface: csInterface,
				replaceId: replaceId
			});
			if (!saved.ok && saved.reason === "NAME_CONFLICT") {
				captureState.conflict = saved;
				renderCaptureForm();
				return;
			}
			if (!saved.ok) {
				showApplyFeedback(saved);
				renderCaptureForm();
				return;
			}
			reloadPresetLibrary();
			counts = typeof PresetCapture.summary === "function"
				? PresetCapture.summary(saved.preset.components)
				: { effects: saved.preset.components.length, skipped: 0 };
			closePresetLibrary();
			showApplyFeedback({
				ok: true,
				preset: true,
				command: true,
				presetName: saved.preset.name,
				status: "Preset saved",
				applied: 1
			});
			if (applyStatus) {
				applyStatus.className = "is-ok";
				applyStatus.textContent = "Preset saved";
			}
		});
	}

	function confirmDeletePreset(id) {
		var preset = findPresetById(id);
		if (!preset || typeof PresetStore === "undefined") {
			return;
		}
		presetsBody.innerHTML = "";
		paintPresetNote("Delete " + preset.name + "?");
		presetsBody.appendChild(presetTextButton("Delete", "confirm-delete", id));
		presetsBody.appendChild(presetTextButton("Cancel", "cancel-delete", id));
	}

	function renamePresetPrompt(id) {
		var preset = findPresetById(id);
		var input;
		var saveBtn;
		if (!preset) {
			return;
		}
		presetsBody.innerHTML = "";
		paintPresetNote("Rename");
		input = document.createElement("input");
		input.className = "preset-name-input";
		input.value = preset.name;
		presetsBody.appendChild(input);
		saveBtn = document.createElement("button");
		saveBtn.type = "button";
		saveBtn.className = "preset-save-btn";
		saveBtn.textContent = "Save";
		saveBtn.addEventListener("click", function () {
			var result = PresetStore.rename(id, input.value, presetStoreOptions());
			if (!result.ok) {
				showApplyFeedback(result);
				return;
			}
			openPresetLibrary();
		});
		presetsBody.appendChild(saveBtn);
	}

	function appendRow(effect, index) {
		var row = document.createElement("div");
		var heart = document.createElement("button");
		var isAction = !!(effect && effect.kind === "action");
		var favorite = !isAction && FavoritesStore.has(effect.premiereName);
		var kind = isAction ? "action" : "effect";
		var subtitle = isAction
			? "Action"
			: (effect && effect.kind === "clip-control" ? "Clip" : "Video Effect");

		row.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", kind);

		appendRowBody(
			row,
			iconForLabel(effect.name),
			effect.name,
			subtitle
		);

		if (!isAction) {
			heart.className = "heart-btn" + (favorite ? " is-on" : "");
			heart.type = "button";
			heart.setAttribute("data-action", "favorite");
			heart.setAttribute("data-name", effect.premiereName);
			heart.setAttribute("aria-label", favorite ? "Remove favorite" : "Add favorite");
			heart.innerHTML = EffectIcons.heart(favorite);
			row.appendChild(heart);
		}
		appendKbd(row);
		staggerRow(row, index);
		searchResults.appendChild(row);
		currentRows.push(isAction
			? { kind: "action", action: effect, effect: effect }
			: { kind: "effect", effect: effect });
	}

	function appendRecentCommandRow(entry, index) {
		var row = document.createElement("div");
		var iconSource = (entry && (entry.parameter || entry.name || entry.title || entry.query)) || "";

		row.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		row.setAttribute("data-index", String(index));
		row.setAttribute("data-kind", "recent-command");
		row.setAttribute("data-query", entry.query || "");
		row.setAttribute("data-name", entry.name || "");

		appendRowBody(row, iconForLabel(iconSource), entry.name || entry.title || entry.query, "Recent");
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
		var name = effectName || (payload && (payload.effect || payload.component)) || "";
		name = String(name || "").replace(/^\s+|\s+$/g, "");
		if (payload && payload.ok && name) {
			RecentStore.add({
				kind: "effect",
				name: name,
				title: name
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
		var runtime;
		var diagEl;
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
		runtime = payload && payload.runtime
			? payload.runtime
			: (payload && payload.clips && payload.clips[0] && payload.clips[0].runtime
				? payload.clips[0].runtime
				: null);
		if (runtime) {
			diagEl = document.createElement("pre");
			diagEl.className = "action-runtime-diag";
			diagEl.textContent = runtime.readable
				? String(runtime.readable)
				: JSON.stringify(runtime, null, 2);
			body.appendChild(diagEl);
			try {
				console.log("[PickFX ZoomInDiag]", runtime.failingOperation || runtime, runtime);
			} catch (ignoreLog) {}
			writeActionDebugToDesktop(payload);
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

	function looksLikeTerminalCommand(query) {
		var text = String(query || "").replace(/^\s+|\s+$/g, "");
		return !!(
			/\b(?:x\s*-?\d+(?:\.\d+)?\s+y\s*-?\d+(?:\.\d+)?)\s*$/i.test(text) ||
			/-?\d+(?:\.\d+)?\s*(?:%|frames?|seconds?)?\s*$/i.test(text)
		);
	}

	function commandForProductionChoice(choice, query) {
		var parsed = typeof TerminalCommandResolver !== "undefined" &&
			TerminalCommandResolver.parse
			? TerminalCommandResolver.parse(query)
			: null;
		var suffix = parsed && parsed.hasValue ? " " + String(parsed.value) : "";
		if (/%\s*$/.test(String(query || ""))) {
			suffix += "%";
		}
		return String(choice.displayName || choice.name || "") + suffix;
	}

	function appendProductionChoice(choice, index, query) {
		var card = document.createElement("div");
		var body = document.createElement("div");
		var command = commandForProductionChoice(choice, query);
		card.className = "result-row" + (index === selectedIndex ? " is-selected" : "");
		card.setAttribute("data-index", String(index));
		card.setAttribute("data-kind", "production-command-choice");
		card.setAttribute("data-query", command);
		body.className = "command-result-body";
		appendText(
			body,
			"command-result-title",
			choice.displayName || choice.name || "Verified command"
		);
		appendText(
			body,
			"command-result-sub",
			choice.type === "MOTION" ? "Parameter" : "Effect"
		);
		card.appendChild(body);
		searchResults.appendChild(card);
		currentRows.push({
			kind: "production-command-choice",
			query: command,
			choice: choice
		});
	}

	function paintProductionTerminalPreview(model, query) {
		var card;
		var body;
		var i;
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		selectedIndex = 0;
		if (model.kind === "executable") {
			card = document.createElement("div");
			body = document.createElement("div");
			card.className = "result-row command-result is-selected";
			card.setAttribute("data-index", "0");
			card.setAttribute("data-kind", "production-command");
			body.className = "command-result-body";
			appendText(body, "command-result-title", model.title);
			appendText(body, "command-result-sub", model.detail);
			appendText(body, "command-result-kind", model.kindLabel);
			card.appendChild(body);
			searchResults.appendChild(card);
			currentRows.push({
				kind: "production-command",
				resolution: model.resolution
			});
			syncStageMode(true, true);
			return true;
		}
		if (model.kind === "choices" && model.choices && model.choices.length) {
			appendSection("Verified options");
			for (i = 0; i < model.choices.length; i++) {
				appendProductionChoice(model.choices[i], i, query);
			}
			syncStageMode(true, true);
			return true;
		}
		if (looksLikeTerminalCommand(query)) {
			paintEmpty(
				"No executable result",
				"none",
				"Try a verified effect or Motion parameter."
			);
			return true;
		}
		return false;
	}

	function discoveryValueText(parameter, applied) {
		if (typeof TerminalEffectDiscovery === "undefined" ||
				!TerminalEffectDiscovery.displayValue) {
			return applied ? "—" : "Not applied";
		}
		return TerminalEffectDiscovery.displayValue(parameter, {
			applied: applied === true,
			unknown: parameter && parameter.currentValue === undefined
		});
	}

	function appendDiscoveryParameterRow(parameter, index, applied) {
		var card = document.createElement("div");
		var nameEl;
		var valueEl;
		var kindEl;
		var executable = !!(parameter && parameter.executable);
		var activeIndex = paletteMode() === "search"
			? selectedIndex
			: paletteFlow.selectedIndex;
		card.className = "result-row is-discovery-param" +
			(executable ? " is-executable" : " is-readonly") +
			(index === activeIndex ? " is-selected" : "");
		card.setAttribute("data-index", String(index));
		card.setAttribute("data-kind", "discovery-parameter");
		card.setAttribute(
			"data-executable",
			executable ? "true" : "false"
		);
		nameEl = document.createElement("div");
		nameEl.className = "discovery-param-name";
		nameEl.textContent = parameter.parameterDisplayName || "—";
		valueEl = document.createElement("div");
		valueEl.className = "discovery-param-value";
		valueEl.textContent = discoveryValueText(parameter, applied);
		kindEl = document.createElement("div");
		kindEl.className = "discovery-param-kind";
		kindEl.textContent = parameter.kindLabel || "Parameter";
		card.appendChild(nameEl);
		card.appendChild(valueEl);
		card.appendChild(kindEl);
		searchResults.appendChild(card);
		currentRows.push({
			kind: "discovery-parameter",
			parameter: parameter,
			executable: executable
		});
	}

	function paintEffectBrowser(model) {
		var header;
		var body;
		var applied;
		var i;
		var keepIndex = selectedIndex;
		var sameEffect = !!(lastDiscoveryBrowser && model &&
			lastDiscoveryBrowser.effect && model.effect &&
			lastDiscoveryBrowser.effect.displayName === model.effect.displayName);
		var effect = model.effect || (model.capability
			? { displayName: model.capability.displayName }
			: null);
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		lastDiscoveryBrowser = model;
		selectedIndex = 0;
		applied = model.applied === true;
		header = document.createElement("div");
		header.className = "result-row is-effect-header" +
			(selectedIndex === 0 ? " is-selected" : "");
		header.setAttribute("data-index", "0");
		header.setAttribute("data-kind", "discovery-effect");
		appendRowBody(
			header,
			iconForLabel(effect && effect.displayName ? effect.displayName : "Effect"),
			effect && effect.displayName ? effect.displayName : "Effect",
			""
		);
		body = document.createElement("div");
		body.className = "command-result-kind";
		body.textContent = "EFFECT";
		header.appendChild(body);
		searchResults.appendChild(header);
		currentRows.push({
			kind: "discovery-effect",
			effect: effect,
			browser: model
		});
		for (i = 0; i < (model.parameters || []).length; i++) {
			appendDiscoveryParameterRow(
				model.parameters[i],
				currentRows.length,
				applied
			);
		}
		syncStageMode(true, true);
		if (sameEffect && keepIndex > 0 && keepIndex < currentRows.length) {
			selectedIndex = keepIndex;
			updateSelectionHighlight();
		}
		scrollSelectedIntoView();
	}

	function requestDiscoveryLiveValues(model) {
		var effectName;
		var token;
		if (!model || model.kind !== "effect-browser" ||
				!model.effect ||
				typeof PremiereBridge === "undefined" ||
				typeof PremiereBridge.listEffectParameters !== "function") {
			return;
		}
		effectName = model.effect.premiereName || model.effect.displayName;
		token = ++discoveryLiveToken;
		PremiereBridge.listEffectParameters(csInterface, effectName, function (listed) {
			var next;
			if (token !== discoveryLiveToken ||
					!lastDiscoveryBrowser ||
					lastDiscoveryBrowser.kind !== "effect-browser" ||
					!lastDiscoveryBrowser.effect ||
					lastDiscoveryBrowser.effect.displayName !==
						model.effect.displayName) {
				return;
			}
			next = typeof TerminalEffectDiscovery !== "undefined" &&
				TerminalEffectDiscovery.applyLiveValues
				? TerminalEffectDiscovery.applyLiveValues(model, listed)
				: model;
			lastDiscoveryBrowser = next;
			if (paletteMode() === "parameters" || paletteMode() === "value") {
				if (next && next.parameters) {
					paletteFlow.parameters = PaletteFlow.executableParameters(next.parameters);
					if (paletteFlow.parameter) {
						var i;
						for (i = 0; i < paletteFlow.parameters.length; i++) {
							if (PaletteFlow.parameterName(paletteFlow.parameters[i]) ===
									PaletteFlow.parameterName(paletteFlow.parameter)) {
								paletteFlow.parameter = paletteFlow.parameters[i];
								break;
							}
						}
					}
				}
				renderPaletteFlow();
				applyPaletteFocus();
				return;
			}
			paintEffectBrowser(next);
		});
	}

	function showNotValidatedFeedback(guard) {
		var customer = isCustomerTerminalCatalog();
		var msg = customer
			? {
				title: "No executable parameter found.",
				detail: guard && guard.parameter && guard.parameter.parameterDisplayName
					? guard.parameter.parameterDisplayName + " isn't available here."
					: "No executable parameter found.",
				footer: "No executable parameter found."
			}
			: {
				title: "Not validated for editing yet",
				detail: guard && guard.parameter && guard.parameter.parameterDisplayName
					? guard.parameter.parameterDisplayName + " is not production-ready."
					: "This parameter is not validated for editing yet.",
				footer: "Not validated for editing yet"
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
			reason: (guard && guard.reason) || "PARAMETER_NOT_VALIDATED",
			status: "PARAMETER_NOT_VALIDATED",
			uiKind: "not-validated",
			executable: false
		});
		statusTimer = setTimeout(function () {
			setFooterFeedback(false);
			renderSearch();
			statusTimer = null;
		}, FEEDBACK_MS);
		focusSearch();
	}

	function completeDiscoveryParameter(row) {
		if (!row || !row.parameter) {
			return false;
		}
		if (!row.parameter.executable) {
			showNotValidatedFeedback({
				parameter: row.parameter,
				reason: "PARAMETER_NOT_VALIDATED"
			});
			return true;
		}
		if (typeof PaletteFlow !== "undefined") {
			if (paletteFlow.mode !== "parameters" && lastDiscoveryBrowser && lastDiscoveryBrowser.effect) {
				transitionPalette(
					PaletteFlow.selectEffect(
						paletteFlow,
						lastDiscoveryBrowser.effect,
						lastDiscoveryBrowser.parameters || []
					),
					{ render: "flow", focus: false }
				);
			}
			transitionPalette(
				PaletteFlow.selectParameter(paletteFlow, row.parameter),
				{ render: "flow" }
			);
			return true;
		}
		return false;
	}

	function paletteMode() {
		return paletteFlow && paletteFlow.mode ? paletteFlow.mode : "search";
	}

	function effectFromRow(row) {
		if (!row) {
			return null;
		}
		if (row.effect) {
			return row.effect;
		}
		if (row.choice && (row.choice.displayName || row.choice.name)) {
			return {
				displayName: row.choice.displayName || row.choice.name,
				premiereName: row.choice.premiereName || row.choice.displayName || row.choice.name,
				matchName: row.choice.matchName || "",
				defaultParameterIndex: row.choice.defaultParameterIndex,
				defaultParameterDisplayName: row.choice.defaultParameterDisplayName
			};
		}
		if (row.browser && row.browser.effect) {
			return row.browser.effect;
		}
		return null;
	}

	function effectForPaletteFlow(effect) {
		var name;
		var i;
		var found;
		if (effect && effect.kind === "clip-control") {
			return effect;
		}
		if (!effect || !discoveryCatalog || !discoveryCatalog.effects) {
			return effect;
		}
		name = effect.premiereName || effect.displayName || effect.name || "";
		for (i = 0; i < discoveryCatalog.effects.length; i++) {
			found = discoveryCatalog.effects[i];
			if (found && (found.premiereName === name || found.displayName === name)) {
				return found;
			}
		}
		return effect;
	}

	function parametersForEffect(effect) {
		var name;
		var i;
		var found;
		if (!effect) {
			return [];
		}
		if (effect.kind === "clip-control") {
			return (effect.parameters || []).slice(0);
		}
		if (lastDiscoveryBrowser && lastDiscoveryBrowser.parameters &&
				lastDiscoveryBrowser.effect &&
				(lastDiscoveryBrowser.effect.displayName === effect.displayName ||
					lastDiscoveryBrowser.effect.premiereName === effect.premiereName)) {
			return lastDiscoveryBrowser.parameters.slice(0);
		}
		name = effect.displayName || effect.premiereName;
		if (discoveryCatalog && discoveryCatalog.effects) {
			for (i = 0; i < discoveryCatalog.effects.length; i++) {
				found = discoveryCatalog.effects[i];
				if (found && (found.displayName === name || found.premiereName === name)) {
					return (found.parameters || []).slice(0);
				}
			}
		}
		return [];
	}

	function syncPaletteInputOwnership() {
		var mode = paletteMode();
		var searchOwnsInput = mode === "search";
		var valueOwnsInput = mode === "value" &&
			!(typeof PaletteFlow !== "undefined" &&
				PaletteFlow.usesChoiceList &&
				PaletteFlow.usesChoiceList(paletteFlow));
		if (searchInput) {
			searchInput.disabled = !searchOwnsInput;
			searchInput.tabIndex = searchOwnsInput ? 0 : -1;
			searchInput.setAttribute("aria-hidden", searchOwnsInput ? "false" : "true");
		}
		if (valueInput) {
			valueInput.disabled = !valueOwnsInput;
			valueInput.tabIndex = valueOwnsInput ? 0 : -1;
			valueInput.setAttribute("aria-hidden", valueOwnsInput ? "false" : "true");
		}
	}

	function syncPaletteChrome() {
		var mode = paletteMode();
		if (commandBar) {
			commandBar.classList.toggle("is-parameter-mode", mode === "parameters");
			commandBar.classList.toggle("is-value-mode", mode === "value");
		}
		if (paletteValueStage) {
			if (mode === "value" && !PaletteFlow.usesChoiceList(paletteFlow)) {
				paletteValueStage.removeAttribute("hidden");
			} else {
				paletteValueStage.setAttribute("hidden", "hidden");
			}
		}
		if (paletteEffectLabel) {
			paletteEffectLabel.textContent = paletteFlow.effect
				? (paletteFlow.effect.displayName || "")
				: "";
		}
		if (paletteParameterLabel) {
			paletteParameterLabel.textContent = paletteFlow.parameter
				? (PaletteFlow.parameterName(paletteFlow.parameter) || "")
				: "";
		}
		if (valueInput) {
			valueInput.value = paletteFlow.valueText || "";
			if (paletteFlow.parameter && paletteFlow.parameter.currentValue !== undefined &&
					paletteFlow.parameter.currentValue !== null && !paletteFlow.valueText) {
				valueInput.placeholder = String(paletteFlow.parameter.currentValue);
			} else if (paletteFlow.effect && paletteFlow.effect.kind === "clip-control" &&
					paletteFlow.effect.valueType === "point") {
				valueInput.placeholder = "100 200";
			} else {
				valueInput.placeholder = "";
			}
		}
		syncPaletteInputOwnership();
	}

	function paintParameterFlow() {
		var i;
		var list;
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		list = paletteFlow.parameters || [];
		appendSection(paletteFlow.effect && paletteFlow.effect.displayName
			? paletteFlow.effect.displayName
			: "Parameters");
		paletteFlow = PaletteFlow.selectIndex(
			paletteFlow,
			paletteFlow.selectedIndex || 0,
			list.length
		);
		for (i = 0; i < list.length; i++) {
			appendDiscoveryParameterRow(list[i], currentRows.length, list[i].applied === true);
		}
		syncStageMode(true, true);
		scrollSelectedIntoView();
		syncPaletteChrome();
	}

	function paintChoiceValueFlow() {
		var i;
		var option;
		var card;
		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		appendSection(PaletteFlow.parameterName(paletteFlow.parameter) || "Value");
		paletteFlow = PaletteFlow.selectIndex(
			paletteFlow,
			paletteFlow.selectedIndex || 0,
			(paletteFlow.options || []).length
		);
		for (i = 0; i < (paletteFlow.options || []).length; i++) {
			option = paletteFlow.options[i];
			card = document.createElement("div");
			card.className = "result-row" +
				(i === paletteFlow.selectedIndex ? " is-selected" : "");
			card.setAttribute("data-index", String(i));
			card.setAttribute("data-kind", "choice-option");
			appendText(card, "effect-name", option.label);
			searchResults.appendChild(card);
			currentRows.push({
				kind: "choice-option",
				option: option
			});
		}
		syncStageMode(true, true);
		syncPaletteChrome();
	}

	function renderPaletteFlow() {
		var mode = paletteMode();
		if (mode === "parameters") {
			paintParameterFlow();
			return true;
		}
		if (mode === "value" && PaletteFlow.usesChoiceList(paletteFlow)) {
			paintChoiceValueFlow();
			return true;
		}
		if (mode === "value") {
			searchResults.innerHTML = "";
			currentMatches = [];
			currentRows = [{ kind: "value-input", parameter: paletteFlow.parameter }];
			syncPaletteChrome();
			return true;
		}
		syncPaletteChrome();
		return false;
	}

	function beginEffectFlow(effect) {
		var parameters;
		if (!effect || typeof PaletteFlow === "undefined") {
			return false;
		}
		effect = effectForPaletteFlow(effect);
		parameters = parametersForEffect(effect);
		transitionPalette(
			PaletteFlow.selectEffect(paletteFlow, effect, parameters),
			{ render: "flow" }
		);
		if (paletteFlow.mode === "search") {
			showNotValidatedFeedback({
				parameter: { parameterDisplayName: effect.displayName },
				reason: "PARAMETER_NOT_VALIDATED"
			});
			return true;
		}
		if (effect && parameters && parameters.length) {
			lastDiscoveryBrowser = {
				kind: "effect-browser",
				effect: effect,
				parameters: parameters
			};
			requestDiscoveryLiveValues(lastDiscoveryBrowser);
		}
		return true;
	}

	function applyPaletteValue() {
		var query;
		if (typeof PaletteFlow === "undefined") {
			return false;
		}
		if (valueInput && !PaletteFlow.usesChoiceList(paletteFlow)) {
			paletteFlow = PaletteFlow.setValueText(paletteFlow, valueInput.value);
		}
		query = typeof ClipControlCatalog !== "undefined" &&
			ClipControlCatalog.applyQuery &&
			paletteFlow.effect &&
			paletteFlow.effect.kind === "clip-control"
			? ClipControlCatalog.applyQuery(paletteFlow.effect, paletteFlow.valueText)
			: PaletteFlow.applyQuery(paletteFlow);
		if (!query) {
			return true;
		}
		tryTerminalCommand(query);
		return true;
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
			paintEmpty("No result.", "none", "Try another search.");
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

	function renderLegacyCommandSearch() {
		var effects = EffectRegistry.getEffects();
		var identity = CommandParser.identify(searchInput.value, effects, aliases);
		var query = CommandParser.searchQuery(searchInput.value, effects, aliases);
		var productionModel;
		var recent;
		var favorites;
		var matches;
		var i;
		var found;
		var preview;
		var guard;
		var productionResolution;
		var paletteState;
		var guard;
		var productionResolution;

		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			renderLumetriPicker();
			return;
		}

		if (paletteMode() === "parameters" || paletteMode() === "value") {
			renderPaletteFlow();
			return;
		}

		if (productionTerminalRegistry &&
				terminalResolverEnabled() &&
				typeof TerminalProductionRegistry !== "undefined" &&
				TerminalProductionRegistry.preview &&
				String(searchInput.value || "").replace(/^\s+|\s+$/g, "")) {
			productionModel = TerminalProductionRegistry.preview(
				searchInput.value,
				productionTerminalRegistry
			);
			if (productionModel &&
					productionModel.kind === "executable" &&
					productionModel.resolution &&
					productionModel.resolution.applyOnly === true) {
				productionModel = null;
			}
			if (productionModel &&
					(productionModel.kind === "executable" ||
						productionModel.kind === "choices") &&
					paintProductionTerminalPreview(
						productionModel,
						searchInput.value
					)) {
				lastIdentity = identity;
				lastCommandPreview = productionModel;
				lastDiscoveryBrowser = null;
				return;
			}
		}

		if (discoveryCatalog &&
				typeof TerminalEffectDiscovery !== "undefined" &&
				TerminalEffectDiscovery.browse &&
				String(searchInput.value || "").replace(/^\s+|\s+$/g, "")) {
			lastDiscoveryBrowser = TerminalEffectDiscovery.browse(
				searchInput.value,
				discoveryCatalog
			);
			if (lastDiscoveryBrowser &&
					(lastDiscoveryBrowser.kind === "effect-browser" ||
						lastDiscoveryBrowser.kind === "motion-browser")) {
				paintEffectBrowser(lastDiscoveryBrowser);
				requestDiscoveryLiveValues(lastDiscoveryBrowser);
				lastIdentity = identity;
				lastCommandPreview = lastDiscoveryBrowser;
				return;
			}
			if (lastDiscoveryBrowser &&
					lastDiscoveryBrowser.kind === "choices" &&
					lastDiscoveryBrowser.candidates &&
					lastDiscoveryBrowser.candidates.length) {
				searchResults.innerHTML = "";
				currentMatches = [];
				currentRows = [];
				appendSection("Effects");
				for (i = 0; i < lastDiscoveryBrowser.candidates.length; i++) {
					appendProductionChoice(
						lastDiscoveryBrowser.candidates[i],
						i,
						searchInput.value
					);
				}
				syncStageMode(true, true);
				lastIdentity = identity;
				return;
			}
			if (lastDiscoveryBrowser &&
					lastDiscoveryBrowser.kind === "command" &&
					looksLikeTerminalCommand(searchInput.value)) {
				productionResolution = productionModel && productionModel.resolution
					? productionModel.resolution
					: (typeof TerminalProductionRegistry.resolve === "function"
						? TerminalProductionRegistry.resolve(
							searchInput.value,
							productionTerminalRegistry
						)
						: null);
				guard = TerminalEffectDiscovery.writeGuard(
					searchInput.value,
					discoveryCatalog,
					productionResolution
				);
				if (guard && guard.reason === "PARAMETER_NOT_VALIDATED") {
					searchResults.innerHTML = "";
					currentMatches = [];
					currentRows = [{
						kind: "discovery-parameter",
						parameter: guard.parameter,
						executable: false
					}];
					selectedIndex = 0;
					paintUnsupportedNotice({
						title: guard.effect
							? guard.effect.displayName
							: "Effect",
						detail: (guard.parameter &&
							guard.parameter.parameterDisplayName
							? guard.parameter.parameterDisplayName
							: "Parameter") +
							(isCustomerTerminalCatalog()
								? " — No executable parameter found."
								: " — Not validated for editing yet")
					});
					lastIdentity = identity;
					return;
				}
				if (productionModel &&
						paintProductionTerminalPreview(
							productionModel,
							searchInput.value
						)) {
					lastIdentity = identity;
					lastCommandPreview = productionModel;
					return;
				}
			}
			if (isCustomerTerminalCatalog()) {
				if (lastDiscoveryBrowser &&
						lastDiscoveryBrowser.kind === "not-found") {
					paintEmpty(
						lastDiscoveryBrowser.status ||
							(lastDiscoveryBrowser.reason === "PARAMETER_NOT_FOUND"
								? "No executable parameter found."
								: "No result."),
						"none",
						lastDiscoveryBrowser.reason === "PARAMETER_NOT_FOUND"
								? "No executable parameter found."
								: "Try another search."
					);
					lastIdentity = identity;
					lastCommandPreview = lastDiscoveryBrowser;
					return;
				}
				if (looksLikeTerminalCommand(searchInput.value)) {
					paintEmpty(
						"No executable parameter found.",
						"none",
						"That command isn't available."
					);
					lastIdentity = identity;
					return;
				}
				paintEmpty(
					"No result.",
					"none",
					"Try another search."
				);
				lastIdentity = identity;
				lastCommandPreview = lastDiscoveryBrowser;
				return;
			}
		}

		lastIdentity = identity;
		discoverToken += 1;
		lastCommandPreview = null;

		if (typeof CommandPreview !== "undefined" && CommandPreview.fromQuery &&
				!isCustomerTerminalCatalog()) {
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
						if (!isCustomerTerminalCatalog() ||
								(productionTerminalRegistry &&
									typeof TerminalProductionRegistry !== "undefined" &&
									TerminalProductionRegistry.resolve(
										recent[i].query,
										productionTerminalRegistry
									).ok)) {
							appendRecentCommandRow(recent[i], currentRows.length);
						}
					} else if (recent[i] && recent[i].name) {
						if (isCustomerTerminalCatalog() &&
								!customerEffectVisible(recent[i].name)) {
							continue;
						}
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
					if (isCustomerTerminalCatalog() &&
							!customerEffectVisible(favorites[i].name || favorites[i].displayName)) {
						continue;
					}
					appendRow(favorites[i], currentRows.length);
					currentMatches.push(favorites[i]);
				}
			}

			if (!currentRows.length) {
				paintEmpty("Search PickFX", "idle");
			} else {
				syncStageMode(false, true);
			}

			if (selectedIndex >= currentRows.length) {
				selectedIndex = Math.max(0, currentRows.length - 1);
			}
			scrollSelectedIntoView();
			return;
		}

		if (isCustomerTerminalCatalog() ||
				(terminalResolverEnabled() && productionTerminalRegistry)) {
			paintEmpty(
				"No result.",
				"none",
				"Try another search."
			);
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

	function renderSearch() {
		var effects = EffectRegistry.getEffects();
		var query = String(searchInput.value || "");
		var normalized = EffectSearch.normalize(query);
		var recent;
		var favorites;
		var matches;
		var found;
		var effect;
		var i;
		var usedNames;
		var recentRows;
		var favoriteRows;
		var groupedMatches;
		var actionMatches;
		var presetMatches;
		var name;

		if (paletteMode() !== "search") {
			renderPaletteFlow();
			applyPaletteFocus();
			return;
		}

		searchResults.innerHTML = "";
		currentMatches = [];
		currentRows = [];
		lastEffectMatches = [];
		lastParameterSuggestions = [];
		lastIdentity = null;
		lastCommandPreview = null;
		lastDiscoveryBrowser = null;
		discoverToken += 1;
		discoveryLiveToken += 1;

		if (!normalized) {
			recent = RecentStore.list();
			favorites = effectsFromNames(FavoritesStore.list());
			usedNames = {};

			if (recent.length) {
				recentRows = [];
				for (i = 0; i < recent.length; i++) {
					if (!recent[i] || !recent[i].name) {
						continue;
					}
					if (!catalogItemVisible(recent[i].name)) {
						continue;
					}
					found = EffectRegistry.findByPremiereName(recent[i].name) ||
						(typeof ClipControlCatalog !== "undefined" && ClipControlCatalog.find
							? ClipControlCatalog.find(recent[i].name, productionTerminalRegistry)
							: null) ||
						(typeof ActionRegistry !== "undefined" && ActionRegistry.findByName
							? ActionRegistry.findByName(recent[i].name)
							: null);
					if (found) {
						recentRows.push(found);
						usedNames[found.premiereName || found.name] = true;
					}
				}
				if (recentRows.length) {
					appendSection("Recent", recentRows.length);
					for (i = 0; i < recentRows.length; i++) {
						appendRow(recentRows[i], currentRows.length);
						currentMatches.push(recentRows[i]);
					}
				}
			}

			if (favorites.length) {
				favoriteRows = [];
				for (i = 0; i < favorites.length; i++) {
					effect = favorites[i];
					if (!catalogItemVisible(effect.premiereName || effect.name, effect)) {
						continue;
					}
					name = effect.premiereName || effect.name;
					if (usedNames[name]) {
						continue;
					}
					favoriteRows.push(effect);
					usedNames[name] = true;
				}
				if (favoriteRows.length) {
					appendSection("Favorites", favoriteRows.length);
					for (i = 0; i < favoriteRows.length; i++) {
						appendRow(favoriteRows[i], currentRows.length);
						currentMatches.push(favoriteRows[i]);
					}
				}
			}

			appendGroupedEffects(browseVisibleEffects(), usedNames);

			if (!currentRows.length) {
				paintEmpty("Search effects...", "idle");
				return;
			}
			if (selectedIndex >= currentRows.length) {
				selectedIndex = Math.max(0, currentRows.length - 1);
			}
			syncStageMode(false, true);
			updateSelectionHighlight();
			return;
		}

		matches = EffectSearch.search(query, effects.concat(clipControlItems()), aliases);
		groupedMatches = [];
		for (i = 0; i < matches.length; i++) {
			effect = matches[i] && matches[i].effect;
			if (!effect) {
				continue;
			}
			if (!catalogItemVisible(effect.premiereName || effect.name, effect)) {
				continue;
			}
			groupedMatches.push(effect);
		}
		if (typeof PresetSearch !== "undefined" && PresetSearch.search) {
			presetMatches = PresetSearch.search(query, presetLibrary);
			if (presetMatches.length) {
				appendSection("My Presets", presetMatches.length);
				for (i = 0; i < presetMatches.length; i++) {
					appendPresetSearchRow(presetMatches[i].preset, currentRows.length);
				}
			}
		}
		if (typeof ActionRegistry !== "undefined" && ActionRegistry.search) {
			actionMatches = ActionRegistry.search(query);
			if (actionMatches.length) {
				appendSection("Actions", actionMatches.length);
				for (i = 0; i < actionMatches.length; i++) {
					appendRow(actionMatches[i].action, currentRows.length);
					currentMatches.push(actionMatches[i].action);
				}
			}
		}
		appendGroupedEffects(groupedMatches, null);
		lastEffectMatches = currentMatches.slice(0);

		if (!currentRows.length) {
			paintEmpty("No effects found.", "none", "Try another effect name.");
			return;
		}
		if (selectedIndex >= currentRows.length) {
			selectedIndex = Math.max(0, currentRows.length - 1);
		}
		syncStageMode(true, true);
		updateSelectionHighlight();
	}

	function updateSelectionHighlight() {
		var rows = searchResults.querySelectorAll(".result-row");
		var activeIndex = typeof PaletteFlow !== "undefined" &&
			paletteMode() !== "search"
			? paletteFlow.selectedIndex
			: selectedIndex;
		var i;
		for (i = 0; i < rows.length; i++) {
			if (i === activeIndex) {
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
		if (typeof PaletteFlow !== "undefined" && paletteMode() !== "search" &&
				PaletteFlow.interceptsArrows(paletteFlow)) {
			paletteFlow = PaletteFlow.move(paletteFlow, delta, currentRows.length);
			updateSelectionHighlight();
			scrollSelectedIntoView();
			return;
		}
		if (!currentRows.length) {
			return;
		}
		selectedIndex = (selectedIndex + delta + currentRows.length) % currentRows.length;
		updateSelectionHighlight();
		if (paletteMode() !== "value") {
			focusSearch();
		}
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

	function requireProductAccess() {
		if (typeof PanelEntitlement !== "undefined" &&
				PanelEntitlement.isCustomerGateActive &&
				PanelEntitlement.isCustomerGateActive() &&
				!PanelEntitlement.productAccess()) {
			if (typeof PickFXProduct !== "undefined" && PickFXProduct.showAccessInactive) {
				PickFXProduct.showAccessInactive();
			}
			return false;
		}
		return true;
	}

	function applySelectedEffect() {
		applyFromSearchInput();
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

	function terminalResolverEnabled() {
		if (!productionTerminalRegistry ||
				productionTerminalRegistryStatus !== "ready" ||
				typeof TerminalProductionRegistry === "undefined" ||
				typeof TerminalProductionRegistry.isFeatureEnabled !== "function") {
			return false;
		}
		return TerminalProductionRegistry.isFeatureEnabled({
			explicit: window.__PICKFX_TERMINAL_RESOLVER_ENABLED__,
			storage: window.localStorage
		});
	}

	function terminalResolutionFailure(resolution) {
		var statuses = {
			AMBIGUOUS_EFFECT: "Multiple effects match. Choose one.",
			AMBIGUOUS_PARAMETER: "Multiple parameters match. No value was written.",
			NO_NUMERIC_PARAMETER: "No suitable numeric parameter was found.",
			INVALID_VALUE: "Invalid numeric value.",
			EFFECT_NAME_REQUIRED: "Enter an effect name before the value.",
			CAPABILITY_NOT_PROMOTED: "No executable result.",
			PARAMETER_NOT_PROMOTED: "No executable result.",
			VALUE_REQUIRED: "Enter a value."
		};
		return {
			ok: false,
			command: true,
			terminalResolver: true,
			reason: resolution.reason,
			status: statuses[resolution.reason] || "Terminal command could not be resolved.",
			query: resolution.query || "",
			value: resolution.value,
			candidates: resolution.candidates || [],
			resolvedEffect: resolution.resolvedEffect || null
		};
	}

	function runTerminalCommand(resolution) {
		if (!requireProductAccess()) {
			return;
		}
		if (applying || typeof TerminalProductionExecutor === "undefined" ||
				typeof TerminalProductionExecutor.dispatch !== "function") {
			return;
		}
		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();
		TerminalProductionExecutor.dispatch(
			csInterface,
			resolution,
			{
				featureEnabled: terminalResolverEnabled(),
				entitlementState: typeof PanelEntitlement !== "undefined" &&
					PanelEntitlement.currentState
					? PanelEntitlement.currentState()
					: undefined
			},
			function (payload) {
				applying = false;
				setApplying(false);
				if (applyBtn) {
					applyBtn.disabled = false;
				}
				if (payload && payload.ok) {
					if (resolution.resolvedEffect) {
						rememberRecent(payload, resolution.resolvedEffect.premiereName);
						delete parameterCache[resolution.resolvedEffect.premiereName];
					} else if (resolution.productionEntry) {
						rememberRecent(payload, resolution.productionEntry.displayName);
					}
				}
				showApplyFeedback(payload);
				showDebugJson(payload);
			}
		);
	}

	function tryTerminalCommand(query) {
		var resolution;
		var failure;
		var guard;
		if (!requireProductAccess()) {
			return true;
		}
		if (!terminalResolverEnabled() || !productionTerminalRegistry ||
				typeof TerminalProductionRegistry === "undefined") {
			return false;
		}
		resolution = TerminalProductionRegistry.resolve(
			query,
			productionTerminalRegistry
		);
		if (resolution && resolution.ok) {
			if (!resolution.productionVerified) {
				return true;
			}
			runTerminalCommand(resolution);
			return true;
		}
		if (discoveryCatalog &&
				typeof TerminalEffectDiscovery !== "undefined" &&
				TerminalEffectDiscovery.writeGuard) {
			guard = TerminalEffectDiscovery.writeGuard(
				query,
				discoveryCatalog,
				resolution
			);
			if (guard && guard.allow && guard.resolution &&
					guard.resolution.productionVerified === true) {
				runTerminalCommand(guard.resolution);
				return true;
			}
			if (guard && !guard.fallthrough && !guard.allow) {
				if (guard.reason === "PARAMETER_NOT_VALIDATED") {
					showNotValidatedFeedback(guard);
					return true;
				}
				failure = terminalResolutionFailure(resolution || {
					reason: guard.reason,
					query: query
				});
				showApplyFeedback(failure);
				showDebugJson(failure);
				return true;
			}
		}
		if (!resolution ||
				resolution.reason === "EMPTY_INPUT" ||
				resolution.reason === "REGISTRY_UNAVAILABLE" ||
				(resolution.reason === "VALUE_REQUIRED" &&
					!looksLikeTerminalCommand(query)) ||
				(resolution.reason === "EFFECT_NOT_FOUND" &&
					!looksLikeTerminalCommand(query))) {
			return false;
		}
		failure = terminalResolutionFailure(resolution);
		showApplyFeedback(failure);
		showDebugJson(failure);
		return true;
	}

	function setScaleClipControl(action) {
		var clip;
		if (typeof ClipControlCatalog !== "undefined" && ClipControlCatalog.find) {
			clip = ClipControlCatalog.find(
				(action && action.parameterDisplayName) || "Scale",
				productionTerminalRegistry
			);
			if (clip) {
				return clip;
			}
		}
		return {
			kind: "clip-control",
			type: "clip-control",
			name: "Scale",
			displayName: "Scale",
			premiereName: "Scale",
			commandName: "Scale",
			valueType: "number",
			parameters: [{
				displayName: "Scale",
				parameterDisplayName: "Scale",
				valueType: "number",
				executable: true,
				writable: true
			}]
		};
	}

	function runPickfxAction(action) {
		if (!requireProductAccess()) {
			return;
		}
		if (!action) {
			return;
		}
		if (action.execution === "set-parameter") {
			beginEffectFlow(setScaleClipControl(action));
			return;
		}
		if (applying) {
			return;
		}
		if (typeof ActionExecutor === "undefined" || typeof ActionExecutor.run !== "function") {
			showApplyFeedback({
				ok: false,
				command: true,
				action: true,
				actionId: action.id,
				reason: "WRITE_FAILED",
				status: "Could not run action."
			});
			return;
		}
		applying = true;
		if (applyBtn) {
			applyBtn.disabled = true;
		}
		beginApplying();
		ActionExecutor.run(csInterface, action, function (payload) {
			applying = false;
			setApplying(false);
			if (applyBtn) {
				applyBtn.disabled = false;
			}
			if (payload && payload.ok) {
				rememberRecent(payload, action.name);
			}
			showApplyFeedback(payload);
			showDebugJson(payload);
		});
	}

	function applyFromSearchInput() {
		var row;
		if (!requireProductAccess()) {
			return;
		}
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			confirmLumetriPicker();
			return;
		}
		if (paletteMode() === "value") {
			applyPaletteValue();
			return;
		}
		if (paletteMode() === "parameters") {
			row = selectedRow();
			if (row && row.parameter) {
				transitionPalette(
					PaletteFlow.selectParameter(paletteFlow, row.parameter),
					{ render: "flow" }
				);
			}
			return;
		}
		row = selectedRow();
		if (typeof PresetExecutor !== "undefined" && PresetExecutor.shouldApplySelectedRow(row)) {
			applyLoadedPreset(row.preset);
			return;
		}
		if (row && row.kind === "action" && row.action) {
			runPickfxAction(row.action);
			return;
		}
		if (row && row.kind === "effect" && row.effect) {
			beginEffectFlow(row.effect);
		}
	}

	function resetPaletteToSearch(keepQuery) {
		if (!keepQuery) {
			setSearchQuery("");
		}
		selectedIndex = 0;
		if (typeof PaletteFlow !== "undefined") {
			transitionPalette(PaletteFlow.toSearch(paletteFlow));
		}
	}

	function handlePaletteEscape() {
		var next;
		if (isPresetsViewOpen()) {
			if (presetViewMode === "capture") {
				openPresetLibrary();
				return;
			}
			closePresetLibrary();
			return;
		}
		if (lumetriPickerSession && lumetriPickerSession.isActive()) {
			cancelLumetriPicker(false);
			return;
		}
		if (typeof PaletteFlow !== "undefined" && paletteMode() !== "search") {
			next = PaletteFlow.escape(paletteFlow);
			if (next.mode === "search") {
				transitionPalette(next, { render: "search" });
				return;
			}
			transitionPalette(next, { render: "flow" });
			return;
		}
		if (searchInput && String(searchInput.value || "")) {
			clearSearch();
			return;
		}
		dismissTerminal();
	}

	function clearSearch() {
		cancelLumetriPicker(true);
		resetPaletteToSearch(false);
		renderSearch();
		applyStatus.textContent = "";
		applyStatus.className = "";
		setFooterFeedback(false);
		focusSearch();
	}

	function dismissTerminal() {
		cancelLumetriPicker(true);
		resetPaletteToSearch(false);
		renderSearch();
		applyStatus.textContent = "";
		applyStatus.className = "";
		setFooterFeedback(false);
		searchInput.blur();
		try {
			document.body.setAttribute("tabindex", "-1");
			document.body.focus();
		} catch (ignoreBodyFocus) {}
	}

	function catalogReady() {
		return !!(discoveryCatalog && discoveryCatalog.ok);
	}

	function paintIndexState() {
		var view;
		if (typeof EffectIndexState === "undefined" || !EffectIndexState.view) {
			return;
		}
		view = EffectIndexState.view(effectIndexState, { catalogReady: catalogReady() });
		if (view.kind === "loading") {
			if (applyStatus && !applyStatus.textContent) {
				applyStatus.className = "is-info";
				applyStatus.textContent = view.message;
			}
			return;
		}
		if (view.showError) {
			if (applyStatus) {
				applyStatus.className = "is-error";
				applyStatus.textContent = view.message;
				setFooterFeedback(true);
			}
			return;
		}
		if (applyStatus && (
			applyStatus.textContent === "Could not load effect index." ||
			applyStatus.textContent === "Loading effects…"
		)) {
			applyStatus.textContent = "";
			applyStatus.className = "";
			setFooterFeedback(false);
		}
	}

	function loadEffectIndex(done) {
		if (effectIndexTimer) {
			clearTimeout(effectIndexTimer);
			effectIndexTimer = null;
		}
		if (typeof EffectIndexState !== "undefined") {
			effectIndexState = EffectIndexState.begin(effectIndexState);
		}
		paintIndexState();
		PremiereBridge.listVideoEffectNames(csInterface, function (payload) {
			var delay;
			if (!payload || !payload.ok) {
				if (typeof EffectIndexState !== "undefined") {
					effectIndexState = EffectIndexState.fail(
						effectIndexState,
						(payload && (payload.error || payload.detail)) || "Could not load effect index.",
						(payload && payload.reason) || "EFFECT_INDEX_UNAVAILABLE"
					);
				}
				paintIndexState();
				showDebugJson({
					ok: false,
					reason: "EFFECT_INDEX_UNAVAILABLE",
					retryable: !!(effectIndexState && effectIndexState.retryable),
					attempt: effectIndexState && effectIndexState.attempt,
					payload: payload
				});
				if (effectIndexState && effectIndexState.retryable) {
					delay = Math.min(1000, 200 * effectIndexState.attempt);
					effectIndexTimer = setTimeout(function () {
						loadEffectIndex(done);
					}, delay);
					return;
				}
				if (done) {
					done(false);
				}
				return;
			}

			EffectRegistry.loadFromNames(payload.names || []);
			if (typeof EffectIndexState !== "undefined") {
				effectIndexState = EffectIndexState.succeed(effectIndexState, payload.names || []);
			}
			paintIndexState();
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

	function discoverEffectRegistry() {
		if (typeof PremiereBridge.discoverEffectRegistry !== "function") {
			showDebugJson({
				ok: false,
				operation: "effect.registry.discovery",
				error: "Effect registry discovery is not available. Reload the panel.",
				readOnly: true,
				settersCalled: false,
				usedQE: false,
				setValueCalls: 0
			});
			return;
		}
		PremiereBridge.discoverEffectRegistry(csInterface, function (payload) {
			if (payload && typeof payload === "object") {
				payload.operation = payload.operation || "effect.registry.discovery";
				payload.readOnly = true;
				payload.settersCalled = false;
				payload.usedQE = false;
				payload.setValueCalls = payload.setValueCalls || 0;
			}
			showDebugJson(payload);
		});
	}

	function registryUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) + "/PickFX/effects-registry.research.json";
		} catch (e) {
			return "";
		}
	}

	function loadRegistryStore() {
		try {
			return JSON.parse(window.localStorage.getItem(REGISTRY_STORE_KEY) || "null");
		} catch (e) {
			return null;
		}
	}

	function saveRegistryStore(registry) {
		var path;
		var dir;
		try {
			window.localStorage.setItem(REGISTRY_STORE_KEY, JSON.stringify(registry));
		} catch (ignoreLocal) {}
		path = registryUserDataPath();
		if (!path || !(window.cep && window.cep.fs && window.cep.fs.writeFile)) {
			return path;
		}
		try {
			dir = csInterface.getSystemPath(SystemPath.USER_DATA) + "/PickFX";
			window.cep.fs.makedir(dir);
			window.cep.fs.writeFile(path, JSON.stringify(registry, null, 2));
		} catch (ignoreFile) {}
		return path;
	}

	function terminalPromotionUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.promotion.json";
		} catch (e) {
			return "";
		}
	}

	function terminalValidationUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.validation.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.promotion.json";
		} catch (e) {
			return "";
		}
	}

	function terminalValidationSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.validation.json";
		} catch (e) {
			return "";
		}
	}

	function terminalAuditUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.audit.json";
		} catch (e) {
			return "";
		}
	}

	function terminalAuditSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.audit.json";
		} catch (e) {
			return "";
		}
	}

	function terminalExhaustiveUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.validation-run.json";
		} catch (e) {
			return "";
		}
	}

	function terminalExhaustiveSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.validation-run.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionPriorityUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.validation-priority.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionResultsUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.validation-results.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionNextReadyUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.production-ready.next.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionPrioritySourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.validation-priority.json";
		} catch (e) {
			return "";
		}
	}

	function terminalPromotionResultsSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.validation-results.json";
		} catch (e) {
			return "";
		}
	}

	function terminalBaselineUserDataPath() {
		try {
			return csInterface.getSystemPath(SystemPath.USER_DATA) +
				"/PickFX/terminal-registry.research-baseline.json";
		} catch (e) {
			return "";
		}
	}

	function terminalBaselineSourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.research-baseline.json";
		} catch (e) {
			return "";
		}
	}

	function knownResearchEffectsForCleanup() {
		if (typeof ResearchBaselineCleanup === "undefined") {
			return [];
		}
		return ResearchBaselineCleanup.mergeKnownEffects(
			ResearchBaselineCleanup.KNOWN_RESEARCH_EFFECTS,
			ResearchBaselineCleanup.identitiesFromRegistry(terminalRegistry)
		);
	}

	function saveBaselineReport(report) {
		return writeJsonFiles([
			[terminalBaselineUserDataPath(), report],
			[terminalBaselineSourcePath(), report]
		].filter(function (row) {
			return row[0] && row[1];
		}));
	}

	function runResearchBaselineCleanup(done) {
		var finish = typeof done === "function" ? done : function () {};
		if (terminalValidationRunning) {
			finish({ ok: false, reason: "VALIDATION_ALREADY_RUNNING" });
			return;
		}
		if (typeof PremiereBridge.researchBaselineCleanup !== "function") {
			finish({
				ok: false,
				status: "RESEARCH_BASELINE_NOT_CLEAN",
				reason: "CLEANUP_DEPENDENCY_UNAVAILABLE"
			});
			return;
		}
		terminalValidationRunning = true;
		setRegistryStatus("Cleaning PickFX Research baseline. Promotion is not running.");
		PremiereBridge.researchBaselineCleanup(
			csInterface,
			knownResearchEffectsForCleanup(),
			function (report) {
				var paths;
				terminalValidationRunning = false;
				paths = saveBaselineReport(report);
				setRegistryStatus(
					report && report.status
						? report.status
						: "RESEARCH_BASELINE_NOT_CLEAN"
				);
				showDebugJson({
					status: report && report.status,
					reason: report && report.reason,
					componentsFound: report && report.componentsFound,
					componentsRemoved: report && report.componentsRemoved,
					componentsRetained: report && report.componentsRetained,
					blockedComponents: report && report.blockedComponents,
					baselineFingerprintBefore: report && report.baselineFingerprintBefore,
					baselineFingerprintAfter: report && report.baselineFingerprintAfter,
					cleanupFullyVerified: report && report.cleanupFullyVerified,
					productionUntouched: report && report.productionUntouched,
					productionRegistryMutated: report && report.productionRegistryMutated,
					artifactPaths: paths
				});
				finish(report);
			}
		);
	}

	function terminalPromotionNextReadySourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.production-ready.next.json";
		} catch (e) {
			return "";
		}
	}

	function productionReadySourcePath() {
		try {
			return csInterface.getSystemPath(SystemPath.EXTENSION) +
				"/src/data/terminal-registry.production-ready.json";
		} catch (e) {
			return "";
		}
	}

	function savePromotionArtifacts(payload) {
		var writes = [
			[terminalPromotionPriorityUserDataPath(), payload && payload.priority],
			[terminalPromotionPrioritySourcePath(), payload && payload.priority],
			[terminalPromotionResultsUserDataPath(), payload && payload.results],
			[terminalPromotionResultsSourcePath(), payload && payload.results],
			[terminalPromotionNextReadyUserDataPath(), payload && payload.nextProductionReady],
			[terminalPromotionNextReadySourcePath(), payload && payload.nextProductionReady]
		];
		return writeJsonFiles(writes.filter(function (row) {
			return row[0] && row[1];
		}));
	}

	function runTargetedPromotionPipeline(runOptions, done) {
		var options = runOptions || {};
		var finish = typeof done === "function" ? done : function () {};
		var productionReady;
		if (terminalValidationRunning) {
			finish({ ok: false, reason: "VALIDATION_ALREADY_RUNNING" });
			return;
		}
		if (typeof TerminalPromotionPipeline === "undefined" ||
				typeof TerminalResearchHarness === "undefined" ||
				typeof SafeNumericTestValue === "undefined") {
			finish({
				ok: false,
				reason: "VALIDATION_DEPENDENCY_UNAVAILABLE"
			});
			return;
		}
		if (!terminalRegistry) {
			finish({
				ok: false,
				reason: "RESEARCH_REGISTRY_UNAVAILABLE"
			});
			return;
		}
		productionReady = readJsonFile(productionReadySourcePath()) || {
			artifactType: "pickfx-terminal-production-ready-allowlist",
			effects: []
		};
		terminalValidationRunning = true;
		setRegistryStatus("Preparing targeted parameter promotion on PickFX Research...");
		TerminalPromotionPipeline.run({
			live: options.live !== false,
			csInterface: csInterface,
			bridge: PremiereBridge,
			dispatcher: TerminalCommandDispatcher,
			effectExecutor: EffectExecutor,
			commandExecutor: CommandExecutor,
			registry: terminalRegistry,
			productionReady: productionReady,
			productionFeatureEnabled: terminalResolverEnabled,
			now: function () {
				return new Date().toISOString();
			},
			saveState: function (state) {
				savePromotionArtifacts({
					priority: state && state.results
						? undefined
						: undefined,
					results: state && state.results && state.results.artifactType
						? state.results
						: undefined,
					nextProductionReady: state && state.nextProductionReady
				});
			},
			onBeforeTest: function (candidate, progress) {
				setRegistryStatus(
					"TARGET: PickFX Research / PickFX Research Clip.mp4 — " +
					String(progress.cursor + 1) + " / " +
					String(progress.total) + " — " +
					candidate.effectDisplayName + " → " +
					candidate.parameterDisplayName
				);
			}
		}, function (payload) {
			var paths;
			terminalValidationRunning = false;
			terminalPromotionLastResult = payload;
			paths = savePromotionArtifacts(payload);
			setRegistryStatus(
				payload && (payload.status === "complete" ||
					payload.status === "classified-only")
					? "Targeted parameter promotion complete."
					: ((payload && payload.stoppedReason) ||
						"Targeted parameter promotion stopped.")
			);
			showDebugJson({
				status: payload && payload.status,
				stoppedReason: payload && payload.stoppedReason,
				summary: payload && payload.results && payload.results.summary,
				gaussianBlur: payload && payload.results && payload.results.gaussianBlur,
				nextUnvalidated: payload && payload.results &&
					payload.results.nextUnvalidated,
				productionRegistryMutated:
					payload && payload.productionRegistryMutated,
				productionFeatureFlagEnabled:
					payload && payload.productionFeatureFlagEnabled,
				artifactPaths: paths
			});
			finish(payload);
		});
	}

	function writeJsonFiles(writes) {
		var result = {
			saved: false,
			paths: [],
			errors: []
		};
		var dir;
		var written;
		var i;
		if (!(window.cep && window.cep.fs && window.cep.fs.writeFile)) {
			result.errors.push("CEP filesystem API is unavailable.");
			return result;
		}
		try {
			dir = csInterface.getSystemPath(SystemPath.USER_DATA) + "/PickFX";
			window.cep.fs.makedir(dir);
			for (i = 0; i < writes.length; i++) {
				written = window.cep.fs.writeFile(
					writes[i][0],
					JSON.stringify(writes[i][1], null, 2)
				);
				result.paths.push(writes[i][0]);
				if (written && written.err) {
					result.errors.push(writes[i][0] + ": CEP error " + written.err);
				}
			}
			result.saved = result.errors.length === 0;
		} catch (e) {
			result.errors.push(String(e));
		}
		return result;
	}

	function terminalCapabilityPath(fileName, userData) {
		try {
			if (userData === true) {
				return csInterface.getSystemPath(
					SystemPath.USER_DATA
				) + "/PickFX/" + fileName;
			}
			return csInterface.getSystemPath(
				SystemPath.EXTENSION
			) + "/src/data/" + fileName;
		} catch (e) {
			return "";
		}
	}

	function writeTerminalCapabilityArtifacts(artifacts) {
		var result = {
			saved: false,
			paths: [],
			errors: []
		};
		var files;
		var dir;
		var written;
		var i;
		if (!artifacts ||
				!(window.cep && window.cep.fs &&
					window.cep.fs.writeFile)) {
			result.errors.push(
				"Capability artifacts or CEP filesystem API are unavailable."
			);
			return result;
		}
		files = [
			[
				"transition-registry.research.json",
				JSON.stringify(
					artifacts.transitionRegistry,
					null,
					2
				)
			],
			[
				"transition-registry.research.md",
				artifacts.transitionMarkdown
			],
			[
				"terminal-capability-audit.json",
				JSON.stringify(
					artifacts.capabilityAudit,
					null,
					2
				)
			],
			[
				"terminal-capability-audit.md",
				artifacts.capabilityMarkdown
			],
			[
				"terminal-mvp-validation.json",
				JSON.stringify(
					artifacts.validation,
					null,
					2
				)
			]
		];
		try {
			dir = csInterface.getSystemPath(
				SystemPath.USER_DATA
			) + "/PickFX";
			window.cep.fs.makedir(dir);
			for (i = 0; i < files.length; i++) {
				written = window.cep.fs.writeFile(
					terminalCapabilityPath(files[i][0], false),
					files[i][1]
				);
				result.paths.push(
					terminalCapabilityPath(files[i][0], false)
				);
				if (written && written.err) {
					result.errors.push(
						files[i][0] +
						": source CEP error " +
						written.err
					);
				}
				written = window.cep.fs.writeFile(
					terminalCapabilityPath(files[i][0], true),
					files[i][1]
				);
				result.paths.push(
					terminalCapabilityPath(files[i][0], true)
				);
				if (written && written.err) {
					result.errors.push(
						files[i][0] +
						": user-data CEP error " +
						written.err
					);
				}
			}
			result.saved = result.errors.length === 0;
		} catch (e) {
			result.errors.push(String(e));
		}
		return result;
	}

	function readJsonFile(path) {
		var read;
		if (!path ||
				!(window.cep && window.cep.fs && window.cep.fs.readFile)) {
			return null;
		}
		try {
			read = window.cep.fs.readFile(path);
			if (!read || read.err || !read.data) {
				return null;
			}
			return JSON.parse(read.data);
		} catch (e) {
			return null;
		}
	}

	function generateTerminalRegistryAudit() {
		var oldEffects;
		var audit;
		var validation;
		var saved;
		if (!terminalRegistry || terminalRegistryStatus !== "ready") {
			return {
				ok: false,
				reason: "REGISTRY_UNAVAILABLE",
				registryStatus: terminalRegistryStatus
			};
		}
		if (typeof TerminalRegistryAudit === "undefined" ||
				typeof TerminalCommandResolver === "undefined" ||
				typeof ConfirmedParameterWrites === "undefined") {
			return {
				ok: false,
				reason: "AUDIT_DEPENDENCY_UNAVAILABLE"
			};
		}
		oldEffects = typeof EffectRegistry !== "undefined" &&
			EffectRegistry.getEffects
			? EffectRegistry.getEffects()
			: [];
		if (!oldEffects || oldEffects.length === 0) {
			return {
				ok: false,
				reason: "OLD_RUNTIME_EFFECT_INDEX_UNAVAILABLE"
			};
		}
		audit = TerminalRegistryAudit.audit(
			terminalRegistry,
			oldEffects,
			{
				resolver: TerminalCommandResolver,
				confirmedWrites: ConfirmedParameterWrites,
				generatedAt: new Date().toISOString()
			}
		);
		validation = TerminalRegistryAudit.validate(audit);
		if (!validation.ok) {
			return validation;
		}
		saved = writeJsonFiles([
			[terminalAuditUserDataPath(), audit],
			[terminalAuditSourcePath(), audit]
		]);
		terminalAuditLastResult = audit;
		return {
			ok: saved.saved,
			reason: saved.saved ? "" : "AUDIT_SAVE_FAILED",
			audit: audit,
			validation: validation,
			artifactPaths: saved
		};
	}

	function saveTerminalExhaustiveState(state) {
		var saved = writeJsonFiles([
			[terminalExhaustiveUserDataPath(), state],
			[terminalExhaustiveSourcePath(), state],
			[terminalPromotionUserDataPath(), state.promotion],
			[terminalPromotionSourcePath(), state.promotion]
		]);
		state.artifactPaths = saved;
		return saved;
	}

	function reconcileTerminalExhaustiveArtifacts() {
		var generated = generateTerminalRegistryAudit();
		var state;
		var reconciled;
		if (!generated.ok) {
			return generated;
		}
		state = readJsonFile(terminalExhaustiveUserDataPath());
		if (!state) {
			return {
				ok: false,
				reason: "VALIDATION_STATE_UNAVAILABLE"
			};
		}
		reconciled = TerminalExhaustiveHarness.reconcileState(
			state,
			generated.audit,
			{
				now: function () {
					return new Date().toISOString();
				}
			}
		);
		if (!reconciled.ok) {
			return reconciled;
		}
		reconciled.artifactPaths =
			saveTerminalExhaustiveState(reconciled.state);
		terminalExhaustiveLastResult = reconciled.state;
		terminalValidationLastResult = reconciled.state;
		return reconciled;
	}

	function runExhaustiveTerminalValidation(runOptions, done) {
		var options = runOptions || {};
		var finish = typeof done === "function" ? done : function () {};
		var generated;
		var existing;
		if (terminalValidationRunning) {
			finish({ ok: false, reason: "VALIDATION_ALREADY_RUNNING" });
			return;
		}
		if (terminalResolverEnabled()) {
			finish({
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_ENABLED",
				productionFeatureFlagEnabled: true
			});
			return;
		}
		if (typeof TerminalExhaustiveHarness === "undefined" ||
				typeof SafeNumericTestValue === "undefined" ||
				typeof TerminalResearchHarness === "undefined") {
			finish({
				ok: false,
				reason: "VALIDATION_DEPENDENCY_UNAVAILABLE"
			});
			return;
		}
		generated = generateTerminalRegistryAudit();
		if (!generated.ok) {
			finish(generated);
			return;
		}
		existing = options.resume === false
			? null
			: readJsonFile(terminalExhaustiveUserDataPath());
		terminalValidationRunning = true;
		setRegistryStatus("Preparing exhaustive controlled terminal validation...");
		TerminalExhaustiveHarness.run({
			csInterface: csInterface,
			bridge: PremiereBridge,
			dispatcher: TerminalCommandDispatcher,
			effectExecutor: EffectExecutor,
			commandExecutor: CommandExecutor,
			audit: generated.audit,
			existingState: existing,
			resumeAfterCleanupVerified:
				options.resumeAfterCleanupVerified === true,
			valuePicker: SafeNumericTestValue,
			productionFeatureEnabled: terminalResolverEnabled,
			now: function () {
				return new Date().toISOString();
			},
			saveState: function (state) {
				saveTerminalExhaustiveState(state);
			},
			onBeforeTest: function (test, state) {
				if (typeof console !== "undefined" && console.log) {
					console.log("TARGET:\n    PickFX Research\n    PickFX Research Clip.mp4");
					console.log(
						"TEST: " + String(state.cursor + 1) +
						" / " + String(state.plan.totalTests) +
						" — " + test.effectDisplayName +
						" → " + test.parameterDisplayName
					);
				}
				setRegistryStatus(
					"TARGET: PickFX Research / PickFX Research Clip.mp4 — " +
					String(state.cursor + 1) + " / " +
					String(state.plan.totalTests) + " — " +
					test.effectDisplayName + " → " +
					test.parameterDisplayName
				);
			},
			onProgress: function (state) {
				terminalExhaustiveLastResult = state;
			}
		}, function (result) {
			terminalValidationRunning = false;
			terminalValidationLastResult = result;
			terminalExhaustiveLastResult = result;
			saveTerminalExhaustiveState(result);
			setRegistryStatus(
				result && result.status === "complete"
					? "Exhaustive terminal validation complete."
					: ((result && result.stoppedReason) ||
						"Exhaustive terminal validation stopped.")
			);
			showDebugJson({
				status: result && result.status,
				stoppedReason: result && result.stoppedReason,
				summary: result && result.summary,
				promotion: result && result.promotion,
				artifactPaths: result && result.artifactPaths
			});
			finish(result);
		});
	}

	function saveTerminalValidationArtifacts(artifacts) {
		var paths = {
			promotionUserData: terminalPromotionUserDataPath(),
			promotionSource: terminalPromotionSourcePath(),
			validationUserData: terminalValidationUserDataPath(),
			validationSource: terminalValidationSourcePath(),
			saved: false,
			errors: []
		};
		var dir;
		var writes;
		var i;
		var result;
		if (!artifacts || !artifacts.promotion || !artifacts.validation) {
			paths.errors.push("Validation artifacts are missing.");
			return paths;
		}
		if (!(window.cep && window.cep.fs && window.cep.fs.writeFile)) {
			paths.errors.push("CEP filesystem API is unavailable.");
			return paths;
		}
		try {
			dir = csInterface.getSystemPath(SystemPath.USER_DATA) + "/PickFX";
			window.cep.fs.makedir(dir);
			writes = [
				[paths.promotionUserData, artifacts.promotion],
				[paths.promotionSource, artifacts.promotion],
				[paths.validationUserData, artifacts.validation],
				[paths.validationSource, artifacts.validation]
			];
			for (i = 0; i < writes.length; i++) {
				result = window.cep.fs.writeFile(
					writes[i][0],
					JSON.stringify(writes[i][1], null, 2)
				);
				if (result && result.err) {
					paths.errors.push(writes[i][0] + ": CEP error " + result.err);
				}
			}
			paths.saved = paths.errors.length === 0;
		} catch (e) {
			paths.errors.push(String(e));
		}
		return paths;
	}

	function runTerminalCapabilityValidation(done) {
		var finish = typeof done === "function"
			? done
			: function () {};
		if (terminalValidationRunning) {
			finish({
				ok: false,
				reason: "VALIDATION_ALREADY_RUNNING"
			});
			return;
		}
		if (terminalResolverEnabled()) {
			finish({
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_ENABLED",
				productionFeatureFlagEnabled: true
			});
			return;
		}
		if (typeof TerminalCapabilityResearchHarness ===
				"undefined" ||
				typeof TerminalTransitionCapability ===
				"undefined" ||
				typeof PremiereBridge
					.researchTerminalCapabilityProbe !==
				"function" ||
				typeof PremiereBridge
					.researchTerminalValidateMotion !==
				"function") {
			finish({
				ok: false,
				reason: "CAPABILITY_MODULE_NOT_LOADED"
			});
			return;
		}
		terminalValidationRunning = true;
		TerminalCapabilityResearchHarness.run({
			effectsSummary: {
				totalEffects: 134,
				productionReadyPairs: 36,
				changed: false
			},
			transitionCapability:
				TerminalTransitionCapability,
			prepare: function (callback) {
				PremiereBridge.researchTerminalPrepare(
					csInterface,
					callback
				);
			},
			probe: function (callback) {
				PremiereBridge
					.researchTerminalCapabilityProbe(
						csInterface,
						callback
					);
			},
			validateMotion: function (
				capabilityId,
				callback
			) {
				PremiereBridge
					.researchTerminalValidateMotion(
						csInterface,
						capabilityId,
						callback
					);
			},
			complete: function (callback) {
				PremiereBridge.researchTerminalComplete(
					csInterface,
					callback
				);
			}
		}, function (result) {
			terminalValidationRunning = false;
			result.artifactSave =
				writeTerminalCapabilityArtifacts(
					result.artifacts
				);
			terminalCapabilityLastResult = result;
			showDebugJson(result);
			finish(result);
		});
	}

	function runControlledTerminalValidation(done) {
		var finish = typeof done === "function" ? done : function () {};
		if (terminalValidationRunning) {
			finish({
				ok: false,
				reason: "VALIDATION_ALREADY_RUNNING"
			});
			return;
		}
		if (terminalResolverEnabled()) {
			finish({
				ok: false,
				reason: "PRODUCTION_FEATURE_FLAG_ENABLED",
				productionFeatureFlagEnabled: true
			});
			return;
		}
		if (!terminalRegistry || terminalRegistryStatus !== "ready") {
			finish({
				ok: false,
				reason: "REGISTRY_UNAVAILABLE",
				registryStatus: terminalRegistryStatus
			});
			return;
		}
		if (typeof TerminalResearchHarness === "undefined" ||
				typeof TerminalCommandResolver === "undefined" ||
				typeof TerminalCommandDispatcher === "undefined" ||
				typeof PremiereBridge.researchTerminalPrepare !== "function") {
			finish({
				ok: false,
				reason: "VALIDATION_DEPENDENCY_UNAVAILABLE"
			});
			return;
		}
		terminalValidationRunning = true;
		setRegistryStatus("Preparing controlled terminal validation...");
		TerminalResearchHarness.run({
			csInterface: csInterface,
			bridge: PremiereBridge,
			resolver: TerminalCommandResolver,
			dispatcher: TerminalCommandDispatcher,
			effectExecutor: EffectExecutor,
			commandExecutor: CommandExecutor,
			registry: terminalRegistry,
			productionFeatureEnabled: terminalResolverEnabled(),
			onBeforeTest: function (test) {
				if (typeof console !== "undefined" && console.log) {
					console.log("TARGET:\n    PickFX Research\n    PickFX Research Clip");
					console.log("TEST: " + test.testId + " / " + test.query);
				}
				setRegistryStatus(
					"TARGET: PickFX Research / PickFX Research Clip — " + test.query
				);
			}
		}, function (result) {
			var manifestValidation;
			terminalValidationRunning = false;
			terminalValidationLastResult = result;
			if (result && result.artifacts) {
				manifestValidation = TerminalResearchHarness.validatePromotionManifest(
					result.artifacts.promotion
				);
				result.promotionManifestValidation = manifestValidation;
				if (manifestValidation.ok) {
					result.artifactPaths = saveTerminalValidationArtifacts(result.artifacts);
				}
			}
			setRegistryStatus(
				result && result.ok
					? "Controlled terminal validation complete."
					: ((result && result.reason) ||
						"Controlled terminal validation stopped.")
			);
			showDebugJson(result);
			finish(result);
		});
	}

	function paintRegistryProgress() {
		var total = registryRun.candidates.length;
		var current = registryRun.candidates[registryRun.index];
		if (registryProgressEl) {
			registryProgressEl.textContent = String(Math.min(registryRun.index, total)) + " / " + String(total);
		}
		if (registryCurrentEl) {
			registryCurrentEl.textContent = current ? current.displayName : "-";
		}
	}

	function setRegistryStatus(text) {
		if (registryStatusEl) {
			registryStatusEl.textContent = text;
		}
	}

	function finishRegistryRun(reason, payload) {
		var summary;
		registryRun.active = false;
		registryRun.busy = false;
		if (registryRun.registry) {
			registryRun.registry.stopped = !!reason;
			registryRun.registry.stoppedReason = reason || null;
			registryRun.registry.outputPath = saveRegistryStore(registryRun.registry);
			if (typeof EffectRegistryBuilder !== "undefined") {
				summary = EffectRegistryBuilder.summarize(registryRun.registry);
				registryRun.registry.summary = summary;
			}
		}
		setRegistryStatus(reason || "Complete");
		showDebugJson(payload || registryRun.registry);
	}

	function processRegistryNext() {
		var candidate;
		var timer;
		var settled;
		if (!registryRun.active || registryRun.paused || registryRun.busy) {
			return;
		}
		if (registryRun.index >= registryRun.candidates.length) {
			finishRegistryRun("", registryRun.registry);
			setRegistryStatus("Complete");
			return;
		}
		candidate = registryRun.candidates[registryRun.index];
		paintRegistryProgress();
		setRegistryStatus("Discovering parameters...");
		registryRun.busy = true;
		settled = false;
		timer = setTimeout(function () {
			if (settled) {
				return;
			}
			settled = true;
			setRegistryStatus("Timeout. Attempting cleanup...");
			PremiereBridge.researchResetToBaseline(csInterface, function () {
				var timeoutRecord = {
					displayName: candidate.displayName,
					status: "timeout",
					parameters: [],
					error: {
						stage: "apply",
						effect: candidate.displayName,
						errorType: "TIMEOUT",
						message: "Effect processing timed out.",
						recoverable: true
					}
				};
				if (typeof EffectRegistryBuilder !== "undefined") {
					EffectRegistryBuilder.mergeRecord(registryRun.registry, timeoutRecord);
				}
				registryRun.registry.cursor = registryRun.index + 1;
				saveRegistryStore(registryRun.registry);
				registryRun.index += 1;
				registryRun.busy = false;
				setTimeout(processRegistryNext, 50);
			});
		}, 20000);
		PremiereBridge.researchProcessOne(csInterface, candidate.displayName, function (record) {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			if (typeof EffectRegistryBuilder !== "undefined") {
				EffectRegistryBuilder.mergeRecord(registryRun.registry, record);
			} else if (registryRun.registry && registryRun.registry.effects) {
				registryRun.registry.effects.push(record);
			}
			if (record && record.error && registryRun.registry.errors) {
				registryRun.registry.errors.push(record.error);
			}
			registryRun.registry.cursor = registryRun.index + 1;
			saveRegistryStore(registryRun.registry);
			if (record && (record.status === "cleanup_failed" || record.stopRun)) {
				finishRegistryRun("CLEANUP_FAILED", record);
				return;
			}
			registryRun.index += 1;
			registryRun.busy = false;
			setTimeout(processRegistryNext, 50);
		});
	}

	function panelRuntimeDiagnostic() {
		var root = "";
		var documentUrl = "";
		try {
			root = csInterface.getSystemPath(SystemPath.EXTENSION) || "";
		} catch (ignoreRoot) {}
		try {
			documentUrl = String(window.location.href || "");
		} catch (ignoreLocation) {}
		return {
			panelRuntimeMarker: "2026-08-22-RUNTIME-VERIFY-01",
			panelExtensionPath: root,
			panelFilePath: (root + "/src/panel/index.html").replace(/\\/g, "/"),
			panelDocumentUrl: documentUrl
		};
	}

	function attachPanelRuntimeDiagnostic(env) {
		var key;
		var panelProbe = panelRuntimeDiagnostic();
		if (!env || typeof env !== "object") {
			env = {
				ok: false,
				reason: "RESEARCH_ENVIRONMENT_UNAVAILABLE",
				message: "Verify returned no host payload."
			};
		}
		env.loadProbe = env.loadProbe && typeof env.loadProbe === "object" ? env.loadProbe : {};
		for (key in panelProbe) {
			if (panelProbe.hasOwnProperty(key)) {
				env.loadProbe[key] = panelProbe[key];
			}
		}
		return env;
	}

	function verifyResearchEnvironment(thenStart) {
		setRegistryStatus("Verifying isolated research environment...");
		showDebugJson({
			warning: "PickFX Research Registry Builder will operate only on the isolated research environment.",
			loadProbe: panelRuntimeDiagnostic()
		});
		if (typeof PremiereBridge.researchPrepareEnvironment !== "function") {
			setRegistryStatus("Research builder is not loaded.");
			showDebugJson(attachPanelRuntimeDiagnostic({
				ok: false,
				reason: "RESEARCH_ENVIRONMENT_UNAVAILABLE",
				message: "Reload the panel so research-registry-host.jsx loads."
			}));
			return;
		}
		PremiereBridge.researchPrepareEnvironment(csInterface, function (env) {
			env = attachPanelRuntimeDiagnostic(env);
			showDebugJson(env);
			if (!env || env.ok !== true) {
				setRegistryStatus((env && env.reason) || "RESEARCH_ENVIRONMENT_UNAVAILABLE");
				return;
			}
			setRegistryStatus("Research environment isolated.");
			if (thenStart) {
				PremiereBridge.researchListCandidates(csInterface, function (listed) {
					var candidates;
					var stored;
					if (!listed || listed.ok !== true) {
						setRegistryStatus((listed && listed.errorType) || "MALFORMED_QE_RESULT");
						showDebugJson(listed);
						return;
					}
					candidates = listed.candidates || [];
					stored = loadRegistryStore();
					if (typeof EffectRegistryBuilder !== "undefined") {
						if (stored && EffectRegistryBuilder.validateSchema(stored).ok) {
							registryRun.registry = stored;
						} else {
							registryRun.registry = EffectRegistryBuilder.createRegistry(candidates, {
								generatedAt: new Date().toISOString()
							});
						}
						registryRun.index = EffectRegistryBuilder.nextResumeIndex(registryRun.registry, candidates);
					} else {
						registryRun.registry = stored || { effects: [], errors: [], cursor: 0 };
						registryRun.index = registryRun.registry.cursor || 0;
					}
					registryRun.candidates = candidates;
					registryRun.registry.candidatesTotal = candidates.length;
					registryRun.registry.outputPath = registryUserDataPath();
					if (!registryRun.registry.errors) {
						registryRun.registry.errors = [];
					}
					registryRun.active = true;
					registryRun.paused = false;
					paintRegistryProgress();
					setRegistryStatus("Discovering parameters...");
					processRegistryNext();
				});
			}
		});
	}

	function startRegistryBuild() {
		if (registryRun.active && !registryRun.paused) {
			return;
		}
		verifyResearchEnvironment(true);
	}

	function pauseRegistryBuild() {
		registryRun.paused = true;
		setRegistryStatus("Paused");
	}

	function resumeRegistryBuild() {
		if (!registryRun.registry) {
			startRegistryBuild();
			return;
		}
		registryRun.paused = false;
		registryRun.active = true;
		setRegistryStatus("Discovering parameters...");
		processRegistryNext();
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
		if (paletteMode() !== "search") {
			return;
		}
		searchEpoch += 1;
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
		syncPaletteArrowCapture(true);
	});

	searchInput.addEventListener("blur", function () {
		if (searchWrap) {
			searchWrap.classList.remove("is-focused");
		}
		syncPaletteArrowCapture();
	});

	searchInput.addEventListener("keydown", function (event) {
		dispatchPaletteKey(event);
	});

	if (valueInput) {
		valueInput.addEventListener("input", function () {
			if (typeof PaletteFlow !== "undefined" &&
					paletteMode() === "value" &&
					!PaletteFlow.usesChoiceList(paletteFlow)) {
				paletteFlow = PaletteFlow.setValueText(paletteFlow, valueInput.value);
			}
		});
		valueInput.addEventListener("focus", function () {
			syncPaletteArrowCapture(true);
		});
		valueInput.addEventListener("blur", function () {
			syncPaletteArrowCapture();
		});
		valueInput.addEventListener("keydown", function (event) {
			dispatchPaletteKey(event);
		});
	}

	if (presetsBtn) {
		presetsBtn.addEventListener("click", function () {
			if (isPresetsViewOpen()) {
				closePresetLibrary();
				return;
			}
			openPresetLibrary();
		});
	}
	if (presetsBackBtn) {
		presetsBackBtn.addEventListener("click", function () {
			handlePaletteEscape();
		});
	}
	if (presetsCaptureBtn) {
		presetsCaptureBtn.addEventListener("click", function () {
			startCapturePreset();
		});
	}
	if (presetsBody) {
		presetsBody.addEventListener("click", function (event) {
			var target = event.target;
			var action = "";
			var id = "";
			var index;
			var node;
			if (target && target.id === "preset-save-btn") {
				saveCapturedPreset();
				return;
			}
			node = target;
			while (node && node !== presetsBody) {
				if (node.getAttribute) {
					if (node.getAttribute("data-preset-action")) {
						action = node.getAttribute("data-preset-action");
						id = node.getAttribute("data-preset-id") || "";
						break;
					}
					if (node.getAttribute("data-capture-index") != null) {
						index = Number(node.getAttribute("data-capture-index"));
						if (captureState && captureState.components[index] &&
								captureState.components[index].captureStatus !== "unsupported") {
							captureState.selected[String(index)] = !captureState.selected[String(index)];
							renderCaptureForm();
						}
						return;
					}
				}
				node = node.parentNode;
			}
			if (action === "apply") {
				applyLoadedPreset(findPresetById(id));
				return;
			}
			if (action === "rename") {
				renamePresetPrompt(id);
				return;
			}
			if (action === "delete") {
				confirmDeletePreset(id);
				return;
			}
			if (action === "confirm-delete") {
				PresetStore.delete(id, presetStoreOptions());
				openPresetLibrary();
				return;
			}
			if (action === "cancel-delete") {
				openPresetLibrary();
				return;
			}
			if (action === "replace-name") {
				saveCapturedPreset(id);
				return;
			}
			if (action === "rename-conflict") {
				if (captureState) {
					captureState.conflict = null;
				}
				renderCaptureForm();
			}
		});
	}

	if (settingsBtn) {
		settingsBtn.addEventListener("click", function () {
			if (typeof PickFXProduct !== "undefined" && PickFXProduct.openSettings) {
				PickFXProduct.openSettings();
				return;
			}
			if (!debugPanel) {
				return;
			}
			setDebugMode(debugPanel.hasAttribute("hidden"));
			focusSearch();
		});
	}

	if (clearSearchBtn) {
		clearSearchBtn.addEventListener("click", function () {
			clearSearch();
		});
	}

	function settingsAreOpen() {
		var node = document.getElementById("product-settings");
		return !!(node && !node.hasAttribute("hidden"));
	}

	function isRecordingShortcut() {
		return typeof PickFXProduct !== "undefined" &&
			PickFXProduct.isRecordingShortcut &&
			PickFXProduct.isRecordingShortcut();
	}

	function paletteKeyContext() {
		var Keys = typeof PaletteKeyboard !== "undefined" ? PaletteKeyboard : null;
		if (!Keys || !Keys.context) {
			return paletteMode();
		}
		return Keys.context({
			mode: paletteMode(),
			activeElement: document.activeElement,
			valueInput: valueInput,
			choiceList: typeof PaletteFlow !== "undefined" &&
				PaletteFlow.usesChoiceList &&
				PaletteFlow.usesChoiceList(paletteFlow),
			recording: isRecordingShortcut(),
			settingsOpen: settingsAreOpen()
		});
	}

	function dispatchPaletteKey(event) {
		var Keys = typeof PaletteKeyboard !== "undefined" ? PaletteKeyboard : null;
		var ctx;
		var action;
		if (!event || event.__pickfxHandled) {
			return true;
		}
		if (isRecordingShortcut()) {
			if (PickFXProduct.handleShortcutRecordEvent) {
				PickFXProduct.handleShortcutRecordEvent(event);
			}
			event.__pickfxHandled = true;
			return true;
		}
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.isOpenShortcut &&
				TerminalKeyboardShortcut.isOpenShortcut(
					event,
					typeof navigator !== "undefined" ? navigator.platform : ""
				)) {
			if (Keys && Keys.consume) {
				Keys.consume(event);
			} else if (event.preventDefault) {
				event.preventDefault();
			}
			focusSearch(true);
			event.__pickfxHandled = true;
			return true;
		}
		ctx = paletteKeyContext();
		action = Keys && Keys.actionFor ? Keys.actionFor(event, ctx) : "";
		if (!action && Keys && Keys.isPaletteNav && Keys.isPaletteNav(event) === false) {
			if (debugPanel && (event.ctrlKey || event.metaKey) && event.shiftKey && event.key &&
					event.key.toLowerCase() === "d") {
				event.preventDefault();
				setDebugMode(debugPanel.hasAttribute("hidden"));
				focusSearch();
				event.__pickfxHandled = true;
				return true;
			}
			return false;
		}
		if (!action) {
			if (ctx === "settings" || ctx === "record") {
				return false;
			}
			if (event.key === "ArrowDown" || event.key === "Down" || event.code === "ArrowDown") {
				action = ctx === "value" ? "IGNORE_VALUE_ARROW" : "MOVE_DOWN";
			} else if (event.key === "ArrowUp" || event.key === "Up" || event.code === "ArrowUp") {
				action = ctx === "value" ? "IGNORE_VALUE_ARROW" : "MOVE_UP";
			} else if (event.key === "Enter" || event.code === "Enter") {
				action = ctx === "value" ? "APPLY_VALUE" : "ACTIVATE";
			} else if (event.key === "Escape" || event.key === "Esc" || event.code === "Escape") {
				action = "ESCAPE";
			}
		}
		if (!action) {
			return false;
		}
		if (Keys && Keys.consume) {
			Keys.consume(event);
		} else {
			if (event.preventDefault) {
				event.preventDefault();
			}
			if (event.stopPropagation) {
				event.stopPropagation();
			}
		}
		event.__pickfxHandled = true;
		if (action === "MOVE_DOWN") {
			if (!shouldIgnoreDomArrow()) {
				moveSelection(1);
			}
			return true;
		}
		if (action === "MOVE_UP") {
			if (!shouldIgnoreDomArrow()) {
				moveSelection(-1);
			}
			return true;
		}
		if (action === "ACTIVATE") {
			applyFromSearchInput();
			return true;
		}
		if (action === "APPLY_VALUE") {
			applyPaletteValue();
			return true;
		}
		if (action === "ESCAPE") {
			handlePaletteEscape();
			return true;
		}
		if (action === "CLOSE_SETTINGS") {
			if (typeof PickFXProduct !== "undefined" && PickFXProduct.closeSettings) {
				PickFXProduct.closeSettings();
			}
			return true;
		}
		if (action === "IGNORE_VALUE_ARROW") {
			return true;
		}
		return true;
	}

	window.addEventListener("keydown", dispatchPaletteKey, true);
	document.addEventListener("keydown", dispatchPaletteKey, true);

	searchResults.addEventListener("mousedown", function (event) {
		event.preventDefault();
	});

	searchResults.addEventListener("mouseover", function (event) {
		var item;
		var nextIndex;
		var activeIndex;
		if (isFavoriteControl(event.target)) {
			return;
		}
		item = resultItemFromEvent(event);
		if (!item) {
			return;
		}
		nextIndex = parseInt(item.getAttribute("data-index"), 10);
		activeIndex = paletteMode() === "search"
			? selectedIndex
			: paletteFlow.selectedIndex;
		if (isNaN(nextIndex) || nextIndex === activeIndex) {
			return;
		}
		if (paletteMode() === "search") {
			selectedIndex = nextIndex;
		} else if (typeof PaletteFlow !== "undefined" && PaletteFlow.selectIndex) {
			paletteFlow = PaletteFlow.selectIndex(
				paletteFlow,
				nextIndex,
				currentRows.length
			);
		}
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
		if (paletteMode() === "search") {
			selectedIndex = parseInt(item.getAttribute("data-index"), 10) || 0;
		} else if (typeof PaletteFlow !== "undefined" && PaletteFlow.selectIndex) {
			paletteFlow = PaletteFlow.selectIndex(
				paletteFlow,
				parseInt(item.getAttribute("data-index"), 10) || 0,
				currentRows.length
			);
		}
		if (item.getAttribute("data-kind") === "choice-option" ||
				item.getAttribute("data-kind") === "boolean-choice") {
			applyPaletteValue();
			return;
		}
		if (item.getAttribute("data-kind") === "lumetri-choice") {
			if (lumetriPickerSession && lumetriPickerSession.isActive()) {
				lumetriPickerSession.selectIndex(selectedIndex);
			}
			confirmLumetriPicker();
			return;
		}
		if (item.getAttribute("data-kind") === "discovery-parameter") {
			completeDiscoveryParameter(selectedRow());
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
		if (paletteMode() === "search") {
			selectedIndex = parseInt(item.getAttribute("data-index"), 10) || 0;
		} else if (typeof PaletteFlow !== "undefined" && PaletteFlow.selectIndex) {
			paletteFlow = PaletteFlow.selectIndex(
				paletteFlow,
				parseInt(item.getAttribute("data-index"), 10) || 0,
				currentRows.length
			);
		}
		if (item.getAttribute("data-kind") === "lumetri-choice") {
			if (lumetriPickerSession && lumetriPickerSession.isActive()) {
				lumetriPickerSession.selectIndex(parseInt(item.getAttribute("data-index"), 10) || 0);
			}
			confirmLumetriPicker();
			return;
		}
		if (item.getAttribute("data-kind") === "discovery-parameter") {
			completeDiscoveryParameter(selectedRow());
			return;
		}
		if (item.getAttribute("data-kind") === "action") {
			runPickfxAction(selectedRow() && selectedRow().action);
			return;
		}
		if (item.getAttribute("data-kind") === "preset") {
			applyLoadedPreset(selectedRow() && selectedRow().preset);
			return;
		}
		if (item.getAttribute("data-kind") === "effect") {
			beginEffectFlow(effectFromRow(selectedRow()));
			return;
		}
		updateSelectionHighlight();
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
	if (discoverEffectRegistryBtn) {
		discoverEffectRegistryBtn.disabled = true;
		discoverEffectRegistryBtn.addEventListener("click", discoverEffectRegistry);
	}
	if (registryVerifyBtn) {
		registryVerifyBtn.disabled = true;
		registryVerifyBtn.addEventListener("click", function () {
			verifyResearchEnvironment(false);
		});
	}
	if (registryStartBtn) {
		registryStartBtn.disabled = true;
		registryStartBtn.addEventListener("click", startRegistryBuild);
	}
	if (terminalValidationRunBtn) {
		terminalValidationRunBtn.disabled = true;
		terminalValidationRunBtn.addEventListener("click", function () {
			runExhaustiveTerminalValidation({ resume: true });
		});
	}
	if (researchBaselineCleanupBtn) {
		researchBaselineCleanupBtn.disabled = true;
		researchBaselineCleanupBtn.addEventListener("click", function () {
			runResearchBaselineCleanup();
		});
	}
	if (terminalPromotionRunBtn) {
		terminalPromotionRunBtn.disabled = true;
		terminalPromotionRunBtn.addEventListener("click", function () {
			runTargetedPromotionPipeline({ live: true });
		});
	}
	if (registryPauseBtn) {
		registryPauseBtn.disabled = true;
		registryPauseBtn.addEventListener("click", pauseRegistryBuild);
	}
	if (registryResumeBtn) {
		registryResumeBtn.disabled = true;
		registryResumeBtn.addEventListener("click", resumeRegistryBuild);
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
	if (debugPanel) {
		window.__pickfxInvokeColorParameterWriteTest = invokeColorParameterWriteTest;
		window.__pickfxInvokeAudioParameterWriteTest = invokeAudioParameterWriteTest;
		window.__pickfxInvokeEnumParameterWriteTest = invokeEnumParameterWriteTest;
		window.__pickfxInvokeAudioLevelSetValueDiagnose = invokeAudioLevelSetValueDiagnose;
		window.__pickfxInvokeAudioLevelCapabilityProbe = invokeAudioLevelCapabilityProbe;
	}
	if (testColorParameterWriteBtn) {
		testColorParameterWriteBtn.disabled = true;
		testColorParameterWriteBtn.onclick = invokeColorParameterWriteTest;
	}
	if (testAudioParameterWriteBtn) {
		testAudioParameterWriteBtn.disabled = true;
		testAudioParameterWriteBtn.onclick = invokeAudioParameterWriteTest;
	}
	if (testEnumParameterWriteBtn) {
		testEnumParameterWriteBtn.disabled = true;
		testEnumParameterWriteBtn.onclick = invokeEnumParameterWriteTest;
	}
	if (diagnoseAudioLevelSetValueBtn) {
		diagnoseAudioLevelSetValueBtn.disabled = true;
		diagnoseAudioLevelSetValueBtn.onclick = invokeAudioLevelSetValueDiagnose;
	}
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

	if (typeof PickFXGlobalLauncher !== "undefined" && PickFXGlobalLauncher.sync) {
		keyboardShortcutStatus = PickFXGlobalLauncher.sync(
			csInterface,
			typeof PanelEntitlement !== "undefined" ? PanelEntitlement.currentRecord() : null
		);
	} else if (typeof TerminalKeyboardShortcut !== "undefined" &&
			TerminalKeyboardShortcut.register) {
		keyboardShortcutStatus = TerminalKeyboardShortcut.register(csInterface);
	}

	window.__pickfxTerminalResolver = {
		featureFlag: typeof TerminalProductionRegistry !== "undefined"
			? TerminalProductionRegistry.FEATURE_FLAG_KEY
			: "pickfx.terminalResolver.enabled",
		enabledByDefault: true,
		isEnabled: terminalResolverEnabled,
		registryStatus: function () {
			return productionTerminalRegistryStatus;
		},
		resolve: function (query) {
			if (!productionTerminalRegistry ||
					typeof TerminalProductionRegistry === "undefined") {
				return {
					ok: false,
					reason: "REGISTRY_UNAVAILABLE",
					registryStatus: productionTerminalRegistryStatus
				};
			}
			return TerminalProductionRegistry.resolve(
				query,
				productionTerminalRegistry
			);
		}
	};

	window.__pickfxEffectDiscovery = {
		source: "production",
		customerFacing: true,
		catalog: function () {
			return discoveryCatalog;
		},
		browse: function (query) {
			if (!discoveryCatalog ||
					typeof TerminalEffectDiscovery === "undefined") {
				return {
					ok: false,
					reason: "DISCOVERY_UNAVAILABLE"
				};
			}
			return TerminalEffectDiscovery.browse(query, discoveryCatalog);
		},
		writeGuard: function (query) {
			var resolution = productionTerminalRegistry &&
				typeof TerminalProductionRegistry !== "undefined"
				? TerminalProductionRegistry.resolve(
					query,
					productionTerminalRegistry
				)
				: null;
			if (!discoveryCatalog ||
					typeof TerminalEffectDiscovery === "undefined") {
				return { allow: false, fallthrough: true };
			}
			return TerminalEffectDiscovery.writeGuard(
				query,
				discoveryCatalog,
				resolution
			);
		}
	};

	window.__pickfxLauncherDebug = {
		status: function () {
			return typeof PickFXGlobalLauncher !== "undefined"
				? PickFXGlobalLauncher.status()
				: null;
		},
		enabled: function () {
			return typeof PickFXGlobalLauncher !== "undefined" &&
				PickFXGlobalLauncher.enabled();
		},
		state: function () {
			var record = typeof PanelEntitlement !== "undefined"
				? PanelEntitlement.currentRecord()
				: null;
			return {
				state: record && record.state,
				plan: record && record.plan,
				productAccess: !!(record && record.productAccess),
				authorized: !!(record && record.authorized),
				globalLauncherEnabled: typeof PanelEntitlement !== "undefined" &&
					PanelEntitlement.globalLauncherEnabled(record),
				surface: typeof PanelEntitlement !== "undefined"
					? PanelEntitlement.resolveSurface(record)
					: null
			};
		}
	};

	window.__pickfxKeyboardShortcut = {
		requested: {
			macOS: "Control + Shift + P",
			windows: "Control + Shift + P"
		},
		status: function () {
			return keyboardShortcutStatus;
		},
		scope: "FOCUSED_CEP_PANEL_ONLY",
		globalRegistrationAvailable: false,
		focusAndSelect: function () {
			focusSearch(true);
		},
		dismiss: dismissTerminal
	};

	window.__pickfxTerminalCapabilities = {
		featureFlag:
			"pickfx.terminalResolver.enabled",
		enabledByDefault: false,
		isProductionEnabled: terminalResolverEnabled,
		resolve: function (query) {
			if (typeof TerminalCapabilityRegistry ===
					"undefined") {
				return {
					ok: false,
					reason:
						"CAPABILITY_MODULE_NOT_LOADED"
				};
			}
			return TerminalCapabilityRegistry.resolve(
				query,
				{
					effectResolver:
						typeof TerminalCommandResolver !==
						"undefined"
							? TerminalCommandResolver
							: null,
					effectRegistry: terminalRegistry,
					transitionRegistry:
						terminalCapabilityLastResult &&
						terminalCapabilityLastResult
							.artifacts
							? terminalCapabilityLastResult
								.artifacts
								.transitionRegistry
							: {
								transitions: []
							}
				}
			);
		},
		lastResult: function () {
			return terminalCapabilityLastResult;
		},
		runValidation:
			runTerminalCapabilityValidation
	};

	if (debugPanel) {
		window.__pickfxTerminalResearch = {
			target: {
				sequence: "PickFX Research",
				clip: "PickFX Research Clip.mp4",
				canonicalClip: "PickFX Research Clip"
			},
			productionFeatureFlagEnabled: terminalResolverEnabled,
			isRunning: function () {
				return terminalValidationRunning;
			},
			lastResult: function () {
				return terminalValidationLastResult;
			},
			lastAudit: function () {
				return terminalAuditLastResult;
			},
			lastExhaustiveResult: function () {
				return terminalExhaustiveLastResult;
			},
			audit: generateTerminalRegistryAudit,
			reconcileExhaustive: reconcileTerminalExhaustiveArtifacts,
			run: runControlledTerminalValidation,
			runExhaustive: runExhaustiveTerminalValidation,
			runPromotion: runTargetedPromotionPipeline,
			runCapabilities: runTerminalCapabilityValidation,
			lastPromotionResult: function () {
				return terminalPromotionLastResult;
			}
		};
	}

	var paletteArrowsCaptured = false;
	var lastHelperArrowAt = 0;
	var lastPaletteArrowToken = "";
	var paletteArrowSeeded = false;
	var captureReleaseTimer = null;

	function pickfxUserDir() {
		var root;
		if (!csInterface || typeof csInterface.getSystemPath !== "function" ||
				typeof SystemPath === "undefined") {
			return "";
		}
		try {
			root = String(csInterface.getSystemPath(SystemPath.USER_DATA) || "");
		} catch (ignorePath) {
			return "";
		}
		if (root.indexOf("file://") === 0) {
			root = root.substring(7);
			try {
				root = decodeURI(root);
			} catch (ignoreDecode) {}
		}
		return root.replace(/\\/g, "/").replace(/\/+$/, "") + "/PickFX";
	}

	function writePickfxFile(name, contents) {
		var dir = pickfxUserDir();
		var path;
		if (!dir || typeof window === "undefined" || !window.cep || !window.cep.fs ||
				typeof window.cep.fs.writeFile !== "function") {
			return false;
		}
		path = dir + "/" + name;
		try {
			if (typeof window.cep.fs.makedir === "function") {
				window.cep.fs.makedir(dir);
			}
			window.cep.fs.writeFile(path, contents);
			return true;
		} catch (ignoreWrite) {
			return false;
		}
	}

	function readPickfxFile(name) {
		var dir = pickfxUserDir();
		var result;
		if (!dir || typeof window === "undefined" || !window.cep || !window.cep.fs ||
				typeof window.cep.fs.readFile !== "function") {
			return "";
		}
		try {
			result = window.cep.fs.readFile(dir + "/" + name);
			return result && result.data ? String(result.data) : "";
		} catch (ignoreRead) {
			return "";
		}
	}

	function dispatchPaletteCapture(on) {
		var event;
		writePickfxFile("palette-capture", on ? "1" : "0");
		if (!csInterface || typeof csInterface.dispatchEvent !== "function") {
			return false;
		}
		try {
			event = typeof CSEvent === "function"
				? new CSEvent("com.pickfx.palette.capture", "APPLICATION")
				: { type: "com.pickfx.palette.capture", scope: "APPLICATION" };
			event.data = on ? "1" : "0";
			csInterface.dispatchEvent(event);
			return true;
		} catch (ignoreCapture) {
			return false;
		}
	}

	function setPaletteArrowCapture(on) {
		on = !!on;
		if (on === paletteArrowsCaptured) {
			if (on) {
				writePickfxFile("palette-capture", "1");
			}
			return;
		}
		paletteArrowsCaptured = on;
		dispatchPaletteCapture(on);
	}

	function consumePaletteArrowFile() {
		var token = readPickfxFile("palette-arrow");
		if (!paletteArrowSeeded) {
			lastPaletteArrowToken = token;
			paletteArrowSeeded = true;
			return;
		}
		if (!token || token === lastPaletteArrowToken) {
			return;
		}
		lastPaletteArrowToken = token;
		handleHelperPaletteArrow(token);
	}

	function paletteShouldCaptureArrows() {
		var active;
		if (typeof document === "undefined") {
			return false;
		}
		if (document.hidden) {
			return false;
		}
		active = document.activeElement;
		if (active === searchInput || active === valueInput || active === searchResults) {
			return true;
		}
		return typeof document.hasFocus === "function" ? document.hasFocus() : false;
	}

	function syncPaletteArrowCapture(forceOn) {
		if (captureReleaseTimer) {
			clearTimeout(captureReleaseTimer);
			captureReleaseTimer = null;
		}
		if (forceOn === true) {
			setPaletteArrowCapture(true);
			return;
		}
		if (paletteShouldCaptureArrows()) {
			setPaletteArrowCapture(true);
			return;
		}
		captureReleaseTimer = setTimeout(function () {
			captureReleaseTimer = null;
			if (!paletteShouldCaptureArrows()) {
				setPaletteArrowCapture(false);
			}
		}, 120);
	}

	function shouldIgnoreDomArrow() {
		return Date.now() - lastHelperArrowAt < 80;
	}

	function handleHelperPaletteArrow(raw) {
		var data = String(raw || "");
		lastHelperArrowAt = Date.now();
		if (data.indexOf("PALETTE_ARROW_DOWN") !== -1) {
			moveSelection(1);
			return;
		}
		if (data.indexOf("PALETTE_ARROW_UP") !== -1) {
			moveSelection(-1);
		}
	}

	function registerPanelKeyboard() {
		var combo = typeof ShortcutStore !== "undefined"
			? ShortcutStore.load({ csInterface: csInterface })
			: { key: "p", shiftKey: true };
		if (typeof PickFXCepKeyInterest !== "undefined" && PickFXCepKeyInterest.apply) {
			PickFXCepKeyInterest.apply(csInterface, {
				palette: true,
				panelFocus: true,
				launcher: false,
				combo: combo,
				source: "panel.js:registerPanelKeyboard"
			});
			return;
		}
		if (typeof PickFXGlobalLauncher !== "undefined" && PickFXGlobalLauncher.sync) {
			PickFXGlobalLauncher.sync(csInterface, PanelEntitlement.currentRecord());
			return;
		}
		if (typeof TerminalKeyboardShortcut !== "undefined" &&
				TerminalKeyboardShortcut.register) {
			TerminalKeyboardShortcut.register(csInterface, {
				panelFocus: true,
				palette: true,
				launcher: false,
				combo: typeof ShortcutStore !== "undefined"
					? ShortcutStore.load({ csInterface: csInterface })
					: null
			});
		}
	}

	syncPaletteChrome();
	registerPanelKeyboard();
	if (csInterface && typeof csInterface.addEventListener === "function") {
		csInterface.addEventListener("com.pickfx.palette.key", function (event) {
			handleHelperPaletteArrow(event && event.data);
		});
	}
	window.addEventListener("focus", function () {
		registerPanelKeyboard();
		applyPaletteFocus();
		syncPaletteArrowCapture(true);
	});
	window.addEventListener("blur", function () {
		syncPaletteArrowCapture();
	});
	document.addEventListener("pointerdown", function () {
		syncPaletteArrowCapture(true);
	}, true);
	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			registerPanelKeyboard();
			syncPaletteArrowCapture();
		} else {
			setPaletteArrowCapture(false);
		}
	});
	document.addEventListener("mousedown", function () {
		syncPaletteArrowCapture(true);
	}, true);
	setInterval(consumePaletteArrowFile, 32);
	setTimeout(function () {
		syncPaletteArrowCapture();
	}, 80);

	function installFlyoutMenu() {
		if (!csInterface || typeof csInterface.setPanelFlyoutMenu !== "function") {
			return;
		}
		try {
			csInterface.setPanelFlyoutMenu(
				'<Menu><MenuItem Id="openLauncher" Label="Open PickFX" Enabled="true" Checked="false"/></Menu>'
			);
			csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function (event) {
				var id = event && event.data && event.data.menuId;
				if (id === "openLauncher") {
					focusSearch(true);
				}
			});
		} catch (ignoreFlyout) {}
	}

	installFlyoutMenu();
	if (typeof PickFXGlobalLauncher !== "undefined") {
		PickFXGlobalLauncher.sync(csInterface, PanelEntitlement.currentRecord());
	}
	focusSearch();
	loadCustomerCatalog(function () {
		startHostAndIndex(1);
	});

	setTimeout(focusSearch, 50);
	if (typeof PickFXProduct !== "undefined" && PickFXProduct.boot) {
		PickFXProduct.boot(csInterface);
	}
}());
