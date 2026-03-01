import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Quiz pages
 * Encapsulates quiz-related page interactions
 */
export class QuizPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly difficultyFilter: Locator;
  readonly quizCards: Locator;
  readonly startButton: Locator;
  readonly nextQuestionButton: Locator;
  readonly previousQuestionButton: Locator;
  readonly submitAnswerButton: Locator;
  readonly submitQuizButton: Locator;
  readonly pauseButton: Locator;
  readonly resumeButton: Locator;
  readonly exitButton: Locator;
  readonly questionTitle: Locator;
  readonly questionText: Locator;
  readonly answerOptions: Locator;
  readonly progressIndicator: Locator;
  readonly timerDisplay: Locator;
  readonly scoreDisplay: Locator;
  readonly resultsContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="quiz-search"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.difficultyFilter = page.locator('[data-testid="difficulty-filter"]');
    this.quizCards = page.locator('[data-testid^="quiz-card-"]');
    this.startButton = page.locator('[data-testid="start-quiz"]');
    this.nextQuestionButton = page.locator('[data-testid="next-question"]');
    this.previousQuestionButton = page.locator('[data-testid="previous-question"]');
    this.submitAnswerButton = page.locator('[data-testid="submit-answer"]');
    this.submitQuizButton = page.locator('[data-testid="submit-quiz"]');
    this.pauseButton = page.locator('[data-testid="pause-quiz"]');
    this.resumeButton = page.locator('[data-testid="resume-quiz"]');
    this.exitButton = page.locator('[data-testid="exit-quiz"]');
    this.questionTitle = page.locator('[data-testid="question-title"]');
    this.questionText = page.locator('[data-testid="question-text"]');
    this.answerOptions = page.locator('[data-testid^="answer-option-"]');
    this.progressIndicator = page.locator('[data-testid="quiz-progress"]');
    this.timerDisplay = page.locator('[data-testid="quiz-timer"]');
    this.scoreDisplay = page.locator('[data-testid="quiz-score"]');
    this.resultsContainer = page.locator('[data-testid="quiz-results"]');
  }

  async goto() {
    await this.page.goto('/quizzes');
    await this.page.waitForLoadState('networkidle');
  }

  async searchQuiz(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
    await this.difficultyFilter.selectOption(difficulty);
    await this.page.waitForLoadState('networkidle');
  }

  async getQuizCount(): Promise<number> {
    return await this.quizCards.count();
  }

  async startQuiz(quizId: string) {
    await this.page.click(`[data-testid="quiz-card-${quizId}"]`);
    await this.startButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectAnswer(optionIndex: number) {
    const option = this.answerOptions.nth(optionIndex);
    await option.click();
  }

  async selectMultipleAnswers(optionIndices: number[]) {
    for (const index of optionIndices) {
      await this.selectAnswer(index);
    }
  }

  async submitAnswer() {
    await this.submitAnswerButton.click();
    await this.page.waitForTimeout(500);
  }

  async nextQuestion() {
    await this.nextQuestionButton.click();
    await this.page.waitForTimeout(500);
  }

  async previousQuestion() {
    await this.previousQuestionButton.click();
    await this.page.waitForTimeout(500);
  }

  async submitQuiz() {
    await this.submitQuizButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async pauseQuiz() {
    await this.pauseButton.click();
  }

  async resumeQuiz() {
    await this.resumeButton.click();
  }

  async exitQuiz() {
    await this.exitButton.click();
  }

  async getQuestionText(): Promise<string> {
    return await this.questionText.textContent() || '';
  }

  async getProgress(): Promise<string> {
    return await this.progressIndicator.textContent() || '';
  }

  async getTimeRemaining(): Promise<string> {
    return await this.timerDisplay.textContent() || '';
  }

  async getScore(): Promise<string> {
    return await this.scoreDisplay.textContent() || '';
  }

  async waitForQuizToLoad() {
    await this.questionTitle.waitFor({ state: 'visible' });
    await this.questionText.waitFor({ state: 'visible' });
  }

  async waitForResults() {
    await this.resultsContainer.waitFor({ state: 'visible' });
  }

  async answerAllQuestions(answers: number[], questionCount: number) {
    for (let i = 0; i < questionCount; i++) {
      await this.selectAnswer(answers[i] || 0);
      await this.submitAnswer();
      if (i < questionCount - 1) {
        await this.nextQuestion();
      }
    }
  }

  async getResultsSummary() {
    await this.waitForResults();
    const score = await this.getScore();
    const passed = await this.page.locator('[data-testid="pass-status"]').textContent();
    const correctAnswers = await this.page.locator('[data-testid="correct-count"]').textContent();
    
    return {
      score,
      passed: passed === 'Passed',
      correctAnswers: parseInt(correctAnswers || '0'),
    };
  }

  async retakeQuiz() {
    await this.page.click('[data-testid="retake-quiz"]');
    await this.page.waitForLoadState('networkidle');
  }

  async viewQuizHistory() {
    await this.page.click('[data-testid="view-history"]');
    await this.page.waitForLoadState('networkidle');
  }
}

// Made with Bob
