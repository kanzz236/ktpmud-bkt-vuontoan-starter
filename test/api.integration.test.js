'use strict';
/**
 * Test tích hợp end-to-end (B-05, B-08): khởi chạy server THẬT (server/index.js) trên cổng ngẫu nhiên
 * với file SQLite tạm, rồi gọi API qua HTTP như trình duyệt. Mỗi ca dùng một tài khoản học sinh mẫu
 * (hocsinhNN, dữ liệu synthetic) riêng để các ca không ảnh hưởng nhau.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const S = require('../server/estimationScorer');

const ROOT = path.join(__dirname, '..');
const SET_ID = 'uoc-luong-nhan-chia';
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'estimation_fixtures.json'), 'utf8')).items;
const exactOf = f => S.computeExact(f.op, f.a, f.b);

let child, base, tmpDir, serverLog = '';

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on('error', reject);
  });
}

async function api(method, url, token, body) {
  await ensureServer();
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: res.status, json, text };
}

async function login(username) {
  const r = await api('POST', '/api/auth/login', null, { username, password: '123456' });
  assert.equal(r.status, 200, `đăng nhập ${username} phải thành công: ${r.text}`);
  return r.json.token;
}

/**
 * Khởi động server thật ở lần gọi API đầu tiên (lười, chỉ một lần) và tự dọn khi tiến trình test thoát.
 * Cố ý KHÔNG dùng test.before/test.after ở cấp file: Node 18 không chạy hook cấp file (chỉ từ Node 20),
 * khiến `base` còn undefined. Cách này chạy được trên Node 18, 20 và 22.
 */
let serverReady = null;
function ensureServer() {
  if (!serverReady) serverReady = startServer();
  return serverReady;
}

async function startServer() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuon-toan-test-'));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DB_PATH: path.join(tmpDir, 'test.db') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // unref để tiến trình test thoát được khi chạy xong (server con bị kill ở sự kiện 'exit' bên dưới).
  child.unref();
  child.stdout.unref();
  child.stderr.unref();
  child.stdout.on('data', d => { serverLog += d; });
  child.stderr.on('data', d => { serverLog += d; });
  const deadline = Date.now() + 90000;
  for (;;) {
    try { const r = await fetch(`${base}/api/health`); if (r.ok) break; } catch { /* chưa sẵn sàng */ }
    if (child.exitCode !== null) throw new Error('Server thoát sớm:\n' + serverLog);
    if (Date.now() > deadline) throw new Error('Server khởi động quá lâu:\n' + serverLog);
    await new Promise(r => setTimeout(r, 200));
  }
}

function cleanup() {
  if (child && child.exitCode === null) { try { child.kill('SIGKILL'); } catch { /* đã thoát */ } }
  if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* Windows còn giữ file */ } }
}
process.on('exit', cleanup);

/* ---------------------------------------------------------------- B-01 / B-02 / B-04 */

test('B-01: bộ ước lượng nằm trong luồng bài học (/api/lessons, Bài 41)', async () => {
  const token = await login('hocsinh01');
  const { status, json } = await api('GET', '/api/lessons', token);
  assert.equal(status, 200);
  const lesson = json.lessons.find(l => l.id === 'bai-41');
  assert.ok(lesson, 'phải có Bài 41');
  assert.ok(lesson.questionSets.some(s => s.id === SET_ID), 'bộ ước lượng phải gắn vào Bài 41');
});

test('B-02/B-04: tải câu hỏi → ≥ 12 câu type estimate và KHÔNG kèm đáp án', async () => {
  const token = await login('hocsinh02');
  const { status, json, text } = await api('GET', `/api/question-sets/${SET_ID}/questions`, token);
  assert.equal(status, 200);
  assert.ok(json.questions.length >= 12);
  const allowed = new Set(['id', 'type', 'prompt', 'points', 'category']);
  for (const q of json.questions) {
    assert.equal(q.type, 'estimate');
    for (const k of Object.keys(q)) assert.ok(allowed.has(k), `trường lạ trong DTO: ${k}`);
  }
  assert.ok(!/correct|meta|answer|exact/i.test(text), 'DTO không được chứa đáp án/meta');
});

