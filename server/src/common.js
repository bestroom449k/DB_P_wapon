// 여러 API가 같이 쓰는 작은 도구

export const toId = (value) => (/^[1-9]\d{0,17}$/.test(value) ? value : null); // 주소의 번호 (숫자가 아니면 null)

export const requireLogin = (message = '로그인이 필요해요') => (req, res, next) => { // 로그인해야 하는 요청 (로그인 전이면 message로 401)
  if (!req.session.userId) return res.status(401).json({ message });
  next();
};
