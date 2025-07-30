import { PlaywrightTestConfig } from '@playwright/test';
import * as path from 'path';

/**
 * Visual Regression Testing Configuration
 * Uses Playwright for screenshot comparison and visual testing
 */

const config: PlaywrightTestConfig = {
  testDir: './tests/visual-regression',
  outputDir: './tests/visual-regression/test-results',
  
  // Visual regression specific settings
  use: {
    // Viewport size for consistent screenshots
    viewport: { width: 1280, height: 720 },
    
    // Screenshot options
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    // Trace options for debugging
    trace: 'on-first-retry',
    
    // Video recording
    video: 'on-first-retry',
    
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Browser options
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },
  },
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Assertion timeout
  expect: {
    timeout: 10 * 1000,
    toHaveScreenshot: {
      // Maximum difference in pixels
      maxDiffPixels: 100,
      
      // Threshold for pixel difference (0-1)
      threshold: 0.2,
      
      // Animation handling
      animations: 'disabled',
      
      // CSS animations and transitions
      caret: 'hide',
    },
  },
  
  // Number of retries
  retries: process.env.CI ? 2 : 0,
  
  // Number of workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/visual-regression/playwright-report' }],
    ['json', { outputFile: 'tests/visual-regression/test-results.json' }],
    ['junit', { outputFile: 'tests/visual-regression/junit.xml' }],
    ['list'],
  ],
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific visual settings
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
    // Dark mode testing
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
  ],
  
  // Global setup/teardown
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),
};

export default config;

// Helper types for visual regression tests
export interface VisualTestOptions {
  name: string;
  selector?: string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  mask?: string[];
  omitBackground?: boolean;
  timeout?: number;
  threshold?: number;
  maxDiffPixels?: number;
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'initial';
  scale?: 'css' | 'device';
  stylePath?: string;
}

export interface ComponentScreenshot {
  name: string;
  component: string;
  states: Array<{
    name: string;
    props?: Record<string, any>;
    interactions?: Array<{
      action: 'click' | 'hover' | 'focus' | 'type';
      selector: string;
      value?: string;
    }>;
    waitFor?: {
      selector?: string;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      timeout?: number;
    };
  }>;
}

// Import device descriptors
import { devices } from '@playwright/test';

// Visual regression test utilities
export class VisualRegressionUtils {
  static async takeComponentScreenshot(
    page: any,
    options: VisualTestOptions
  ): Promise<void> {
    const screenshotOptions = {
      fullPage: options.fullPage || false,
      clip: options.clip,
      mask: options.mask ? await Promise.all(
        options.mask.map(selector => page.locator(selector))
      ) : undefined,
      omitBackground: options.omitBackground,
      animations: options.animations || 'disabled',
      caret: options.caret || 'hide',
      scale: options.scale || 'css',
      timeout: options.timeout || 5000,
    };

    if (options.selector) {
      const element = page.locator(options.selector);
      await element.scrollIntoViewIfNeeded();
      await element.screenshot({
        ...screenshotOptions,
        path: `tests/visual-regression/screenshots/${options.name}.png`,
      });
    } else {
      await page.screenshot({
        ...screenshotOptions,
        path: `tests/visual-regression/screenshots/${options.name}.png`,
      });
    }
  }

  static async compareScreenshots(
    baseline: string,
    current: string,
    options?: {
      threshold?: number;
      maxDiffPixels?: number;
    }
  ): Promise<{ match: boolean; diffPixels: number; diffPercentage: number }> {
    // This would use a library like pixelmatch or looks-same
    // For now, returning a placeholder
    return {
      match: true,
      diffPixels: 0,
      diffPercentage: 0,
    };
  }

  static async waitForAnimations(page: any): Promise<void> {
    // Wait for CSS animations to complete
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.getAnimations) {
          Promise.all(
            document.getAnimations().map(animation => animation.finished)
          ).then(() => resolve());
        } else {
          // Fallback for browsers without getAnimations
          setTimeout(resolve, 300);
        }
      });
    });
  }

  static async hideVolatileElements(page: any): Promise<void> {
    // Hide elements that change frequently and shouldn't be part of visual tests
    await page.addStyleTag({
      content: `
        /* Hide timestamps */
        .timestamp, [data-testid="timestamp"] { visibility: hidden !important; }
        
        /* Hide loading spinners */
        .spinner, .loading, [data-loading="true"] { display: none !important; }
        
        /* Hide cursor and selection */
        * { caret-color: transparent !important; }
        ::selection { background-color: transparent !important; }
        
        /* Disable animations */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        
        /* Hide scrollbars */
        *::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
      `,
    });
  }

  static async injectTestStyles(page: any, styles: string): Promise<void> {
    await page.addStyleTag({ content: styles });
  }

  static async setViewportSize(
    page: any,
    device: 'desktop' | 'tablet' | 'mobile' | { width: number; height: number }
  ): Promise<void> {
    const viewports = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 },
    };

    const viewport = typeof device === 'string' ? viewports[device] : device;
    await page.setViewportSize(viewport);
  }

  static async captureElementStates(
    page: any,
    selector: string,
    states: Array<'default' | 'hover' | 'focus' | 'active' | 'disabled'>
  ): Promise<void> {
    const element = page.locator(selector);
    
    for (const state of states) {
      switch (state) {
        case 'hover':
          await element.hover();
          break;
        case 'focus':
          await element.focus();
          break;
        case 'active':
          await element.click({ delay: 100 });
          break;
        case 'disabled':
          await element.evaluate((el: HTMLElement) => {
            el.setAttribute('disabled', 'true');
          });
          break;
        default:
          // Default state - no action needed
          break;
      }
      
      await this.takeComponentScreenshot(page, {
        name: `${selector.replace(/[^\w-]/g, '_')}-${state}`,
        selector,
      });
      
      // Reset state
      if (state !== 'default') {
        await page.mouse.move(0, 0);
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
        });
      }
    }
  }

  static async generateVisualReport(results: any[]): Promise<string> {
    // Generate HTML report with visual diffs
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Visual Regression Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test { margin-bottom: 30px; border: 1px solid #ddd; padding: 10px; }
            .passed { border-color: #4CAF50; }
            .failed { border-color: #f44336; }
            .images { display: flex; gap: 10px; margin-top: 10px; }
            .image-container { flex: 1; }
            .image-container img { width: 100%; border: 1px solid #ddd; }
            .diff-percentage { font-weight: bold; color: #f44336; }
          </style>
        </head>
        <body>
          <h1>Visual Regression Test Report</h1>
          ${results.map(result => `
            <div class="test ${result.passed ? 'passed' : 'failed'}">
              <h3>${result.name}</h3>
              <p>Status: ${result.passed ? '✅ Passed' : '❌ Failed'}</p>
              ${!result.passed ? `
                <p class="diff-percentage">Difference: ${result.diffPercentage.toFixed(2)}% (${result.diffPixels} pixels)</p>
                <div class="images">
                  <div class="image-container">
                    <h4>Expected</h4>
                    <img src="${result.baselinePath}" alt="Expected">
                  </div>
                  <div class="image-container">
                    <h4>Actual</h4>
                    <img src="${result.actualPath}" alt="Actual">
                  </div>
                  <div class="image-container">
                    <h4>Diff</h4>
                    <img src="${result.diffPath}" alt="Diff">
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    return html;
  }
}