// address is a single editable text field — pre-filled with Google's own readable address when
// a Maps link to a named place is pasted, but always freely editable (e.g. to add a flat/shop
// number) before saving. Whatever it holds at save time is trusted as-is as the display address.
export const EMPTY_ADDRESS = { lat: null, lng: null, address: '' }

export const ADDRESS_LABELS = ['Home', 'Girlfriend', 'Boyfriend', 'Friend', 'Relative', 'Other']
