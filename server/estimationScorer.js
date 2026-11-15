'use strict';
/**
 * Track B — "Ước lượng trước khi tính đúng".
 *
 * Module THUẦN (không đọc DB, không gọi mạng, không dùng LLM): mọi quy tắc tạo
 * câu hỏi và chấm ước lượng nằm ở đây để test được độc lập (B-03, B-08).
 * Toàn bộ phép so sánh dùng SỐ NGUYÊN, không dùng số thực → biên chính xác tuyệt đối.
 *
 * QUY TẮC CHẤM (xem ADR-03 trong DECISIONS.md):
 *   E = kết quả chính xác của phép nhân/chia (số nguyên).
 *   - Ước lượng bằng MỘT SỐ v: hợp lý  <=>  ceil(0,85·E) <= v <= floor(1,15·E)   (sai số ±15%)
 *   - Ước lượng bằng MỘT KHOẢNG [low, high]: hợp lý <=> low <= E <= high
 *     VÀ (high - low) <= 30% của E  (khoảng phải chứa kết quả thật và không quá rộng).
 *   - Điểm một câu: 50% cho ước lượng hợp lý + 50% cho kết quả tính chính xác.
 */

/** Sai số tương đối cho phép khi ước lượng bằng một số (đơn vị: %). */
const TOLERANCE_PERCENT = 15;
/** Độ rộng tối đa của khoảng ước lượng so với kết quả thật (đơn vị: %). */
const RANGE_MAX_WIDTH_PERCENT = 30;
/** Phần trăm điểm của bước ước lượng; phần còn lại thuộc bước tính chính xác. */
const ESTIMATE_WEIGHT_PERCENT = 50;
/** Số lớn nhất học sinh được nhập (chặn đầu vào phi lý, tránh tràn số). */
const MAX_INPUT = 9999999;
/** Seed mặc định để sinh bộ fixtures tái lập được (B-02). */
const DEFAULT_FIXTURE_SEED = 20261104;

class EstimationInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EstimationInputError';
    this.code = code;
    this.status = 400;
  }
}

/* ------------------------------------------------------------------ */
/* 1. Đọc & kiểm tra đầu vào                                            */
/* ------------------------------------------------------------------ */

/**
 * Chuyển giá trị học sinh nhập thành số nguyên không âm, hoặc ném
 * EstimationInputError với thông báo thân thiện (dùng cho lỗi HTTP 400).
 * @param {*} raw    số hoặc chuỗi số
 * @param {string} label  tên ô nhập, dùng trong thông báo ("ước lượng", "kết quả"...)
 */
function parseWholeNumber(raw, label = 'số') {
  if (raw === undefined || raw === null) {
    throw new EstimationInputError('missing', `Con chưa nhập ${label}. Hãy điền một số nhé!`);
  }
  let n;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) throw new EstimationInputError('not_number', `Ô ${label} cần một số, con kiểm tra lại nhé.`);
    if (!Number.isInteger(raw)) throw new EstimationInputError('not_integer', `Ô ${label} chỉ nhập số tròn (không có phần thập phân) nhé.`);
    if (raw < 0) throw new EstimationInputError('negative', `Ô ${label} không nhập số âm được. Con nhập số từ 0 trở lên nhé.`);
    n = raw;
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (t === '') throw new EstimationInputError('missing', `Con chưa nhập ${label}. Hãy điền một số nhé!`);
    if (/^-\s*\d/.test(t)) throw new EstimationInputError('negative', `Ô ${label} không nhập số âm được. Con nhập số từ 0 trở lên nhé.`);
    if (/^\d+[.,]\d+$/.test(t)) throw new EstimationInputError('not_integer', `Ô ${label} chỉ nhập số tròn (không có phần thập phân) nhé.`);
    if (!/^\d+$/.test(t)) throw new EstimationInputError('not_number', `Ô ${label} chỉ nhập chữ số (0–9), con kiểm tra lại nhé.`);
    n = Number(t);
  } else {
    throw new EstimationInputError('not_number', `Ô ${label} cần một số, con kiểm tra lại nhé.`);
  }
  if (n > MAX_INPUT) throw new EstimationInputError('too_big', `Số ở ô ${label} lớn quá. Con nhập số nhỏ hơn ${MAX_INPUT.toLocaleString('vi-VN')} nhé.`);
  return n;
}

