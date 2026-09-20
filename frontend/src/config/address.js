export const EMPTY_ADDRESS = { houseNo: '', street: '', city: '', state: '', pincode: '' }

export const ADDRESS_LABELS = ['Home', 'Girlfriend', 'Boyfriend', 'Friend', 'Relative', 'Other']

export const formatAddress = ({ houseNo, street, city, state, pincode } = {}) =>
  [houseNo, street, city, state, pincode].map(part => part?.trim()).filter(Boolean).join(', ')
