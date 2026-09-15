(function () {
	var startCount = passed + failed;
	var Cep = PickFXCepKeyInterest;
	var macCs;
	var winCs;
	var built;
	var payload;
	var rows;
	var codes;
	var i;
	var shiftP;
	var cmdSpace;
	var hasFalseMod;
	var registered;
	var result;
	var html;

	function mockCs(os) {
		return {
			getOSInformation: function () {
				return os;
			},
			getExtensionID: function () {
				return "com.pickfx.panel";
			},
			registerKeyEventsInterest: function (value) {
				registered = value;
				return "ok";
			}
		};
	}

	function rowCodes(list) {
		var next = [];
		for (i = 0; i < list.length; i++) {
			next.push(list[i].keyCode);
		}
		return next;
	}

	function contains(list, value) {
		return list.indexOf(value) !== -1;
	}

	macCs = mockCs("Mac OS X");
	winCs = mockCs("Windows 10 64-bit");

	assertEq("mac Down is kVK_DownArrow 125", Cep.MAC.DOWN, 125);
	assertEq("mac Up is kVK_UpArrow 126", Cep.MAC.UP, 126);
	assertEq("mac Left is kVK_LeftArrow 123", Cep.MAC.LEFT, 123);
	assertEq("mac Right is kVK_RightArrow 124", Cep.MAC.RIGHT, 124);
	assertEq("mac Return is kVK_Return 36", Cep.MAC.RETURN, 36);
	assertEq("mac Escape is kVK_Escape 53", Cep.MAC.ESCAPE, 53);
	assertEq("mac P is kVK_ANSI_P 35", Cep.MAC.P, 35);
	assertEq("mac Space is kVK_Space 49", Cep.MAC.SPACE, 49);
	assertEq("cep isMac uses CSInterface OS string", Cep.isMac(macCs), true);
	assertEq("cep isMac rejects Windows OS string", Cep.isMac(winCs), false);
	assertEq("cep isMac rejects Win64 OS string", Cep.isMac(mockCs("Win64")), false);

	built = Cep.build({
		csInterface: macCs,
		palette: true,
		panelFocus: true,
		launcher: true,
		combo: { key: "p", shiftKey: true }
	});
	codes = rowCodes(built.interests);
	assertEq("mac payload uses Carbon codes", built.mac, true);
	assertEq("mac registers Down 125", contains(codes, 125), true);
	assertEq("mac registers Up 126", contains(codes, 126), true);
	assertEq("mac registers Left 123", contains(codes, 123), true);
	assertEq("mac registers Right 124", contains(codes, 124), true);
	assertEq("mac registers Return 36", contains(codes, 36), true);
	assertEq("mac registers KeypadEnter 76", contains(codes, 76), true);
	assertEq("mac registers Escape 53", contains(codes, 53), true);
	assertEq("mac does not register JS ArrowDown 40", contains(codes, 40), false);
	assertEq("mac does not register JS ArrowUp 38", contains(codes, 38), false);
	assertEq("mac does not register JS Enter 13", contains(codes, 13), false);
	assertEq("mac does not register JS Escape 27", contains(codes, 27), false);
	assertEq("mac does not register Windows P 80", contains(codes, 80), false);

	hasFalseMod = false;
	shiftP = null;
	cmdSpace = null;
	for (i = 0; i < built.interests.length; i++) {
		rows = built.interests[i];
		if (rows.ctrlKey === false || rows.altKey === false ||
				rows.shiftKey === false || rows.metaKey === false) {
			hasFalseMod = true;
		}
		if (rows.keyCode === 35 && rows.shiftKey === true) {
			shiftP = rows;
		}
		if (rows.keyCode === 49 && rows.metaKey === true) {
			cmdSpace = rows;
		}
	}
	assertEq("mac omits false modifier fields", hasFalseMod, false);
	assert("mac Shift+P is kVK_ANSI_P 35 with shiftKey", !!shiftP);
	assertEq("mac Shift+P has no ctrlKey field", shiftP && shiftP.ctrlKey, undefined);
	assertEq("mac Shift+P has no metaKey field", shiftP && shiftP.metaKey, undefined);
	assert("mac Cmd+Space is kVK_Space 49 with metaKey", !!cmdSpace);

	built = Cep.build({
		csInterface: macCs,
		palette: true,
		panelFocus: true,
		launcher: false,
		combo: { key: "p", shiftKey: true }
	});
	assertEq("panel production payload omits Shift+P", contains(rowCodes(built.interests), 35), false);

	built = Cep.build({
		csInterface: winCs,
		palette: true,
		panelFocus: false,
		launcher: true,
		combo: { key: "p", shiftKey: true }
	});
	codes = rowCodes(built.interests);
	assertEq("win registers VK_DOWN 40", contains(codes, 40), true);
	assertEq("win registers VK_UP 38", contains(codes, 38), true);
	assertEq("win registers VK_RETURN 13", contains(codes, 13), true);
	assertEq("win registers VK_ESCAPE 27", contains(codes, 27), true);
	assertEq("win Shift+P is VK_P 80", contains(codes, 80), true);
	assertEq("win does not register Mac Down 125", contains(codes, 125), false);

	registered = "";
	Cep.apply(macCs, {
		palette: true,
		panelFocus: true,
		launcher: true,
		combo: { key: "p", shiftKey: true }
	});
	payload = JSON.parse(registered);
	assertEq("apply posts JSON string", Array.isArray(payload), true);
	assertEq("apply Mac Down is 125", contains(rowCodes(payload), 125), true);

	registered = "";
	Cep.apply(macCs, {
		palette: false,
		panelFocus: false,
		launcher: true,
		combo: { key: "p", altKey: true }
	});
	payload = JSON.parse(registered);
	assertEq("Alt+P is a single interest", payload.length, 1);
	assertEq("Alt+P keyCode is 35", payload[0].keyCode, 35);
	assertEq("Alt+P sets altKey", payload[0].altKey, true);
	assertEq("Alt+P does not set shiftKey", payload[0].shiftKey, undefined);

	registered = "";
	Cep.apply(macCs, {
		palette: true,
		panelFocus: true,
		launcher: true,
		combo: { cleared: true }
	});
	codes = rowCodes(JSON.parse(registered));
	assertEq("cleared shortcut keeps Down 125", contains(codes, 125), true);
	assertEq("cleared shortcut drops P 35", contains(codes, 35), false);

	if (typeof fs !== "undefined" && typeof path !== "undefined" && typeof __pickfxRoot !== "undefined") {
		html = fs.readFileSync(path.join(__pickfxRoot, "src/panel/index.html"), "utf8");
		assert("panel html loads CepKeyInterest immediately after CSInterface",
			html.indexOf('src="lib/CSInterface.js"') !== -1 &&
			html.indexOf("js/CepKeyInterest.js") !== -1 &&
			html.indexOf('src="lib/CSInterface.js"') < html.indexOf("js/CepKeyInterest.js") &&
			html.indexOf("js/CepKeyInterest.js") < html.indexOf("js/panel.js"));
		assert("panel html has no key probe", html.indexOf("cep-key-probe") === -1);
		assert("panel html has no diagnostic buttons",
			html.indexOf("FOCUS THIS") === -1 &&
			html.indexOf("ONLY 125") === -1 &&
			html.indexOf("ONLY SPACE") === -1 &&
			html.indexOf("ONLY SHIFT+P") === -1 &&
			html.indexOf("TEST3") === -1 &&
			html.indexOf("MINIMAL PAGE") === -1);
		assert("panel html cache-busts keyboard runtime", html.indexOf("kb-runtime-20260904-v7") !== -1);
		assert("minimal diag page is not shipped",
			!fs.existsSync(path.join(__pickfxRoot, "src/panel/cep-key-diag.html")));
	}

	assertEq("hex 0x7D stringifies to decimal 125", JSON.stringify([{ keyCode: 0x7D }]), '[{"keyCode":125}]');
	assertEq("diagnostic isolate table is gone", Cep.ISOLATE, undefined);
	assertEq("diagnostic build banner is gone", Cep.BUILD, undefined);
	assertEq("diagnostic Shift+P logger is gone", Cep.noteShiftP, undefined);

	registered = "";
	result = Cep.apply(macCs, {
		palette: true,
		panelFocus: true,
		launcher: true,
		combo: { key: "p", shiftKey: true },
		source: "test-full"
	});
	assertEq("production apply is not skipped", result.skipped, false);
	assert("full apply includes Down 125", registered.indexOf('"keyCode":125') !== -1);
	assert("full apply includes Mac Shift+P 35", registered.indexOf('"keyCode":35') !== -1);

	print("cep key interest: " + ((passed + failed) - startCount) + " assertions");
}());