/**
 * Chuẩn hoá phần ước lượng gửi lên: hoặc { estimate } (một số) hoặc { low, high } (một khoảng).
 * @returns {{mode:'value', value:number}|{mode:'range', low:number, high:number}}
 */
function parseEstimateInput(body) {
  const b = body || {};
  const hasValue = b.estimate !== undefined && b.estimate !== null && b.estimate !== '';
  const hasLow = b.low !== undefined && b.low !== null && b.low !== '';
  const hasHigh = b.high !== undefined && b.high !== null && b.high !== '';
  const touchedValue = b.estimate !== undefined && b.estimate !== null;
  const touchedRange = (b.low !== undefined && b.low !== null) || (b.high !== undefined && b.high !== null);

  if (!touchedValue && !touchedRange) {
    throw new EstimationInputError('missing', 'Con chưa nhập ước lượng. Hãy điền một số hoặc một khoảng nhé!');
  }
  if (touchedValue && touchedRange) {
    throw new EstimationInputError('ambiguous', 'Con chỉ chọn một cách: ước lượng bằng một số, hoặc bằng một khoảng nhé.');
  }
  if (touchedValue) {
    void hasValue;
    return { mode: 'value', value: parseWholeNumber(b.estimate, 'ước lượng') };
  }
  if (!hasLow || !hasHigh) {
    throw new EstimationInputError('missing', 'Với khoảng ước lượng, con cần nhập cả hai số "từ" và "đến" nhé.');
  }
  const low = parseWholeNumber(b.low, 'số "từ"');
  const high = parseWholeNumber(b.high, 'số "đến"');
  if (low > high) {
    throw new EstimationInputError('range_inverted', 'Số "từ" phải nhỏ hơn hoặc bằng số "đến". Con đổi lại giúp cô nhé!');
  }
  return { mode: 'range', low, high };
}

/* ------------------------------------------------------------------ */
/* 2. Kết quả chính xác + biên chấp nhận                                */
/* ------------------------------------------------------------------ */

/** Kết quả chính xác của a × b hoặc a : b (chỉ phép chia hết, nằm trong phạm vi SGK lớp 3). */
function computeExact(op, a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    throw new RangeError('Toán hạng phải là số nguyên không âm.');
  }
  if (op === '*') return a * b;
  if (op === '/') {
    if (b === 0) throw new RangeError('Số chia phải khác 0.');
    if (a % b !== 0) throw new RangeError('Chỉ dùng phép chia hết cho dạng bài ước lượng.');
    return a / b;
  }
  throw new RangeError(`Phép tính không được hỗ trợ: ${op}`);
}

/** Biên [lower, upper] (số nguyên) mà một ước lượng bằng MỘT SỐ được coi là hợp lý. */
function estimateBounds(exact, tolerancePercent = TOLERANCE_PERCENT) {
  const lower = Math.floor(((100 - tolerancePercent) * exact + 99) / 100); // ceil
  const upper = Math.floor(((100 + tolerancePercent) * exact) / 100);      // floor
  return { lower, upper };
}

/**
 * Chấm phần ước lượng.
 * @param {number} exact  kết quả chính xác
 * @param {{mode:'value',value:number}|{mode:'range',low:number,high:number}} est
 * @returns {{reasonable:boolean, mode:string, reason:string, lower:number, upper:number}}
 *   reason ∈ within | too_low | too_high | range_misses | range_too_wide
 */
function gradeEstimate(exact, est) {
  const { lower, upper } = estimateBounds(exact);
  if (est.mode === 'value') {
    if (est.value < lower) return { reasonable: false, mode: 'value', reason: 'too_low', lower, upper };
    if (est.value > upper) return { reasonable: false, mode: 'value', reason: 'too_high', lower, upper };
    return { reasonable: true, mode: 'value', reason: 'within', lower, upper };
  }
  if (est.mode === 'range') {
    if (est.low > exact || est.high < exact) return { reasonable: false, mode: 'range', reason: 'range_misses', lower, upper };
    if ((est.high - est.low) * 100 > RANGE_MAX_WIDTH_PERCENT * exact) {
      return { reasonable: false, mode: 'range', reason: 'range_too_wide', lower, upper };
    }
    return { reasonable: true, mode: 'range', reason: 'within', lower, upper };
  }
  throw new RangeError('Chế độ ước lượng không hợp lệ.');
}

