var ParameterDiscovery = (function () {
	var HIDDEN_EXACT = {
		"error occurred": true,
		"controls": true,
		"about": true,
		"compositing options": true,
		"applied version": true,
		"overlay mode": true,
		"sequence width": true,
		"sequence height": true,
		"sequence pixel ratio": true,
		"seed": true
	};

	var CONTAINERS = {
		controls: true,
		about: true,
		"compositing options": true
	};

	function trim(value) {
		return String(value || "").replace(/^\s+|\s+$/g, "");
	}

	function normalize(value) {
		return trim(value).toLowerCase();
	}

	function isContainerName(name) {
		return !!CONTAINERS[normalize(name)];
	}

	function isMetadataName(name) {
		var n = normalize(name);
		if (!n) {
			return true;
		}
		if (HIDDEN_EXACT[n]) {
			return true;
		}
		if (n.indexOf("error occurred") !== -1) {
			return true;
		}
		if (n.indexOf("applied version") !== -1) {
			return true;
		}
		if (n.indexOf("overlay mode") !== -1) {
			return true;
		}
		if (n.indexOf("sequence width") !== -1) {
			return true;
		}
		if (n.indexOf("sequence height") !== -1) {
			return true;
		}
		if (n.indexOf("sequence pixel ratio") !== -1) {
			return true;
		}
		return false;
	}

	function isUserFacing(param) {
		var name;
		if (!param) {
			return false;
		}
		name = trim(param.displayName);
		if (!name) {
			return false;
		}
		if (name.charAt(0) === "_") {
			return false;
		}
		if (isContainerName(name) || isMetadataName(name)) {
			return false;
		}
		return true;
	}

	function userFacing(parameters) {
		var visible = [];
		var i;
		var param;

		if (!parameters || !parameters.length) {
			return [];
		}

		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			if (!isUserFacing(param)) {
				continue;
			}
			visible.push(param);
		}

		return visible;
	}

	function matching(parameters, parameterQuery) {
		var q = normalize(parameterQuery);
		var prefix = [];
		var contains = [];
		var i;
		var param;
		var name;

		if (!q) {
			return parameters ? parameters.slice() : [];
		}

		for (i = 0; i < parameters.length; i++) {
			param = parameters[i];
			if (!param) {
				continue;
			}
			name = normalize(param.displayName);
			if (!name) {
				continue;
			}
			if (name.indexOf(q) === 0) {
				prefix.push(param);
			} else if (name.indexOf(q) !== -1) {
				contains.push(param);
			}
		}

		return prefix.concat(contains);
	}

	return {
		userFacing: userFacing,
		matching: matching
	};
}());
