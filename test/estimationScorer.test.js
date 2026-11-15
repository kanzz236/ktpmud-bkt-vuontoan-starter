'use strict';
/**
 * Unit test module chấm điểm thuần (B-03, B-08): normal · boundary · invalid · scoring.
 * Không cần DB hay server; chạy bằng: npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../server/estimationScorer');

const value = v => ({ mode: 'value', value: v });
const range = (low, high) => ({ mode: 'range', low, high });

test('computeExact: nhân và chia hết (normal)', () => {
  assert.equal(S.computeExact('*', 48, 6), 288);
  assert.equal(S.computeExact('/', 616, 7), 88);
  assert.equal(S.computeExact('*', 0, 9), 0);
});

test('computeExact: đầu vào sai bị từ chối (invalid)', () => {
  assert.throws(() => S.computeExact('/', 10, 0), RangeError);
  assert.throws(() => S.computeExact('/', 10, 3), RangeError, 'không dùng phép chia có dư');
  assert.throws(() => S.computeExact('+', 1, 2), RangeError);
  assert.throws(() => S.computeExact('*', -1, 2), RangeError);
  assert.throws(() => S.computeExact('*', 1.5, 2), RangeError);
});

test('estimateBounds: biên ±15% bằng số nguyên', () => {
  assert.deepEqual(S.estimateBounds(288), { lower: 245, upper: 331 }); // 244,8 -> 245 ; 331,2 -> 331
  assert.deepEqual(S.estimateBounds(100), { lower: 85, upper: 115 });
  assert.deepEqual(S.estimateBounds(0), { lower: 0, upper: 0 });
});

test('gradeEstimate (một số): trong khoảng -> hợp lý (normal)', () => {
  const g = S.gradeEstimate(288, value(300));
  assert.equal(g.reasonable, true);
  assert.equal(g.reason, 'within');
});

test('gradeEstimate (một số): đúng biên dưới/trên được nhận, sát ngoài biên bị loại (boundary)', () => {
  assert.equal(S.gradeEstimate(288, value(245)).reasonable, true);
  assert.equal(S.gradeEstimate(288, value(244)).reasonable, false);
  assert.equal(S.gradeEstimate(288, value(244)).reason, 'too_low');
  assert.equal(S.gradeEstimate(288, value(331)).reasonable, true);
  assert.equal(S.gradeEstimate(288, value(332)).reasonable, false);
  assert.equal(S.gradeEstimate(288, value(332)).reason, 'too_high');
  // E = 100: đúng ±15 là biên, không có sai số số thực
  assert.equal(S.gradeEstimate(100, value(85)).reasonable, true);
  assert.equal(S.gradeEstimate(100, value(84)).reasonable, false);
  assert.equal(S.gradeEstimate(100, value(115)).reasonable, true);
  assert.equal(S.gradeEstimate(100, value(116)).reasonable, false);
});

test('gradeEstimate (khoảng): phải chứa kết quả thật và không quá rộng (boundary)', () => {
  assert.equal(S.gradeEstimate(288, range(280, 300)).reasonable, true);
  assert.equal(S.gradeEstimate(288, range(288, 288)).reasonable, true);
  assert.equal(S.gradeEstimate(288, range(289, 300)).reason, 'range_misses');
  assert.equal(S.gradeEstimate(288, range(250, 287)).reason, 'range_misses');
  // độ rộng tối đa = 30% của 100 = 30
  assert.equal(S.gradeEstimate(100, range(90, 120)).reasonable, true);   // rộng 30 (đúng biên)
  assert.equal(S.gradeEstimate(100, range(90, 121)).reason, 'range_too_wide'); // rộng 31
  assert.equal(S.gradeEstimate(100, range(0, 10000)).reasonable, false);
});

test('scoreQuestion: 50% ước lượng + 50% tính đúng (scoring)', () => {
  assert.equal(S.scoreQuestion(10, true, true), 10);
  assert.equal(S.scoreQuestion(10, true, false), 5);
  assert.equal(S.scoreQuestion(10, false, true), 5);
  assert.equal(S.scoreQuestion(10, false, false), 0);
});

test('parseWholeNumber: chuỗi/số hợp lệ (normal)', () => {
  assert.equal(S.parseWholeNumber('300'), 300);
  assert.equal(S.parseWholeNumber('  42 '), 42);
  assert.equal(S.parseWholeNumber(0), 0);
  assert.equal(S.parseWholeNumber('007'), 7);
});

test('parseWholeNumber: rỗng, chữ, số âm, thập phân, quá lớn, sai kiểu bị từ chối (invalid)', () => {
  const code = raw => { try { S.parseWholeNumber(raw, 'ước lượng'); return 'ok'; } catch (e) { assert.ok(e instanceof S.EstimationInputError); assert.equal(e.status, 400); assert.ok(e.message.length > 10); return e.code; } };
  assert.equal(code(undefined), 'missing');
  assert.equal(code(null), 'missing');
  assert.equal(code(''), 'missing');
  assert.equal(code('   '), 'missing');
  assert.equal(code('abc'), 'not_number');
  assert.equal(code('12a'), 'not_number');
  assert.equal(code('1e3'), 'not_number');
  assert.equal(code('-5'), 'negative');
  assert.equal(code(-5), 'negative');
  assert.equal(code('12.5'), 'not_integer');
  assert.equal(code('12,5'), 'not_integer');
  assert.equal(code(1.5), 'not_integer');
  assert.equal(code(NaN), 'not_number');
  assert.equal(code(Infinity), 'not_number');
  assert.equal(code('99999999'), 'too_big');
  assert.equal(code({}), 'not_number');
  assert.equal(code([1]), 'not_number');
  assert.equal(code(true), 'not_number');
});

test('parseEstimateInput: một số hoặc một khoảng; thiếu/mơ hồ/đảo ngược bị từ chối', () => {
  assert.deepEqual(S.parseEstimateInput({ estimate: '300' }), { mode: 'value', value: 300 });
  assert.deepEqual(S.parseEstimateInput({ low: '280', high: 300 }), { mode: 'range', low: 280, high: 300 });
  const code = body => { try { S.parseEstimateInput(body); return 'ok'; } catch (e) { return e.code; } };
  assert.equal(code({}), 'missing');
  assert.equal(code(undefined), 'missing');
  assert.equal(code({ estimate: '' }), 'missing');
  assert.equal(code({ low: '10' }), 'missing');
  assert.equal(code({ high: '10' }), 'missing');
  assert.equal(code({ estimate: '5', low: '1', high: '9' }), 'ambiguous');
  assert.equal(code({ low: '30', high: '10' }), 'range_inverted');
  assert.equal(code({ estimate: 'abc' }), 'not_number');
  assert.equal(code({ low: '-1', high: '10' }), 'negative');
});

test('teachingEstimate: làm tròn / số tròn tương thích', () => {
  assert.equal(S.teachingEstimate('*', 48, 6).value, 300);   // 48 ≈ 50
  assert.equal(S.teachingEstimate('*', 198, 4).value, 800);  // 198 ≈ 200
  assert.equal(S.teachingEstimate('/', 392, 7).value, 60);   // 420 : 7
  assert.equal(S.teachingEstimate('/', 252, 6).value, 40);   // 240 : 6
});

test('exactFeedback: tách bạch "ước lượng hợp lý" và "kết quả chính xác" (B-06)', () => {
  const base = { op: '*', a: 48, b: 6, exact: 288 };
  const est = value(300);
  const grade = S.gradeEstimate(288, est);
  const right = S.exactFeedback({ ...base, given: 288, estimate: est, grade });
  assert.match(right.estimateMessage, /hợp lý/);
  assert.match(right.exactMessage, /chính xác đúng/);
  const wrongExact = S.exactFeedback({ ...base, given: 290, estimate: est, grade });
  assert.match(wrongExact.estimateMessage, /hợp lý/, 'ước lượng vẫn hợp lý dù tính sai');
  assert.match(wrongExact.exactMessage, /chưa đúng/);
  const badEst = value(1000);
  const badGrade = S.gradeEstimate(288, badEst);
  const fb = S.exactFeedback({ ...base, given: 288, estimate: badEst, grade: badGrade });
  assert.match(fb.estimateMessage, /chưa hợp lý/, 'ước lượng sai nhưng tính đúng');
  assert.match(fb.exactMessage, /chính xác đúng/);
});

test('estimateFeedback (sau bước 1) không lộ kết quả chính xác hay biên chấp nhận (B-04)', () => {
  for (const est of [value(300), value(1), range(1, 5), range(0, 99999)]) {
    const g = S.gradeEstimate(288, est);
    const msg = S.estimateFeedback(g);
    assert.ok(!msg.includes('288'), msg);
    assert.ok(!msg.includes(String(g.lower)) && !msg.includes(String(g.upper)), msg);
  }
});

test('generateFixtures: tái lập được, ≥ 12 câu, thoả ràng buộc (B-02)', () => {
  const a = S.generateFixtures(S.DEFAULT_FIXTURE_SEED, 12);
  const b = S.generateFixtures(S.DEFAULT_FIXTURE_SEED, 12);
  assert.deepEqual(a, b, 'cùng seed phải cho cùng kết quả');
  assert.notDeepEqual(a, S.generateFixtures(S.DEFAULT_FIXTURE_SEED + 1, 12), 'khác seed phải khác kết quả');
  assert.ok(a.length >= 12);
  assert.equal(new Set(a.map(f => f.id)).size, a.length, 'id duy nhất');
  assert.equal(new Set(a.map(f => `${f.op}|${f.a}|${f.b}`)).size, a.length, 'không trùng phép tính');
  for (const f of a) {
    const exact = S.computeExact(f.op, f.a, f.b); // ném lỗi nếu chia không hết
    const { lower, upper } = S.estimateBounds(exact);
    const t = S.teachingEstimate(f.op, f.a, f.b).value;
    assert.ok(t >= lower && t <= upper, `${f.id}: ước lượng mẫu ${t} phải nằm trong [${lower}, ${upper}]`);
    assert.ok(f.b >= 2 && f.b <= 9);
  }
  assert.ok(a.some(f => f.op === '*') && a.some(f => f.op === '/'), 'có cả nhân và chia');
});

test('data/estimation_fixtures.json khớp với bộ sinh (không bị sửa tay lệch)', () => {
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'estimation_fixtures.json'), 'utf8'));
  assert.equal(file.seed, S.DEFAULT_FIXTURE_SEED);
  assert.deepEqual(file.items, S.generateFixtures(file.seed, file.items.length));
  assert.ok(file.items.length >= 12);
});

test('fixtureToQuestionRow: tạo hàng DB cho type estimate', () => {
  const row = S.fixtureToQuestionRow({ id: 'est-xx', op: '*', a: 48, b: 6, strategy: 'round-tens' });
  assert.equal(row.type, 'estimate');
  assert.equal(row.correctAnswer, '288');
  assert.equal(row.prompt, 'Ước lượng kết quả: 48 × 6');
  assert.deepEqual(row.meta, { op: '*', a: 48, b: 6, strategy: 'round-tens' });
});
