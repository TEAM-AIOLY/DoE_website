/* Scientific model from the V1 index.html. Independent of the UI and storage. */
(() => {
  'use strict';
  const factors = [
    {id:'temp', label:'Température', unit:'°C', min:20, max:120, step:1, initial:70},
    {id:'press', label:'Pression', unit:'bar', min:1, max:20, step:1, initial:10},
    {id:'debit', label:"Débit d’alimentation", unit:'L/h', min:1, max:100, step:1, initial:50},
    {id:'conc', label:'Concentration initiale', unit:'mol/L', min:0.01, max:5, step:0.01, initial:2.5},
    {id:'temps', label:'Temps de réaction', unit:'min', min:1, max:240, step:1, initial:120},
    {id:'agit', label:'Agitation', unit:'rpm', min:0, max:1500, step:1, initial:750},
    {id:'ph', label:'pH', unit:'', min:1, max:14, step:1, initial:7},
    {id:'cat', label:'Catalyseur', unit:'', min:1, max:3, step:1, initial:2},
    {id:'vol', label:'Volume', unit:'L', min:0.1, max:10, step:0.1, initial:5}
  ];
  function validateParameters(parameters) {
    for (const f of factors) {
      if (typeof parameters[f.id] !== 'number' || !Number.isFinite(parameters[f.id]) || parameters[f.id] < f.min || parameters[f.id] > f.max) {
        throw new RangeError(`${f.label} : entre ${f.min} et ${f.max} ${f.unit}.`);
      }
    }
    return parameters;
  }
  // Replace this function with an API call later; the UI already awaits its result.
  function runExperiment(parameters) {
    validateParameters(parameters);
    const normalize = (id) => {
      const f = factors.find(f => f.id === id);
      return (parameters[id] - (f.min + f.max) / 2) / ((f.max - f.min) / 2);
    };
    const x1 = normalize('temp'), x2 = normalize('conc'), x3 = normalize('ph');
    // V1 implementation uses (random - 0.5) * 1, i.e. ±0.5.
    return 2 + 3.2*x1 + 5*x2 + 2*x3 - 1.4*x3*x3 + 0.6*x1*x2 + (Math.random() - 0.5);
  }
  const api = {factors, validateParameters, runExperiment};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DoE = api;
})();
