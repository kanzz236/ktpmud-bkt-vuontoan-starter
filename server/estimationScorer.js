/**
 * Module chấm điểm tất định cho dạng bài "Ước lượng trước khi tính đúng" (Track B)
 */

/**
 * Tính toán kết quả chính xác của phép tính (nhân hoặc chia)
 * @param {number} num1 
 * @param {number} num2 
 * @param {string} operator - '*' hoặc '/'
 * @returns {number}
 */
function calculateExactResult(num1, num2, operator) {
  if (operator === '*') return num1 * num2;
  if (operator === '/') return Math.round(num1 / num2); // Hoặc giữ nguyên số thực tùy thiết kế
  throw new Error(`Unsupported operator: ${operator}`);
}

/**
 * Kiểm tra ước lượng của học sinh có nằm trong biên độ chấp nhận được không
 * @param {number} userEstimation - Giá trị học sinh ước lượng
 * @param {number} exactResult - Kết quả tính toán chính xác
 * @param {number} tolerancePercent - Biên độ sai số cho phép (mặc định 15% hoặc 20% cho học sinh lớp 3)
 * @returns {object} { isReasonable: boolean, exact: number, message: string }
 */
function evaluateEstimation(userEstimation, exactResult, tolerancePercent = 20) {
  const allowedDelta = Math.abs(exactResult * (tolerancePercent / 100));
  const lowerBound = exactResult - allowedDelta;
  const upperBound = exactResult + allowedDelta;

  const isReasonable = userEstimation >= lowerBound && userEstimation <= upperBound;

  return {
    isReasonable,
    exactResult,
    toleranceRange: { lowerBound, upperBound },
    message: isReasonable 
      ? "Tuyệt vời! Ước lượng của con rất sát với kết quả thực tế." 
      : "Ước lượng chưa chính xác lắm, con hãy thử làm tròn số tròn chục hoặc tròn trăm rồi tính lại nhé!"
  };
}

module.exports = {
  calculateExactResult,
  evaluateEstimation
};
