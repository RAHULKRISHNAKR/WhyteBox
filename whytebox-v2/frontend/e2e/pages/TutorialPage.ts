import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Tutorial pages
 * Encapsulates tutorial-related page interactions
 */
export class TutorialPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly difficultyFilter: Locator;
  readonly categoryFilter: Locator;
  readonly tutorialCards: Locator;
  readonly startButton: Locator;
  readonly nextStepButton: Locator;
  readonly previousStepButton: Locator;
  readonly completeStepButton: Locator;
  readonly exitButton: Locator;
  readonly pauseButton: Locator;
  readonly resumeButton: Locator;
  readonly progressBar: Locator;
  readonly stepTitle: Locator;
  readonly stepContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="tutorial-search"]');
    this.difficultyFilter = page.locator('[data-testid="difficulty-filter"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.tutorialCards = page.locator('[data-testid^="tutorial-card-"]');
    this.startButton = page.locator('[data-testid="start-tutorial"]');
    this.nextStepButton = page.locator('[data-testid="next-step"]');
    this.previousStepButton = page.locator('[data-testid="previous-step"]');
    this.completeStepButton = page.locator('[data-testid="complete-step"]');
    this.exitButton = page.locator('[data-testid="exit-tutorial"]');
    this.pauseButton = page.locator('[data-testid="pause-tutorial"]');
    this.resumeButton = page.locator('[data-testid="resume-tutorial"]');
    this.progressBar = page.locator('[data-testid="tutorial-progress"]');
    this.stepTitle = page.locator('[data-testid="step-title"]');
    this.stepContent = page.locator('[data-testid="step-content"]');
  }

  async goto() {
    await this.page.goto('/tutorials');
    await this.page.waitForLoadState('networkidle');
  }

  async searchTutorial(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced') {
    await this.difficultyFilter.selectOption(difficulty);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForLoadState('networkidle');
  }

  async getTutorialCount(): Promise<number> {
    return await this.tutorialCards.count();
  }

  async startTutorial(tutorialId: string) {
    await this.page.click(`[data-testid="tutorial-card-${tutorialId}"]`);
    await this.startButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async nextStep() {
    await this.nextStepButton.click();
    await this.page.waitForTimeout(500); // Wait for animation
  }

  async previousStep() {
    await this.previousStepButton.click();
    await this.page.waitForTimeout(500);
  }

  async completeStep() {
    await this.completeStepButton.click();
    await this.page.waitForTimeout(500);
  }

  async pauseTutorial() {
    await this.pauseButton.click();
  }

  async resumeTutorial() {
    await this.resumeButton.click();
  }

  async exitTutorial() {
    await this.exitButton.click();
  }

  async getStepTitle(): Promise<string> {
    return await this.stepTitle.textContent() || '';
  }

  async getStepContent(): Promise<string> {
    return await this.stepContent.textContent() || '';
  }

  async getProgress(): Promise<string> {
    return await this.progressBar.getAttribute('aria-valuenow') || '0';
  }

  async waitForTutorialToLoad() {
    await this.stepTitle.waitFor({ state: 'visible' });
    await this.stepContent.waitFor({ state: 'visible' });
  }

  async completeTutorial(stepCount: number) {
    for (let i = 0; i < stepCount; i++) {
      await this.completeStep();
      if (i < stepCount - 1) {
        await this.nextStep();
      }
    }
  }
}

// Made with Bob
