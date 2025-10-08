// assets/js/ixh-growth.js
(() => {
  const React = window.React;
  const ReactDOM = window.ReactDOM;

  // ---------- Utils ----------
  const nf = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 });
  const cf = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 });
  const fmtN = (n) => nf.format(n);
  const fmtC = (n) => cf.format(n);

  const GEN_NAMES = ["Gen 01","Gen 02","Gen 03","Gen 04","Gen 05","Gen 06","Gen 07","Gen 08"];
  const DUR = { intro:1.2, reveal:0.9, flow:1.1 };

  const BRANCHING_FACTOR = 5;
  const GENERATION_LEVELS = 8;
  const PAYOUT_DEFAULTS = {
    directReward: 30,
    indirectReward: 10,
    company: 50,
  };

  const buildDistribution = (overrides = {}) => {
    const config = {
      branching: BRANCHING_FACTOR,
      levels: GENERATION_LEVELS,
      directReward: PAYOUT_DEFAULTS.directReward,
      indirectReward: PAYOUT_DEFAULTS.indirectReward,
      company: PAYOUT_DEFAULTS.company,
      customCounts: undefined,
      ...overrides,
    };

    if (Array.isArray(config.customCounts) && !config.levels) {
      config.levels = Math.min(config.customCounts.length, GENERATION_LEVELS);
    }

    const layoutCounts = Array.isArray(config.customCounts) && config.customCounts.length >= config.levels
      ? config.customCounts.slice(0, config.levels)
      : Array.from({ length: config.levels }, (_, idx) => config.branching ** (idx + 1));

    const incomeCounts = layoutCounts.map((_, idx) => {
      if (idx === 0) return config.branching;
      if (Array.isArray(config.customCounts) && config.customCounts.length > idx + 1) {
        return config.customCounts[idx + 1];
      }
      return config.branching ** (idx + 2);
    });

    const incomeAmounts = incomeCounts.map((count, idx) =>
      count * (idx === 0 ? config.directReward : config.indirectReward)
    );

    const incomeCumulative = [];
    incomeAmounts.reduce((acc, value) => {
      const next = acc + value;
      incomeCumulative.push(next);
      return next;
    }, 0);

    const downlineCounts = Array.from({ length: config.levels + 1 }, (_, idx) => config.branching ** (idx + 1));
    const downlineTotal = downlineCounts.reduce((sum, value) => sum + value, 0);
    const companyTotal = downlineTotal * config.company;

    return {
      incomeCounts,
      incomeAmounts,
      incomeCumulative,
      companyTotal,
      downlineTotal,
      config,
    };
  };

  const buildTimeline = (genCount) => {
    const entries = [];
    let t = DUR.intro;
    for (let i=0;i<genCount;i++){
      entries.push({ start:t, end:(t+=DUR.reveal), type:"reveal", genIndex:i });
      entries.push({ start:t, end:(t+=DUR.flow),   type:"flow",   genIndex:i });
    }
    return { entries, total:t+0.4 };
  };

  // ---------- Ticker ----------
  const useTicker = (running, speed) => {
    const [time,setTime] = React.useState(0);
    const raf = React.useRef(null);
    const last = React.useRef(null);
    React.useEffect(()=>{
      const loop = (now) => {
        if(last.current===null) last.current = now;
        const dt = (now-last.current)/1000; last.current=now;
        if(running) setTime(t=>t + dt*speed);
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      return ()=>{ if(raf.current) cancelAnimationFrame(raf.current); raf.current=null; last.current=null; };
    },[running,speed]);
    return [time,setTime];
  };

  // ---------- SVG primitives ----------
  const hexPoints = (size) => {
    const r = size/2;
    return [
      [0,-r],[0.866*r,-0.5*r],[0.866*r,0.5*r],[0,r],[-0.866*r,0.5*r],[-0.866*r,-0.5*r]
    ].map(p=>p.join(",")).join(" ");
  };

  const HexNode = ({ x,y,size, label, solid=false, active=false }) => {
    const pts = hexPoints(size);
    const baseFill  = solid ? "#f2c94c" : "rgba(212,175,55,0.18)";
    const baseStroke= solid ? "#1a1300" : "#d4af37";
    const cls = "hex" + (active ? " hex--active" : "");
    return React.createElement("g", { transform:`translate(${x} ${y})`, style:{ shapeRendering:"geometricPrecision" } },
      React.createElement("g", { className:cls },
        React.createElement("polygon", {
          points: pts,
          fill: baseFill,
          stroke: baseStroke,
          strokeWidth: 2.2,
          style: { paintOrder: "stroke", pointerEvents: "none" }
        }),
        label ? React.createElement("text", {
          x:0, y:6, textAnchor:"middle",
          style:{ fontSize:16, fontWeight:800, letterSpacing:0.2, fill:"#f2c94c" }
        }, label) : null
      )
    );
  };

  const Link = ({ x1,y1,x2,y2, lane=0, lanes=1 }) => {
    const midY = (y1+y2)/2;
    const laneOffset = (lane - (lanes-1)/2) * 14;
    const c1x = x1 + laneOffset*0.6;
    const c2x = x2;
    const d = `M ${x1} ${y1} C ${c1x} ${midY}, ${c2x} ${midY}, ${x2} ${y2}`;
    return React.createElement("path", { d, fill:"none", stroke:"rgba(212,175,55,0.70)", strokeWidth:2 });
  };

  const RowLabel = ({ x,y,text, active }) =>
    React.createElement("text", {
      x,y, textAnchor:"start",
      style:{ fontSize:14, fontWeight:600, fill: active ? "#ffd86a" : "rgba(255,255,255,0.85)" }
    }, text);

  const Badge = ({ x,y,text }) =>
    React.createElement("g", null,
      React.createElement("rect", { x:x-28, y:y-13, width:56, height:26, rx:10,
        fill:"rgba(255,255,255,0.06)", stroke:"rgba(255,255,255,0.15)" }),
      React.createElement("text", { x, y:y+5, textAnchor:"middle",
        style:{ fontSize:13, fontWeight:800, fill:"#fff" } }, text)
    );

  // ---------- Grid layout ----------
  const GridLayout = ({ width, gens, rowH, leftPad, activeGen }) => {
    const pieces = [];
    for (let gi=0; gi<gens.length; gi++){
      const y = 200 + gi*rowH;
      pieces.push(React.createElement(RowLabel, { key:`lbl-${gi}`, x:leftPad, y:y+4, text:GEN_NAMES[gi], active: gi===activeGen }));
      const count = gens[gi];
      const visible = Math.min(180, count);   // cap for perf
      const cols = Math.ceil(Math.sqrt(visible*1.4));
      const size = 26, gap = 10;
      const gridW = cols*(size+gap);
      const startX = width/2 - gridW/2;
      for (let i=0;i<visible;i++){
        const cx = i % cols, cy = Math.floor(i/cols);
        const x = startX + cx*(size+gap);
        const yy = y + cy*(size+gap);
        pieces.push(React.createElement(HexNode, {
          key:`g${gi}-${i}`, x, y:yy, size, solid:true, active: gi===activeGen
        }));
      }
    }
    return React.createElement("g", null, pieces);
  };

  // ---------- Branching layout ----------
  const BranchLayout = ({ width, rowH, leftPad, activeGen, branching }) => {
    const centerX = width / 2;
    const baseY = 140;
    const labels = [];
    const links = [];
    const nodes = [];
    const deeperHexes = [];
    const badges = [];

    GEN_NAMES.forEach((name, idx) => {
      const rowY = baseY + (idx + 1) * rowH;
      labels.push(React.createElement(RowLabel, { key: `rowlbl-${idx}`, x: leftPad, y: rowY + 4, text: name, active: idx === activeGen }));
    });

    const highlightLayer =
      activeGen < 0
        ? null
        : activeGen <= 2
          ? activeGen
          : Math.min(activeGen - 1, GEN_NAMES.length - 1);

    const SIZE = { g1: 48, g2: 40, g3: 34, g4: 28, g5: 26, g6: 24, g7: 22, g8: 20 };
    const laneCount = Math.max(branching, 1);
    const g1Spread = branching === 3 ? 520 : 800;
    const g1Denom = Math.max(branching - 1, 1);
    const g1Xs = Array.from({ length: branching }, (_, i) =>
      centerX - g1Spread / 2 + (g1Denom === 0 ? 0 : (i * g1Spread) / g1Denom)
    );
    const g1Y = baseY + rowH;
    const g1Nodes = g1Xs.map((x) => ({ x, y: g1Y, size: SIZE.g1 }));
    g1Nodes.forEach((n, i) => {
      links.push(React.createElement(Link, {
        key: `l-you-${i}`,
        x1: centerX,
        y1: baseY,
        x2: n.x,
        y2: n.y - 26,
        lane: i,
        lanes: laneCount
      }));
      nodes.push(React.createElement(HexNode, { key: `g1-${i}`, ...n, solid: true, active: highlightLayer === 0 }));
    });

    const g2Y = baseY + 2 * rowH;
    const g2Nodes = [];
    const g2Span = (g1Spread / Math.max(branching, 1)) * (branching === 3 ? 0.9 : 0.72);
    g1Nodes.forEach((parent, pi) => {
      const denom = Math.max(branching - 1, 1);
      for (let k = 0; k < branching; k++) {
        const x = parent.x - g2Span / 2 + (denom === 0 ? 0 : (k * g2Span) / denom);
        const n = { x, y: g2Y, size: SIZE.g2 };
        links.push(React.createElement(Link, {
          key: `l-g1-${pi}-${k}`,
          x1: parent.x,
          y1: parent.y + 24,
          x2: x,
          y2: g2Y - 24,
          lane: k,
          lanes: laneCount
        }));
        nodes.push(React.createElement(HexNode, { key: `g2-${pi}-${k}`, ...n, solid: true, active: highlightLayer === 1 }));
        g2Nodes.push(n);
      }
    });

    const g3Y = baseY + 3 * rowH;
    const g3Nodes = [];
    const g3Span = (g2Span / Math.max(branching, 1)) * (branching === 3 ? 0.85 : 0.66);
    g2Nodes.forEach((parent, pi) => {
      const denom = Math.max(branching - 1, 1);
      for (let k = 0; k < branching; k++) {
        const x = parent.x - g3Span / 2 + (denom === 0 ? 0 : (k * g3Span) / denom);
        const n = { x, y: g3Y, size: SIZE.g3 };
        links.push(React.createElement(Link, {
          key: `l-g2-${pi}-${k}`,
          x1: parent.x,
          y1: parent.y + 22,
          x2: x,
          y2: g3Y - 22,
          lane: k,
          lanes: laneCount
        }));
        nodes.push(React.createElement(HexNode, { key: `g3-${pi}-${k}`, ...n, solid: true, active: highlightLayer === 2 }));
        g3Nodes.push(n);
      }
    });

    const rowSizes = [SIZE.g4, SIZE.g5, SIZE.g6, SIZE.g7, SIZE.g8];
    const totals = rowSizes.map((_, idx) => branching ** (idx + 3));

    g3Nodes.forEach((parent, pi) => {
      let lastY = g3Y;
      rowSizes.forEach((size, idx) => {
        const generationIndex = idx + 4;
        const y = baseY + generationIndex * rowH;
        links.push(React.createElement("line", {
          key: `tr-${pi}-${generationIndex}`,
          x1: parent.x,
          y1: lastY + 18,
          x2: parent.x,
          y2: y - 18,
          stroke: "rgba(212,175,55,0.55)",
          strokeWidth: 2
        }));
        deeperHexes.push(React.createElement(HexNode, {
          key: `hx-${pi}-${generationIndex}`,
          x: parent.x,
          y,
          size,
          solid: true,
          active: highlightLayer === idx + 3
        }));
        lastY = y;
      });
    });

    const rows = rowSizes.map((_, idx) => idx + 4);
    g1Nodes.forEach((node) => {
      rows.forEach((genNumber, idx) => {
        const y = baseY + genNumber * rowH - 22;
        badges.push(React.createElement(Badge, { key: `bd-${node.x}-${genNumber}`, x: node.x, y, text: fmtN(totals[idx]) }));
      });
    });

    return React.createElement("g", null,
      React.createElement("g", null, labels),
      React.createElement("g", null, links),
      React.createElement("g", null, badges),
      React.createElement("g", null, nodes),
      React.createElement("g", null, deeperHexes)
    );
  };

  // ---------- Sidebar ----------
  const SidebarRow = ({ title, amount, count, cumulative, active }) =>
    React.createElement("div", {
      className: `flex items-center justify-between rounded-xl px-3 py-2 border ${active ? "border-ixhGold/70 bg-ixhGold/10" : "border-white/10 bg-white/5"}`
    },
      React.createElement("div", { className: "flex flex-col" },
        React.createElement("span", { className: "text-[15px] text-white/90" }, title),
        React.createElement("span", { className: "text-[12px] text-white/55" }, `${count.toLocaleString()} members x ${fmtC(amount / count)}`),
        React.createElement("span", { className: "text-[12px] text-white/40" }, `Cumulative: ${fmtC(cumulative)}`)
      ),
      React.createElement("span", { className: "text-[15px] font-semibold text-ixhGold" }, fmtC(amount))
    );

  const Sidebar = ({ counts, amounts, cumulative, activeGen, total, perJoinerBreakdown, running, onPlay, onPause, branching, onBranchingChange }) => {
    const growthBtnClass = (value) =>
      `rounded-xl px-3 py-1 text-sm font-semibold transition ${branching === value ? 'border border-ixhGold/60 bg-ixhGold/20 text-ixhGold' : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`;

    const handleGrowthClick = (value) => {
      if (branching === value || typeof onBranchingChange !== 'function') return;
      onBranchingChange(value);
    };

    return React.createElement("div", { className: "w-full lg:w-80 xl:w-96 shrink-0 grid gap-4" },
      React.createElement("div", { className: "rounded-2xl p-5 border border-white/15 bg-gradient-to-br from-black/60 to-neutral-900/60" },
        React.createElement("div", { className: "text-xs tracking-widest text-white/60 uppercase" }, "Per Generation"),
        React.createElement("div", { className: "mt-3 grid gap-2.5" },
          amounts.map((amt, i) => React.createElement(SidebarRow, { key: i, title: GEN_NAMES[i], amount: amt, count: counts[i], cumulative: cumulative[i], active: i === activeGen }))
        ),
        React.createElement("div", { className: "mt-3 text-[12px] text-white/55" }, `Cumulative total: ${fmtC(total)}`)
      ),
      React.createElement("div", { className: "rounded-2xl p-5 border border-white/15 bg-gradient-to-br from-black/60 to-neutral-900/60" },
        React.createElement("div", { className: "flex items-center justify-between text-xs tracking-widest text-white/60 uppercase" },
          React.createElement("span", null, "Options"),
          React.createElement("button", {
            className: "inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10",
            type: "button",
            title: "Playback speed is fixed at 1.25x"
          }, "Info")
        ),
        React.createElement("div", { className: "mt-2 text-sm text-white/70" }, running ? "Simulation running" : "Simulation paused"),
        React.createElement("div", { className: "mt-3 flex gap-2" },
          React.createElement("button", {
            className: "flex-1 rounded-xl border border-ixhGold/60 bg-ixhGold/15 px-3 py-2 text-sm font-semibold text-ixhGold transition hover:bg-ixhGold/25",
            onClick: onPlay
          }, running ? "Restart" : "Play"),
          React.createElement("button", {
            className: `flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 ${running ? '' : 'opacity-60 cursor-not-allowed'}`,
            onClick: running ? onPause : undefined,
            disabled: !running
          }, "Pause")
        ),
        React.createElement("div", { className: "mt-4 inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-white/15 bg-white/5" },
          React.createElement("span", { className: "text-xs font-semibold uppercase tracking-wide text-white/70" }, "Growth"),
          React.createElement("button", { className: growthBtnClass(5), onClick: () => handleGrowthClick(5), disabled: branching === 5 }, "5"),
          React.createElement("button", { className: growthBtnClass(3), onClick: () => handleGrowthClick(3), disabled: branching === 3 }, "3")
        ),
        React.createElement("div", { className: "mt-2 text-[11px] text-white/55" }, `Children per parent: ${branching}`)
      ),
      React.createElement("div", { className: "rounded-2xl p-5 border border-ixhGold/40 bg-gradient-to-br from-ixhDarkYellow/20 to-ixhGold/10" },
        React.createElement("div", { className: "text-xs tracking-widest text-ixhGold uppercase" }, "Per Joiner Payments"),
        React.createElement("ul", { className: "mt-3 grid gap-1 text-[12px] text-white/80" },
          React.createElement("li", null, `Direct child (Gen 01): ${fmtC(perJoinerBreakdown.direct)} to you`),
          React.createElement("li", null, `Gen 02 - Gen 08 joiner: ${fmtC(perJoinerBreakdown.indirect)} to you`)
        )
      )
    );
  };

  const YouBadge = ({ total }) =>
    React.createElement("div", { className:"absolute right-6 top-4 md:top-6" },
      React.createElement("div", { className:"mx-auto w-[260px] text-center rounded-2xl border border-ixhGold/40 bg-ixhGold/10 px-5 py-3 backdrop-blur" },
        React.createElement("div", { className:"text-[11px] tracking-widest text-ixhGold uppercase" }, "YOU - Total"),
        React.createElement("div", { className:"text-3xl font-extrabold text-white" }, fmtC(total))
      )
    );

  const App = ({ perJoinerAmount, gens, structure, title }) => {
    const baseOverrides = React.useMemo(() => {
      if (structure && typeof structure === "object") return structure;
      if (Array.isArray(gens) && gens.length) {
        return { customCounts: gens, levels: gens.length };
      }
      return {};
    }, [structure, gens]);

    const levelCount = React.useMemo(() => {
      if (typeof baseOverrides.levels === "number") {
        return Math.min(baseOverrides.levels, GENERATION_LEVELS);
      }
      if (Array.isArray(baseOverrides.customCounts) && baseOverrides.customCounts.length) {
        return Math.min(baseOverrides.customCounts.length, GENERATION_LEVELS);
      }
      if (Array.isArray(gens) && gens.length) {
        return Math.min(gens.length, GENERATION_LEVELS);
      }
      return GENERATION_LEVELS;
    }, [baseOverrides, gens]);

    const baseBranching = React.useMemo(() => {
      if (typeof baseOverrides.branching === "number" && baseOverrides.branching > 0) {
        return baseOverrides.branching;
      }
      if (Array.isArray(baseOverrides.customCounts) && baseOverrides.customCounts.length) {
        return baseOverrides.customCounts[0];
      }
      if (Array.isArray(gens) && gens.length) {
        return gens[0];
      }
      return BRANCHING_FACTOR;
    }, [baseOverrides, gens]);

    const [childrenPerParent, setChildrenPerParent] = React.useState(baseBranching);

    React.useEffect(() => {
      setChildrenPerParent(baseBranching);
    }, [baseBranching]);

    const distributionOverrides = React.useMemo(() => {
      const counts = Array.from({ length: levelCount }, (_, idx) => childrenPerParent ** (idx + 1));
      return {
        ...baseOverrides,
        branching: childrenPerParent,
        levels: levelCount,
        customCounts: counts,
      };
    }, [baseOverrides, childrenPerParent, levelCount]);

    const {
      incomeCounts,
      incomeAmounts,
      incomeCumulative,
      config,
    } = React.useMemo(
      () => buildDistribution(distributionOverrides),
      [distributionOverrides]
    );

    const total = React.useMemo(
      () => incomeCumulative[incomeCumulative.length - 1] || 0,
      [incomeCumulative]
    );

    const countsForYou = incomeCounts;
    const amounts = incomeAmounts;

    const perJoinerBreakdown = React.useMemo(
      () => ({
        direct: config.directReward,
        indirect: config.indirectReward,
        company: config.company,
      }),
      [config]
    );

    const { entries, total: timelineTotal } = React.useMemo(
      () => buildTimeline(config.levels),
      [config.levels]
    );

    const [speed, setSpeed] = React.useState(1.25);
    const [running, setRunning] = React.useState(false);
    const [time, setTime] = useTicker(running, speed);

    const handlePlay = React.useCallback(() => {
      setTime(0);
      setSpeed(1.25);
      setRunning(true);
    }, [setTime]);

    const handlePause = React.useCallback(() => {
      setRunning(false);
    }, []);

    const handleBranchingChange = React.useCallback((value) => {
      setChildrenPerParent(value);
      setRunning(false);
      setTime(0);
    }, [setTime]);

    const activeGen = React.useMemo(() => {
      for (let i = config.levels - 1; i >= 0; i--) {
        const flow = entries.find((e) => e.genIndex === i && e.type === "flow");
        const reveal = entries.find((e) => e.genIndex === i && e.type === "reveal");
        if (flow && time >= flow.start && time < flow.end) return i;
        if (reveal && time >= reveal.start && time < reveal.end) return i;
      }
      return -1;
    }, [time, entries, config.levels]);

    const youRunningTotal = React.useMemo(
      () => (activeGen < 0 ? 0 : incomeCumulative[activeGen]),
      [activeGen, incomeCumulative]
    );

    React.useEffect(() => {
      if (time >= timelineTotal) {
        setRunning(false);
      }
    }, [time, timelineTotal]);

    const width = 1400, rowH = 120, leftPad = 70, svgHeight = 1100;

    return React.createElement("div", { className: "w-full min-h-[940px] rounded-3xl p-5 md:p-6 lg:p-8 relative overflow-hidden" },
      React.createElement("div", { className: "flex items-start gap-6" },
        React.createElement("div", { className: "relative flex-1 rounded-3xl border border-white/10 bg-gradient-to-b from-black/60 to-neutral-900/20 overflow-hidden" },
          React.createElement("div", { className: "flex items-center px-5 md:px-6 py-3 border-b border-white/10 bg-black/40" },
            React.createElement("div", { className: "text-base md:text-lg font-semibold tracking-wide text-ixhGold" }, title || "IgniteX Hive - Growth & Income Flow")
          ),
          React.createElement(YouBadge, { total: youRunningTotal }),
          React.createElement("div", { className: "relative" },
            React.createElement("svg", { viewBox: `0 0 ${width} ${svgHeight}`, className: "w-full h-[780px]" },
              React.createElement("defs", null,
                React.createElement("radialGradient", { id: "bgGlow", cx: "50%", cy: "0%", r: "80%" },
                  React.createElement("stop", { offset: "0%",  stopColor: "#d4af37", stopOpacity: "0.28" }),
                  React.createElement("stop", { offset: "60%", stopColor: "#b08900", stopOpacity: "0.08" }),
                  React.createElement("stop", { offset: "100%", stopColor: "#b08900", stopOpacity: "0" })
                ),
                React.createElement("style", { type: "text/css" }, `
                  .hex { filter:url(#hexGlowSoft); transition:transform .25s ease, filter .25s ease; transform-box: fill-box; transform-origin: center; }
                  .hex.hex--active { animation: hexPulse .9s ease-in-out infinite alternate; filter:url(#hexGlowStrong); }
                  @keyframes hexPulse { from { transform:scale(1); } to { transform:scale(1.06); } }
                `),
                React.createElement("filter", { id: "hexGlowSoft", x: "-50%", y: "-50%", width: "200%", height: "200%" },
                  React.createElement("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "2.2", result: "g" }),
                  React.createElement("feMerge", null,
                    React.createElement("feMergeNode", { in: "g" }),
                    React.createElement("feMergeNode", { in: "SourceGraphic" })
                  )
                ),
                React.createElement("filter", { id: "hexGlowStrong", x: "-60%", y: "-60%", width: "220%", height: "220%" },
                  React.createElement("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "3.6", result: "g2" }),
                  React.createElement("feMerge", null,
                    React.createElement("feMergeNode", { in: "g2" }),
                    React.createElement("feMergeNode", { in: "SourceGraphic" })
                  )
                )
              ),
              React.createElement("rect", { x: 0, y: 0, width: width, height: svgHeight, fill: "url(#bgGlow)" }),
              React.createElement(HexNode, { x: width / 2, y: 140, size: 48, label: "YOU", solid: false, active: false }),
              React.createElement(BranchLayout, { width, rowH, leftPad, activeGen, branching: childrenPerParent })
            )
          ),
          React.createElement("div", { className: "px-5 md:px-6 py-3 border-t border-white/10 bg-black/40 text-[14px] text-white/80" },
            `You receive ${fmtC(perJoinerBreakdown.direct)} from each Gen 01 child and ${fmtC(perJoinerBreakdown.indirect)} from every Gen 02 - Gen 08 joiner. Totals above accumulate these earnings as the network scales from Gen 01 -> Gen 08.`
          )
        ),
        React.createElement(Sidebar, { counts: countsForYou, amounts, cumulative: incomeCumulative, activeGen, total, perJoinerBreakdown, running, onPlay: handlePlay, onPause: handlePause, branching: childrenPerParent, onBranchingChange: handleBranchingChange })
      )
    );
  };

  // ---------- Mount ----------
  function mount({ containerId, perJoinerAmount, gens, title, controlIds, structure }) {
    window.__IXH_CTRL_IDS = controlIds || {};
    const el = document.getElementById(containerId);
    ReactDOM.createRoot(el).render(React.createElement(App, { perJoinerAmount, gens, structure, title }));
  }
  window.IXH_GROWTH_MOUNT = mount;
})();

