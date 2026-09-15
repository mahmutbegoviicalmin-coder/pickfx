(function () {
	var startCount = passed + failed;
	var Browse = EffectCatalogBrowse;
	var groups;
	var blur;
	var color;

	groups = Browse.group([
		{ name: "Gaussian Blur", premiereName: "Gaussian Blur" },
		{ name: "Lumetri Color", premiereName: "Lumetri Color" },
		{ name: "Spherize", premiereName: "Spherize" },
		{ name: "Brightness & Contrast", premiereName: "Brightness & Contrast" },
		{ name: "VR Digital Glitch", premiereName: "VR Digital Glitch" },
		{ name: "Custom Widget", premiereName: "Custom Widget" }
	]);

	assertEq("browse keeps known category order", groups[0].id, "blur");
	blur = groups.filter(function (row) { return row.id === "blur"; })[0];
	color = groups.filter(function (row) { return row.id === "color"; })[0];
	assert("browse groups gaussian blur", !!(blur && blur.effects[0].name === "Gaussian Blur"));
	assert("browse groups brightness with color", !!(color && color.effects[0].name === "Brightness & Contrast"));
	assertEq("browse maps spherize to distort", Browse.groupIdFor(Browse.categoryOf({ name: "Spherize" })), "distortion");
	assertEq("browse maps lumetri to lumetri", Browse.groupIdFor(Browse.categoryOf({ name: "Lumetri Color" })), "lumetri");
	assertEq("browse maps vr to immersive", Browse.groupIdFor(Browse.categoryOf({ name: "VR Digital Glitch" })), "vr");
	assertEq("browse maps unknown to other", Browse.groupIdFor(Browse.categoryOf({ name: "Custom Widget" })), "other");
	assert("icons distinguish blur from audio", EffectIcons.category("blur") !== EffectIcons.category("audio"));
	assert("icons distinguish transition from color", EffectIcons.category("transition") !== EffectIcons.category("color"));
	assert("blur icon is a droplet", EffectIcons.category("blur").indexOf("M8 2.7c2.15") !== -1);
	assertEq("browse skips empty groups", groups.filter(function (row) { return !row.effects.length; }).length, 0);

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot !== "undefined") {
		assert(
			"panel loads catalog browse before panel.js",
			fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("EffectCatalogBrowse.js") !== -1 &&
			fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("EffectCatalogBrowse.js") <
				fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8").indexOf("js/panel.js")
		);
	}

	print("effect catalog browse: " + ((passed + failed) - startCount) + " assertions");
}());
