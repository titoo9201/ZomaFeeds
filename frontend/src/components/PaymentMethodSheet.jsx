import { PAYMENT_OPTIONS } from '../config/paymentOptions'
import '../styles/checkout-sheet.css'

const GROUPS = [...new Set(PAYMENT_OPTIONS.map(option => option.group))]

const PaymentMethodSheet = ({ selected, onSelect, onClose }) => <div className="sheet-overlay">
  <header className="sheet-header">
    <button type="button" className="sheet-back" onClick={onClose} aria-label="Back">←</button>
    <h2>Select payment method</h2>
  </header>
  <div className="sheet-body">
    {GROUPS.map(group => <div className="sheet-group" key={group}>
      <span className="sheet-group-label">{group}</span>
      {PAYMENT_OPTIONS.filter(option => option.group === group).map(option => <button
        type="button"
        key={option.id}
        className={`sheet-row ${selected?.id === option.id ? 'is-selected' : ''}`}
        onClick={() => { onSelect(option); onClose() }}
      >
        <span className="sheet-row-icon" aria-hidden="true">{option.icon}</span>
        <span className="sheet-row-label">{option.label}</span>
        {selected?.id === option.id && <span className="sheet-row-check" aria-hidden="true">✓</span>}
      </button>)}
    </div>)}
    <p className="sheet-note">This is a dummy checkout for testing — no real payment is ever charged.</p>
  </div>
</div>

export default PaymentMethodSheet
