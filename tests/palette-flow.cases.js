(function () {
	var startCount = passed + failed;
	var Flow = PaletteFlow;
	var state;
	var gaussian = {
		displayName: "Gaussian Blur",
		premiereName: "Gaussian Blur",
		defaultParameterIndex: 5,
		defaultParameterDisplayName: "Amount"
	};
	var posterize = {
		displayName: "Posterize",
		premiereName: "Posterize"
	};
	var lumetri = {
		displayName: "Lumetri Color",
		premiereName: "Lumetri Color",
		defaultParameterIndex: 19,
		defaultParameterDisplayName: "Exposure"
	};

	function param(name, extra) {
		var row = {
			parameterDisplayName: name,
			parameterIndex: extra && extra.index !== undefined ? extra.index : 0,
			valueType: (extra && extra.type) || "number",
			executable: extra && extra.executable === false ? false : true,
			currentValue: extra && extra.currentValue
		};
		if (extra && extra.options) {
			row.options = extra.options;
		}
		if (extra && extra.enumMetadata) {
			row.enumMetadata = extra.enumMetadata;
		}
		return row;
	}

	state = Flow.create();
	assertEq("starts in search", state.mode, Flow.MODE.SEARCH);
	assertEq("search focuses search", Flow.focusTarget(state), "search");

	state = Flow.selectEffect(state, posterize, [param("Level", { currentValue: 8 })]);
	assertEq("single param enters value", state.mode, Flow.MODE.VALUE);
	assertEq("single param name", Flow.parameterName(state.parameter), "Level");
	assertEq("value focuses value", Flow.focusTarget(state), "value");
	assertEq("value shows current", state.valueText, "8");

	state = Flow.setValueText(state, "20");
	assertEq("apply query", Flow.applyQuery(state), "Posterize Level 20");
	state = Flow.escape(state);
	assertEq("single parameter value esc returns search", state.mode, Flow.MODE.SEARCH);

	state = Flow.create();
	state = Flow.selectEffect(state, gaussian, [
		param("Seed", { index: 3 }),
		param("Angle", { index: 4 }),
		param("Amount", { index: 5, currentValue: 20 })
	]);
	assertEq("multi param stays on list", state.mode, Flow.MODE.PARAMETERS);
	assertEq("default amount selected", Flow.parameterName(state.parameters[state.selectedIndex]), "Amount");
	assertEq("parameter list focuses results", Flow.focusTarget(state), "results");

	state = Flow.selectIndex(state, 0);
	assertEq("direct selection uses flow index", state.selectedIndex, 0);
	assertEq("direct selection identifies seed", Flow.parameterName(state.parameters[state.selectedIndex]), "Seed");
	state = Flow.selectIndex(state, 2);
	assertEq("mouse-style selection identifies amount", Flow.parameterName(state.parameters[state.selectedIndex]), "Amount");

	state = Flow.move(state, 1);
	assertEq("down wraps from amount", Flow.parameterName(state.parameters[state.selectedIndex]), "Seed");
	state = Flow.move(state, -1);
	assertEq("up returns to amount", Flow.parameterName(state.parameters[state.selectedIndex]), "Amount");

	state = Flow.selectParameter(state, state.parameters[state.selectedIndex]);
	assertEq("enter param goes to value", state.mode, Flow.MODE.VALUE);
	assertEq("amount focused", Flow.focusTarget(state), "value");
	assertEq("amount current shown", state.valueText, "20");

	state = Flow.escape(state);
	assertEq("esc from value returns to params", state.mode, Flow.MODE.PARAMETERS);
	state = Flow.escape(state);
	assertEq("esc from params returns to search", state.mode, Flow.MODE.SEARCH);
	assertEq("esc from search dismisses", Flow.escape(state).dismiss, true);

	state = Flow.selectEffect(Flow.create(), lumetri, [
		param("Exposure", { index: 19 }),
		param("Highlights", { index: 20 }),
		param("Shadows", { index: 21 })
	]);
	assertEq("lumetri shows parameter list", state.mode, Flow.MODE.PARAMETERS);
	assertEq("lumetri default exposure", Flow.parameterName(state.parameters[state.selectedIndex]), "Exposure");

	state = Flow.selectParameter(state, state.parameters[0]);
	state = Flow.setValueText(state, "1");
	assertEq("lumetri apply query", Flow.applyQuery(state), "Lumetri Color Exposure 1");

	state = Flow.selectEffect(Flow.create(), gaussian, [param("Enabled", { type: "boolean", currentValue: false })]);
	assertEq("boolean enters value mode", state.mode, Flow.MODE.VALUE);
	assertEq("boolean focuses options", Flow.focusTarget(state), "results");
	assertEq("boolean off selected", state.selectedIndex, 1);

	state = Flow.selectEffect(Flow.create(), gaussian, [param("Blur Dimensions", {
		type: "enum",
		currentValue: "Horizontal and Vertical",
		options: [
			{ label: "Horizontal and Vertical", value: 1 },
			{ label: "Horizontal", value: 2 },
			{ label: "Vertical", value: 3 }
		]
	})]);
	assertEq("enum enters value mode", state.mode, Flow.MODE.VALUE);
	assertEq("enum focuses options", Flow.focusTarget(state), "results");
	assertEq("enum uses choice list", Flow.usesChoiceList(state), true);
	assertEq("enum keeps current option", state.options[state.selectedIndex].label, "Horizontal and Vertical");
	state = Flow.move(state, 1);
	assertEq("enum down selects next", state.options[state.selectedIndex].label, "Horizontal");
	assertEq("enum apply query uses label", Flow.applyQuery(state), "Gaussian Blur Blur Dimensions Horizontal");

	print("palette flow: " + ((passed + failed) - startCount) + " assertions");
}());
