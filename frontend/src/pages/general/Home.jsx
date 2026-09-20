import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../config/api'
import LoadingState from '../../components/LoadingState'
import '../../styles/directory.css'

const TOP_FOODS_LIMIT = 12

const partnerIdOf = food => typeof food.foodPartner === 'object' ? food.foodPartner?._id : food.foodPartner

const Home = () => {
  const [partners, setPartners] = useState([])
  const [foods, setFoods] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 280)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    Promise.all([api.get('/api/food-partner'), api.get('/api/food')])
      .then(([partnerResponse, foodResponse]) => {
        setPartners(partnerResponse.data.foodPartners)
        setFoods(foodResponse.data.foodItems)
      })
      .catch(() => setError('Unable to load food discovery right now.'))
      .finally(() => setIsLoading(false))
  }, [])

  const isSearching = Boolean(debouncedSearch)

  const partnerPopularity = useMemo(() => new Map(partners.map(partner => [partner._id, (partner.customersServed || 0) + (partner.reviewCount || 0)])), [partners])

  const filteredFoods = useMemo(() => foods.filter(food => {
    if (!isSearching) return true
    const partnerName = typeof food.foodPartner === 'object' ? food.foodPartner?.name : ''
    return `${food.name} ${food.description || ''} ${partnerName || ''}`.toLowerCase().includes(debouncedSearch)
  }), [foods, isSearching, debouncedSearch])

  const visibleFoods = useMemo(() => {
    const sorted = [...filteredFoods].sort((a, b) => (partnerPopularity.get(partnerIdOf(b)) || 0) - (partnerPopularity.get(partnerIdOf(a)) || 0))
    return isSearching ? sorted : sorted.slice(0, TOP_FOODS_LIMIT)
  }, [filteredFoods, partnerPopularity, isSearching])

  const filteredPartners = useMemo(() => isSearching ? partners.filter(partner => `${partner.name} ${partner.address}`.toLowerCase().includes(debouncedSearch)) : [], [partners, isSearching, debouncedSearch])

  return <main className="directory-page">
    <header className="directory-header">
      <p className="eyebrow">Discover nearby</p>
      <h1>Explore the food reel.<br />View it. Crave it.</h1>
      <p>Find restaurants, watch their food stories, and discover your next favorite bite.</p>
      <div className="search-box"><span aria-hidden="true">⌕</span><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search restaurants or food" aria-label="Search restaurants or food" /></div>
    </header>
    {isLoading ? <LoadingState label="Loading food discovery..." /> : error ? <p className="error-text" role="alert">{error}</p> : <>
      <div className="directory-cta"><div><span className="eyebrow">{isSearching ? 'Search results' : 'Fresh from the kitchen'}</span><h2>{isSearching ? `Results for “${searchTerm}”` : 'Top picks near you.'}</h2></div><Link className="reel-btn" to="/reels">Watch full reels</Link></div>
      {visibleFoods.length > 0 ? <section className="food-reel-grid" aria-label="Food reels">{visibleFoods.map(food => <FoodReelCard key={food._id} food={food} />)}</section> : <p className="empty-copy">{isSearching ? `No food reel matched “${searchTerm}”.` : 'No food reels yet.'}</p>}
      {isSearching && filteredPartners.length > 0 && <section className="restaurant-section"><div className="section-heading"><h2>Restaurants</h2><span>{filteredPartners.length} places</span></div><div className="partner-grid">{filteredPartners.map(partner => <PartnerCard key={partner._id} partner={partner} />)}</div></section>}
    </>}
  </main>
}

const FoodReelCard = ({ food }) => {
  const partner = typeof food.foodPartner === 'object' ? food.foodPartner : null
  return <Link className="food-reel-card" to={partner?._id ? `/food-partner/${partner._id}?food=${food._id}` : `/order/${food._id}`}>
    <video src={food.video} muted playsInline preload="metadata" />
    <span className="food-reel-shade" />
    <span className="food-reel-content"><strong>{food.name}</strong><small>{partner?.name || 'Food partner'}</small></span>
  </Link>
}

const PartnerCard = ({ partner }) => <Link className="partner-card" to={`/food-partner/${partner._id}`}>
  {partner.profilePicture ? <img className="partner-card-avatar" src={partner.profilePicture} alt={`${partner.name} profile`} /> : <div className="partner-card-avatar">{partner.name?.slice(0, 1)}</div>}
  <div><h2>{partner.name}</h2><p>{partner.address}</p><small>{partner.totalMeals} food reels</small></div>
</Link>

export default Home
