import { useState } from 'react'
import api from '../config/api'

const AuthCredentialField = ({ role, purpose, email }) => {
  const [method, setMethod] = useState('password')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpError, setOtpError] = useState('')

  const sendOtp = async () => {
    setOtpError('')
    if (!email) { setOtpError('Enter your email first.'); return }
    try {
      setIsSendingOtp(true)
      await api.post('/api/auth/otp/request', { email, role, purpose })
      setOtpSent(true)
    } catch (requestError) {
      setOtpError(requestError.response?.data?.message || 'Could not send the OTP. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  return <div className="field-group">
    <div className="auth-method-toggle">
      <button type="button" className={method === 'password' ? 'is-active' : ''} onClick={() => setMethod('password')}>Password</button>
      <button type="button" className={method === 'otp' ? 'is-active' : ''} onClick={() => setMethod('otp')}>Email OTP</button>
    </div>

    {method === 'password' ? <>
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" placeholder="••••••••" autoComplete={purpose === 'register' ? 'new-password' : 'current-password'} minLength={purpose === 'register' ? 8 : undefined} required />
    </> : <>
      <label htmlFor="otp">4-digit code</label>
      <div className="otp-row">
        <input id="otp" name="otp" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" required />
        <button type="button" onClick={sendOtp} disabled={isSendingOtp || !email}>{isSendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Get OTP'}</button>
      </div>
      {otpSent && !otpError && <p className="small-note">Code sent to {email} — expires in 5 minutes.</p>}
      {otpError && <p className="error-text" role="alert">{otpError}</p>}
    </>}
  </div>
}

export default AuthCredentialField
