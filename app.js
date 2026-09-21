/* ============================================================
   AmplifyLab — Virtual PCR & Gel Electrophoresis Studio
   Vanilla JS. Sections:
     1. Utilities (PRNG, sequence math)
     2. Sample template generator
     3. Hero canvas animation
     4. Mobile nav
     5. PCR Studio (validation, primers, efficiency, curve)
     6. Gel Studio (physics, animation, analysis)
     7. Init
   ============================================================ */
"use strict";

/* ================= 1. UTILITIES ================= */
const $ = (id) => document.getElementById(id);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function revcomp(seq) {
  const comp = { A: "T", T: "A", G: "C", C: "G" };
  return seq.split("").reverse().map((b) => comp[b] || b).join("");
}

function cleanDNA(s) {
  return s.toUpperCase().replace(/[^ATCG]/g, "");
}

function gcPercent(s) {
  if (!s.length) return 0;
  const gc = (s.match(/[GC]/g) || []).length;
  return (gc / s.length) * 100;
}

/* Wallace rule: Tm = 2*(A+T) + 4*(G+C) */
function wallaceTm(s) {
  const a = (s.match(/A/g) || []).length;
  const t = (s.match(/T/g) || []).length;
  const g = (s.match(/G/g) || []).length;
  const c = (s.match(/C/g) || []).length;
  return 2 * (a + t) + 4 * (g + c);
}

function fmtInt(n) {
  return Math.round(n).toLocaleString("en-US");
}

/* Fit a canvas to its CSS size with devicePixelRatio scaling. Returns ctx. */
function fitCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(50, cv.clientWidth);
  const h = Math.max(50, cv.clientHeight);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ================= 2. SAMPLE TEMPLATE ================= */
/* Deterministic ~1200 bp synthetic construct with known primer sites. */
const SAMPLE_F = "ATGCGTACGTTAGCCGTA"; // 18-mer, Tm 54 °C, embedded at pos 200
const SAMPLE_R = "GCTAACGTACGCATAGCC"; // 18-mer, Tm 56 °C, binds via its rev-comp at pos 950
const SAMPLE_F_POS = 200;
const SAMPLE_R_POS = 950; // position of revcomp(SAMPLE_R) on the template
const TEMPLATE_LEN = 1200;

function generateTemplate(seed, embedPrimers) {
  const rnd = mulberry32(seed);
  const bases = "ATCG";
  const arr = new Array(TEMPLATE_LEN);
  for (let i = 0; i < TEMPLATE_LEN; i++) arr[i] = bases[(rnd() * 4) | 0];
  if (embedPrimers) {
    for (let i = 0; i < SAMPLE_F.length; i++) arr[SAMPLE_F_POS + i] = SAMPLE_F[i];
    const rcR = revcomp(SAMPLE_R);
    for (let i = 0; i < rcR.length; i++) arr[SAMPLE_R_POS + i] = rcR[i];
  }
  return arr.join("");
}