test('API ước lượng yêu cầu đăng nhập (401 khi chưa đăng nhập)', async () => {
  for (const [m, u, b] of [['POST', '/api/estimation/estimate', {}], ['POST', '/api/estimation/exact', {}], ['GET', `/api/estimation/sets/${SET_ID}/state`]]) {
    const r = await api(m, u, null, b);
    assert.equal(r.status, 401, `${m} ${u}`);
  }
});

/* ---------------------------------------------------------------- B-03 chấm ước lượng qua API */

test('normal: ước lượng hợp lý được ghi nhận và KHÔNG lộ kết quả chính xác', async () => {
  const token = await login('hocsinh03');
  const f = FIX[0]; const e = exactOf(f);
  const r = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(Math.round(e * 1.05)) });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.reasonable, true);
  assert.match(r.json.feedback, /Ước lượng hợp lý/);
  assert.equal(r.json.nextStep, 'exact');
  assert.ok(!('exact' in r.json) && !('exactResult' in r.json) && !('acceptedRange' in r.json));
  assert.ok(!r.text.includes(`"${e}"`) && !new RegExp(`\\b${e}\\b`).test(r.json.feedback));
});

test('boundary: đúng biên dưới/trên được nhận, sát ngoài biên bị loại', async () => {
  const f = FIX[2]; const e = exactOf(f); const { lower, upper } = S.estimateBounds(e);
  const cases = [
    ['hocsinh04', lower, true], ['hocsinh05', lower - 1, false],
    ['hocsinh06', upper, true], ['hocsinh07', upper + 1, false],
  ];
  for (const [user, v, expected] of cases) {
    const token = await login(user);
    const r = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: v });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.reasonable, expected, `${user}: ${v} (biên ${lower}–${upper}, E=${e})`);
  }
});

test('khoảng ước lượng: khoảng hẹp chứa kết quả hợp lý; khoảng quá rộng hoặc trượt thì không', async () => {
  const f = FIX[4]; const e = exactOf(f);
  const t1 = await login('hocsinh08');
  const ok = await api('POST', '/api/estimation/estimate', t1, { questionId: f.id, low: e - 5, high: e + 5 });
  assert.equal(ok.json.reasonable, true, ok.text);
  const t2 = await login('hocsinh09');
  const wide = await api('POST', '/api/estimation/estimate', t2, { questionId: f.id, low: 0, high: e * 10 });
  assert.equal(wide.json.reasonable, false);
  const t3 = await login('hocsinh10');
  const miss = await api('POST', '/api/estimation/estimate', t3, { questionId: f.id, low: e + 1, high: e + 10 });
  assert.equal(miss.json.reasonable, false);
});

/* ---------------------------------------------------------------- invalid input */

test('invalid: đầu vào sai → 400 kèm thông báo dễ hiểu và KHÔNG tiêu hao lượt chốt', async () => {
  const token = await login('hocsinh11');
  const f = FIX[0];
  const bad = [
    {}, { estimate: '' }, { estimate: '   ' }, { estimate: 'abc' }, { estimate: '-5' }, { estimate: '12.5' },
    { estimate: '99999999' }, { estimate: [1] }, { low: '5' }, { high: '5' }, { low: '9', high: '1' },
    { estimate: '5', low: '1', high: '9' },
  ];
  for (const b of bad) {
    const r = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, ...b });
    assert.equal(r.status, 400, `${JSON.stringify(b)} → ${r.text}`);
    assert.ok(typeof r.json.error === 'string' && r.json.error.length > 10 && r.json.code, JSON.stringify(r.json));
  }
  // Không có questionId / không tồn tại / không phải câu estimate → 404
  assert.equal((await api('POST', '/api/estimation/estimate', token, { estimate: '10' })).status, 404);
  assert.equal((await api('POST', '/api/estimation/estimate', token, { questionId: 'khong-co', estimate: '10' })).status, 404);
  assert.equal((await api('POST', '/api/estimation/estimate', token, { questionId: 'input-1', estimate: '10' })).status, 404);
  // Các lần gửi lỗi không làm mất lượt: vẫn chốt được bình thường
  const state = await api('GET', `/api/estimation/sets/${SET_ID}/state`, token);
  assert.equal(state.json.questions[f.id].stage, 'estimate');
  const ok = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: '150' });
  assert.equal(ok.status, 200);
});

