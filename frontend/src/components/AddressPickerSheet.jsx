import SavedAddresses from './SavedAddresses'
import '../styles/checkout-sheet.css'

const AddressPickerSheet = ({ onSelect, onClose }) => <div className="sheet-overlay">
  <header className="sheet-header">
    <button type="button" className="sheet-back" onClick={onClose} aria-label="Back">←</button>
    <h2>Select delivery address</h2>
  </header>
  <div className="sheet-body">
    <SavedAddresses selectable onSelect={item => { onSelect(item); onClose() }} />
  </div>
</div>

export default AddressPickerSheet
