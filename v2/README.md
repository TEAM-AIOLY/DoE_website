# DoE Lab V2

Static HTML/CSS/JavaScript with no external dependency or build step. Place this directory at the root of the existing repository. Existing V1 files must stay untouched. GitHub Pages serving the repository root then exposes `/DoE_website/v2/`.

`model.js` defines the nine factors and `runExperiment(parameters)`. The response is a simulated yield in percent, computed as `50 + 3 * V1_response`. This affine conversion preserves the V1 effects, interactions and optimum, without clipping, and stays within 0–100% across the valid domain. Uniform measurement noise is ±1.5 percentage points. This is an educational simulation, not a calibrated physical yield. Numeric fields accept arbitrary precision within the V1 bounds; sliders use the V1 input increments. `app.js` awaits the function, so it can later return a Promise from an API call. Failed measurements never consume an experiment.

Sessions automatically resume from the separate `doe-lab-v2-yield-session` localStorage key; old normalized-response sessions remain separate. The budget is 40 measurements per session; restarting requires confirmation. This is a browser-local learning budget, not a server-enforced limit. CSV exports all nine parameters, timestamps and full-precision yield under `rendement_pct`. SVG plots require no chart library. The notebook provides the same measurements in an accessible table.

Run `node --test v2/tests/*.test.cjs` for scientific and UI/session tests. Browser validation and V1 regression checks still need the actual repository checkout and a browser runtime.
