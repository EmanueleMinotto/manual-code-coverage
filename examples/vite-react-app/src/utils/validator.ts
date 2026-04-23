export type ValidationError = string | null;

export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

export function validateEmail(email: string): ValidationError {
  if (email.trim() === '') return 'Email is required';
  if (!email.includes('@')) return 'Email must contain @';
  const [localPart, domain] = email.split('@');
  if (!localPart || localPart.length === 0) return 'Email must have a local part';
  if (!domain || !domain.includes('.')) return 'Email domain is invalid';
  return null;
}

export function validatePassword(password: string): ValidationError {
  if (password === '') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

export function validateUsername(username: string): ValidationError {
  if (username.trim() === '') return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be at most 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers and underscores';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): ValidationError {
  if (confirm === '') return 'Please confirm your password';
  if (confirm !== password) return 'Passwords do not match';
  return null;
}

export function getPasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3) return 'strong';
  if (score >= 1) return 'fair';
  return 'weak';
}

export function validateRegistrationForm(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const emailError = validateEmail(data.email);
  if (emailError !== null) errors.email = emailError;
  const usernameError = validateUsername(data.username);
  if (usernameError !== null) errors.username = usernameError;
  const passwordError = validatePassword(data.password);
  if (passwordError !== null) errors.password = passwordError;
  const confirmError = validatePasswordConfirm(data.password, data.confirmPassword);
  if (confirmError !== null) errors.confirmPassword = confirmError;
  return errors;
}
