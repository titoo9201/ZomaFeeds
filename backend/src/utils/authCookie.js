const jwt = require('jsonwebtoken');

// SameSite=None + Secure is required for the auth cookie to survive on iOS Safari (and other
// browsers' cross-site cookie policies/ITP) when the frontend and backend are on different
// domains — Safari drops any cross-site cookie that isn't explicitly marked this way. Locally
// (plain http) that combination doesn't work at all (browsers reject Secure cookies over http),
// so it only applies in production.
function cookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
    };
}

function setAuthCookie(res, id, role) {
    const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

// Must repeat the exact sameSite/secure attributes used when the cookie was set — a clearCookie
// call with mismatched attributes is treated as a different cookie by strict browsers (iOS
// Safari in particular) and won't actually remove the original, leaving a stale session behind.
function clearAuthCookie(res) {
    res.clearCookie('token', cookieOptions());
}

module.exports = { setAuthCookie, clearAuthCookie };
