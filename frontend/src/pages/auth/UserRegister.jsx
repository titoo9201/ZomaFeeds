import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth-shared.css';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import AuthCredentialField from '../../components/AuthCredentialField';
import AuthClose from '../../components/AuthClose';

const UserRegister = () => {

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const firstName = e.target.firstName.value;
        const lastName = e.target.lastName.value;
        const password = e.target.password?.value;
        const otp = e.target.otp?.value;
        const profilePicture = e.target.profilePicture.files[0];

        const formData = new FormData();
        formData.append('fullName', firstName + " " + lastName);
        formData.append('email', email);
        if (password) formData.append('password', password);
        if (otp) formData.append('otp', otp);
        if (profilePicture) formData.append('profilePicture', profilePicture);

        try {
            setError('');
            setIsSubmitting(true);
            await api.post('/api/auth/user/register', formData);
            navigate('/home');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }

    };

    return (
        <div className="auth-page-wrapper">
            <AuthClose />
            <div className="auth-card" role="region" aria-labelledby="user-register-title">
                <header>
                    <h1 id="user-register-title" className="auth-title">Create your account</h1>
                    <p className="auth-subtitle">Join to explore and enjoy delicious meals.</p>
                </header>
                <nav className="auth-alt-action" style={{ marginTop: '-4px' }}>
                    <strong style={{ fontWeight: 600 }}>Switch:</strong> <Link to="/user/register" state={{ internal: true }}>User</Link> • <Link to="/food-partner/register" state={{ internal: true }}>Food partner</Link>
                </nav>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="two-col">
                        <div className="field-group">
                            <label htmlFor="firstName">First Name</label>
                            <input id="firstName" name="firstName" placeholder="Rahul" autoComplete="given-name" required />
                        </div>
                        <div className="field-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input id="lastName" name="lastName" placeholder="singh" autoComplete="family-name" required />
                        </div>
                    </div>
                    <div className="field-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <AuthCredentialField role="user" purpose="register" email={email} />
                    <div className="field-group">
                        <label htmlFor="profilePicture">Profile picture <span className="small-note">(optional, max 5 MB)</span></label>
                        <input id="profilePicture" name="profilePicture" type="file" accept="image/*" />
                    </div>
                    {error && <p className="error-text" role="alert">{error}</p>}
                    <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Sign Up'}</button>
                </form>
                <div className="auth-alt-action">
                    Already have an account? <Link to="/user/login" state={{ internal: true }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default UserRegister;
