import { test, expect } from '@playwright/test';
import { TutorialPage } from '../pages/TutorialPage';

test.describe('Tutorial Browsing', () => {
  let tutorialPage: TutorialPage;

  test.beforeEach(async ({ page }) => {
    tutorialPage = new TutorialPage(page);
    await tutorialPage.goto();
  });

  test('should display tutorial catalog', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveTitle(/Tutorials/i);
    
    // Verify tutorials are displayed
    const tutorialCount = await tutorialPage.getTutorialCount();
    expect(tutorialCount).toBeGreaterThan(0);
    
    // Verify search input is visible
    await expect(tutorialPage.searchInput).toBeVisible();
    
    // Verify filters are visible
    await expect(tutorialPage.difficultyFilter).toBeVisible();
    await expect(tutorialPage.categoryFilter).toBeVisible();
  });

  test('should search tutorials by keyword', async ({ page }) => {
    // Search for specific tutorial
    await tutorialPage.searchTutorial('machine learning');
    
    // Verify search results
    const tutorialCount = await tutorialPage.getTutorialCount();
    expect(tutorialCount).toBeGreaterThan(0);
    
    // Verify search term is in results
    const firstCard = tutorialPage.tutorialCards.first();
    await expect(firstCard).toContainText(/machine learning/i);
  });

  test('should filter tutorials by difficulty', async ({ page }) => {
    // Get initial count
    const initialCount = await tutorialPage.getTutorialCount();
    
    // Filter by beginner
    await tutorialPage.filterByDifficulty('beginner');
    
    // Verify filtered results
    const beginnerCount = await tutorialPage.getTutorialCount();
    expect(beginnerCount).toBeLessThanOrEqual(initialCount);
    
    // Verify all results are beginner level
    const cards = await tutorialPage.tutorialCards.all();
    for (const card of cards) {
      await expect(card).toContainText(/beginner/i);
    }
  });

  test('should filter tutorials by category', async ({ page }) => {
    // Filter by category
    await tutorialPage.filterByCategory('Neural Networks');
    
    // Verify filtered results
    const categoryCount = await tutorialPage.getTutorialCount();
    expect(categoryCount).toBeGreaterThan(0);
    
    // Verify category badge is visible
    const firstCard = tutorialPage.tutorialCards.first();
    await expect(firstCard).toContainText(/Neural Networks/i);
  });

  test('should combine search and filters', async ({ page }) => {
    // Apply search
    await tutorialPage.searchTutorial('neural');
    
    // Apply difficulty filter
    await tutorialPage.filterByDifficulty('beginner');
    
    // Verify combined results
    const resultCount = await tutorialPage.getTutorialCount();
    expect(resultCount).toBeGreaterThan(0);
    
    // Verify results match both criteria
    const firstCard = tutorialPage.tutorialCards.first();
    await expect(firstCard).toContainText(/neural/i);
    await expect(firstCard).toContainText(/beginner/i);
  });

  test('should display tutorial details on card click', async ({ page }) => {
    // Click first tutorial card
    const firstCard = tutorialPage.tutorialCards.first();
    await firstCard.click();
    
    // Verify detail page loaded
    await expect(page).toHaveURL(/\/tutorials\/.+/);
    
    // Verify tutorial details are visible
    await expect(page.locator('[data-testid="tutorial-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutorial-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutorial-difficulty"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutorial-duration"]')).toBeVisible();
    
    // Verify start button is visible
    await expect(tutorialPage.startButton).toBeVisible();
  });

  test('should show empty state when no results', async ({ page }) => {
    // Search for non-existent tutorial
    await tutorialPage.searchTutorial('xyznonexistent123');
    
    // Verify empty state
    const tutorialCount = await tutorialPage.getTutorialCount();
    expect(tutorialCount).toBe(0);
    
    // Verify empty state message
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText(/no tutorials found/i);
  });

  test('should display tutorial metadata', async ({ page }) => {
    // Get first tutorial card
    const firstCard = tutorialPage.tutorialCards.first();
    
    // Verify metadata is displayed
    await expect(firstCard.locator('[data-testid="tutorial-difficulty"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="tutorial-duration"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="tutorial-steps"]')).toBeVisible();
    
    // Verify progress indicator if tutorial was started
    const progressIndicator = firstCard.locator('[data-testid="tutorial-progress"]');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toHaveAttribute('aria-valuenow');
    }
  });

  test('should navigate back to catalog from detail page', async ({ page }) => {
    // Click first tutorial
    await tutorialPage.tutorialCards.first().click();
    await expect(page).toHaveURL(/\/tutorials\/.+/);
    
    // Click back button
    await page.click('[data-testid="back-to-catalog"]');
    
    // Verify back at catalog
    await expect(page).toHaveURL(/\/tutorials$/);
    await expect(tutorialPage.tutorialCards.first()).toBeVisible();
  });

  test('should persist filter selections', async ({ page }) => {
    // Apply filters
    await tutorialPage.filterByDifficulty('intermediate');
    await tutorialPage.filterByCategory('Deep Learning');
    
    // Navigate to detail page
    await tutorialPage.tutorialCards.first().click();
    
    // Navigate back
    await page.goBack();
    
    // Verify filters are still applied
    await expect(tutorialPage.difficultyFilter).toHaveValue('intermediate');
    await expect(tutorialPage.categoryFilter).toHaveValue('Deep Learning');
  });
});

// Made with Bob
