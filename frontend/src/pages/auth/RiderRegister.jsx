import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth-shared.css';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import AuthCredentialField from '../../components/AuthCredentialField';
import AuthClose from '../../components/AuthClose';

const RiderRegister = () => {

  const navigate = useNavigate()
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = e.target.name.value;
    const phone = e.target.phone.value;
    const vehicleNumber = e.target.vehicleNumber.value;
    const password = e.target.password?.value;
    const otp = e.target.otp?.value;
    const profilePicture = e.target.profilePicture.files[0];

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('vehicleNumber', vehicleNumber);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (otp) formData.append('otp', otp);
    if (profilePicture) formData.append('profilePicture', profilePicture);

    try {
      setError('');
      setIsSubmitting(true);
      await api.post('/api/rider/register', formData);
      navigate('/rider/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthClose />
      <div className="auth-card" role="region" aria-labelledby="rider-register-title">
        <header>
          <h1 id="rider-register-title" className="auth-title">Rider sign up</h1>
          <p className="auth-subtitle">Start delivering with ZomaFeeds.</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" placeholder="Rahul Kumar" autoComplete="name" required />
          </div>
          <div className="two-col">
            <div className="field-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" placeholder="+91 xxxx-xxxx" autoComplete="tel" required />
            </div>
            <div className="field-group">
              <label htmlFor="vehicleNumber">Vehicle number</label>
              <input id="vehicleNumber" name="vehicleNumber" placeholder="DL01AB1234" required />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="rider@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <AuthCredentialField role="rider" purpose="register" email={email} />
          <div className="field-group">
            <label htmlFor="profilePicture">Profile picture <span className="small-note">(optional, max 5 MB)</span></label>
            <input id="profilePicture" name="profilePicture" type="file" accept="image/*" />
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create Rider Account'}</button>
        </form>
        <div className="auth-alt-action">
          Already a rider? <Link to="/rider/login" state={{ internal: true }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RiderRegister;
