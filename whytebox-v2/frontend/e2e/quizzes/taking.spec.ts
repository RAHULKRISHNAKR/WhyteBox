import { test, expect } from '@playwright/test';
import { QuizPage } from '../pages/QuizPage';

test.describe('Quiz Taking', () => {
  let quizPage: QuizPage;

  test.beforeEach(async ({ page: _page }) => {
    quizPage = new QuizPage(page);
    await quizPage.goto();
    
    // Start a quiz
    await quizPage.quizCards.first().click();
    await quizPage.startButton.click();
    await quizPage.waitForQuizToLoad();
  });

  test('should start quiz and display first question', async ({ page: _page }) => {
    // Verify quiz started
    await expect(page).toHaveURL(/\/quizzes\/.+\/take/);
    
    // Verify first question is displayed
    await expect(quizPage.questionTitle).toBeVisible();
    await expect(quizPage.questionText).toBeVisible();
    
    // Verify answer options are displayed
    const optionCount = await quizPage.answerOptions.count();
    expect(optionCount).toBeGreaterThan(0);
    
    // Verify navigation buttons
    await expect(quizPage.nextQuestionButton).toBeVisible();
    
    // Verify progress indicator
    await expect(quizPage.progressIndicator).toBeVisible();
  });

  test('should select and submit answer', async ({ page: _page }) => {
    // Select an answer
    await quizPage.selectAnswer(0);
    
    // Verify answer is selected
    const selectedOption = quizPage.answerOptions.first();
    await expect(selectedOption).toHaveAttribute('aria-checked', 'true');
    
    // Submit answer
    await quizPage.submitAnswer();
    
    // Verify feedback is shown
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();
  });

  test('should navigate between questions', async ({ page: _page }) => {
    // Get first question text
    const firstQuestion = await quizPage.getQuestionText();
    
    // Answer and move to next question
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    await quizPage.nextQuestion();
    
    // Verify question changed
    const secondQuestion = await quizPage.getQuestionText();
    expect(secondQuestion).not.toBe(firstQuestion);
    
    // Navigate back
    await quizPage.previousQuestion();
    
    // Verify back at first question
    const backToFirst = await quizPage.getQuestionText();
    expect(backToFirst).toBe(firstQuestion);
  });

  test('should track quiz progress', async ({ page: _page }) => {
    // Get initial progress
    const initialProgress = await quizPage.getProgress();
    
    // Answer first question
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    await quizPage.nextQuestion();
    
    // Verify progress updated
    const newProgress = await quizPage.getProgress();
    expect(newProgress).not.toBe(initialProgress);
  });

  test('should display timer if quiz is timed', async ({ page: _page }) => {
    // Check if timer is visible
    if (await quizPage.timerDisplay.isVisible()) {
      const initialTime = await quizPage.getTimeRemaining();
      
      // Wait a few seconds
      await page.waitForTimeout(3000);
      
      // Verify time decreased
      const newTime = await quizPage.getTimeRemaining();
      expect(newTime).not.toBe(initialTime);
    }
  });

  test('should pause and resume quiz', async ({ page: _page }) => {
    // Pause quiz
    await quizPage.pauseQuiz();
    
    // Verify pause overlay
    await expect(page.locator('[data-testid="pause-overlay"]')).toBeVisible();
    await expect(quizPage.resumeButton).toBeVisible();
    
    // Resume quiz
    await quizPage.resumeQuiz();
    
    // Verify quiz resumed
    await expect(page.locator('[data-testid="pause-overlay"]')).not.toBeVisible();
    await expect(quizPage.questionText).toBeVisible();
  });

  test('should exit quiz with confirmation', async ({ page: _page }) => {
    // Click exit button
    await quizPage.exitButton.click();
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="exit-confirmation"]')).toBeVisible();
    
    // Confirm exit
    await page.click('[data-testid="confirm-exit"]');
    
    // Verify returned to quiz catalog
    await expect(page).toHaveURL(/\/quizzes$/);
  });

  test('should handle multiple choice questions', async ({ page: _page }) => {
    // Check if current question allows multiple answers
    const multipleChoice = page.locator('[data-testid="multiple-choice-indicator"]');
    
    if (await multipleChoice.isVisible()) {
      // Select multiple answers
      await quizPage.selectMultipleAnswers([0, 1]);
      
      // Verify both are selected
      const firstOption = quizPage.answerOptions.nth(0);
      const secondOption = quizPage.answerOptions.nth(1);
      
      await expect(firstOption).toHaveAttribute('aria-checked', 'true');
      await expect(secondOption).toHaveAttribute('aria-checked', 'true');
    }
  });

  test('should show explanation after answering', async ({ page: _page }) => {
    // Answer question
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    
    // Verify explanation is shown
    const explanation = page.locator('[data-testid="answer-explanation"]');
    if (await explanation.isVisible()) {
      const explanationText = await explanation.textContent();
      expect(explanationText?.length).toBeGreaterThan(0);
    }
  });

  test('should prevent changing answer after submission', async ({ page: _page }) => {
    // Submit answer
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    
    // Try to select different answer
    const secondOption = quizPage.answerOptions.nth(1);
    
    // Verify options are disabled
    await expect(secondOption).toBeDisabled();
  });

  test('should show correct/incorrect feedback', async ({ page: _page }) => {
    // Answer question
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    
    // Verify feedback indicator
    const feedback = page.locator('[data-testid="answer-feedback"]');
    await expect(feedback).toBeVisible();
    
    // Verify feedback has correct/incorrect class
    const feedbackClass = await feedback.getAttribute('class');
    expect(feedbackClass).toMatch(/correct|incorrect/);
  });

  test('should submit quiz and show results', async ({ page: _page }) => {
    // Answer all questions (simplified - answer first 3)
    for (let i = 0; i < 3; i++) {
      await quizPage.selectAnswer(0);
      await quizPage.submitAnswer();
      
      // Check if there's a next question
      if (await quizPage.nextQuestionButton.isVisible()) {
        await quizPage.nextQuestion();
      }
    }
    
    // Submit quiz
    if (await quizPage.submitQuizButton.isVisible()) {
      await quizPage.submitQuizButton.click();
      
      // Verify results page
      await quizPage.waitForResults();
      await expect(page).toHaveURL(/\/quizzes\/.+\/results/);
      
      // Verify results are displayed
      await expect(quizPage.scoreDisplay).toBeVisible();
      await expect(page.locator('[data-testid="pass-status"]')).toBeVisible();
    }
  });

  test('should display question number indicator', async ({ page: _page }) => {
    // Verify question indicator
    const indicator = page.locator('[data-testid="question-indicator"]');
    await expect(indicator).toBeVisible();
    
    // Verify format (e.g., "Question 1 of 10")
    const indicatorText = await indicator.textContent();
    expect(indicatorText).toMatch(/question \d+ of \d+/i);
  });

  test('should handle keyboard navigation', async ({ page: _page }) => {
    // Test number key selection
    await page.keyboard.press('1');
    
    // Verify first option selected
    const firstOption = quizPage.answerOptions.first();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');
    
    // Test Enter to submit
    await page.keyboard.press('Enter');
    
    // Verify answer submitted
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();
  });

  test('should show review mode before final submission', async ({ page: _page }) => {
    // Answer some questions
    await quizPage.selectAnswer(0);
    await quizPage.submitAnswer();
    await quizPage.nextQuestion();
    
    // Look for review button
    const reviewButton = page.locator('[data-testid="review-answers"]');
    
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      
      // Verify review mode
      await expect(page.locator('[data-testid="review-mode"]')).toBeVisible();
      
      // Verify can navigate to any question
      await expect(page.locator('[data-testid="question-nav"]')).toBeVisible();
    }
  });
});

// Made with Bob
