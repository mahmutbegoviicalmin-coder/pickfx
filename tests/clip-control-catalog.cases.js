(function () {
	var startCount = passed + failed;
	var Catalog = ClipControlCatalog;
	var production = {
		capabilities: [
			{
				id: "motion.opacity",
				displayName: "Opacity",
				names: ["opacity"],
				valueType: "percent",
				parameterDisplayName: "Opacity",
				writerPath: "ConfirmedParameterWrites.write",
				productionReady: true
			},
			{
				id: "motion.scale",
				displayName: "Scale",
				names: ["scale"],
				valueType: "percent",
				parameterDisplayName: "Scale",
				writerPath: "ConfirmedParameterWrites.write",
				productionReady: true
			},
			{
				id: "motion.rotation",
				displayName: "Rotation",
				names: ["rotation"],
				valueType: "number",
				parameterDisplayName: "Rotation",
				writerPath: "ConfirmedParameterWrites.write",
				productionReady: true
			},
			{
				id: "motion.position",
				displayName: "Position",
				names: ["position"],
				valueType: "point",
				parameterDisplayName: "Position",
				writerPath: "ConfirmedParameterWrites.write",
				productionReady: true
			},
			{
				id: "motion.anchor-point",
				displayName: "Anchor Point",
				names: ["anchor point"],
				valueType: "point",
				parameterDisplayName: "Anchor Point",
				writerPath: "ConfirmedParameterWrites.write",
				productionReady: true
			},
			{
				id: "clip.speed",
				displayName: "Speed",
				names: ["speed"],
				valueType: "percent",
				writerPath: "none",
				productionReady: false
			}
		]
	};
	var items = Catalog.list(production);
	var names = items.map(function (item) { return item.displayName; });
	var groups;

	assertEq("clip catalog has five executable controls", items.length, 5);
	assert("clip catalog includes opacity", names.indexOf("Opacity") !== -1);
	assert("clip catalog includes scale", names.indexOf("Scale") !== -1);
	assert("clip catalog includes rotation", names.indexOf("Rotation") !== -1);
	assert("clip catalog includes position", names.indexOf("Position") !== -1);
	assert("clip catalog includes anchor point", names.indexOf("Anchor Point") !== -1);
	assert("clip catalog excludes speed", names.indexOf("Speed") === -1);
	assertEq("clip catalog items are clip-control kind", items[0].kind, "clip-control");
	assertEq("opacity apply query", Catalog.applyQuery(Catalog.find("Opacity", production), "80"), "opacity 80");
	assertEq("position apply query from pair", Catalog.applyQuery(Catalog.find("Position", production), "120 40"), "position x 120 y 40");
	assertEq("position apply query from xy", Catalog.applyQuery(Catalog.find("Position", production), "x 10 y 20"), "position x 10 y 20");
	assertEq("empty value has no apply query", Catalog.applyQuery(Catalog.find("Scale", production), ""), "");

	groups = EffectCatalogBrowse.group(items.concat([{ name: "Gaussian Blur", premiereName: "Gaussian Blur" }]));
	assertEq("browse puts clip controls first", groups[0].id, "clip");
	assertEq("browse clip section has five controls", groups[0].effects.length, 5);

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot !== "undefined") {
		assert(
			"panel loads clip control catalog before panel.js",
			fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("ClipControlCatalog.js") !== -1 &&
			fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("ClipControlCatalog.js") <
				fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("js/panel.js")
		);
	}

	print("clip control catalog: " + ((passed + failed) - startCount) + " assertions");
}());
