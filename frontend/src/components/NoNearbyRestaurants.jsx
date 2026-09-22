import '../styles/no-nearby.css'

const NoNearbyRestaurants = () => <div className="no-nearby-state">
  <span className="no-nearby-icon" aria-hidden="true">📍</span>
  <h2>No restaurant available in your 30km radius</h2>
  <p>We don't have a partner restaurant near you just yet. Our team will reach out soon to bring ZomaFeeds to your area.</p>
</div>

export default NoNearbyRestaurants
