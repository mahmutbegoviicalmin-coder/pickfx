(function () {
	var startCount = passed + failed;
	var storage = ShortcutStore.memoryStorage();
	var loaded;
	var combo;
	var validated;
	var Shortcut = TerminalKeyboardShortcut;

	loaded = ShortcutStore.load({ storage: storage });
	assertEq("default key", loaded.key, "p");
	assertEq("default shift", loaded.shiftKey, true);
	assertEq("default meta off", loaded.metaKey, false);

	combo = Shortcut.fromEvent({
		key: " ",
		code: "Space",
		keyCode: 32,
		metaKey: true,
		ctrlKey: false,
		altKey: false,
		shiftKey: false
	});
	validated = Shortcut.validateCombo(combo, "MacIntel");
	assertEq("cmd space conflicts", validated.ok, false);
	assertEq("cmd space conflict reason", validated.reason, "CONFLICT_PANEL_FOCUS");

	combo = Shortcut.fromEvent({
		key: "p",
		code: "KeyP",
		keyCode: 80,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false
	});
	validated = Shortcut.validateCombo(combo, "MacIntel");
	assertEq("bare letter rejected", validated.ok, false);

	combo = Shortcut.fromEvent({
		key: "k",
		code: "KeyK",
		keyCode: 75,
		metaKey: true,
		ctrlKey: false,
		altKey: false,
		shiftKey: false
	});
	validated = Shortcut.validateCombo(combo, "MacIntel");
	assertEq("cmd k accepted", validated.ok, true);
	ShortcutStore.save(validated.combo, { storage: storage });
	loaded = ShortcutStore.load({ storage: storage });
	assertEq("persisted key", loaded.key, "k");
	assertEq("persisted meta", loaded.metaKey, true);
	assertEq("mac label", Shortcut.formatCombo(loaded, "MacIntel"), "⌘ K");
	assertEq("windows label", Shortcut.formatCombo(loaded, "Win32"), "Win + K");

	assertEq("matches recorded combo", Shortcut.isLauncherShortcut({
		key: "k",
		code: "KeyK",
		keyCode: 75,
		metaKey: true,
		ctrlKey: false,
		altKey: false,
		shiftKey: false
	}, "MacIntel", loaded), true);
	assertEq("shift p no longer matches custom", Shortcut.isLauncherShortcut({
		key: "p",
		keyCode: 80,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: true
	}, "MacIntel", loaded), false);

	ShortcutStore.reset({ storage: storage });
	loaded = ShortcutStore.load({ storage: storage });
	assertEq("reset key", loaded.key, "p");
	assertEq("reset shift", loaded.shiftKey, true);
	assertEq("default label", Shortcut.launcherShortcutLabel("MacIntel", loaded), "⇧ P");

	ShortcutStore.clear({ storage: storage });
	loaded = ShortcutStore.load({ storage: storage });
	assertEq("clear disables shortcut", loaded.disabled, true);
	assertEq("cleared label", Shortcut.launcherShortcutLabel("MacIntel", loaded), "None");
	assertEq("cleared combo does not match shift p", Shortcut.isLauncherShortcut({
		key: "p",
		keyCode: 80,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: true
	}, "MacIntel", loaded), false);
	ShortcutStore.reset({ storage: storage });
	loaded = ShortcutStore.load({ storage: storage });
	assertEq("reset after clear restores p", loaded.key, "p");
	assertEq("reset after clear not disabled", loaded.disabled, false);

	assertEq("capture arrows", Shortcut.isArrow({ key: "ArrowDown", keyCode: 40 }), true);
	assertEq("capture enter", Shortcut.isEnter({ key: "Enter", keyCode: 13 }), true);

	print("shortcut store: " + ((passed + failed) - startCount) + " assertions");
}());