test('invalid: nộp kết quả tính sai định dạng → 400', async () => {
  const token = await login('hocsinh12');
  const f = FIX[0];
  for (const exact of ['', 'abc', '-3', '1.5', undefined]) {
    const r = await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact });
    assert.equal(r.status, 400, `exact=${exact} → ${r.text}`);
  }
});

/* ---------------------------------------------------------------- thứ tự 2 bước do server bắt buộc */

test('thứ tự: tính chính xác trước khi ước lượng → 409; chốt hai lần / nộp hai lần → 409', async () => {
  const token = await login('hocsinh13');
  const f = FIX[1]; const e = exactOf(f);
  const early = await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e) });
  assert.equal(early.status, 409);
  assert.equal(early.json.code, 'estimate_first');
  assert.ok(!early.text.includes(`"${e}"`), 'không lộ đáp án khi bị từ chối');

  assert.equal((await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(e) })).status, 200);
  const again = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: '1' });
  assert.equal(again.status, 409);
  assert.equal(again.json.code, 'already_estimated');

  assert.equal((await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e) })).status, 200);
  const twice = await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e) });
  assert.equal(twice.status, 409);
  assert.equal(twice.json.code, 'already_answered');
});

/* ---------------------------------------------------------------- B-06 feedback tách bạch */

test('B-06: ước lượng hợp lý nhưng tính sai → hai thông báo riêng biệt, lộ đáp án sau bước 2', async () => {
  const token = await login('hocsinh14');
  const f = FIX[1]; const e = exactOf(f);
  await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(e) });
  const r = await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e + 2) });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.estimate.reasonable, true);
  assert.match(r.json.estimate.message, /hợp lý/);
  assert.equal(r.json.exact.correct, false);
  assert.match(r.json.exact.message, /chưa đúng/);
  assert.equal(r.json.exact.result, e);
  assert.ok(r.json.teaching.length > 10);
  assert.deepEqual(r.json.comparison.acceptedRange, S.estimateBounds(e));
});

test('B-06: ước lượng chưa hợp lý nhưng tính đúng → vẫn tách bạch', async () => {
  const token = await login('hocsinh15');
  const f = FIX[3]; const e = exactOf(f);
  const est = await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(e * 5) });
  assert.equal(est.json.reasonable, false);
  assert.match(est.json.feedback, /chưa hợp lý/);
  const r = await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e) });
  assert.equal(r.json.estimate.reasonable, false);
  assert.match(r.json.estimate.message, /chưa hợp lý/);
  assert.equal(r.json.exact.correct, true);
  assert.match(r.json.exact.message, /chính xác đúng/);
});

/* ---------------------------------------------------------------- B-05 lưu trạng thái, F5 */

test('B-05: trạng thái lưu trên server — tải lại (phiên mới) vẫn còn, chưa lộ đáp án trước bước 2', async () => {
  const token = await login('hocsinh16');
  const f = FIX[0]; const e = exactOf(f);
  await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(e) });

  const token2 = await login('hocsinh16'); // "F5" bằng phiên đăng nhập mới
  let s = await api('GET', `/api/estimation/sets/${SET_ID}/state`, token2);
  const mid = s.json.questions[f.id];
  assert.equal(mid.stage, 'exact');
  assert.equal(mid.estimate.value, e);
  assert.ok(!/result|exactResult|acceptedRange/.test(JSON.stringify(mid)), 'chưa được lộ đáp án ở trạng thái giữa chừng');
  assert.equal(s.json.questions[FIX[1].id].stage, 'estimate');

  await api('POST', '/api/estimation/exact', token2, { questionId: f.id, exact: String(e) });
  s = await api('GET', `/api/estimation/sets/${SET_ID}/state`, token);
  const done = s.json.questions[f.id];
  assert.equal(done.stage, 'done');
  assert.equal(done.exact.result, e);
  assert.equal(done.exact.correct, true);
});

