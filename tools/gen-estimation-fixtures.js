'use strict';
/**
 * Sinh lại data/estimation_fixtures.json từ quy tắc tất định trong
 * server/estimationScorer.js (cùng seed → cùng kết quả, B-02).
 *
 * Dùng:  node tools/gen-estimation-fixtures.js [seed] [count]
 */
const fs = require('fs');
const path = require('path');
const { generateFixtures, DEFAULT_FIXTURE_SEED } = require('../server/estimationScorer');

const seed = Number(process.argv[2]) || DEFAULT_FIXTURE_SEED;
const count = Number(process.argv[3]) || 12;
const out = path.join(__dirname, '..', 'data', 'estimation_fixtures.json');
const doc = { seed, generator: 'server/estimationScorer.js#generateFixtures', items: generateFixtures(seed, count) };
fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
console.log(`Đã ghi ${doc.items.length} fixtures (seed=${seed}) vào ${path.relative(process.cwd(), out)}`);
