<div align="center">

# AMPLIFYLAB

### Amplify DNA. See it move.

![AmplifyLab](https://img.shields.io/badge/AMPLIFYLAB-2026-%23F2F0EB?style=for-the-badge&labelColor=%23060608)
![Status](https://img.shields.io/badge/STATUS-LIVE-%237A1212?style=for-the-badge&labelColor=%23060608)
![Stack](https://img.shields.io/badge/STACK-VANILLA_JS-%23060608?style=for-the-badge&labelColor=%23060608)
![License](https://img.shields.io/badge/License-MIT-%23060608?style=for-the-badge&labelColor=%23060608)

A cinematic, fully interactive virtual bench for the polymerase chain
reaction and agarose gel electrophoresis — with honest simulation math
under the hood.

[Live Demo](https://amplifylab.vercel.app) • [GitHub](https://github.com/adityapratap0077-cloud/amplifylab)

</div>

---

## PCR Studio

- **Template validation** — A/T/C/G only, live base-pair counter, invalid-character error states
- **Sample & random templates** — a deterministic ~1200 bp synthetic construct with baked-in primer-binding sites, or a fresh random sequence
- **Live primer analysis** — length, GC%, T<sub>m</sub> (Wallace rule), and true binding-site search against your template (reverse primers matched via reverse complement)
- **Primer QC** — primer-dimer risk from 3′-end complementarity, hairpin/inverted-repeat notes
- **Efficiency model** — per-cycle efficiency responds to annealing temperature, template GC%, and primer-dimer penalties, with a plain-English verdict
- **Animated amplification curve** — copies (log₁₀) vs. cycle with labeled baseline / exponential / linear / plateau phases, final yield in copies and ng

## Gel Electrophoresis Studio

- **100 bp DNA ladder** (100–1500 bp, 500/1000 bp bands brighter), your PCR product auto-loaded, plus a third lane for custom bands
- **Real migration physics** — `d = (A − B·log₁₀bp) · f(agarose) · g(voltage) · t`, rendered live with `requestAnimationFrame`
- **Tank controls** — agarose % (0.7–2.0), voltage (60–150 V), run/pause/reset, 1×/4× speed
- **EtBr-style visualization** — glowing bands, dye front, bp ruler, subtle band-broadening and "smiling" at voltage extremes
- **Band analysis** — sample bands sized by interpolation against the ladder's migration curve, with expected-vs-observed error

## Learn cards

Concise explainers for denaturation, annealing, extension, and how gel
electrophoresis separates DNA by size.

---

## How it works

1. **Load the sample template** in PCR Studio — primers are pre-filled and already validated against it.
2. Tune the **annealing temperature** and **cycle count**, watch the efficiency verdict update live.
3. Hit **Run PCR** — the amplification curve draws itself, phases labeled, yield computed.
4. **Send product to gel** — your amplicon lands in Lane 2 next to the ladder.
5. Set **agarose %** and **voltage**, press **Run**, and watch the bands migrate to the dye front.
6. Check **Band analysis** to see how close the observed sizes are to expected.

---

## Getting started

```bash
git clone https://github.com/adityapratap0077-cloud/amplifylab.git
cd amplifylab
```

Open `index.html` in a browser — no build step:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Static site — push to `main` and Vercel auto-deploys production.

---

## Tech

| Layer | Choice |
| :--- | :--- |
| Language | Vanilla JavaScript (ES6+, zero frameworks) |
| Rendering | HTML5 Canvas (amplification curve, gel tank, hero particles) |
| Styling | Hand-written CSS — dark virtual-lab theme |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| Deploy | Static site — Vercel-ready via `vercel.json` |
| CI | GitHub Actions (`ship.yml`: static checks + README freshness) |

*Simulations are educational models, not substitutes for bench protocols. No pipettes were harmed.*

---

## License

MIT © 2026 Aditya Pratap — see [LICENSE](./LICENSE).

---

**Aditya Pratap** — Creative Technologist
Gorakhpur, India — github.com/adityapratap0077-cloud
