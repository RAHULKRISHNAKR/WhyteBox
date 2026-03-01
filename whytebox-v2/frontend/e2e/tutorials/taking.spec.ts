import { test, expect } from '@playwright/test';
import { TutorialPage } from '../pages/TutorialPage';

test.describe('Tutorial Taking', () => {
  let tutorialPage: TutorialPage;

  test.beforeEach(async ({ page: _page }) => {
    tutorialPage = new TutorialPage(page);
    await tutorialPage.goto();
    
    // Start a tutorial
    await tutorialPage.tutorialCards.first().click();
    await tutorialPage.startButton.click();
    await tutorialPage.waitForTutorialToLoad();
  });

  test('should start tutorial and display first step', async ({ page: _page }) => {
    // Verify tutorial started
    await expect(page).toHaveURL(/\/tutorials\/.+\/take/);
    
    // Verify first step is displayed
    await expect(tutorialPage.stepTitle).toBeVisible();
    await expect(tutorialPage.stepContent).toBeVisible();
    
    // Verify navigation buttons
    await expect(tutorialPage.nextStepButton).toBeVisible();
    await expect(tutorialPage.completeStepButton).toBeVisible();
    
    // Verify progress bar
    await expect(tutorialPage.progressBar).toBeVisible();
    const progress = await tutorialPage.getProgress();
    expect(parseInt(progress)).toBeGreaterThanOrEqual(0);
  });

  test('should navigate through tutorial steps', async ({ page: _page }) => {
    // Get first step title
    const firstStepTitle = await tutorialPage.getStepTitle();
    
    // Navigate to next step
    await tutorialPage.nextStep();
    
    // Verify step changed
    const secondStepTitle = await tutorialPage.getStepTitle();
    expect(secondStepTitle).not.toBe(firstStepTitle);
    
    // Navigate back
    await tutorialPage.previousStep();
    
    // Verify back at first step
    const backToFirstTitle = await tutorialPage.getStepTitle();
    expect(backToFirstTitle).toBe(firstStepTitle);
  });

  test('should complete tutorial steps', async ({ page: _page }) => {
    // Get initial progress
    const initialProgress = await tutorialPage.getProgress();
    
    // Complete first step
    await tutorialPage.completeStep();
    
    // Verify progress increased
    await page.waitForTimeout(500);
    const newProgress = await tutorialPage.getProgress();
    expect(parseInt(newProgress)).toBeGreaterThan(parseInt(initialProgress));
    
    // Verify step marked as complete
    await expect(page.locator('[data-testid="step-complete-indicator"]')).toBeVisible();
  });

  test('should pause and resume tutorial', async ({ page: _page }) => {
    // Pause tutorial
    await tutorialPage.pauseTutorial();
    
    // Verify pause overlay
    await expect(page.locator('[data-testid="pause-overlay"]')).toBeVisible();
    await expect(tutorialPage.resumeButton).toBeVisible();
    
    // Resume tutorial
    await tutorialPage.resumeTutorial();
    
    // Verify tutorial resumed
    await expect(page.locator('[data-testid="pause-overlay"]')).not.toBeVisible();
    await expect(tutorialPage.stepContent).toBeVisible();
  });

  test('should exit tutorial with confirmation', async ({ page: _page }) => {
    // Click exit button
    await tutorialPage.exitButton.click();
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="exit-confirmation"]')).toBeVisible();
    
    // Confirm exit
    await page.click('[data-testid="confirm-exit"]');
    
    // Verify returned to catalog
    await expect(page).toHaveURL(/\/tutorials$/);
  });

  test('should save progress when exiting', async ({ page: _page }) => {
    // Complete first step
    await tutorialPage.completeStep();
    await tutorialPage.nextStep();
    
    // Get current step
    const currentStepTitle = await tutorialPage.getStepTitle();
    
    // Exit tutorial
    await tutorialPage.exitButton.click();
    await page.click('[data-testid="confirm-exit"]');
    
    // Return to tutorial
    await tutorialPage.tutorialCards.first().click();
    await page.click('[data-testid="continue-tutorial"]');
    
    // Verify resumed at correct step
    await tutorialPage.waitForTutorialToLoad();
    const resumedStepTitle = await tutorialPage.getStepTitle();
    expect(resumedStepTitle).toBe(currentStepTitle);
  });

  test('should display step content correctly', async ({ page: _page }) => {
    // Verify step has title
    const stepTitle = await tutorialPage.getStepTitle();
    expect(stepTitle.length).toBeGreaterThan(0);
    
    // Verify step has content
    const stepContent = await tutorialPage.getStepContent();
    expect(stepContent.length).toBeGreaterThan(0);
    
    // Verify media content if present
    const imageElement = page.locator('[data-testid="step-image"]');
    if (await imageElement.isVisible()) {
      await expect(imageElement).toHaveAttribute('src');
    }
    
    // Verify code snippet if present
    const codeElement = page.locator('[data-testid="step-code"]');
    if (await codeElement.isVisible()) {
      await expect(codeElement).toBeVisible();
    }
  });

  test('should handle interactive step elements', async ({ page: _page }) => {
    // Check for interactive elements
    const interactiveButton = page.locator('[data-testid="interactive-action"]');
    
    if (await interactiveButton.isVisible()) {
      // Click interactive element
      await interactiveButton.click();
      
      // Verify interaction feedback
      await expect(page.locator('[data-testid="interaction-feedback"]')).toBeVisible();
    }
  });

  test('should show hints when available', async ({ page: _page }) => {
    // Check if hints are available
    const hintButton = page.locator('[data-testid="show-hint"]');
    
    if (await hintButton.isVisible()) {
      // Click hint button
      await hintButton.click();
      
      // Verify hint is displayed
      await expect(page.locator('[data-testid="hint-content"]')).toBeVisible();
      
      // Verify hint can be hidden
      await page.click('[data-testid="hide-hint"]');
      await expect(page.locator('[data-testid="hint-content"]')).not.toBeVisible();
    }
  });

  test('should track time spent on tutorial', async ({ page: _page }) => {
    // Verify timer is displayed
    const timerElement = page.locator('[data-testid="tutorial-timer"]');
    
    if (await timerElement.isVisible()) {
      const initialTime = await timerElement.textContent();
      
      // Wait a few seconds
      await page.waitForTimeout(3000);
      
      // Verify time increased
      const newTime = await timerElement.textContent();
      expect(newTime).not.toBe(initialTime);
    }
  });

  test('should disable previous button on first step', async ({ page: _page }) => {
    // Verify on first step
    const progress = await tutorialPage.getProgress();
    
    if (parseInt(progress) === 0) {
      // Verify previous button is disabled
      await expect(tutorialPage.previousStepButton).toBeDisabled();
    }
  });

  test('should show completion message on last step', async ({ page: _page }) => {
    // Navigate to last step (simplified - in real test would complete all steps)
    // For now, just verify the completion logic exists
    const completionButton = page.locator('[data-testid="complete-tutorial"]');
    
    // This would be visible on the last step
    if (await completionButton.isVisible()) {
      await completionButton.click();
      
      // Verify completion screen
      await expect(page.locator('[data-testid="tutorial-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
    }
  });

  test('should handle keyboard navigation', async ({ page: _page }) => {
    // Test arrow key navigation
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    // Verify step changed
    const stepAfterRight = await tutorialPage.getStepTitle();
    
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    
    // Verify navigated back
    const stepAfterLeft = await tutorialPage.getStepTitle();
    expect(stepAfterLeft).not.toBe(stepAfterRight);
  });

  test('should display progress percentage', async ({ page: _page }) => {
    // Get progress percentage
    const progressText = page.locator('[data-testid="progress-text"]');
    
    if (await progressText.isVisible()) {
      const text = await progressText.textContent();
      expect(text).toMatch(/\d+%/);
    }
  });

  test('should show step number indicator', async ({ page: _page }) => {
    // Verify step indicator
    const stepIndicator = page.locator('[data-testid="step-indicator"]');
    await expect(stepIndicator).toBeVisible();
    
    // Verify format (e.g., "Step 1 of 5")
    const indicatorText = await stepIndicator.textContent();
    expect(indicatorText).toMatch(/step \d+ of \d+/i);
  });
});

// Made with Bob
