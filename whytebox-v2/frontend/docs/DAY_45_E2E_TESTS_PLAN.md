# Day 45: End-to-End Tests - Implementation Plan

**Date:** Phase 5, Week 9, Day 45  
**Focus:** End-to-end testing with Playwright  
**Target:** 50+ E2E tests  
**Status:** 📋 Planning

---

## Overview

Day 45 focuses on end-to-end testing using Playwright to validate complete user workflows across the entire application. E2E tests simulate real user interactions in a browser environment, testing the full stack from UI to backend.

---

## Test Categories

### 1. User Authentication Flow (8 tests)

**Focus:** Complete authentication workflows

**Test Scenarios:**
- User registration flow
- Login with valid credentials
- Login with invalid credentials
- Password reset flow
- Session persistence
- Logout functionality
- Protected route access
- Token refresh

### 2. Tutorial Workflows (12 tests)

**Focus:** Complete tutorial user journeys

**Test Scenarios:**
- Browse tutorial catalog
- Filter tutorials by difficulty
- Search tutorials
- Start a tutorial
- Navigate through tutorial steps
- Complete tutorial steps
- Pause and resume tutorial
- Exit tutorial
- View tutorial progress
- Complete entire tutorial
- Earn tutorial rewards
- View completed tutorials

### 3. Quiz Workflows (12 tests)

**Focus:** Complete quiz-taking experience

**Test Scenarios:**
- Browse quiz catalog
- Filter quizzes by category
- Start a quiz
- Answer multiple choice questions
- Answer true/false questions
- Navigate between questions
- Review answers before submission
- Submit quiz
- View quiz results
- Retake quiz
- View quiz history
- Track quiz progress

### 4. Model Visualization (8 tests)

**Focus:** Neural network visualization features

**Test Scenarios:**
- Load model architecture
- Navigate 3D visualization
- Toggle layer visibility
- View layer details
- Inspect layer parameters
- Export visualization
- Switch between models
- Performance with large models

### 5. Explainability Features (10 tests)

**Focus:** Model explainability workflows

**Test Scenarios:**
- Upload image for analysis
- Generate Grad-CAM visualization
- Generate saliency maps
- Generate integrated gradients
- Compare explainability methods
- Download visualizations
- Adjust visualization parameters
- View explanation details
- Switch between images
- Batch processing

---

## Playwright Configuration

### Installation

```bash
cd whytebox-v2/frontend
npm install -D @playwright/test
npx playwright install
```

