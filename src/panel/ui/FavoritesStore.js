var FavoritesStore = (function () {
	var KEY = "pickfx.favorites";

	function load() {
		try {
			var parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]");
			if (parsed && parsed.length) {
				return parsed;
			}
		} catch (ignore) {}
		return [];
	}

	function save(names) {
		window.localStorage.setItem(KEY, JSON.stringify(names));
	}

	function has(name) {
		return load().indexOf(name) !== -1;
	}

	function toggle(name) {
		var names = load();
		var index = names.indexOf(name);
		if (index === -1) {
			names.push(name);
		} else {
			names.splice(index, 1);
		}
		save(names);
		return has(name);
	}

	return {
		list: load,
		has: has,
		toggle: toggle
	};
}());
