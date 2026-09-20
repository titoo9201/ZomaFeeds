import { Link } from 'react-router-dom'
import { Clapperboard, Star, Bike, Music2, Home, ChefHat } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import '../../styles/landing.css'

const FEATURES = [
  { Icon: Clapperboard, title: 'Reels-first discovery', text: 'Scroll vertical food videos from restaurants near you before you decide what to order.' },
  { Icon: Star, title: 'Reviews you can trust', text: 'Only customers whose order was actually accepted by the restaurant can leave a rating.' },
  { Icon: Bike, title: 'Live order updates', text: 'Track your order from Preparing to Out for delivery to Delivered, in real time.' },
  { Icon: Music2, title: 'Set the mood', text: 'Restaurants can add a song to their reels, Instagram-style, so every dish has a soundtrack.' }
]

const USER_POINTS = [
  'Discover restaurants through short, honest food reels',
  'Like, save, and comment on the dishes you love',
  'A simple checkout with UPI, card, or cash on delivery',
  'Get notified the moment a closed restaurant reopens'
]

const RIDER_POINTS = [
  'Go online whenever you want to start earning',
  'Accept nearby delivery requests in real time',
  'Live GPS guides you from pickup to drop-off',
  'Get paid for every delivery you complete'
]

const PARTNER_POINTS = [
  'A dashboard for today, yesterday, and 30-day orders & revenue',
  'Accept or reject orders, then move them through your kitchen',
  'Full control over your menu — price, availability, and photos',
  'Toggle open/closed anytime, on your own schedule'
]

const YEAR = new Date().getFullYear()

const MailIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6.5 8 6 8-6" /></svg>
const GithubIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.19c0 4.49 2.87 8.3 6.84 9.64.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.19C22 6.58 17.52 2 12 2Z" /></svg>
const InstagramIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
const LinkedinIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3.2 9h3.6v11.5H3.2V9Zm6.4 0h3.45v1.57h.05c.48-.9 1.66-1.86 3.42-1.86 3.66 0 4.33 2.4 4.33 5.53v6.26h-3.6v-5.55c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.93v5.64H9.6V9Z" /></svg>

