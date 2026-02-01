// Common password blacklist
const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'qwerty123', 'admin', 'admin123', 'letmein', 'welcome', 'welcome1',
  'abc123', 'monkey', '123123', 'dragon', 'master', 'login', 'admin1234'
];

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return { valid: false, error: 'كلمة المرور مطلوبة' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' };
  }

  if (password.length > 100) {
    return { valid: false, error: 'كلمة المرور طويلة جداً (الحد الأقصى 100 حرف)' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$%^&*)' };
  }

  // Check against common passwords (case-insensitive)
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    return { valid: false, error: 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى' };
  }

  return { valid: true };
}

// Server-side validation function (for edge functions)
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  commonPasswordsBlacklist: COMMON_PASSWORDS
};
