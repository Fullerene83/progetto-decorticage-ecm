
window.addEventListener('load', () => {
  const original = window.snapPoints;
  Object.defineProperty(window, 'snapPoints', {
    get() {
      return window._snapPoints || original;
    },
    set(v) {
      console.trace("snapPoints SET!", v);
      window._snapPoints = v;
      if (typeof refreshPreview === 'function') refreshPreview();
    }
  });
});
