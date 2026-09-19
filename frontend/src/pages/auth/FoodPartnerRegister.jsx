import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth-shared.css';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import AuthCredentialField from '../../components/AuthCredentialField';
import AuthClose from '../../components/AuthClose';

const FoodPartnerRegister = () => {

  const navigate = useNavigate()
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const businessName = e.target.businessName.value;
    const contactName = e.target.contactName.value;
    const phone = e.target.phone.value;
    const password = e.target.password?.value;
    const otp = e.target.otp?.value;
    const address = e.target.address.value;
    const restaurantType = e.target.restaurantType.value;
    const profilePicture = e.target.profilePicture.files[0];

    const formData = new FormData();
    formData.append('name', businessName);
    formData.append('contactName', contactName);
    formData.append('phone', phone);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (otp) formData.append('otp', otp);
    formData.append('address', address);
    formData.append('restaurantType', restaurantType);
    if (profilePicture) formData.append('profilePicture', profilePicture);

    try {
      setError('');
      setIsSubmitting(true);
      await api.post('/api/auth/food-partner/register', formData);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthClose />
      <div className="auth-card" role="region" aria-labelledby="partner-register-title">
        <header>
          <h1 id="partner-register-title" className="auth-title">Partner sign up</h1>
          <p className="auth-subtitle">Grow your business with our platform.</p>
        </header>
        <nav className="auth-alt-action" style={{marginTop: '-4px'}}>
          <strong style={{fontWeight:600}}>Switch:</strong> <Link to="/user/register" state={{ internal: true }}>User</Link> • <Link to="/food-partner/register" state={{ internal: true }}>Food partner</Link>
        </nav>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="businessName">Business Name</label>
            <input id="businessName" name="businessName" placeholder="Tasty Bites" autoComplete="organization" required />
          </div>
          <div className="two-col">
            <div className="field-group">
              <label htmlFor="contactName">Contact Name</label>
              <input id="contactName" name="contactName" placeholder="Rahul" autoComplete="name" required />
            </div>
            <div className="field-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" placeholder="+91 xxxx-xxxx" autoComplete="tel" required />
            </div>
          </div>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="business@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          <AuthCredentialField role="foodPartner" purpose="register" email={email} />
          <div className="field-group">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" placeholder="123 Market Street" autoComplete="street-address" required />
            <p className="small-note">Full address helps customers find you faster.</p>
          </div>
          <div className="field-group">
            <label htmlFor="restaurantType">Restaurant type</label>
            <select id="restaurantType" name="restaurantType" defaultValue="Both" required>
              <option value="Veg">Veg</option>
              <option value="Non-Veg">Non-Veg</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="profilePicture">Profile picture <span className="small-note">(optional, max 5 MB)</span></label>
            <input id="profilePicture" name="profilePicture" type="file" accept="image/*" />
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create Partner Account'}</button>
        </form>
        <div className="auth-alt-action">
          Already a partner? <Link to="/food-partner/login" state={{ internal: true }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPartnerRegister;