const LandingPage = () => <div className="landing-page">
  <header className="landing-nav">
    <div className="landing-nav-inner">
      <span className="landing-logo">ZomaFeeds</span>
      <nav className="landing-nav-links">
        <ThemeToggle className="theme-toggle--inline" />
        <Link to="/food-partner/login" state={{ internal: true }}>Partner login</Link>
        <Link to="/rider/login" state={{ internal: true }}>Rider login</Link>
        <Link to="/user/login" state={{ internal: true }} className="landing-nav-cta">Sign in</Link>
      </nav>
    </div>
  </header>

  <section className="landing-hero">
    <div className="landing-hero-inner">
      <span className="landing-hero-eyebrow">Food, but make it watchable</span>
      <h1>Discover food you'll actually crave.</h1>
      <p>Scroll bite-sized food reels from restaurants near you, then order in a tap — or bring your restaurant onto ZomaFeeds and reach hungry customers instantly.</p>
      <div className="landing-hero-actions">
        <Link to="/user/register" state={{ internal: true }} className="landing-btn landing-btn-primary">I'm hungry — Get started</Link>
        <Link to="/rider/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">I want to deliver</Link>
        <Link to="/food-partner/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">I run a restaurant</Link>
      </div>
      <p className="landing-hero-signin">Already on ZomaFeeds? <Link to="/user/login" state={{ internal: true }}>Sign in as customer</Link> · <Link to="/rider/login" state={{ internal: true }}>Sign in as rider</Link> · <Link to="/food-partner/login" state={{ internal: true }}>Sign in as partner</Link></p>
    </div>
  </section>

  <section className="landing-section">
    <div className="landing-section-head">
      <span className="eyebrow">Why ZomaFeeds</span>
      <h2>Not just another delivery app.</h2>
      <p>Every feature is built around watching food before you order it.</p>
    </div>
    <div className="landing-feature-grid">
      {FEATURES.map(feature => <article className="landing-feature-card" key={feature.title}>
        <span className="landing-feature-icon" aria-hidden="true"><feature.Icon size={22} strokeWidth={2} /></span>
        <h3>{feature.title}</h3>
        <p>{feature.text}</p>
      </article>)}
    </div>
  </section>

  <div className="landing-split-wrap">
    <section className="landing-section">
      <div className="landing-section-head">
        <span className="eyebrow">Three sides, one app</span>
        <h2>Whichever side of the order you're on.</h2>
      </div>
      <div className="landing-split landing-split--triple">
        <div className="landing-split-col">
          <span className="landing-split-icon" aria-hidden="true"><Home size={22} /></span>
          <span className="eyebrow">For foodies</span>
          <h3>Watch first. Order when you're convinced.</h3>
          <ul>{USER_POINTS.map(point => <li key={point}><span className="tick">✓</span>{point}</li>)}</ul>
          <Link to="/user/register" state={{ internal: true }} className="landing-btn landing-btn-primary">Create a free account</Link>
        </div>
        <div className="landing-split-col landing-split-col--rider">
          <span className="landing-split-icon" aria-hidden="true"><Bike size={22} /></span>
          <span className="eyebrow">For riders</span>
          <h3>Ride, deliver, earn — on your schedule.</h3>
          <ul>{RIDER_POINTS.map(point => <li key={point}><span className="tick">✓</span>{point}</li>)}</ul>
          <Link to="/rider/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">Start delivering</Link>
        </div>
        <div className="landing-split-col landing-split-col--partner">
          <span className="landing-split-icon" aria-hidden="true"><ChefHat size={22} /></span>
          <span className="eyebrow">For restaurants</span>
          <h3>Run your kitchen from one dashboard.</h3>
          <ul>{PARTNER_POINTS.map(point => <li key={point}><span className="tick">✓</span>{point}</li>)}</ul>
          <Link to="/food-partner/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">Partner with us</Link>
        </div>
      </div>
    </section>
  </div>

  <section className="landing-cta-band">
    <h2>Ready to dive in?</h2>
    <p>It takes less than a minute to get started — with a password or just an email OTP.</p>
    <div className="landing-hero-actions">
      <Link to="/user/register" state={{ internal: true }} className="landing-btn landing-btn-primary">I'm hungry — Get started</Link>
      <Link to="/rider/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">I want to deliver</Link>
      <Link to="/food-partner/register" state={{ internal: true }} className="landing-btn landing-btn-ghost">I run a restaurant</Link>
    </div>
  </section>

  <footer className="landing-footer">
    <div className="landing-footer-top">
      <div className="landing-footer-brand">
        <span className="landing-logo">ZomaFeeds</span>
        <p>Food discovery, one reel at a time. Watch it, crave it, order it.</p>
      </div>
      <div className="landing-footer-col">
        <h4>Contact ZomaFeeds</h4>
        <a href="mailto:zomafeeds@gmail.com">zomafeeds@gmail.com</a>
      </div>
      <div className="landing-footer-col">
        <h4>Built by Titoo Singh</h4>
        <div className="landing-footer-socials">
          <a href="mailto:titoos67@gmail.com" aria-label="Email Titoo Singh"><MailIcon /></a>
          <a href="https://github.com/titoo9201" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon /></a>
          <a href="https://www.instagram.com/titoo_9201/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>
          <a href="https://www.linkedin.com/in/titoo-singh-dev/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedinIcon /></a>
        </div>
      </div>
    </div>
    <div className="landing-footer-bottom">
      <span>© {YEAR} ZomaFeeds. All rights reserved.</span>
      <span>A dummy checkout for testing — no real payments are made.</span>
    </div>
  </footer>
</div>

export default LandingPage
