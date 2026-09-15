(function () {
	var startCount = passed + failed;
	var Keys = PaletteKeyboard;
	var event;
	var ctx;
	var interests;
	var i;
	var codes = {};

	event = { key: "ArrowDown", code: "ArrowDown" };
	assertEq("arrow down from key", Keys.eventKey(event), "ArrowDown");
	assertEq("arrow down is nav", Keys.isPaletteNav(event), true);
	assertEq("search down moves", Keys.actionFor(event, "search"), "MOVE_DOWN");
	assertEq("parameter down moves", Keys.actionFor(event, "parameters"), "MOVE_DOWN");
	assertEq("value down ignored", Keys.actionFor(event, "value"), "IGNORE_VALUE_ARROW");
	assertEq("choice down moves", Keys.actionFor(event, "choice"), "MOVE_DOWN");

	event = { key: "ArrowUp", code: "ArrowUp" };
	assertEq("arrow up from key", Keys.eventKey(event), "ArrowUp");
	assertEq("search up moves", Keys.actionFor(event, "search"), "MOVE_UP");

	event = { key: "Enter", code: "Enter" };
	assertEq("enter activates search", Keys.actionFor(event, "search"), "ACTIVATE");
	assertEq("enter activates parameters", Keys.actionFor(event, "parameters"), "ACTIVATE");
	assertEq("enter applies value", Keys.actionFor(event, "value"), "APPLY_VALUE");
	assertEq("enter applies choice", Keys.actionFor(event, "choice"), "ACTIVATE");

	event = { key: "Escape", code: "Escape" };
	assertEq("escape leaves search", Keys.actionFor(event, "search"), "ESCAPE");
	assertEq("escape leaves value", Keys.actionFor(event, "value"), "ESCAPE");
	assertEq("escape closes settings", Keys.actionFor(event, "settings"), "CLOSE_SETTINGS");
	assertEq("record ignores escape action", Keys.actionFor(event, "record"), "");

	event = { key: "2", code: "Digit2" };
	assertEq("digits are not nav", Keys.isPaletteNav(event), false);
	assertEq("digits not consumed in value", Keys.actionFor(event, "value"), "");
	assertEq("digits not consumed in search", Keys.actionFor(event, "search"), "");

	event = { key: "l", code: "KeyL", keyCode: 76, which: 76 };
	assertEq("letter L is not legacy keypad enter", Keys.eventKey(event), "l");
	assertEq("letter L does not activate search", Keys.actionFor(event, "search"), "");

	event = { key: "5", code: "Digit5", keyCode: 53, which: 53 };
	assertEq("digit 5 is not legacy mac escape", Keys.eventKey(event), "5");
	assertEq("digit 5 remains editable in value", Keys.actionFor(event, "value"), "");

	event = { key: "$", code: "Digit4", keyCode: 36, which: 36 };
	assertEq("printable key is not legacy mac return", Keys.eventKey(event), "$");

	assertEq("legacy mac keypad enter still works without DOM identity",
		Keys.eventKey({ keyCode: 76, which: 76 }), "Enter");
	assertEq("legacy mac escape still works without DOM identity",
		Keys.eventKey({ keyCode: 53, which: 53 }), "Escape");
	assertEq("cep mac down uses carbon 125",
		Keys.eventKey({ key: "Unidentified", code: "Unidentified", keyCode: 125, which: 125 }),
		"ArrowDown");
	assertEq("cep mac up uses carbon 126",
		Keys.eventKey({ key: "Unidentified", code: "Unidentified", keyCode: 126, which: 126 }),
		"ArrowUp");
	assertEq("cep mac down wins over process identity",
		Keys.eventKey({ key: "Process", keyCode: 125, which: 125 }),
		"ArrowDown");
	assertEq("cep mac down moves the list",
		Keys.actionFor({ keyCode: 125, which: 125 }, "search"),
		"MOVE_DOWN");
	assertEq("cep mac up moves the list",
		Keys.actionFor({ keyCode: 126, which: 126 }, "search"),
		"MOVE_UP");

	ctx = Keys.context({
		mode: "value",
		activeElement: { id: "value-input" },
		valueInput: { id: "value-input" },
		choiceList: false
	});
	assertEq("value context", ctx, "value");
	ctx = Keys.context({
		mode: "parameters"
	});
	assertEq("parameter context", ctx, "parameters");

	interests = PickFXCepKeyInterest.build({
		csInterface: { getOSInformation: function () { return "Mac OS X"; } },
		palette: true,
		panelFocus: false,
		launcher: false
	}).interests;
	for (i = 0; i < interests.length; i++) {
		codes[String(interests[i].keyCode)] = true;
	}
	assertEq("cep mac does not use JS arrow up", codes["38"], undefined);
	assertEq("cep mac does not use JS arrow down", codes["40"], undefined);
	assertEq("cep mac registers kVK_UpArrow", codes["126"], true);
	assertEq("cep mac registers kVK_DownArrow", codes["125"], true);
	assertEq("cep mac registers kVK_Return", codes["36"], true);
	assertEq("cep mac registers kVK_Escape", codes["53"], true);

	print("palette keyboard: " + ((passed + failed) - startCount) + " assertions");
}());
