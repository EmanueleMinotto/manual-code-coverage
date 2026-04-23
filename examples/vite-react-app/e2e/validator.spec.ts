import { expect, test } from '@playwright/test';

// Each test exercises a distinct set of branches in validator.ts and
// flushes coverage to Railway via sendBeacon on beforeunload.
// Total: ~17 out of ~42 Istanbul branches (~40%).

test.describe('validator.ts — non-happy path coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // Trigger beforeunload so MccClient flushes coverage via sendBeacon
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
    await page.waitForTimeout(500);
  });

  // Branches covered: validateEmail(empty)=true, validatePassword(empty)=true,
  // validateUsername(empty)=true, validatePasswordConfirm(empty)=true,
  // validateRegistrationForm — all 4 `!== null` checks true (~8 branches)
  test('empty form submit covers all required error branches', async ({ page }) => {
    await page.getByRole('button', { name: /Submit/ }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Please confirm your password')).toBeVisible();
  });

  // Branches covered: validateEmail empty=false, no-@=true (~2 branches)
  test('email without @ triggers the no-@ branch', async ({ page }) => {
    await page.getByPlaceholder('user@example.com').fill('notanemail');

    await expect(page.getByText('Email must contain @')).toBeVisible();
  });

  // Branches covered: getPasswordStrength length<8=true (weak),
  // length<8=false + score≥1=true (fair), score≥3=true (strong) (~5 branches)
  test('password strength badge covers weak, fair and strong branches', async ({ page }) => {
    const pwInput = page.getByPlaceholder('min 8, 1 uppercase, 1 numero');

    await pwInput.fill('short');
    await expect(page.getByText('weak')).toBeVisible();

    await pwInput.fill('nouppercase1');
    await expect(page.getByText('fair')).toBeVisible();

    await pwInput.fill('Valid1!pw');
    await expect(page.getByText('strong')).toBeVisible();
  });

  // Branches covered: validateUsername empty=false, length<3=true (~2 branches)
  test('username too short triggers the length error branch', async ({ page }) => {
    await page.getByPlaceholder('min 3, max 20, solo a-z0-9_').fill('ab');

    await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
  });
});
