// assets/js/ixh-allocation.js
(() => {
  const nf = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 });

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animateValue(el, target, { prefix = "", suffix = "", duration = 1000 } = {}) {
    const startValue = 0;
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
        }, 240);
      }
    };

    requestAnimationFrame(step);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      if (!coinOrderMap.has(order)) coinOrderMap.set(order, []);
      coinOrderMap.get(order).push({ coin, path });
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
          animateValue(el, target, { prefix, suffix, duration: 1000 });
        });

        (fillMap.get(order) || []).forEach((el) => {
          const target = parseFloat(el.getAttribute("data-fill") || "0");
          animateFill(el, target, { duration: 1100 });
        });

        (coinOrderMap.get(order) || []).forEach(({ coin, path }) => {
          animateCoinAlongPath(coin, path, { duration: 1400 });
        });
      }, delay);
    });
  });
})();