/** Điểm một câu: ước lượng hợp lý được ESTIMATE_WEIGHT_PERCENT%, tính đúng được phần còn lại. */
function scoreQuestion(points, estimateReasonable, exactCorrect) {
  const estPart = (points * ESTIMATE_WEIGHT_PERCENT) / 100;
  const exactPart = points - estPart;
  return (estimateReasonable ? estPart : 0) + (exactCorrect ? exactPart : 0);
}

/* ------------------------------------------------------------------ */
/* 3. Cách ước lượng "mẫu" để dạy (làm tròn / số tròn tương thích)      */
/* ------------------------------------------------------------------ */

function roundHalfUpTo(n, unit) {
  return Math.floor((n + unit / 2) / unit) * unit;
}

/**
 * Ước lượng mẫu cho lời giải sau khi lộ đáp án:
 *  - Nhân: làm tròn thừa số nhiều chữ số đến hàng chục (số có 2 chữ số) hoặc hàng trăm (3 chữ số).
 *  - Chia: thay số bị chia bằng bội số tròn chục của (số chia × 10) gần nhất ("số tròn tương thích").
 */
function teachingEstimate(op, a, b) {
  if (op === '*') {
    const unit = a >= 100 ? 100 : 10;
    const rounded = roundHalfUpTo(a, unit);
    const value = rounded * b;
    return {
      value,
      text: `Làm tròn ${a} ≈ ${rounded}, rồi nhẩm ${rounded} × ${b} = ${value}.`,
    };
  }
  if (op === '/') {
    const step = b * 10;
    const rounded = roundHalfUpTo(a, step);
    const value = rounded / b;
    return {
      value,
      text: `Chọn số tròn gần ${a} mà dễ chia cho ${b}: ${rounded} : ${b} = ${value}.`,
    };
  }
  throw new RangeError(`Phép tính không được hỗ trợ: ${op}`);
}

/* ------------------------------------------------------------------ */
/* 4. Lời nhắn sư phạm — TÁCH BẠCH "ước lượng hợp lý" và "tính chính xác" (B-06) */
/* ------------------------------------------------------------------ */

/** Phản hồi ngay sau bước 1 — KHÔNG tiết lộ kết quả chính xác hay biên chấp nhận. */
function estimateFeedback(grade) {
  if (grade.reasonable) {
    return grade.mode === 'range'
      ? 'Ước lượng hợp lý! Khoảng con chọn vừa chắc chắn, vừa không quá rộng. Giờ con hãy tính chính xác nhé.'
      : 'Ước lượng hợp lý! Con đoán rất gần kết quả thật. Giờ con hãy tính chính xác nhé.';
  }
  const tail = ' Con vẫn tiếp tục tính chính xác ở bước sau, và cô sẽ chỉ cách ước lượng sau khi con tính xong.';
  switch (grade.reason) {
    case 'range_misses':
      return 'Ước lượng chưa hợp lý: khoảng con chọn chưa chứa kết quả thật.' + tail;
    case 'range_too_wide':
      return 'Ước lượng chưa hợp lý: khoảng con chọn quá rộng nên chưa giúp ích để kiểm tra kết quả.' + tail;
    default:
      return 'Ước lượng chưa hợp lý: số con đoán còn lệch khá xa kết quả thật.' + tail;
  }
}

/** Mô tả ước lượng của học sinh dưới dạng chữ. */
function describeEstimate(est) {
  return est.mode === 'range' ? `khoảng từ ${est.low} đến ${est.high}` : `${est.value}`;
}

