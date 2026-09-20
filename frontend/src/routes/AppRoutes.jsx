import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import api from '../config/api'
import '../styles/loading.css'
import LandingPage from '../pages/auth/LandingPage'
import UserRegister from '../pages/auth/UserRegister'
import UserLogin from '../pages/auth/UserLogin'
import FoodPartnerRegister from '../pages/auth/FoodPartnerRegister'
import FoodPartnerLogin from '../pages/auth/FoodPartnerLogin'
import RiderRegister from '../pages/auth/RiderRegister'
import RiderLogin from '../pages/auth/RiderLogin'
import Home from '../pages/general/Home'
import Reels from '../pages/general/Reels'
import Saved from '../pages/general/Saved'
import UserProfile from '../pages/general/UserProfile'
import OrderPage from '../pages/general/OrderPage'
import PaymentPage from '../pages/general/PaymentPage'
import Profile from '../pages/food-partner/Profile'
import Dashboard from '../pages/food-partner/Dashboard'
import ManageFood from '../pages/food-partner/ManageFood'
import CreateFood from '../pages/food-partner/CreateFood'
import RiderDashboard from '../pages/rider/RiderDashboard'
import RiderProfile from '../pages/rider/RiderProfile'
import BottomNav from '../components/BottomNav'
import PartnerBottomNav from '../components/PartnerBottomNav'
import RiderBottomNav from '../components/RiderBottomNav'

const Guard = ({ role, children }) => {
    const location = useLocation()
    const [session, setSession] = useState(undefined)
    useEffect(() => { api.get('/api/auth/me').then(({ data }) => setSession(data)).catch(() => setSession(null)) }, [location.pathname])
    if (session === undefined) return <div className="loading-screen">Loading your session...</div>
    if (!session || session.role !== role) return <Navigate to="/" replace />
    return children
}

const InternalOnly = ({ children }) => {
    const location = useLocation()
    if (!location.state?.internal) return <Navigate to="/" replace />
    return children
}

const UserShell = ({ children }) => <Guard role="user"><>{children}<BottomNav /></></Guard>
const CheckoutShell = ({ children }) => <Guard role="user">{children}</Guard>
const PartnerShell = ({ children }) => <Guard role="foodPartner"><>{children}<PartnerBottomNav /></></Guard>
const PartnerFocusShell = ({ children }) => <Guard role="foodPartner">{children}</Guard>
const RiderShell = ({ children }) => <Guard role="rider"><>{children}<RiderBottomNav /></></Guard>

const AppRoutes = () => <Router><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/user/register" element={<InternalOnly><UserRegister /></InternalOnly>} />
    <Route path="/user/login" element={<InternalOnly><UserLogin /></InternalOnly>} />
    <Route path="/food-partner/register" element={<InternalOnly><FoodPartnerRegister /></InternalOnly>} />
    <Route path="/food-partner/login" element={<InternalOnly><FoodPartnerLogin /></InternalOnly>} />
    <Route path="/rider/register" element={<InternalOnly><RiderRegister /></InternalOnly>} />
    <Route path="/rider/login" element={<InternalOnly><RiderLogin /></InternalOnly>} />
    <Route path="/home" element={<UserShell><Home /></UserShell>} />
    <Route path="/reels" element={<UserShell><Reels /></UserShell>} />
    <Route path="/saved" element={<UserShell><Saved /></UserShell>} />
    <Route path="/user-profile" element={<UserShell><UserProfile /></UserShell>} />
    <Route path="/order/:foodId" element={<CheckoutShell><OrderPage /></CheckoutShell>} />
    <Route path="/payment/:orderId" element={<CheckoutShell><PaymentPage /></CheckoutShell>} />
    <Route path="/food-partner/:id" element={<UserShell><Profile /></UserShell>} />
    <Route path="/dashboard" element={<PartnerShell><Dashboard /></PartnerShell>} />
    <Route path="/create-food" element={<PartnerFocusShell><CreateFood /></PartnerFocusShell>} />
    <Route path="/manage-food/:id" element={<PartnerFocusShell><ManageFood /></PartnerFocusShell>} />
    <Route path="/profile" element={<PartnerShell><Profile /></PartnerShell>} />
    <Route path="/rider/dashboard" element={<RiderShell><RiderDashboard /></RiderShell>} />
    <Route path="/rider/profile" element={<RiderShell><RiderProfile /></RiderShell>} />
    <Route path="*" element={<Navigate to="/" replace />} />
</Routes></Router>

export default AppRoutes
