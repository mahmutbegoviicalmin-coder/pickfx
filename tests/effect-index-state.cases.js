(function () {
	var startCount = passed + failed;
	var state;
	var view;
	var Index = EffectIndexState;

	state = Index.create();
	assertEq("index starts idle", state.status, "idle");
	view = Index.view(state, { catalogReady: false });
	assertEq("idle is loading view", view.kind, "loading");
	assertEq("idle does not show error", view.showError, false);

	state = Index.begin(state);
	assertEq("begin is loading", state.status, "loading");
	assertEq("first attempt", state.attempt, 1);
	view = Index.view(state);
	assertEq("loading message", view.message, "Loading effects…");
	assertEq("loading hides error", view.showError, false);

	state = Index.fail(state, "QE not ready", "EFFECT_INDEX_UNAVAILABLE");
	assertEq("first fail stays loading", state.status, "loading");
	assertEq("first fail is retryable", state.retryable, true);
	assertEq("should retry after first fail", Index.shouldRetry(state), true);

	state = Index.begin(state);
	state = Index.succeed(state, ["Gaussian Blur"]);
	assertEq("success is ready", state.status, "ready");
	view = Index.view(state);
	assertEq("ready hides error", view.showError, false);
	assertEq("ready clears message", view.message, "");

	state = Index.create({ maxAttempts: 2 });
	state = Index.begin(state);
	state = Index.fail(state, "no qe", "EFFECT_INDEX_UNAVAILABLE");
	state = Index.begin(state);
	state = Index.fail(state, "no qe", "EFFECT_INDEX_UNAVAILABLE");
	assertEq("final fail status", state.status, "failed");
	view = Index.view(state, { catalogReady: false });
	assertEq("final fail shows error", view.showError, true);
	assertEq("final fail customer copy", view.message, "Could not load effect index.");
	view = Index.view(state, { catalogReady: true });
	assertEq("catalog fallback hides error", view.showError, false);
	assertEq("catalog fallback kind", view.kind, "ready");

	print("effect index state: " + ((passed + failed) - startCount) + " assertions");
}());