/** Phản hồi sau bước 2 — bây giờ mới lộ kết quả chính xác, kèm lời giải ước lượng mẫu. */
function exactFeedback({ op, a, b, exact, given, estimate, grade }) {
  const exactCorrect = given === exact;
  const symbol = op === '*' ? '×' : ':';
  const teach = teachingEstimate(op, a, b);
  const estimateMessage = grade.reasonable
    ? `Ước lượng của con (${describeEstimate(estimate)}) là hợp lý.`
    : `Ước lượng của con (${describeEstimate(estimate)}) chưa hợp lý, còn lệch khá xa kết quả thật.`;
  const exactMessage = exactCorrect
    ? `Kết quả tính chính xác đúng rồi: ${a} ${symbol} ${b} = ${exact}.`
    : `Kết quả tính chính xác chưa đúng: ${a} ${symbol} ${b} = ${exact} (con tính ra ${given}).`;
  return {
    estimateMessage,
    exactMessage,
    teachingMessage: `Cách ước lượng nhanh: ${teach.text} Nhờ vậy con kiểm tra được kết quả có "lạc quẻ" hay không.`,
  };
}

/* ------------------------------------------------------------------ */
/* 5. Sinh fixtures tất định (B-02)                                     */
/* ------------------------------------------------------------------ */

/** PRNG mulberry32: cùng seed → cùng dãy số, chạy giống nhau trên mọi máy. */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function inBand(value, exact) {
  const { lower, upper } = estimateBounds(exact);
  return value >= lower && value <= upper;
}

/**
 * Sinh `count` câu (xen kẽ nhân/chia). Ràng buộc để câu hỏi "dạy được":
 *  - nhân: thừa số một chữ số 2..9; thừa số còn lại 2 chữ số (21..99) hoặc 3 chữ số (101..499), không tròn chục/trăm;
 *  - chia: số chia 2..9, thương 21..99 (chia hết);
 *  - ước lượng mẫu (làm tròn) PHẢI nằm trong biên chấp nhận, để cách dạy và cách chấm nhất quán.
 * @returns {Array<{id:string, op:'*'|'/', a:number, b:number, strategy:string}>}
 */
function generateFixtures(seed = DEFAULT_FIXTURE_SEED, count = 12) {
  const rand = mulberry32(seed);
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const seen = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    const op = i % 2 === 0 ? '*' : '/';
    const threeDigit = Math.floor(i / 2) % 2 === 1;
    let item = null;
    for (let tries = 0; tries < 5000 && !item; tries++) {
      let a, b, strategy;
      if (op === '*') {
        b = pick(2, 9);
        a = threeDigit ? pick(101, 499) : pick(21, 99);
        if (a % 10 === 0) continue;
        strategy = a >= 100 ? 'round-hundreds' : 'round-tens';
      } else {
        b = pick(2, 9);
        const q = pick(21, 99);
        a = q * b;
        if (a % 10 === 0) continue;
        strategy = 'compatible-multiples';
      }
      const key = `${op}|${a}|${b}`;
      if (seen.has(key)) continue;
      const exact = computeExact(op, a, b);
      if (!inBand(teachingEstimate(op, a, b).value, exact)) continue;
      seen.add(key);
      item = { id: `est-${String(i + 1).padStart(2, '0')}`, op, a, b, strategy };
    }
    if (!item) throw new Error('Không sinh được fixture thoả ràng buộc.');
    out.push(item);
  }
  return out;
}

/** Hàng dữ liệu cho bảng `questions` từ một fixture (dùng khi seed DB). */
function fixtureToQuestionRow(f, points = 10) {
  const exact = computeExact(f.op, f.a, f.b);
  const symbol = f.op === '*' ? '×' : ':';
  return {
    id: f.id,
    type: 'estimate',
    prompt: `Ước lượng kết quả: ${f.a} ${symbol} ${f.b}`,
    correctAnswer: String(exact),
    points,
    category: 'Ước lượng',
    meta: { op: f.op, a: f.a, b: f.b, strategy: f.strategy },
  };
}

module.exports = {
  TOLERANCE_PERCENT, RANGE_MAX_WIDTH_PERCENT, ESTIMATE_WEIGHT_PERCENT, MAX_INPUT, DEFAULT_FIXTURE_SEED,
  EstimationInputError,
  parseWholeNumber, parseEstimateInput,
  computeExact, estimateBounds, gradeEstimate, scoreQuestion,
  teachingEstimate, estimateFeedback, exactFeedback, describeEstimate,
  generateFixtures, fixtureToQuestionRow,
};
