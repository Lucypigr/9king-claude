// Node 無頭模擬用載入器：const NK = require('./tools/sim.js')
globalThis.NK = globalThis.NK || {};
for (const f of ['data/cards', 'data/kings', 'state', 'enemy', 'battle']) require('../js/' + f + '.js');
module.exports = globalThis.NK;
