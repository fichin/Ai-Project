import { useState } from 'react'
import Icon from './icons/Icon'
import './PasswordInput.css'

// Shared by Login and Register's password fields (2+ places, same bar as
// every other entry in the icons registry) so the show/hide behavior and
// markup only live in one spot. Visibility is local, per-field state — never
// lifted — since each field toggles independently and nothing outside the
// field ever needs to know whether it's currently shown.
function PasswordInput({ id, value, onChange, autoComplete, required, ...rest }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="password-input">
      <input
        id={id}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
      >
        <Icon name={isVisible ? 'eye-off' : 'eye'} size={18} />
      </button>
    </div>
  )
}

export default PasswordInput
