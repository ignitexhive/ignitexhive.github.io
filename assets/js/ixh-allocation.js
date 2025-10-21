// assets/js/ixh-allocation.js
(() => {
  const nf = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 });

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animateValue(el, target, { prefix = "", suffix = "", duration = 1000, start = 0 } = {}) {
    const startValue = start;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(startValue + (target - startValue) * eased);
      el.textContent = `${prefix}${nf.format(current)}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  function animateFill(el, targetPercent, { duration = 1000 } = {}) {
    el.classList.add("is-active");
    const startPercent = 0;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = startPercent + (targetPercent - startPercent) * eased;
      el.style.width = `${current}%`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  function immediateFill(el, targetPercent) {
    el.classList.add("is-active");
    el.style.width = `${targetPercent}%`;
  }

  function immediateValue(el, target, { prefix = "", suffix = "" } = {}) {
    el.textContent = `${prefix}${nf.format(target)}${suffix}`;
  }

  function animateCoinAlongPath(coin, path, { duration = 1300 } = {}) {
    return new Promise((resolve) => {
      const length = path.getTotalLength();
      const startPoint = path.getPointAtLength(0);
      coin.setAttribute("cx", `${startPoint.x}`);
      coin.setAttribute("cy", `${startPoint.y}`);
      coin.style.opacity = "1";
      coin.classList.add("is-active");

      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const pos = path.getPointAtLength(length * eased);
        coin.setAttribute("cx", `${pos.x}`);
        coin.setAttribute("cy", `${pos.y}`);

        if (progress < 1) {
          requestAnimationFrame(step);
          } else {
          window.setTimeout(() => {
            coin.classList.remove("is-active");
            coin.style.opacity = "0";
            resolve();
          }, 180);
        }
      };

      requestAnimationFrame(step);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bumpAmount = (targetId, increment, finalValue) => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const prefix = el.getAttribute("data-prefix") || "";
      const suffix = el.getAttribute("data-suffix") || "";
      const current = Number(el.getAttribute("data-current") || el.getAttribute("data-start") || 0);
      const next = Math.min(finalValue > 0 ? finalValue : current + increment, current + increment);
      el.setAttribute("data-current", next);
      animateValue(el, next, { prefix, suffix, duration: 600, start: current });
    };

    const collectByOrder = (selector, attr) => {
      const map = new Map();
      document.querySelectorAll(selector).forEach((el) => {
        const order = Number(el.getAttribute(attr));
        if (!map.has(order)) map.set(order, []);
        map.get(order).push(el);
          });
      return map;
    };

    const activationMap = collectByOrder("[data-activate-order]", "data-activate-order");
    const amountMap = collectByOrder("[data-amount-order]", "data-amount-order");
    const fillMap = collectByOrder("[data-fill-order]", "data-fill-order");
    const coinOrderMap = new Map();

    document.querySelectorAll("[data-coin-order]").forEach((coin) => {
      const order = Number(coin.getAttribute("data-coin-order"));
      const pathId = coin.getAttribute("data-flow-path");
      const path = pathId ? document.getElementById(pathId) : null;
      if (!path) return;
      const repeat = Math.max(1, parseInt(coin.getAttribute("data-repeat-count") || "1", 10));
      if (!coinOrderMap.has(order)) coinOrderMap.set(order, []);
      coinOrderMap.get(order).push({ coin, path, repeat });
          });

    const orders = Array.from(
      new Set([
        ...activationMap.keys(),
        ...amountMap.keys(),
        ...fillMap.keys(),
        ...coinOrderMap.keys(),
      ])
    ).sort((a, b) => a - b);

    if (reduceMotion) {
      activationMap.forEach((elements) => {
        elements.forEach((el) => el.classList.add("is-active"));
          });
      amountMap.forEach((elements) => {
        elements.forEach((el) => {
          const target = Number(el.getAttribute("data-amount") || "0");
          const prefix = el.getAttribute("data-prefix") || "";
          const suffix = el.getAttribute("data-suffix") || "";
          immediateValue(el, target, { prefix, suffix });
          });
          });
      fillMap.forEach((elements) => {
        elements.forEach((el) => {
          const target = parseFloat(el.getAttribute("data-fill") || "0");
          immediateFill(el, target);
          });
          });
      coinOrderMap.forEach((items) => {
        items.forEach(({ coin, path }) => {
          const end = path.getPointAtLength(path.getTotalLength());
          coin.setAttribute("cx", `${end.x}`);
          coin.setAttribute("cy", `${end.y}`);
          coin.classList.add("is-active");
          coin.style.opacity = "1";
          });
          });
      return;
    }

    const baseDelay = 220;
    const stepDelay = 1200;

    orders.forEach((order, index) => {
      const delay = baseDelay + index * stepDelay;
      window.setTimeout(() => {
        (activationMap.get(order) || []).forEach((el) => {
          if (el.classList.contains("flow-line")) {
            el.classList.remove("is-active");
            void el.getBoundingClientRect();
          }
          el.classList.add("is-active");
        });

      (amountMap.get(order) || []).forEach((el) => {
        const target = Number(el.getAttribute("data-amount") || "0");
        const prefix = el.getAttribute("data-prefix") || "";
        const suffix = el.getAttribute("data-suffix") || "";
        const increment = Number(el.getAttribute("data-increment") || "0");
        const steps = Math.max(1, parseInt(el.getAttribute("data-repeat-count") || "1", 10));
        const startValue = Number(el.getAttribute("data-start") || "0");

        if (increment > 0 && steps > 1) {
          el.setAttribute("data-current", startValue);
          animateValue(el, startValue, { prefix, suffix, duration: 0, start: startValue });
        } else {
          animateValue(el, target, { prefix, suffix, duration: 1000, start: startValue });
          el.setAttribute("data-current", target);
        }
      });

      (fillMap.get(order) || []).forEach((el) => {
        const target = parseFloat(el.getAttribute("data-fill") || "0");
        animateFill(el, target, { duration: 1100 });
      });

      (coinOrderMap.get(order) || []).forEach(({ coin, path, repeat }) => {
        const amountTargetId = coin.getAttribute("data-amount-target");
        const amountIncrement = Number(coin.getAttribute("data-increment") || "0");
        const amountFinal = Number(coin.getAttribute("data-final") || "0");
        const run = (iteration = 0) => {
          animateCoinAlongPath(coin, path, { duration: 1400 }).then(() => {
            if (amountTargetId && amountIncrement) {
              bumpAmount(amountTargetId, amountIncrement, amountFinal);
            }
            if (iteration + 1 < repeat) {
              window.setTimeout(() => run(iteration + 1), 220);
            }
          });
        };
          run();
        });
      }, delay);
    });
  });
})();

