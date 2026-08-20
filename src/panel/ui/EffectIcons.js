var EffectIcons = (function () {
	var SW = "1.5";

	function svg(inner) {
		return '<svg class="icon-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">' + inner + "</svg>";
	}

	function stroke(d) {
		return '<path d="' + d + '" stroke="currentColor" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
	}

	function circle(cx, cy, r) {
		return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="currentColor" stroke-width="' + SW + '" fill="none"/>';
	}

	var MARKUP = {
		blur: svg(circle(7.1, 7.1, 3.05) + circle(8.35, 6.2, 3.05) + stroke("M10.55 10.35L13.15 13")),
		brightness: svg(
			circle(8, 8, 2.15) +
			stroke("M8 2.55v1.25M8 12.2v1.25M2.55 8h1.25M12.2 8h1.25M4.15 4.15l.9.9M11 11l.9.9M11.85 4.15l-.9.9M5 11l-.9.9")
		),
		contrast: svg(circle(8, 8, 4.15) + '<path d="M8 3.85v8.3A4.15 4.15 0 0 0 8 3.85Z" fill="currentColor"/>'),
		temperature: svg(
			stroke("M8 2.7c-.72 0-1.3.58-1.3 1.3v5.45a2.35 2.35 0 1 0 2.6 0V4c0-.72-.58-1.3-1.3-1.3Z") +
			stroke("M8 6.35v2.55M10.15 4.35h1.15M10.15 5.7h1.15")
		),
		saturation: svg(
			stroke("M8 2.9c2.15 2.35 3.25 3.85 3.25 5.7A3.25 3.25 0 1 1 4.75 8.6C4.75 6.75 5.85 5.25 8 2.9Z") +
			stroke("M6.85 9.15h2.3")
		),
		color: svg(circle(8, 8, 4.05) + stroke("M8 3.95v8.1M3.95 8h8.1")),
		lumetri: svg(circle(8, 8, 4.05) + stroke("M8 3.2v1.15M12.8 8h-1.15M8 12.8v-1.15M3.2 8h1.15")),
		opacity: svg(stroke("M3.7 5.45h6.4v6.4H3.7Z") + stroke("M5.85 4.15h6.45v6.45")),
		scale: svg(stroke("M3.2 6.35V3.2H6.35M9.65 3.2H12.8V6.35M12.8 9.65V12.8H9.65M6.35 12.8H3.2V9.65")),
		rotation: svg(stroke("M11.55 8.05A3.55 3.55 0 1 1 8.2 4.55") + stroke("M11.7 3.35v2.45H9.3")),
		crop: svg(stroke("M4.15 3.15v6.2h6.2") + stroke("M11.85 12.85V6.65H5.65")),
		position: svg(stroke("M8 3.05v9.9M3.05 8h9.9") + stroke("M8 3.05l1.35 1.35M8 3.05L6.65 4.4M12.95 8l-1.35 1.35M12.95 8l-1.35-1.35")),
		anchor: svg(circle(8, 8, 2.15) + stroke("M8 2.55v2.2M8 11.25v2.2M2.55 8h2.2M11.25 8h2.2")),
		motion: svg(stroke("M3.15 8h6.05") + stroke("M7.15 5.55L10.55 8 7.15 10.45") + stroke("M12.55 5.15v5.7")),
		transform: svg(stroke("M4.15 5.45h6.2v6.2H4.15Z") + stroke("M6.2 4.15h5.65v5.65")),
		sharpen: svg(stroke("M8 3.15L12.55 12.7H3.45Z") + stroke("M8 6.55v3.15")),
		distortion: svg(stroke("M2.55 8c1.5-2.2 2.75 2.2 5.1 0s3.6 2.2 5.8 0")),
		noise: svg(
			circle(5.1, 5.2, 0.85) +
			circle(8.2, 4.45, 0.7) +
			circle(11.1, 5.55, 0.85) +
			circle(6.35, 8.25, 0.7) +
			circle(9.7, 7.7, 0.85) +
			circle(7.5, 11.1, 0.7) +
			circle(11, 10.5, 0.75)
		),
		keying: svg(stroke("M3.95 4.25h5.25v5.25H3.95Z") + stroke("M7.15 6.55h4.9v5.2H7.15")),
		light: svg(
			circle(8, 8, 2.05) +
			stroke("M8 2.7v1.2M8 12.1v1.2M2.7 8h1.2M12.1 8h1.2M4.3 4.3l.85.85M10.85 10.85l.85.85M11.7 4.3l-.85.85M5.15 10.85l-.85.85")
		),
		stylize: svg(stroke("M8 2.85L9.05 6.9 13.15 8 9.05 9.1 8 13.15 6.95 9.1 2.85 8 6.95 6.9Z")),
		vr: svg(stroke("M3.25 6.15h9.5v3.55c0 .7-.55 1.25-1.25 1.25H9.45L8 10 6.55 10.95H4.5c-.7 0-1.25-.55-1.25-1.25V6.15Z") + circle(6.05, 7.95, 0.75) + circle(9.95, 7.95, 0.75)),
		audio: svg(stroke("M4.25 6.1v3.8L3.1 11.15V4.85L4.25 6.1Z") + stroke("M8.1 5.7c1.15.75 1.15 3.85 0 4.6") + stroke("M10.15 4.5c1.9 1.25 1.9 5.75 0 7")),
		transition: svg(stroke("M3.25 4.7h4.05v6.6H3.25Z") + stroke("M8.15 4.7h4.6L10.4 8l2.35 3.3H8.15")),
		generic: svg(stroke("M8 3.05L8.95 6.95 12.95 8 8.95 9.05 8 12.95 7.05 9.05 3.05 8 7.05 6.95Z"))
	};

	function mark() {
		return svg(
			'<circle cx="8" cy="8" r="7.25" fill="#2a2a2a" stroke="rgba(255,255,255,0.08)" stroke-width="0.75"/>' +
			'<path d="M9.05 2.35L4.35 8.55h3L6.7 13.65l4.95-6.7H8.7L9.05 2.35Z" fill="#a1a1a6"/>'
		);
	}

	function bolt() {
		return mark();
	}

	function search() {
		return svg(circle(6.85, 6.85, 4.15) + stroke("M10.05 10.05L13.25 13.25"));
	}

	function gear() {
		return svg(
			circle(8, 8, 2) +
			stroke("M8 2.55v1.25M8 12.2v1.25M2.55 8h1.25M12.2 8h1.25M4.15 4.15l.9.9M10.95 10.95l.9.9M11.85 4.15l-.9.9M5.05 10.95l-.9.9")
		);
	}

	function ellipsis() {
		return svg(
			'<circle cx="3.5" cy="8" r="1" fill="currentColor"/>' +
			'<circle cx="8" cy="8" r="1" fill="currentColor"/>' +
			'<circle cx="12.5" cy="8" r="1" fill="currentColor"/>'
		);
	}

	function clock() {
		return svg(circle(8, 8, 5) + stroke("M8 5.15v3.05l2.15 1.3"));
	}

	function heart(filled) {
		var star = "M8 2.9l1.25 2.9 3.2.35-2.4 2.15.7 3.15L8 10.05l-2.75 1.5.7-3.15-2.4-2.15 3.2-.35L8 2.9Z";
		if (filled) {
			return svg('<path d="' + star + '" fill="currentColor"/>');
		}
		return svg('<path d="' + star + '" stroke="currentColor" stroke-width="' + SW + '" stroke-linejoin="round" fill="none"/>');
	}

	function fxMark() {
		return bolt();
	}

	function parameter() {
		return svg(stroke("M3.3 8h9.4") + stroke("M6.15 5.55v4.9") + stroke("M10.4 6.35v3.3"));
	}

	function check() {
		return svg('<path class="check-path" d="M3.4 8.2l2.8 2.8 6.4-6.45" stroke="currentColor" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/>');
	}

	function custom() {
		return svg(
			stroke("M4.05 3.85h7.9c.7 0 1.2.5 1.2 1.2v5.9c0 .7-.5 1.2-1.2 1.2H4.05c-.7 0-1.2-.5-1.2-1.2V5.05c0-.7.5-1.2 1.2-1.2Z") +
			stroke("M6.2 8h3.6M8 6.2v3.6")
		);
	}

	function info() {
		return svg(circle(8, 8, 5) + stroke("M8 7.25v3.35M8 5.2v.15"));
	}

	function category(name) {
		return MARKUP[name] || MARKUP.generic;
	}

	return {
		category: category,
		mark: bolt,
		search: search,
		gear: gear,
		ellipsis: ellipsis,
		clock: clock,
		heart: heart,
		fxMark: fxMark,
		parameter: parameter,
		check: check,
		custom: custom,
		info: info
	};
}());
