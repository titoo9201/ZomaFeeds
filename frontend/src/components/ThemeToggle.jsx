import { useEffect, useState } from 'react'
import '../styles/theme-toggle.css'

const getInitialTheme = () => {
  const savedTheme = window.localStorage.getItem('zomafeeds-theme')
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light'
}

const ThemeToggle = ({ className = '' }) => {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('zomafeeds-theme', theme)
  }, [theme])

  const nextTheme = theme === 'light' ? 'dark' : 'light'
  return <button className={`theme-toggle ${className}`.trim()} type="button" onClick={() => setTheme(nextTheme)} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`}>
    <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
    <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
  </button>
}

export default ThemeToggle
