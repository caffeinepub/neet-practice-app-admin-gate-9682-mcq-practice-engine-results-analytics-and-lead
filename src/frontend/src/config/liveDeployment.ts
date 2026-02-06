/**
 * Live Deployment Configuration
 * 
 * This file contains the configuration for the permanent Live deployment.
 * The Live name must be 5-50 characters and contain only letters, numbers, and hyphens.
 */

export const LIVE_DEPLOYMENT_NAME = 'learningxhub-rahil-mehran';
export const LIVE_DISPLAY_NAME = 'LearningXHub by RAHIL & MEHRAN';

/**
 * Validates the Live deployment name against IC constraints
 */
export function validateLiveName(name: string): { valid: boolean; error?: string } {
  if (name.length < 5 || name.length > 50) {
    return {
      valid: false,
      error: 'Live name must be between 5 and 50 characters',
    };
  }

  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(name)) {
    return {
      valid: false,
      error: 'Live name can only contain letters, numbers, and hyphens (no spaces)',
    };
  }

  return { valid: true };
}

/**
 * Helper to check if the configured Live name is valid
 */
export function isLiveNameValid(): boolean {
  return validateLiveName(LIVE_DEPLOYMENT_NAME).valid;
}

/**
 * Get validation warning message if Live name is invalid
 */
export function getLiveNameWarning(): string | null {
  const validation = validateLiveName(LIVE_DEPLOYMENT_NAME);
  if (!validation.valid) {
    return `⚠️ Live deployment name "${LIVE_DEPLOYMENT_NAME}" is invalid: ${validation.error}`;
  }
  return null;
}
