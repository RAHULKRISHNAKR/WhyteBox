#!/usr/bin/env node

/**
 * Accessibility Audit Script
 * 
 * Runs automated accessibility tests using:
 * - axe-core for WCAG violations
 * - Pa11y for additional checks
 * - Color contrast analysis
 * 
 * Usage: node scripts/accessibility-audit.js [options]
 * Options:
 *   --url <url>       URL to test (default: http://localhost:5173)
 *   --output <file>   Output file for results (default: accessibility-report.json)
 *   --threshold <n>   Maximum allowed violations (default: 0)
 */

import { chromium } from 'playwright';
import { AxePuppeteer } from '@axe-core/puppeteer';
import pa11y from 'pa11y';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_URL = 'http://localhost:5173';
const DEFAULT_OUTPUT = 'accessibility-report.json';
const DEFAULT_THRESHOLD = 0;

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const url = getArg('--url', DEFAULT_URL);
const outputFile = getArg('--output', DEFAULT_OUTPUT);
const threshold = parseInt(getArg('--threshold', DEFAULT_THRESHOLD), 10);

// WCAG 2.1 Level AA Rules
const WCAG_AA_RULES = [
  'color-contrast',
  'image-alt',
  'label',
  'link-name',
  'button-name',
  'document-title',
  'html-has-lang',
  'valid-lang',
  'landmark-one-main',
  'page-has-heading-one',
  'region',
  'bypass',
  'focus-order-semantics',
  'frame-title',
  'heading-order',
  'input-button-name',
  'input-image-alt',
  'label-title-only',
  'list',
  'listitem',
  'meta-viewport',
  'scrollable-region-focusable',
  'select-name',
  'skip-link',
  'tabindex',
  'td-headers-attr',
  'th-has-data-cells',
  'video-caption',
];

async function runAxeAudit(page) {
  console.log('Running axe-core audit...');
  
  const results = await page.evaluate(async () => {
    // @ts-ignore - axe is injected
    const axe = window.axe;
    return await axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    });
  });

  return {
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
    inapplicable: results.inapplicable,
  };
}

async function runPa11yAudit(url) {
  console.log('Running Pa11y audit...');
  
  try {
    const results = await pa11y(url, {
      standard: 'WCAG2AA',
      includeWarnings: true,
      includeNotices: false,
      timeout: 30000,
      wait: 1000,
    });

    return {
      issues: results.issues,
      pageUrl: results.pageUrl,
      documentTitle: results.documentTitle,
    };
  } catch (error) {
    console.error('Pa11y audit failed:', error.message);
    return { issues: [], error: error.message };
  }
}

async function analyzeColorContrast(page) {
  console.log('Analyzing color contrast...');
  
  const contrastIssues = await page.evaluate(() => {
    const issues = [];
    const elements = document.querySelectorAll('*');
    
    elements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      const fontSize = parseFloat(styles.fontSize);
      
      // Skip if no text content
      if (!el.textContent?.trim()) return;
      
      // Calculate contrast ratio (simplified)
      const getLuminance = (rgb) => {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };
      
      try {
        const fgLum = getLuminance(color);
        const bgLum = getLuminance(backgroundColor);
        const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
        
        // WCAG AA requirements
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight >= 700);
        const requiredRatio = isLargeText ? 3 : 4.5;
        
        if (ratio < requiredRatio) {
          issues.push({
            element: el.tagName,
            text: el.textContent.substring(0, 50),
            ratio: ratio.toFixed(2),
            required: requiredRatio,
            color,
            backgroundColor,
          });
        }
      } catch (e) {
        // Skip elements with invalid colors
      }
    });
    
    return issues;
  });
  
  return contrastIssues;
}

async function checkKeyboardNavigation(page) {
  console.log('Checking keyboard navigation...');
  
  const issues = await page.evaluate(() => {
    const problems = [];
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    interactiveElements.forEach((el) => {
      // Check if element is focusable
      const tabindex = el.getAttribute('tabindex');
      if (tabindex && parseInt(tabindex) > 0) {
        problems.push({
          type: 'positive-tabindex',
          element: el.tagName,
          tabindex,
          message: 'Positive tabindex values should be avoided',
        });
      }
      
      // Check for focus indicators
      const styles = window.getComputedStyle(el);
      if (styles.outline === 'none' && !styles.boxShadow) {
        problems.push({
          type: 'no-focus-indicator',
          element: el.tagName,
          message: 'Element may not have visible focus indicator',
        });
      }
    });
    
    return problems;
  });
  
  return issues;
}

async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    url: results.url,
    summary: {
      totalViolations: results.axe.violations.length,
      criticalViolations: results.axe.violations.filter(v => v.impact === 'critical').length,
      seriousViolations: results.axe.violations.filter(v => v.impact === 'serious').length,
      moderateViolations: results.axe.violations.filter(v => v.impact === 'moderate').length,
      minorViolations: results.axe.violations.filter(v => v.impact === 'minor').length,
      pa11yIssues: results.pa11y.issues.length,
      contrastIssues: results.contrast.length,
      keyboardIssues: results.keyboard.length,
    },
    details: {
      axe: results.axe,
      pa11y: results.pa11y,
      contrast: results.contrast,
      keyboard: results.keyboard,
    },
  };
  
  // Write to file
  await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
  
  return report;
}

function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('ACCESSIBILITY AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`URL: ${report.url}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('\nViolations by Severity:');
  console.log(`  Critical: ${report.summary.criticalViolations}`);
  console.log(`  Serious:  ${report.summary.seriousViolations}`);
  console.log(`  Moderate: ${report.summary.moderateViolations}`);
  console.log(`  Minor:    ${report.summary.minorViolations}`);
  console.log(`\nTotal axe violations: ${report.summary.totalViolations}`);
  console.log(`Pa11y issues: ${report.summary.pa11yIssues}`);
  console.log(`Color contrast issues: ${report.summary.contrastIssues}`);
  console.log(`Keyboard navigation issues: ${report.summary.keyboardIssues}`);
  console.log('\n' + '='.repeat(60));
  
  const totalIssues = report.summary.totalViolations + 
                      report.summary.pa11yIssues + 
                      report.summary.contrastIssues + 
                      report.summary.keyboardIssues;
  
  if (totalIssues > threshold) {
    console.log(`\n❌ FAILED: ${totalIssues} issues found (threshold: ${threshold})`);
    console.log(`\nFull report saved to: ${outputFile}`);
    process.exit(1);
  } else {
    console.log(`\n✅ PASSED: ${totalIssues} issues found (threshold: ${threshold})`);
    console.log(`\nFull report saved to: ${outputFile}`);
    process.exit(0);
  }
}

async function main() {
  console.log('Starting accessibility audit...');
  console.log(`URL: ${url}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Threshold: ${threshold} violations\n`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Inject axe-core
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js',
    });
    
    // Run all audits
    const [axeResults, pa11yResults, contrastIssues, keyboardIssues] = await Promise.all([
      runAxeAudit(page),
      runPa11yAudit(url),
      analyzeColorContrast(page),
      checkKeyboardNavigation(page),
    ]);
    
    // Generate and print report
    const report = await generateReport({
      url,
      axe: axeResults,
      pa11y: pa11yResults,
      contrast: contrastIssues,
      keyboard: keyboardIssues,
    });
    
    printSummary(report);
    
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

// Made with Bob
