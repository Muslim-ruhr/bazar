(function () {
  "use strict";

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothToward(current, target, speed, dtSec) {
    const alpha = 1 - Math.exp(-Math.max(0.0001, speed) * Math.max(0, dtSec));
    return lerp(current, target, alpha);
  }

  window.BazarMotion = { lerp, easeOutBack, easeInOutCubic, easeOutCubic, smoothToward };
})();