/* ================= 3. HERO CANVAS ================= */
function initHero() {
  const cv = $("heroCanvas");
  if (!cv) return;
  let W = 0, H = 0, parts = [], running = true, t0 = performance.now();

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedParticles() {
    parts = [];
    const n = Math.min(90, Math.floor(W / 14));
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vy: -(0.12 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.15,
        hue: Math.random() < 0.5 ? "34,211,238" : "232,121,249",
        ph: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    /* drifting particles */
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${a.toFixed(3)})`;
      ctx.fill();
    }

    /* faint double-helix ribbon behind the headline */
    const midY = H * 0.42, amp = Math.min(70, H * 0.09);
    ctx.lineWidth = 1.6;
    for (const [col, phase] of [["34,211,238", 0], ["232,121,249", Math.PI]]) {
      ctx.strokeStyle = `rgba(${col},0.35)`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const y = midY + Math.sin(x * 0.018 + t * 0.7 + phase) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(148,163,184,0.14)";
    ctx.lineWidth = 1;
    for (let x = 28; x < W; x += 56) {
      const y1 = midY + Math.sin(x * 0.018 + t * 0.7) * amp;
      const y2 = midY + Math.sin(x * 0.018 + t * 0.7 + Math.PI) * amp;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
    }
    requestAnimationFrame(draw);
  }

  resize(); seedParticles();
  window.addEventListener("resize", () => { resize(); seedParticles(); });
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { t0 = performance.now(); requestAnimationFrame(draw); }
  });
  requestAnimationFrame(draw);
}

/* ================= 4. MOBILE NAV ================= */
function initNav() {
  const toggle = $("navToggle"), links = $("navLinks");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

/* ============================================================
   5. PCR STUDIO
   ============================================================ */
const pcr = {
  template: "",          // cleaned template
  fwd: null,             // {seq,len,gc,tm,bind}
  rev: null,
  efficiency: null,
  amplicon: null,        // bp
  lastRun: null,         // {efficiency, cycles, copies, ng, bp}
  animating: false,
};

function getTemplateInput() {
  const el = $("templateSeq");
  const raw = el.value;
  const invalid = /[^ATCGatcg\s]/.test(raw);
  const cleaned = cleanDNA(raw);
  return { raw, cleaned, invalid };
}

function updateTemplateUI() {
  const { raw, cleaned, invalid } = getTemplateInput();
  const ta = $("templateSeq"), count = $("templateCount"), err = $("templateError");
  pcr.template = invalid ? "" : cleaned;
  count.textContent = `${fmtInt(cleaned.length)} bp`;
  if (invalid) {
    ta.classList.add("invalid");
    err.hidden = false;
    err.textContent = "Invalid characters — only A, T, C, G (and whitespace) allowed.";
  } else {
    ta.classList.remove("invalid");
    err.hidden = true;
    err.textContent = "";
  }
  void raw;
  analyzePrimers();
}

function analyzeOnePrimer(seqRaw, template, isReverse) {
  const seq = cleanDNA(seqRaw);
  if (!seq) return null;
  const invalid = /[^ATCGatcg\s]/.test(seqRaw);
  const bindTarget = isReverse ? revcomp(seq) : seq;
  const bind = template ? template.indexOf(bindTarget) : -1;
  return {
    seq, len: seq.length,
    gc: gcPercent(seq), tm: wallaceTm(seq),
    bind, invalid,
  };
}

function primerCardHTML(p, label) {
  if (!p) return `<span class="muted">Enter a ${label} primer to analyze…</span>`;
  const bindHTML = p.bind >= 0
    ? `<span class="bind-ok">✓ binds @ ${p.bind + 1}</span>`
    : `<span class="bind-bad">✗ no binding site</span>`;
  return `
    <div class="pc"><span>Length</span>${p.len} nt</div>
    <div class="pc"><span>GC%</span>${p.gc.toFixed(1)}%</div>
    <div class="pc"><span>Tm (Wallace)</span>${p.tm} °C</div>
    <div class="pc"><span>${p.invalid ? "⚠ invalid chars stripped" : "Binding"}</span>${bindHTML}</div>`;
}

/* 3'-end complementarity → primer-dimer risk (last 4 bases) */
function dimerRisk(f, r) {
  if (!f || !r || f.len < 4 || r.len < 4) return false;
  const f3 = f.seq.slice(-4), r3 = r.seq.slice(-4);
  return revcomp(f3) === r3 || revcomp(r3) === f3;
}

/* simple hairpin note: any 4-mer whose reverse complement also occurs */
function hairpinNote(seq) {
  for (let i = 0; i <= seq.length - 4; i++) {
    const k = seq.substr(i, 4);
    const rc = revcomp(k);
    const j = seq.indexOf(rc);
    if (j !== -1 && j !== i) return true;
  }
  return false;
}

function analyzePrimers() {
  const fRaw = $("fwdPrimer").value, rRaw = $("revPrimer").value;
  pcr.fwd = analyzeOnePrimer(fRaw, pcr.template, false);
  pcr.rev = analyzeOnePrimer(rRaw, pcr.template, true);
  $("fwdAnalysis").innerHTML = primerCardHTML(pcr.fwd, "forward");
  $("revAnalysis").innerHTML = primerCardHTML(pcr.rev, "reverse");

  /* warnings */
  const w = [];
  if (dimerRisk(pcr.fwd, pcr.rev)) {
    w.push(`<div class="warn bad">⚠️ <strong>Primer-dimer risk:</strong> the 3′ ends of your primers are complementary — they may amplify each other instead of the template.</div>`);
  }
  if (pcr.fwd && hairpinNote(pcr.fwd.seq)) {
    w.push(`<div class="warn">ℹ️ Forward primer contains an inverted repeat — possible hairpin/secondary structure.</div>`);
  }
  if (pcr.rev && hairpinNote(pcr.rev.seq)) {
    w.push(`<div class="warn">ℹ️ Reverse primer contains an inverted repeat — possible hairpin/secondary structure.</div>`);
  }
  $("primerWarnings").innerHTML = w.join("");

  updateEfficiency();
}

function updateEfficiency() {
  const Ta = parseFloat($("taSlider").value);
  $("taValue").textContent = `${Ta} °C`;
  const cycles = parseInt($("cycleSlider").value, 10);
  $("cycleValue").textContent = cycles;

  const effEl = $("effValue"), verdEl = $("effVerdict"), ampEl = $("ampliconValue");
  pcr.efficiency = null; pcr.amplicon = null;

  /* amplicon geometry */
  if (pcr.fwd && pcr.rev && pcr.fwd.bind >= 0 && pcr.rev.bind >= 0) {
    const start = pcr.fwd.bind;
    const end = pcr.rev.bind + pcr.rev.len;
    if (end > start) {
      pcr.amplicon = end - start;
      ampEl.textContent = `${fmtInt(pcr.amplicon)} bp`;
    } else {
      ampEl.textContent = "—";
      verdEl.textContent = "Primers bind in the wrong orientation — no product possible. Swap their order on the template.";
      verdEl.className = "badv";
      effEl.textContent = "–";
      return;
    }
  } else {
    ampEl.textContent = "—";
  }

  if (!pcr.template || !pcr.fwd || !pcr.rev || pcr.fwd.bind < 0 || pcr.rev.bind < 0) {
    effEl.textContent = "–";
    verdEl.textContent = "Enter a valid template and two binding primers to compute efficiency.";
    verdEl.className = "";
    return;
  }

  let e = 1.95;
  const notes = [];
  const avgTm = (pcr.fwd.tm + pcr.rev.tm) / 2;
  if (Ta > avgTm + 5) { e -= 0.25; notes.push("annealing temp too high — poor primer binding"); }
  else if (Ta < avgTm - 12) { e -= 0.10; notes.push("annealing temp very low — risk of non-specific products"); }
  const tGC = gcPercent(pcr.template);
  if (tGC < 40 || tGC > 60) { e -= 0.05; notes.push(`template GC ${tGC.toFixed(0)}% outside 40–60%`); }
  if (dimerRisk(pcr.fwd, pcr.rev)) { e -= 0.15; notes.push("primer-dimer competition"); }
  e = Math.max(1.0, Math.min(2.0, e));
  pcr.efficiency = e;

  effEl.textContent = `${e.toFixed(2)}×`;
  let verdict, cls;
  if (e >= 1.9) { verdict = "Optimal — expect strong, specific amplification."; cls = "ok"; }
  else if (e >= 1.7) { verdict = "Good — amplification should be robust."; cls = "ok"; }
  else if (e >= 1.4) { verdict = "Suboptimal — " + notes.join("; ") + "."; cls = "warnv"; }
  else { verdict = "Poor — " + notes.join("; ") + ". Adjust conditions before running."; cls = "badv"; }
  verdEl.textContent = (notes.length && e >= 1.7 ? `Note: ${notes.join("; ")} — ` : "") + verdict;
  verdEl.className = cls;
}

/* ---------- PCR run + amplification curve ---------- */
const PCR_N0 = 1e4;      // starting template copies
const PCR_PLATEAU = 2e12; // reagent-limited max copies
const AVOGADRO = 6.022e23;

function pcrReady() {
  return pcr.template && pcr.fwd && pcr.rev &&
    pcr.fwd.bind >= 0 && pcr.rev.bind >= 0 &&
    pcr.amplicon && pcr.efficiency && !pcr.animating;
}

function runPCR() {
  if (!pcrReady()) {
    const v = $("effVerdict");
    v.textContent = "Can't run: fix the template/primer issues above first.";
    v.className = "badv";
    return;
  }
  const cycles = parseInt($("cycleSlider").value, 10);
  const E = pcr.efficiency, bp = pcr.amplicon;
  pcr.animating = true;
  $("btnRunPcr").disabled = true;
  $("pcrResultsCard").hidden = false;

  const t0 = performance.now(), DUR = 3200;
  function frame(now) {
    const p = Math.min(1, (now - t0) / DUR);
    const curCycle = p * cycles;
    drawPcrCurve(curCycle, cycles, E);
    if (p < 1) { requestAnimationFrame(frame); return; }
    /* finished — final numbers */
    const copies = Math.min(PCR_N0 * Math.pow(E, cycles), PCR_PLATEAU);
    const grams = (copies * bp * 660) / AVOGADRO;
    const ng = grams * 1e9;
    pcr.lastRun = { efficiency: E, cycles, copies, ng, bp };
    $("yieldCopies").textContent = copies >= 1e12 ? copies.toExponential(2) + " copies" : fmtInt(copies) + " copies";
    $("yieldNg").textContent = ng >= 1000 ? (ng / 1000).toFixed(2) + " µg" : ng.toFixed(1) + " ng";
    $("yieldBp").textContent = `${fmtInt(bp)} bp`;
    pcr.animating = false;
    $("btnRunPcr").disabled = false;
    $("btnSendGel").disabled = false;
    $("pcrResultsCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  requestAnimationFrame(frame);
}

function drawPcrCurve(curCycle, cycles, E) {
  const cv = $("pcrCanvas");
  const { ctx, w, h } = fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);

  const L = 58, R = 18, T = 34, B = 40;
  const logMin = 3, logMax = 13;
  const X = (c) => L + (c / cycles) * (w - L - R);
  const Y = (v) => T + (1 - (v - logMin) / (logMax - logMin)) * (h - T - B);

  /* phase bands */
  const cPlat = Math.log(PCR_PLATEAU / PCR_N0) / Math.log(E);
  const b1 = Math.min(8, cycles), b2 = Math.min(0.72 * cPlat, cycles), b3 = Math.min(cPlat, cycles);
  const phases = [
    [0, b1, "rgba(148,163,184,0.10)", "baseline"],
    [b1, b2, "rgba(34,211,238,0.10)", "exponential"],
    [b2, b3, "rgba(250,204,21,0.10)", "linear"],
    [b3, cycles, "rgba(232,121,249,0.12)", "plateau"],
  ];
  ctx.font = "600 10px Inter, sans-serif";
  for (const [a, b, col, label] of phases) {
    if (b <= a) continue;
    ctx.fillStyle = col;
    ctx.fillRect(X(a), T, X(b) - X(a), h - T - B);
    if (X(b) - X(a) > 46) {
      ctx.fillStyle = "rgba(238,242,255,0.55)";
      ctx.fillText(label, X(a) + 6, T - 8);
    }
  }

  /* grid + axes */
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.fillStyle = "rgba(139,148,179,0.9)";
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', monospace";
  for (let lg = logMin; lg <= logMax; lg++) {
    ctx.beginPath(); ctx.moveTo(L, Y(lg)); ctx.lineTo(w - R, Y(lg)); ctx.stroke();
    ctx.fillText("1e" + lg, 8, Y(lg) + 3);
  }
  for (let c = 0; c <= cycles; c += 5) {
    ctx.fillText(String(c), X(c) - 4, h - B + 16);
  }
  ctx.fillText("cycle", w - R - 34, h - 8);
  ctx.save();
  ctx.translate(12, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText("copies (log₁₀)", -34, 0);
  ctx.restore();

  /* curve */
  const grad = ctx.createLinearGradient(L, 0, w - R, 0);
  grad.addColorStop(0, "#22d3ee"); grad.addColorStop(1, "#e879f9");
  ctx.strokeStyle = grad; ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(34,211,238,0.6)"; ctx.shadowBlur = 10;
  ctx.beginPath();
  const steps = Math.max(2, Math.floor(curCycle * 8));
  for (let i = 0; i <= steps; i++) {
    const c = (i / steps) * curCycle;
    const copies = Math.min(PCR_N0 * Math.pow(E, c), PCR_PLATEAU);
    const x = X(c), y = Y(Math.log10(copies));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function initPCR() {
  $("templateSeq").addEventListener("input", updateTemplateUI);
  $("fwdPrimer").addEventListener("input", analyzePrimers);
  $("revPrimer").addEventListener("input", analyzePrimers);
  $("taSlider").addEventListener("input", updateEfficiency);
  $("cycleSlider").addEventListener("input", updateEfficiency);

  $("btnSample").addEventListener("click", () => {
    $("templateSeq").value = generateTemplate(20260921, true);
    $("fwdPrimer").value = SAMPLE_F;
    $("revPrimer").value = SAMPLE_R;
    updateTemplateUI();
  });
  $("btnRandom").addEventListener("click", () => {
    $("templateSeq").value = generateTemplate((Date.now() % 100000) | 0, false);
    updateTemplateUI();
  });
  $("btnClearTemplate").addEventListener("click", () => {
    $("templateSeq").value = "";
    updateTemplateUI();
  });

  $("btnRunPcr").addEventListener("click", runPCR);
  $("btnSendGel").addEventListener("click", () => {
    if (!pcr.lastRun) return;
    $("gelSample").value = String(pcr.lastRun.bp);
    gel.parseInputs();
    gel.draw();
    $("gel").scrollIntoView({ behavior: "smooth" });
  });

  window.addEventListener("resize", () => {
    if (!$("pcrResultsCard").hidden && pcr.lastRun) {
      drawPcrCurve(pcr.lastRun.cycles, pcr.lastRun.cycles, pcr.lastRun.efficiency);
    }
  });
}

/* ============================================================
   6. GEL STUDIO
   d = (A − B·log₁₀bp) · f(agarose) · g(voltage) · t
   ============================================================ */
const GEL_A = 1.97, GEL_B = 0.51;   // 100 bp → ~0.95, 1500 bp → ~0.35 at reference
const LADDER = [];
for (let bp = 100; bp <= 1500; bp += 100) {
  LADDER.push({ bp, bright: bp === 500 || bp === 1000 });
}
const GEL_RUN_MS = 24000;

const gel = {
  p: 0, running: false, speed: 1, lastTs: 0, raf: 0,
  lane2: [], lane3: [],
  laneNames: ["100 bp ladder", "PCR product", "Sample B"],
};

function gelFactors() {
  const ag = parseFloat($("agaroseSlider").value);
  const v = parseFloat($("voltageSlider").value);
  return {
    ag, v,
    fAg: Math.pow(1 / ag, 0.75),   // denser gel → slower
    gV: v / 100,                    // voltage relative to 100 V
    bEff: GEL_B * (0.9 + 0.1 * ag), // denser gel → better small-fragment spread
  };
}

/* migration fraction of max distance for a band at reference progress=1 */
function bandFrac(bp, laneIdx) {
  const { fAg, gV, bEff } = gelFactors();
  const m = GEL_A - bEff * Math.log10(bp);
  const smile = (laneIdx === 0 || laneIdx === 2) ? 1.015 : 1.0; // subtle edge smile
  return Math.min(0.97, Math.max(0.04, m * fAg * gV * smile));
}

function parseBandList(str) {
  const out = [];
  for (const tok of str.split(",")) {
    const s = tok.trim();
    if (!s) continue;
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 50 || n > 5000) return { error: `“${s}” is not a valid band size (50–5000 bp).` };
    out.push(n);
  }
  return { bands: out };
}

gel.parseInputs = function () {
  const err = $("gelInputError");
  const r2 = parseBandList($("gelSample").value);
  const r3 = parseBandList($("gelSample2").value);
  if (r2.error || r3.error) {
    err.hidden = false;
    err.textContent = r2.error || r3.error;
    return false;
  }
  err.hidden = true; err.textContent = "";
  gel.lane2 = r2.bands; gel.lane3 = r3.bands;
  return true;
};

gel.draw = function () {
  const cv = $("gelCanvas");
  const { ctx, w, h } = fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);

  /* gel slab */
  const gx = 8, gy = 8, gw = w - 16, gh = h - 16;
  const slab = ctx.createLinearGradient(0, gy, 0, gy + gh);
  slab.addColorStop(0, "#0c2150"); slab.addColorStop(1, "#081538");
  ctx.fillStyle = slab;
  ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 14); ctx.fill();
  ctx.strokeStyle = "rgba(34,211,238,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();

  const rulerW = 62, rightPad = 20;
  const wellY = gy + 66;
  const maxDist = gy + gh - 26 - wellY;
  const laneAreaW = gw - rulerW - rightPad;
  const laneW = Math.min(110, laneAreaW / 3 - 18);
  const laneCX = [0, 1, 2].map((i) => gx + rulerW + laneAreaW * ((i + 0.5) / 3));

  const { v } = gelFactors();

  /* bp ruler (ladder positions under current conditions) */
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  for (let bp = 100; bp <= 1500; bp += 100) {
    const y = wellY + bandFrac(bp, 0) * maxDist * gel.p;
    ctx.strokeStyle = "rgba(139,148,179,0.35)";
    ctx.beginPath(); ctx.moveTo(gx + rulerW - (bp % 200 === 0 ? 14 : 8), y); ctx.lineTo(gx + rulerW - 2, y); ctx.stroke();
    if (bp % 300 === 0 || bp === 100) {
      ctx.fillStyle = "rgba(139,148,179,0.85)";
      ctx.fillText(bp >= 1000 ? (bp / 1000) + "k" : String(bp), gx + rulerW - 18, y + 3);
    }
  }
  ctx.textAlign = "left";

  /* wells + labels */
  ctx.font = "600 11px Inter, sans-serif";
  const lanes = [
    { name: "Ladder", bands: LADDER.map((b) => ({ bp: b.bp, bright: b.bright, ladder: true })) },
    { name: "PCR product", bands: gel.lane2.map((bp) => ({ bp, ladder: false })) },
    { name: "Sample B", bands: gel.lane3.map((bp) => ({ bp, ladder: false })) },
  ];
  lanes.forEach((lane, li) => {
    const cx = laneCX[li];
    ctx.fillStyle = "#020610";
    ctx.beginPath(); ctx.roundRect(cx - 26, wellY - 26, 52, 16, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(238,242,255,0.75)";
    ctx.textAlign = "center";
    ctx.fillText(lane.name, cx, wellY - 34);
    ctx.textAlign = "left";

    if (!lane.bands.length && li > 0) {
      ctx.fillStyle = "rgba(139,148,179,0.5)";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(gel.p > 0 ? "no bands" : "—", cx, wellY + 40);
      ctx.textAlign = "left";
      return;
    }

    /* bands — EtBr glow */
    const broaden = 1 + Math.abs(v - 100) / 120; // high/low voltage broadens
    for (const b of lane.bands) {
      const y = wellY + bandFrac(b.bp, li) * maxDist * gel.p;
      const bw = laneW * 0.72;
      const bh = (b.bright ? 9 : 6.5) * broaden;
      const col = b.bright ? "214,255,110" : b.ladder ? "74,222,128" : "94,234,212";
      ctx.save();
      ctx.shadowColor = `rgba(${col},0.9)`;
      ctx.shadowBlur = b.bright ? 16 : 11;
      ctx.fillStyle = `rgba(${col},${b.bright ? 0.95 : 0.85})`;
      ctx.beginPath(); ctx.roundRect(cx - bw / 2, y - bh / 2, bw, bh, bh / 2); ctx.fill();
      ctx.restore();
    }
  });

  /* dye front */
  const dyeY = wellY + maxDist * gel.p;
  if (gel.p > 0 && gel.p < 1) {
    ctx.strokeStyle = "rgba(34,211,238,0.8)";
    ctx.setLineDash([7, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx + rulerW - 6, dyeY); ctx.lineTo(gx + gw - 14, dyeY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(34,211,238,0.9)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("dye front", gx + gw - 72, dyeY - 6);
  }

  /* electrodes */
  ctx.fillStyle = "rgba(248,113,113,0.75)";
  ctx.font = "600 11px Inter, sans-serif";
  ctx.fillText("− cathode (wells)", gx + 14, gy + 22);
  ctx.fillStyle = "rgba(74,222,128,0.75)";
  ctx.fillText("+ anode", gx + 14, gy + gh - 10);

  if (gel.p === 0 && !gel.running) {
    ctx.fillStyle = "rgba(238,242,255,0.55)";
    ctx.font = "600 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press “Run” to start electrophoresis", gx + gw / 2, wellY + maxDist * 0.55);
    ctx.textAlign = "left";
  }
};

gel.setButtons = function () {
  $("btnGelRun").disabled = gel.running;
  $("btnGelPause").disabled = !gel.running;
};

gel.tick = function (now) {
  if (!gel.running) return;
  const dt = now - gel.lastTs;
  gel.lastTs = now;
  gel.p = Math.min(1, gel.p + (dt * gel.speed) / GEL_RUN_MS);
  const pct = Math.round(gel.p * 100);
  $("gelProgress").textContent = pct + " %";
  $("gelProgressBar").style.width = pct + "%";
  gel.draw();
  if (gel.p >= 1) {
    gel.running = false;
    gel.setButtons();
    gel.analyze();
  } else {
    gel.raf = requestAnimationFrame(gel.tick);
  }
};

/* size sample bands by interpolating against the ladder migration curve */
gel.analyze = function () {
  const cv = $("gelCanvas");
  const { h } = fitCanvas(cv);
  const gy = 8, gh = h - 16;
  const wellY = gy + 66;
  const maxDist = gy + gh - 26 - wellY;

  /* least-squares fit: log10(bp) vs final distance (px) */
  const xs = [], ys = [];
  for (const b of LADDER) {
    xs.push(Math.log10(b.bp));
    ys.push(wellY + bandFrac(b.bp, 0) * maxDist);
  }
  const n = xs.length;
  const mx = xs.reduce((a, c) => a + c, 0) / n;
  const my = ys.reduce((a, c) => a + c, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = num / den, intercept = my - slope * mx;

  const rows = [];
  const lanes = [
    ["Lane 2", gel.lane2, 1],
    ["Lane 3", gel.lane3, 2],
  ];
  for (const [lname, bands, li] of lanes) {
    for (const bp of bands) {
      const d = wellY + bandFrac(bp, li) * maxDist;
      const obs = Math.round(Math.pow(10, (d - intercept) / slope));
      const errPct = (Math.abs(obs - bp) / bp) * 100;
      const cls = errPct < 10 ? "ok" : errPct < 25 ? "meh" : "";
      rows.push(`<tr><td>${lname}</td><td class="mono">${fmtInt(bp)}</td><td class="mono">${fmtInt(obs)}</td><td><span class="${cls}">${errPct.toFixed(1)}%</span></td></tr>`);
    }
  }
  const tb = $("gelTable").querySelector("tbody");
  tb.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="4" class="muted">No sample bands loaded.</td></tr>`;
  $("gelNote").textContent = gel.p >= 1
    ? "Sizes estimated from the ladder's log-linear migration curve at the final dye-front position."
    : "Mid-run estimate — run to completion for the most accurate sizing.";
  $("gelResultsCard").hidden = false;
};

function initGel() {
  $("agaroseSlider").addEventListener("input", () => {
    $("agaroseValue").textContent = `${parseFloat($("agaroseSlider").value).toFixed(1)} %`;
    gel.draw();
  });
  $("voltageSlider").addEventListener("input", () => {
    $("voltageValue").textContent = `${$("voltageSlider").value} V`;
    gel.draw();
  });
  $("gelSample").addEventListener("input", () => { if (gel.parseInputs()) gel.draw(); });
  $("gelSample2").addEventListener("input", () => { if (gel.parseInputs()) gel.draw(); });

  $("btnGelRun").addEventListener("click", () => {
    if (!gel.parseInputs()) return;
    if (gel.p >= 1) { /* restart */ gel.p = 0; $("gelResultsCard").hidden = true; }
    gel.running = true;
    gel.lastTs = performance.now();
    gel.setButtons();
    cancelAnimationFrame(gel.raf);
    gel.raf = requestAnimationFrame(gel.tick);
  });
  $("btnGelPause").addEventListener("click", () => {
    gel.running = false;
    cancelAnimationFrame(gel.raf);
    gel.setButtons();
  });
  $("btnGelReset").addEventListener("click", () => {
    gel.running = false;
    cancelAnimationFrame(gel.raf);
    gel.p = 0;
    $("gelProgress").textContent = "0 %";
    $("gelProgressBar").style.width = "0%";
    $("gelResultsCard").hidden = true;
    gel.setButtons();
    gel.draw();
  });
  $("btnGelSpeed").addEventListener("click", () => {
    gel.speed = gel.speed === 1 ? 4 : 1;
    $("btnGelSpeed").textContent = `Speed: ${gel.speed}×`;
    $("btnGelSpeed").setAttribute("aria-pressed", gel.speed === 4 ? "true" : "false");
  });

  window.addEventListener("resize", () => gel.draw());
  gel.parseInputs();
  gel.setButtons();
  gel.draw();
}

/* ================= 7. INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initNav();
  initPCR();
  initGel();
  updateTemplateUI();
});
