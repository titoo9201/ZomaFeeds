import React, { useState } from 'react';
import '../../styles/auth-shared.css';
import api from '../../config/api';
import { Link, useNavigate } from 'react-router-dom';
import AuthCredentialField from '../../components/AuthCredentialField';
import AuthClose from '../../components/AuthClose';

const UserLogin = () => {

  const navigate = useNavigate()
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const password = e.target.password?.value;
    const otp = e.target.otp?.value;

    try {
      setError('');
      setIsSubmitting(true);
      await api.post('/api/auth/user/login', {
        email,
        password,
        otp
      });

      navigate("/home");
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthClose />
      <div className="auth-card" role="region" aria-labelledby="user-login-title">
        <header>
          <h1 id="user-login-title" className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue your food journey.</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <AuthCredentialField role="user" purpose="login" email={email} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div className="auth-alt-action">
          New here? <Link to="/user/register" state={{ internal: true }}>Create account</Link>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