### Configuration File

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## E2E Test Structure

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to starting point
    await page.goto('/');
  });

  test('should complete user workflow', async ({ page }) => {
    // Arrange - Setup test data
    
    // Act - Perform user actions
    await page.click('button[data-testid="start"]');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Assert - Verify outcomes
    await expect(page.locator('h1')).toContainText('Success');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Page Object Model

```typescript
// e2e/pages/TutorialPage.ts
export class TutorialPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/tutorials');
  }

  async searchTutorial(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
  }

  async startTutorial(tutorialId: string) {
    await this.page.click(`[data-testid="tutorial-${tutorialId}"] button`);
  }

  async nextStep() {
    await this.page.click('[data-testid="next-step"]');
  }

  async completeStep() {
    await this.page.click('[data-testid="complete-step"]');
  }

  async getTutorialTitle() {
    return await this.page.textContent('[data-testid="tutorial-title"]');
  }
}
```

---

## Test Files to Create

### Authentication Tests
1. `e2e/auth/registration.spec.ts` (3 tests)
2. `e2e/auth/login.spec.ts` (3 tests)
3. `e2e/auth/password-reset.spec.ts` (2 tests)

### Tutorial Tests
4. `e2e/tutorials/browse.spec.ts` (3 tests)
5. `e2e/tutorials/taking.spec.ts` (5 tests)
6. `e2e/tutorials/completion.spec.ts` (4 tests)

### Quiz Tests
7. `e2e/quizzes/browse.spec.ts` (3 tests)
8. `e2e/quizzes/taking.spec.ts` (5 tests)
9. `e2e/quizzes/results.spec.ts` (4 tests)

### Visualization Tests
10. `e2e/visualization/model-viewer.spec.ts` (4 tests)
11. `e2e/visualization/layer-details.spec.ts` (4 tests)

### Explainability Tests
12. `e2e/explainability/gradcam.spec.ts` (3 tests)
13. `e2e/explainability/saliency.spec.ts` (3 tests)
14. `e2e/explainability/comparison.spec.ts` (4 tests)

---

## Success Criteria

### Quantitative
- [ ] 50+ E2E tests created
- [ ] All tests passing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] < 5 minutes total execution time
- [ ] 90%+ critical path coverage

### Qualitative
- [ ] Real user workflows tested
- [ ] Error scenarios covered
- [ ] Performance validated
- [ ] Accessibility checked
- [ ] Mobile responsiveness tested

---

## Best Practices

### 1. Use Data Test IDs
```typescript
// Good
await page.click('[data-testid="submit-button"]');

// Avoid
await page.click('button.btn-primary');
```

### 2. Wait for Network Idle
```typescript
await page.goto('/dashboard', { waitUntil: 'networkidle' });
```

### 3. Use Page Object Model
```typescript
const tutorialPage = new TutorialPage(page);
await tutorialPage.goto();
await tutorialPage.startTutorial('intro-to-ml');
```

### 4. Handle Async Operations
```typescript
await page.waitForSelector('[data-testid="results"]');
await expect(page.locator('[data-testid="score"]')).toBeVisible();
```

### 5. Take Screenshots on Failure
```typescript
test('should complete workflow', async ({ page }) => {
  try {
    // Test steps
  } catch (error) {
    await page.screenshot({ path: 'failure.png' });
    throw error;
  }
});
```

---

## Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/tutorials/taking.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Generate test report
npx playwright show-report

# Debug tests
npx playwright test --debug
```

---

## CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Timeline

### Morning (Tests 1-20)
- Setup Playwright configuration
- Create page object models
- Authentication tests (8 tests)
- Tutorial browse tests (3 tests)
- Quiz browse tests (3 tests)
- Initial visualization tests (6 tests)

### Afternoon (Tests 21-40)
- Tutorial taking tests (5 tests)
- Tutorial completion tests (4 tests)
- Quiz taking tests (5 tests)
- Quiz results tests (4 tests)
- Visualization layer tests (2 tests)

### Evening (Tests 41-50+)
- Explainability tests (10 tests)
- Cross-browser validation
- Performance testing
- Documentation

---

## Expected Challenges

### Challenge 1: Async Operations
**Issue:** Timing issues with async operations  
**Solution:** Use proper wait strategies and assertions

### Challenge 2: Test Data Management
**Issue:** Need consistent test data  
**Solution:** Use fixtures and database seeding

### Challenge 3: Browser Compatibility
**Issue:** Different behavior across browsers  
**Solution:** Test in all target browsers

### Challenge 4: Test Flakiness
**Issue:** Intermittent test failures  
**Solution:** Proper waits, retries, and stable selectors

---

## Test Data Strategy

### Fixtures
```typescript
// e2e/fixtures/tutorials.ts
export const testTutorials = [
  {
    id: 'intro-ml',
    title: 'Introduction to Machine Learning',
    difficulty: 'beginner',
    steps: 5,
  },
  // More test data...
];
```

### Database Seeding
```typescript
// e2e/setup/seed.ts
export async function seedDatabase() {
  // Seed test data before tests
  await db.tutorials.createMany(testTutorials);
  await db.quizzes.createMany(testQuizzes);
}
```

---

## Debugging Tips

1. **Use --headed mode** to see browser
2. **Use --debug** to step through tests
3. **Use page.pause()** to pause execution
4. **Check screenshots** in test-results/
5. **Review traces** in Playwright UI
6. **Use console.log** in page context

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| E2E Tests | 50+ | 🔴 0 |
| Test Suites | 14+ | 🔴 0 |
| Browser Coverage | 3 | 🔴 0 |
| Execution Time | < 5min | ⚪ N/A |
| Pass Rate | 100% | ⚪ N/A |
| Critical Paths | 90%+ | 🔴 0% |

---

## Next Steps After Day 45

### Day 46: Performance Optimization
- Bundle size analysis
- Code splitting
- Lazy loading
- Performance benchmarks
- Lighthouse scores

### Day 47: Accessibility Audit
- WCAG 2.1 AA compliance
- Screen reader testing
- Keyboard navigation
- Color contrast
- ARIA labels

---

**Status:** 📋 Planning Complete  
**Next:** Begin Playwright setup and authentication tests  
**Target:** 50+ E2E tests by end of day