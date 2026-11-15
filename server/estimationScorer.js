/**
 * Module chấm điểm tất định cho dạng bài "Ước lượng trước khi tính đúng" (Track B)
 */

function calculateExactResult(num1, num2, operator) {
  if (operator === '*') return num1 * num2;
  if (operator === '/') return Math.round(num1 / num2); // Làm tròn số nguyên cho phép chia
  throw new Error(`Unsupported operator: ${operator}`);
}

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
