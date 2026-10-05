# DoE Lab V2

Static HTML/CSS/JavaScript with no external dependency or build step. Place this directory at the root of the existing repository. Existing V1 files must stay untouched. GitHub Pages serving the repository root then exposes `/DoE_website/v2/`.

`model.js` defines the nine factors and `runExperiment(parameters)`, preserving the V1 root index model, normalization, coefficients and actual ±0.5 uniform noise. Numeric fields accept arbitrary precision within the V1 bounds; sliders use the V1 input increments. `app.js` awaits the function, so it can later return a Promise from an API call. Failed measurements never consume an experiment.

Sessions automatically resume from the separate `doe-lab-v2-session` localStorage key. The budget is 24 measurements per session; restarting requires confirmation. This is a browser-local learning budget, not a server-enforced limit. CSV exports all nine parameters, timestamps and full-precision Y. SVG plots require no chart library. The notebook provides the same measurements in an accessible table.

Run `node --test v2/tests/*.test.cjs` for scientific and UI/session tests. Browser validation and V1 regression checks still need the actual repository checkout and a browser runtime.
