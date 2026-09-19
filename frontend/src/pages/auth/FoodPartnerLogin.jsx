import React, { useState } from 'react';
import '../../styles/auth-shared.css';
import api from '../../config/api';
import { Link, useNavigate } from 'react-router-dom';
import AuthCredentialField from '../../components/AuthCredentialField';
import AuthClose from '../../components/AuthClose';

const FoodPartnerLogin = () => {

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault()

    const password = e.target.password?.value;
    const otp = e.target.otp?.value;

    try {
      setError('');
      setIsSubmitting(true);
      await api.post('/api/auth/food-partner/login', { email, password, otp });
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }

  };

  return (
    <div className="auth-page-wrapper">
      <AuthClose />
      <div className="auth-card" role="region" aria-labelledby="partner-login-title">
        <header>
          <h1 id="partner-login-title" className="auth-title">Partner login</h1>
          <p className="auth-subtitle">Access your dashboard and manage orders.</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="business@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <AuthCredentialField role="foodPartner" purpose="login" email={email} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div className="auth-alt-action">
          New partner? <Link to="/food-partner/register" state={{ internal: true }}>Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPartnerLogin;
