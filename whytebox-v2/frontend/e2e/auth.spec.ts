/**
 * E2E tests for authentication flows
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/WhyteBox/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Fill login form
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    
    // Submit form
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Fill registration form
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('SecurePass123!');
    await page.getByLabel(/confirm password/i).fill('SecurePass123!');
    await page.getByLabel(/full name/i).fill('New User');
    
    // Submit form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/dashboard|\/verify-email/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /log in/i }).click();
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Logout
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123');
    
    // Should show password strength indicator
    await expect(page.getByText(/weak|too short/i)).toBeVisible();
  });
});

// Made with Bob