test('B-05: nộp trọn bộ → điểm/sao/tiến độ được lưu; trạng thái bước được làm mới', async () => {
  const token = await login('hocsinh17');
  const before = (await api('GET', '/api/auth/me', token)).json.user.totalStars;
  for (const f of FIX) {
    const e = exactOf(f);
    assert.equal((await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(e) })).status, 200);
    assert.equal((await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(e) })).status, 200);
  }
  const sub = await api('POST', '/api/submissions', token, { setId: SET_ID, answers: {}, durationSec: 30 });
  assert.equal(sub.status, 200, sub.text);
  assert.equal(sub.json.scorePercent, 100);
  assert.equal(sub.json.correctCount, FIX.length);
  assert.equal(sub.json.starsEarned, 40);
  assert.ok(sub.json.detail.every(d => d.estimateReasonable && d.exactCorrect));

  const prog = (await api('GET', '/api/me/progress', token)).json;
  const l41 = prog.lessons.find(l => l.id === 'bai-41');
  assert.equal(l41.bestScore, 100);
  assert.equal(l41.completed, true);
  assert.equal(prog.totalStars, before + 40);

  const s = await api('GET', `/api/estimation/sets/${SET_ID}/state`, token);
  assert.ok(Object.values(s.json.questions).every(q => q.stage === 'estimate'), 'sau khi nộp, lần làm mới bắt đầu từ bước 1');
});

/* ---------------------------------------------------------------- scoring */

async function playAll(token, { estimateOf, exactOf: exactFn, count = FIX.length }) {
  for (const f of FIX.slice(0, count)) {
    const e = exactOf(f);
    if (estimateOf) await api('POST', '/api/estimation/estimate', token, { questionId: f.id, estimate: String(estimateOf(e)) });
    if (exactFn) await api('POST', '/api/estimation/exact', token, { questionId: f.id, exact: String(exactFn(e)) });
  }
  return (await api('POST', '/api/submissions', token, { setId: SET_ID, answers: {}, durationSec: 5 })).json;
}

test('scoring: ước lượng hợp lý nhưng tính sai hết → 50%', async () => {
  assert.equal((await playAll(await login('hocsinh18'), { estimateOf: e => e, exactOf: e => e + 1 })).scorePercent, 50);
});
test('scoring: ước lượng sai nhưng tính đúng hết → 50%', async () => {
  assert.equal((await playAll(await login('hocsinh19'), { estimateOf: e => e * 10, exactOf: e => e })).scorePercent, 50);
});
test('scoring: chưa làm bước nào → 0%; làm một nửa → 50%', async () => {
  assert.equal((await playAll(await login('hocsinh20'), {})).scorePercent, 0);
  assert.equal((await playAll(await login('hocsinh21'), { estimateOf: e => e, exactOf: e => e, count: FIX.length / 2 })).scorePercent, 50);
});
test('scoring: client không thể tự khai đáp án để lấy điểm (server chấm từ trạng thái đã lưu)', async () => {
  const token = await login('hocsinh22');
  const answers = Object.fromEntries(FIX.map(f => [f.id, String(exactOf(f))]));
  const sub = await api('POST', '/api/submissions', token, { setId: SET_ID, answers, durationSec: 1 });
  assert.equal(sub.json.scorePercent, 0);
});

/* ---------------------------------------------------------------- hồi quy: không phá hành vi cũ (B-07) */

test('hồi quy: bộ đề cũ (4 type cũ) vẫn chấm bằng so sánh chuỗi như trước', async () => {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));
  const set = seed.questionSets['phieu-bai-9-10'];
  const token = await login('hocsinh23');
  const good = Object.fromEntries(set.questions.map(q => [q.id, q.correctAnswer]));
  const r = await api('POST', '/api/submissions', token, { setId: 'phieu-bai-9-10', answers: good, durationSec: 10 });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.scorePercent, 100);
  const bad = await api('POST', '/api/submissions', await login('hocsinh24'), { setId: 'phieu-bai-9-10', answers: {}, durationSec: 10 });
  assert.equal(bad.json.scorePercent, 0);
});

test('B-07: server/auth.js giữ nguyên bản gốc; tài khoản mẫu học sinh & giáo viên vẫn đăng nhập được', async () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'server', 'auth.js'))).digest('hex');
  assert.equal(sha, 'a0745d96973d0a86067298d8843d3d6e9a435ff879e385c8cc2745146e4cfb4f', 'server/auth.js không được sửa (B-07)');
  await login('hocsinh01');
  const teacher = await login('giaovien01');
  const a = await api('GET', '/api/teacher/analytics', teacher);
  assert.equal(a.status, 200, 'thống kê giáo viên vẫn chạy khi có dữ liệu ước lượng');
  const wrong = await api('POST', '/api/auth/login', null, { username: 'hocsinh01', password: 'sai' });
  assert.equal(wrong.status, 401);
});
