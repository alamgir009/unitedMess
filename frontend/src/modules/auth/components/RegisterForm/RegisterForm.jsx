import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '@/modules/auth/store/auth.slice';
import Button from '@/shared/ui/Button/Button';
import Input from '@/shared/ui/Input/Input';
import { toast } from 'react-hot-toast';

// ==================== CONSTANTS ====================
// India and its neighboring countries (ISO codes, dial codes, flags)
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', iso: 'IN' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', iso: 'PK' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', iso: 'BD' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', iso: 'NP' },
  { code: '+975', country: 'Bhutan', flag: '🇧🇹', iso: 'BT' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲', iso: 'MM' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', iso: 'LK' },
  { code: '+960', country: 'Maldives', flag: '🇲🇻', iso: 'MV' },
  { code: '+86', country: 'China', flag: '🇨🇳', iso: 'CN' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫', iso: 'AF' },
];

// Validation helpers
const validateEmail = (email) => /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email);
const validatePhoneNumber = (phone) => /^\d{5,15}$/.test(phone);
const validatePassword = (password) => password.length >= 8;

// ==================== CUSTOM DROPDOWN COMPONENT ====================
// Fintech-grade, accessible, searchable, keyboard navigable
const CountryCodeDropdown = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const selectedOption = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return COUNTRY_CODES;
    const term = searchTerm.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) =>
        c.country.toLowerCase().includes(term) ||
        c.code.includes(term) ||
        c.iso.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setSearchTerm('');
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  };

  const selectCountry = (countryCode) => {
    onChange({ target: { name: 'countryCode', value: countryCode } });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select country code"
      >
        <span>
          {selectedOption.flag} {selectedOption.code} ({selectedOption.country})
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-input">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search country or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input px-2 py-1 text-sm focus:border-primary focus:outline-none"
              aria-label="Search countries"
            />
          </div>

          {/* Options list */}
          <ul
            className="max-h-60 overflow-y-auto py-1"
            role="listbox"
            aria-label="Country codes"
          >
            {filteredCountries.map((country) => (
              <li
                key={country.code}
                onClick={() => selectCountry(country.code)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${
                  value === country.code ? 'bg-primary/10 text-primary font-medium' : ''
                }`}
                role="option"
                aria-selected={value === country.code}
              >
                <span>{country.flag}</span>
                <span className="flex-1">
                  {country.code} ({country.country})
                </span>
                {value === country.code && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ))}
            {filteredCountries.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No countries found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN REGISTER FORM ====================
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',      // digits only
    countryCode: '+91',   // India selected by default
    password: '',
    confirmPassword: '',
  });

  const { name, email, phoneNumber, countryCode, password, confirmPassword } = formData;
  const dispatch = useDispatch();
  const { isLoading, isError, message } = useSelector((state) => state.auth);

  // Optimized change handler
  const onChange = useCallback((e) => {
    const { name: fieldName, value } = e.target;
    setFormData((prev) => {
      if (fieldName === 'phoneNumber') {
        const digitsOnly = value.replace(/\D/g, '');
        return { ...prev, [fieldName]: digitsOnly };
      }
      return { ...prev, [fieldName]: value };
    });
  }, []);

  // Validation
  const validateForm = useCallback(() => {
    if (!name.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!email.trim()) {
      toast.error('Email address is required');
      return false;
    }
    if (!validateEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return false;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Phone number must contain 5-15 digits');
      return false;
    }
    if (!password) {
      toast.error('Password is required');
      return false;
    }
    if (!validatePassword(password)) {
      toast.error('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  }, [name, email, phoneNumber, password, confirmPassword]);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      const fullPhone = `${countryCode}${phoneNumber}`;
      dispatch(
        register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: fullPhone,
          password,
        })
      );
    },
    [name, email, phoneNumber, countryCode, password, dispatch, validateForm]
  );

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      {/* Full Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Full Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={onChange}
          placeholder="John Doe"
          aria-required="true"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={onChange}
          placeholder="you@example.com"
          aria-required="true"
        />
      </div>

      {/* Phone with fintech-grade dropdown */}
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground mb-1">
          Phone Number
        </label>
        <div className="flex gap-2">
          <div className="w-36 flex-shrink-0">
            <CountryCodeDropdown
              value={countryCode}
              onChange={onChange}
            />
          </div>
          <div className="flex-1">
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel-national"
              required
              value={phoneNumber}
              onChange={onChange}
              placeholder="9876543210"
              aria-required="true"
              inputMode="numeric"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter local number (digits only) – will be combined with country code
        </p>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={onChange}
          placeholder="Min 8 characters"
          aria-required="true"
        />
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={onChange}
          placeholder="Confirm password"
          aria-required="true"
        />
      </div>

      {/* Backend error */}
      {isError && message && (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mt-0.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{message}</span>
        </div>
      )}

      {/* Submit button */}
      <div>
        <Button type="submit" isLoading={isLoading} className="w-full">
          Create Account
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;