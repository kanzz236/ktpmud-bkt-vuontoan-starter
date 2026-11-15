'use strict';
/**
 * API cho dạng bài "Ước lượng trước khi tính đúng" (Track B).
 * Được gắn vào router sẵn có của server/api.js; dùng chung requireAuth, bảng questions/attempts/progress.
 *
 * Luồng 2 bước do SERVER bắt buộc (không tin client):
 *   1) POST /api/estimation/estimate  — chốt ước lượng (1 lần/câu). Chưa lộ đáp án.
 *   2) POST /api/estimation/exact     — nộp kết quả tính chính xác (chỉ sau bước 1, 1 lần/câu). Lúc này mới lộ đáp án.
 *   GET  /api/estimation/sets/:setId/state — khôi phục trạng thái sau khi tải lại trang (F5).
 * Chấm điểm cả bộ vẫn qua POST /api/submissions (server/api.js) → ghi attempts + progress + sao như mọi bộ đề khác.
 */
const S = require('./estimationScorer');

function loadEstimateQuestion(db, questionId) {
  if (typeof questionId !== 'string' || !questionId) return null;
  const q = db.prepare("SELECT * FROM questions WHERE id=? AND type='estimate'").get(questionId);
  if (!q || !q.meta_json) return null;
  const meta = JSON.parse(q.meta_json);
  return { q, meta, exact: S.computeExact(meta.op, meta.a, meta.b) };
}

function stepToEstimate(step) {
  return step.est_mode === 'range'
    ? { mode: 'range', low: step.est_low, high: step.est_high }
    : { mode: 'value', value: step.est_low };
}

/** Điểm một câu ước lượng của người dùng — dùng bởi POST /api/submissions. Chưa làm bước nào → 0 điểm. */
function scoreEstimateQuestion(db, userId, q) {
  const info = loadEstimateQuestion(db, q.id);
  if (!info) return { earned: 0, correct: false, estOk: false, exactOk: false, exactGiven: null };
  const step = db.prepare('SELECT * FROM estimation_steps WHERE user_id=? AND question_id=?').get(userId, q.id);
  const estOk = !!(step && step.est_ok);
  const exactOk = !!(step && step.exact_ok);
  return {
    earned: S.scoreQuestion(q.points, estOk, exactOk),
    correct: estOk && exactOk,
    estOk, exactOk,
    exactGiven: step && step.exact_given != null ? step.exact_given : null,
  };
}

/** Xoá trạng thái từng bước của một bộ đề sau khi nộp, để học sinh có thể làm lại từ đầu. */
function clearSteps(db, userId, setId) {
  db.prepare('DELETE FROM estimation_steps WHERE user_id=? AND set_id=?').run(userId, setId);
}

function fail(res, status, message, code) {
  return res.status(status).json({ error: message, code });
}

