// Stubs that need to exist before any test code runs. We don't import
// jest-dom here because `setupFiles` runs BEFORE jest's expect is on the
// global; per-test-file imports work reliably across Jest versions.

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Plain non-jest fetch stub. Tests that need richer fetch mocking can override
// in their own `beforeEach`.
if (typeof global !== 'undefined') {
  global.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
      json: () => Promise.resolve({}),
    });
}
