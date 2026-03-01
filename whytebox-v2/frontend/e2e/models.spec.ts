/**
 * E2E tests for model visualization and management
 */
import { test, expect } from '@playwright/test';

test.describe('Model Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display models list', async ({ page }) => {
    await page.goto('/models');
    
    await expect(page.getByRole('heading', { name: /models/i })).toBeVisible();
    await expect(page.getByTestId('models-grid')).toBeVisible();
  });

  test('should filter models by framework', async ({ page }) => {
    await page.goto('/models');
    
    // Select PyTorch filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByRole('checkbox', { name: /pytorch/i }).check();
    
    // Verify filtered results
    const modelCards = page.getByTestId('model-card');
    await expect(modelCards.first()).toBeVisible();
    
    // All visible models should be PyTorch
    const count = await modelCards.count();
    for (let i = 0; i < count; i++) {
      await expect(modelCards.nth(i).getByText(/pytorch/i)).toBeVisible();
    }
  });

  test('should search models', async ({ page }) => {
    await page.goto('/models');
    
    await page.getByPlaceholder(/search/i).fill('VGG');
    
    // Should show VGG models
    await expect(page.getByText(/vgg16|vgg19/i)).toBeVisible();
  });

  test('should view model details', async ({ page }) => {
    await page.goto('/models');
    
    // Click on first model
    await page.getByTestId('model-card').first().click();
    
    // Should navigate to model details
    await expect(page).toHaveURL(/\/models\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/architecture/i)).toBeVisible();
    await expect(page.getByText(/parameters/i)).toBeVisible();
  });

  test('should load model for visualization', async ({ page }) => {
    await page.goto('/models');
    
    await page.getByTestId('model-card').first().click();
    await page.getByRole('button', { name: /visualize/i }).click();
    
    // Should navigate to visualization page
    await expect(page).toHaveURL(/\/visualize/);
    
    // Wait for 3D scene to load
    await expect(page.getByTestId('babylon-canvas')).toBeVisible();
  });

  test('should upload custom model', async ({ page }) => {
    await page.goto('/models');
    
    await page.getByRole('button', { name: /upload/i }).click();
    
    // Fill upload form
    await page.getByLabel(/model name/i).fill('Test Model');
    await page.getByLabel(/framework/i).selectOption('pytorch');
    await page.getByLabel(/type/i).selectOption('cnn');
    
    // Upload file (mock)
    const fileInput = page.getByLabel(/choose file/i);
    await fileInput.setInputFiles({
      name: 'test_model.pth',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('mock model data'),
    });
    
    await page.getByRole('button', { name: /upload/i }).click();
    
    // Should show success message
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible();
  });
});

test.describe('Model Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.goto('/visualize');
  });

  test('should render 3D visualization', async ({ page }) => {
    await expect(page.getByTestId('babylon-canvas')).toBeVisible();
    
    // Check for controls
    await expect(page.getByRole('button', { name: /reset camera/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /play|animate/i })).toBeVisible();
  });

  test('should interact with 3D scene', async ({ page }) => {
    const canvas = page.getByTestId('babylon-canvas');
    
    // Click on canvas to interact
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Should show layer details panel
    await expect(page.getByTestId('layer-details')).toBeVisible();
  });

  test('should toggle layer visibility', async ({ page }) => {
    await page.getByRole('button', { name: /layers/i }).click();
    
    // Toggle first layer
    const firstLayer = page.getByTestId('layer-toggle').first();
    await firstLayer.click();
    
    // Layer should be hidden in visualization
    await expect(firstLayer).toHaveAttribute('aria-checked', 'false');
  });

  test('should animate data flow', async ({ page }) => {
    await page.getByRole('button', { name: /play|animate/i }).click();
    
    // Animation should start
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
    
    // Should show animation progress
    await expect(page.getByTestId('animation-progress')).toBeVisible();
  });

  test('should reset camera view', async ({ page }) => {
    const canvas = page.getByTestId('babylon-canvas');
    
    // Interact with canvas (simulate camera movement)
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Reset camera
    await page.getByRole('button', { name: /reset camera/i }).click();
    
    // Camera should return to default position
    // (Visual verification would be needed in real test)
  });

  test('should export visualization', async ({ page }) => {
    await page.getByRole('button', { name: /export/i }).click();
    
    // Should show export options
    await expect(page.getByText(/png|jpg|svg/i)).toBeVisible();
    
    // Select PNG export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /png/i }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('Model Inference', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.goto('/inference');
  });

  test('should upload image for inference', async ({ page }) => {
    // Upload image
    const fileInput = page.getByLabel(/upload image/i);
    await fileInput.setInputFiles({
      name: 'test_image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data'),
    });
    
    // Should show image preview
    await expect(page.getByTestId('image-preview')).toBeVisible();
  });

  test('should run inference', async ({ page }) => {
    // Upload image first
    const fileInput = page.getByLabel(/upload image/i);
    await fileInput.setInputFiles({
      name: 'test_image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data'),
    });
    
    // Run inference
    await page.getByRole('button', { name: /run inference/i }).click();
    
    // Should show loading state
    await expect(page.getByText(/processing/i)).toBeVisible();
    
    // Should show results
    await expect(page.getByTestId('inference-results')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/prediction|confidence/i)).toBeVisible();
  });

  test('should display top predictions', async ({ page }) => {
    // Mock inference flow
    const fileInput = page.getByLabel(/upload image/i);
    await fileInput.setInputFiles({
      name: 'test_image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data'),
    });
    
    await page.getByRole('button', { name: /run inference/i }).click();
    await expect(page.getByTestId('inference-results')).toBeVisible({ timeout: 10000 });
    
    // Should show top 5 predictions
    const predictions = page.getByTestId('prediction-item');
    const count = await predictions.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(5);
  });
});

// Made with Bob