function registerEstimationRoutes(router, db, requireAuth) {
  /* Bước 1: chốt ước lượng ------------------------------------------------ */
  router.post('/estimation/estimate', requireAuth, (req, res) => {
    const body = req.body || {};
    const info = loadEstimateQuestion(db, body.questionId);
    if (!info) return fail(res, 404, 'Không tìm thấy câu hỏi ước lượng này.', 'question_not_found');

    let est;
    try { est = S.parseEstimateInput(body); }
    catch (e) {
      if (e instanceof S.EstimationInputError) return fail(res, 400, e.message, e.code);
      throw e;
    }

    const existing = db.prepare('SELECT 1 FROM estimation_steps WHERE user_id=? AND question_id=?').get(req.user.id, info.q.id);
    if (existing) return fail(res, 409, 'Con đã chốt ước lượng cho câu này rồi, không đổi được nữa. Hãy sang bước tính chính xác nhé!', 'already_estimated');

    const grade = S.gradeEstimate(info.exact, est);
    db.prepare(`INSERT INTO estimation_steps (user_id,question_id,set_id,est_mode,est_low,est_high,est_ok)
      VALUES (?,?,?,?,?,?,?)`).run(
      req.user.id, info.q.id, info.q.set_id, est.mode,
      est.mode === 'range' ? est.low : est.value,
      est.mode === 'range' ? est.high : est.value,
      grade.reasonable ? 1 : 0);

    // KHÔNG trả kết quả chính xác hay biên chấp nhận ở bước này (B-04).
    res.json({
      questionId: info.q.id,
      estimate: est,
      reasonable: grade.reasonable,
      feedback: S.estimateFeedback(grade),
      nextStep: 'exact',
    });
  });

  /* Bước 2: tính chính xác (chỉ sau khi đã chốt ước lượng) ---------------- */
  router.post('/estimation/exact', requireAuth, (req, res) => {
    const body = req.body || {};
    const info = loadEstimateQuestion(db, body.questionId);
    if (!info) return fail(res, 404, 'Không tìm thấy câu hỏi ước lượng này.', 'question_not_found');

    let given;
    try { given = S.parseWholeNumber(body.exact, 'kết quả tính chính xác'); }
    catch (e) {
      if (e instanceof S.EstimationInputError) return fail(res, 400, e.message, e.code);
      throw e;
    }

    const step = db.prepare('SELECT * FROM estimation_steps WHERE user_id=? AND question_id=?').get(req.user.id, info.q.id);
    if (!step) return fail(res, 409, 'Con hãy ước lượng trước khi tính chính xác nhé! Hãy chốt ước lượng ở bước 1.', 'estimate_first');
    if (step.exact_given != null) return fail(res, 409, 'Con đã nộp kết quả cho câu này rồi.', 'already_answered');

    const exactOk = given === info.exact;
    db.prepare(`UPDATE estimation_steps SET exact_given=?, exact_ok=?, exact_at=datetime('now','localtime')
      WHERE user_id=? AND question_id=?`).run(given, exactOk ? 1 : 0, req.user.id, info.q.id);

    res.json(revealPayload(info, step, given));
  });

  /* Khôi phục trạng thái sau F5 ------------------------------------------ */
  router.get('/estimation/sets/:setId/state', requireAuth, (req, res) => {
    const rows = db.prepare("SELECT id FROM questions WHERE set_id=? AND type='estimate' ORDER BY sort_order").all(req.params.setId);
    if (!rows.length) return fail(res, 404, 'Bộ bài này không có câu ước lượng.', 'set_not_found');
    const steps = Object.fromEntries(db.prepare('SELECT * FROM estimation_steps WHERE user_id=? AND set_id=?')
      .all(req.user.id, req.params.setId).map(s => [s.question_id, s]));
    const questions = {};
    for (const { id } of rows) {
      const step = steps[id];
      if (!step) { questions[id] = { stage: 'estimate' }; continue; }
      const info = loadEstimateQuestion(db, id);
      const est = stepToEstimate(step);
      const grade = S.gradeEstimate(info.exact, est);
      if (step.exact_given == null) {
        questions[id] = { stage: 'exact', estimate: est, reasonable: !!step.est_ok, feedback: S.estimateFeedback(grade) };
      } else {
        questions[id] = { stage: 'done', ...revealPayload(info, step, step.exact_given) };
      }
    }
    res.json({ setId: req.params.setId, questions });
  });
}

/** Nội dung lộ đáp án sau khi học sinh đã nộp bước 2 (chỉ dùng cho câu ĐÃ làm xong). */
function revealPayload(info, step, given) {
  const est = stepToEstimate(step);
  const grade = S.gradeEstimate(info.exact, est);
  const fb = S.exactFeedback({ op: info.meta.op, a: info.meta.a, b: info.meta.b, exact: info.exact, given, estimate: est, grade });
  const comparison = {
    estimate: est,
    acceptedRange: est.mode === 'value' ? { lower: grade.lower, upper: grade.upper } : null,
    exactResult: info.exact,
  };
  return {
    questionId: info.q.id,
    estimate: { ...est, reasonable: grade.reasonable, message: fb.estimateMessage },
    exact: { given, correct: given === info.exact, result: info.exact, message: fb.exactMessage },
    teaching: fb.teachingMessage,
    comparison,
  };
}

module.exports = { registerEstimationRoutes, scoreEstimateQuestion, clearSteps, loadEstimateQuestion };
