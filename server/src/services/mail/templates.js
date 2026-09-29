import { env } from '../../config/env.js'
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../../config/auth.js'

export function verificationEmail(email, token) {
  const link = `${env.frontendUrl}/verify-email?token=${token}`
  return {
    to: email,
    subject: 'Verify your email address',
    body: `Welcome! Please verify your email address by visiting the link below:\n\n${link}\n\nThis link expires in ${EMAIL_VERIFICATION_TTL_HOURS} hours. If you didn't create an account, you can ignore this email.`,
  }
}

export function passwordResetEmail(email, token) {
  const link = `${env.frontendUrl}/reset-password?token=${token}`
  return {
    to: email,
    subject: 'Reset your password',
    body: `We received a request to reset your password. Visit the link below to choose a new one:\n\n${link}\n\nThis link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.`,
  }
}
