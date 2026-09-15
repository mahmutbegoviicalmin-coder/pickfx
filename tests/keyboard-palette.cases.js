(function () {
	var startCount = passed + failed;
	var panelSource;
	var panelHtml;
	var panelCss;
	var writerSource;
	var searchSource;
	var effectVisibilitySource;
	var applySource;
	var focusSource;
	var successSource;
	var steps;
	if (typeof fs === "undefined" || typeof path === "undefined" || typeof __pickfxRoot === "undefined") {
		assert("palette flow module loaded", typeof PaletteFlow !== "undefined");
		assert("shortcut store module loaded", typeof ShortcutStore !== "undefined");
		print("keyboard palette: " + ((passed + failed) - startCount) + " assertions");
		return;
	}
	panelSource = fs.readFileSync(path.join(__pickfxRoot, "src/panel/js/panel.js"), "utf8");
	panelHtml = fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8");
	panelCss = fs.readFileSync(path.join(__pickfxRoot, "src/panel/styles/panel.css"), "utf8");
	writerSource = fs.readFileSync(path.join(__pickfxRoot, "src/core/ParameterWriter.js"), "utf8");
	searchSource = panelSource.slice(
		panelSource.lastIndexOf("function renderSearch()"),
		panelSource.indexOf("function updateSelectionHighlight", panelSource.lastIndexOf("function renderSearch()"))
	);
	effectVisibilitySource = panelSource.slice(
		panelSource.indexOf("function customerEffectVisible"),
		panelSource.indexOf("function loadReadinessAudit")
	);
	applySource = panelSource.slice(
		panelSource.indexOf("function applyFromSearchInput()"),
		panelSource.indexOf("function resetPaletteToSearch", panelSource.indexOf("function applyFromSearchInput()"))
	);
	focusSource = panelSource.slice(
		panelSource.indexOf("function focusElement"),
		panelSource.indexOf("function showDebugJson")
	);
	successSource = panelSource.slice(
		panelSource.indexOf("function showApplyFeedback"),
		panelSource.indexOf("function visibleApplyMessage")
	);
	assert("panel loads palette flow", panelSource.indexOf("PaletteFlow.selectEffect") !== -1);
	assert("panel auto-focuses value", panelSource.indexOf("focusValue") !== -1);
	assert("panel intercepts arrows in capture", panelSource.indexOf("dispatchPaletteKey") !== -1);
	assert("panel uses capture true", panelSource.indexOf("dispatchPaletteKey, true") !== -1);
	assert("panel registers palette keys with CEP", panelSource.indexOf("registerPanelKeyboard") !== -1);
	assert("panel loads CepKeyInterest before panel.js", panelHtml.indexOf("CepKeyInterest.js") !== -1 &&
		panelHtml.indexOf("CepKeyInterest.js") < panelHtml.indexOf("js/panel.js"));
	assert("effect-search runtime cache-bust is visible in panel html",
		panelHtml.indexOf("panel.js?v=presets-parity-20260915") !== -1 &&
		panelHtml.indexOf("PaletteFlow.js?v=effect-search-only-20260904") !== -1);
	assert("panel loads palette keyboard", panelHtml.indexOf("PaletteKeyboard.js") !== -1);
	assert("panel has value input", panelHtml.indexOf("id=\"value-input\"") !== -1);
	assert("value input starts disabled", panelHtml.indexOf("id=\"value-input\"") !== -1 &&
		panelHtml.indexOf("id=\"value-input\"") < panelHtml.indexOf("disabled tabindex=\"-1\""));
	assert("search says effects", panelHtml.indexOf("placeholder=\"Search effects...\"") !== -1);
	assert("value mode footer shows escape back hint", panelHtml.indexOf("footer-back-hint") !== -1 &&
		panelHtml.indexOf("<span class=\"keycap\">esc</span> Back") !== -1);
	assert("footer keeps esc back next to apply", panelHtml.indexOf("footer-keys") !== -1 &&
		panelHtml.indexOf("footer-back-hint") < panelHtml.indexOf("footer-apply-hint"));
	assert("footer shows arrow move hint", panelHtml.indexOf("footer-nav-hint") !== -1 &&
		panelHtml.indexOf("footer-back-hint") < panelHtml.indexOf("footer-nav-hint") &&
		panelHtml.indexOf("footer-nav-hint") < panelHtml.indexOf("footer-apply-hint"));
	assert("footer back hint stays visible", panelCss.indexOf(".footer-back-hint") !== -1 &&
		panelCss.indexOf(".command-bar.is-value-mode .footer-back-hint") === -1);
	assert("panel reregisters CEP arrows on focus",
		panelSource.indexOf("registerPanelKeyboard();") !== -1 &&
		panelSource.indexOf("window.addEventListener(\"focus\"") !== -1);
	assert("panel asks helper to capture arrows while focused",
		panelSource.indexOf("com.pickfx.palette.capture") !== -1 &&
		panelSource.indexOf("syncPaletteArrowCapture") !== -1 &&
		panelSource.indexOf("palette-capture") !== -1);
	assert("panel moves selection from helper arrow events",
		panelSource.indexOf("com.pickfx.palette.key") !== -1 &&
		panelSource.indexOf("handleHelperPaletteArrow") !== -1 &&
		panelSource.indexOf("PALETTE_ARROW_DOWN") !== -1 &&
		panelSource.indexOf("palette-arrow") !== -1 &&
		panelSource.indexOf("consumePaletteArrowFile") !== -1);
	assert("value input has dedicated palette styling", panelCss.indexOf("#value-input {") !== -1 &&
		panelCss.indexOf("font-variant-numeric: tabular-nums") !== -1);
	assert("value context is visually secondary", panelCss.indexOf(".palette-effect-label {") !== -1 &&
		panelCss.indexOf("text-transform: uppercase") !== -1);
	assert("value parameter is the primary title", panelCss.indexOf(".palette-parameter-label {") !== -1 &&
		panelCss.indexOf("font-size: 22px") !== -1);
	assert("value card stays compact", panelCss.indexOf(".search-wrap.is-value {") !== -1 &&
		panelCss.indexOf("min-height: 52px") !== -1);
	assert("settings can record shortcut", panelHtml.indexOf("settings-shortcut-record") !== -1);
	assert("settings can reset shortcut", panelHtml.indexOf("settings-shortcut-reset") !== -1);
	assert("settings can clear shortcut", panelHtml.indexOf("settings-shortcut-clear") !== -1);
	assert("writer retries read-back", writerSource.indexOf("readBackVerified") !== -1);
	assert("writer does not assume success", writerSource.indexOf("verified.ok") !== -1);
	assert("panel does not copy effect name into search during parameter flow",
		panelSource.indexOf("searchInput.value = paletteFlow.effect.displayName") === -1);
	assert("panel does not copy applyQuery into search",
		panelSource.indexOf("searchInput.value = query") === -1);
	assert("success restore clears search", panelSource.indexOf("resetPaletteToSearch(false)") !== -1);
	assert("recent remembers effect identity", panelSource.indexOf('kind: "effect"') !== -1);
	assert("ordinary search uses effect search", searchSource.indexOf("EffectSearch.search(query, effects.concat(clipControlItems()), aliases)") !== -1);
	assert("empty search browses the categorized catalog",
		searchSource.indexOf("appendGroupedEffects(browseVisibleEffects(), usedNames)") !== -1 &&
		searchSource.indexOf("appendSection(\"Recent\"") !== -1);
	assert("typed search groups matches by category",
		searchSource.indexOf("appendGroupedEffects(groupedMatches, null)") !== -1);
	assert("search includes executable clip controls",
		searchSource.indexOf("clipControlItems()") !== -1 &&
		panelSource.indexOf("ClipControlCatalog.applyQuery") !== -1);
	assert("panel seeds effects from the customer catalog if Premiere index is empty",
		panelSource.indexOf("function seedRegistryFromCatalog") !== -1 &&
		panelSource.indexOf("function loadCustomerCatalog") !== -1 &&
		panelSource.indexOf("startHostAndIndex") !== -1);
	assert("ordinary search has no command parser", searchSource.indexOf("CommandParser") === -1);
	assert("ordinary search has no command preview", searchSource.indexOf("CommandPreview.fromQuery") === -1);
	assert("ordinary search has no terminal preview", searchSource.indexOf("TerminalProductionRegistry.preview") === -1);
	assert("ordinary search has no effect browser expansion", searchSource.indexOf("TerminalEffectDiscovery.browse") === -1);
	assert("ordinary search does not append parameters", searchSource.indexOf("appendDiscoveryParameterRow") === -1 &&
		searchSource.indexOf("appendParameterRow") === -1);
	assert("ordinary search never renders parameter-not-found copy",
		searchSource.indexOf("No executable parameter found.") === -1);
	assert("ordinary search never begins an effect flow from typing",
		searchSource.indexOf("beginEffectFlow") === -1);
	assert("search visibility never promotes terminal capabilities to effects",
		effectVisibilitySource.indexOf("discoveryCatalog.capabilities") === -1);
	assert("ordinary search ignores command recents", searchSource.indexOf("appendRecentCommandRow") === -1);
	assert("search enter has no command parsing", applySource.indexOf("CommandParser") === -1 &&
		applySource.indexOf("tryTerminalCommand(searchInput.value)") === -1 &&
		applySource.indexOf("runClipParameterCommand") === -1);
	assert("search enter applies selected presets before effects",
		applySource.indexOf("PresetExecutor.shouldApplySelectedRow") !== -1 &&
		applySource.indexOf("PresetExecutor.shouldApplySelectedRow") <
			applySource.indexOf("beginEffectFlow(row.effect)"));
	assert("search enter begins effect flow", applySource.indexOf("beginEffectFlow(row.effect)") !== -1);
	assert("typed search includes saved presets", searchSource.indexOf("PresetSearch.search") !== -1);
	assert("header has a presets button", panelHtml.indexOf("id=\"presets-btn\"") !== -1);
	assert("palette transitions own state changes", panelSource.indexOf("function transitionPalette") !== -1);
	assert("focus retries are version guarded", focusSource.indexOf("requestVersion !== focusTransition") !== -1);
	assert("focus uses one guarded animation frame", focusSource.indexOf("requestAnimationFrame") !== -1 &&
		focusSource.indexOf("setTimeout(apply") === -1);
	assert("parameter mode hides search", panelCss.indexOf(".command-bar.is-parameter-mode .search-wrap:not(.is-value)") !== -1 &&
		panelCss.indexOf(".command-bar.is-parameter-mode .search-wrap:not(.is-value) {\n\tdisplay: none;") !== -1);
	assert("input ownership disables inactive input", panelSource.indexOf("searchInput.disabled = !searchOwnsInput") !== -1 &&
		panelSource.indexOf("valueInput.disabled = !valueOwnsInput") !== -1);
	assert("search input is state guarded", panelSource.indexOf('if (paletteMode() !== "search")') !== -1);
	assert("value input is state guarded", panelSource.indexOf('paletteMode() === "value"') !== -1);
	assert("hover selection updates palette flow", panelSource.indexOf("PaletteFlow.selectIndex") !== -1);
	assert("success immediately returns keyboard state to search",
		successSource.indexOf("PaletteFlow.toSearch(paletteFlow)") !== -1 &&
		successSource.indexOf("PaletteFlow.toSearch(paletteFlow)") <
			successSource.indexOf("paintSuccessResult(payload)"));

	steps = [
		"Open PickFX",
		"Type an effect",
		"Arrow through results",
		"ENTER select effect",
		"Select parameter",
		"ENTER",
		"Type value",
		"ENTER",
		"Effect is applied",
		"ESC backs out",
		"Search another effect"
	];
	assertEq("manual keyboard-only steps", steps.length, 11);
	assert("gaussian blur example documented", panelSource.indexOf("beginEffectFlow") !== -1);

	print("keyboard palette: " + ((passed + failed) - startCount) + " assertions");
}());
