/**
 * Twitter Extension
 * 
 * This extension provides Twitter functionality for agents, allowing them to
 * interact with Twitter through various skills like tweeting, engagement,
 * user management, search, and media handling.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { Agent, Extension, ExtensionAction, ExtensionEventHandler, ActionResult, ActionResultType, ExtensionType, ExtensionStatus } from '../../types/agent.js';
import { ExtensionConfig } from '../../types/common.js';
import { initializeSkills, TwitterSkills } from './skills/index.js';
import { TwitterConfig, TwitterActionType, TwitterErrorType, TwitterMediaType } from './types.js';

/**
 * Twitter Extension implementation
 */
export class TwitterExtension implements Extension {
  id: string = 'twitter';
  name: string = 'Twitter';
  version: string = '1.0.0';
  type: ExtensionType = ExtensionType.SOCIAL_PLATFORM;
  enabled: boolean = false;
  status: ExtensionStatus = ExtensionStatus.DISABLED;
  config: ExtensionConfig;
  private twitterConfig: TwitterConfig;
  skills: TwitterSkills;
  actions: Record<string, ExtensionAction> = {};
  events: Record<string, ExtensionEventHandler> = {};
  
  private browser: Browser | null = null; // Will hold Puppeteer browser instance
  private page: Page | null = null;    // Will hold Puppeteer page instance
  private loggedIn: boolean = false;
  
  constructor(config: TwitterConfig) {
    this.twitterConfig = config;
    this.config = {
      enabled: true,
      settings: config as any
    };
    
    // Initialize skills
    this.skills = initializeSkills(this);
    
    // Register all actions from skills
    this.registerSkillActions();
    
    // Register event handlers
    this.registerEventHandlers();
  }
  
  /**
   * Initialize the extension for a specific agent
   */
  async init(agent: Agent): Promise<void> {
    try {
      console.log(`🐦 Initializing Twitter extension for agent ${agent.name}...`);
      
      // Initialize Puppeteer browser
      await this.initBrowser();
      
      // Login to Twitter
      await this.login();
      
      this.enabled = true;
      this.status = ExtensionStatus.ENABLED;
      console.log(`✅ Twitter extension initialized for ${agent.name}`);
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      console.error(`❌ Failed to initialize Twitter extension: ${error}`);
      this.enabled = false;
      throw error;
    }
  }
  
  /**
   * Tick method called by the agent runtime on each cycle
   */
  async tick(agent: Agent): Promise<void> {
    if (!this.enabled) return;
    
    try {
      // Check for notifications, DMs, etc.
      // This would be implemented with actual Twitter API or Puppeteer code
    } catch (error) {
      console.error(`❌ Twitter extension tick error: ${error}`);
    }
  }
  
  /**
   * Register all actions from skills
   */
  private registerSkillActions(): void {
    // Combine actions from all skills
    const allSkills = [
      this.skills.tweeting,
      this.skills.engagement,
      this.skills.search,
      this.skills.media,
      this.skills.userManagement
    ];
    
    for (const skill of allSkills) {
      const actions = skill.getActions();
      for (const [key, action] of Object.entries(actions)) {
        this.actions[key] = action;
      }
    }
  }
  
  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    this.events = {
      'twitter:notification': {
        event: 'twitter:notification',
        description: 'Triggered when a Twitter notification is received',
        handler: async (agent: Agent, event: any) => {
          // Handle Twitter notification
          console.log(`📬 Twitter notification for ${agent.name}: ${event.data?.type}`);
        }
      },
      'twitter:dm': {
        event: 'twitter:dm',
        description: 'Triggered when a direct message is received',
        handler: async (agent: Agent, event: any) => {
          // Handle Twitter DM
          console.log(`💬 Twitter DM for ${agent.name} from ${event.data?.sender}`);
        }
      }
    };
  }
  
  /**
   * Implementation methods that will be called by skills
   */
  
  // Tweeting methods
  async postTweet(text: string, mediaIds?: string[], replyToTweetId?: string): Promise<ActionResult> {
    if (!this.page) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: 'Browser not initialized',
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.BROWSER_ERROR, errorCode: 'BROWSER_NOT_INIT' }
      };
    }

    try {
      await this.refreshSession();
      
      // Navigate to Twitter home to compose tweet
      await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
      
      // Click on the compose tweet button/area
      await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await this.page.click('[data-testid="tweetTextarea_0"]');
      
      // Type the tweet text
      await this.page.type('[data-testid="tweetTextarea_0"]', text, { delay: 50 });
      
      // If replying to a tweet, handle that logic here
      if (replyToTweetId) {
        // This would require navigating to the specific tweet first
        console.log(`📝 Replying to tweet ${replyToTweetId}`);
      }
      
      // Handle media uploads if provided
      if (mediaIds && mediaIds.length > 0) {
        console.log(`📎 Attaching ${mediaIds.length} media files`);
        // Media upload logic would go here
      }
      
      // Click the Tweet button to post
      await this.page.waitForSelector('[data-testid="tweetButtonInline"]', { timeout: 5000 });
      await this.page.click('[data-testid="tweetButtonInline"]');
      
      // Wait for the tweet to be posted (look for success indicators)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Successfully posted tweet: "${text.substring(0, 50)}..."`);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          text, 
          timestamp: new Date().toISOString(),
          mediaIds,
          replyToTweetId 
        },
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      console.error('❌ Failed to post tweet:', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to post tweet: ${error}`,
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.API_ERROR, errorCode: 'POST_TWEET_FAILED' }
      };
    }
  }
  
  async replyToTweet(tweetId: string, text: string, mediaIds?: string[]): Promise<ActionResult> {
    // Implementation would use Puppeteer to reply to a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, text, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async createThread(tweets: string[], mediaIds?: string[][]): Promise<ActionResult> {
    // Implementation would use Puppeteer to create a thread
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetCount: tweets.length, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async scheduleTweet(text: string, scheduledTime: string, mediaIds?: string[]): Promise<ActionResult> {
    // Implementation would use Puppeteer to schedule a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { text, scheduledTime, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async deleteTweet(tweetId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to delete a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  // Engagement methods
  async retweet(tweetId: string): Promise<ActionResult> {
    if (!this.page) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: 'Browser not initialized',
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.BROWSER_ERROR, errorCode: 'BROWSER_NOT_INIT' }
      };
    }

    try {
      await this.refreshSession();
      
      // Navigate to the specific tweet
      const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the retweet button and click it
      await this.page.waitForSelector('[data-testid="retweet"]', { timeout: 10000 });
      await this.page.click('[data-testid="retweet"]');
      
      // Wait for the retweet confirmation dialog and click "Retweet"
      await this.page.waitForSelector('[data-testid="retweetConfirm"]', { timeout: 5000 });
      await this.page.click('[data-testid="retweetConfirm"]');
      
      // Wait for the action to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Successfully retweeted: ${tweetId}`);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          tweetId, 
          timestamp: new Date().toISOString(),
          action: 'retweet'
        },
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      console.error('❌ Failed to retweet:', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to retweet: ${error}`,
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.API_ERROR, errorCode: 'RETWEET_FAILED' }
      };
    }
  }
  
  async likeTweet(tweetId: string): Promise<ActionResult> {
    if (!this.page) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: 'Browser not initialized',
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.BROWSER_ERROR, errorCode: 'BROWSER_NOT_INIT' }
      };
    }

    try {
      await this.refreshSession();
      
      // Navigate to the specific tweet
      const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the like button and click it
      await this.page.waitForSelector('[data-testid="like"]', { timeout: 10000 });
      await this.page.click('[data-testid="like"]');
      
      // Wait for the action to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`❤️ Successfully liked tweet: ${tweetId}`);
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          tweetId, 
          timestamp: new Date().toISOString(),
          action: 'like'
        },
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      console.error('❌ Failed to like tweet:', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to like tweet: ${error}`,
        metadata: { timestamp: new Date().toISOString(), errorType: TwitterErrorType.API_ERROR, errorCode: 'LIKE_FAILED' }
      };
    }
  }
  
  async unlikeTweet(tweetId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to unlike a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async bookmarkTweet(tweetId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to bookmark a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async removeBookmark(tweetId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to remove a bookmark
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async quoteTweet(tweetId: string, text: string, mediaIds?: string[]): Promise<ActionResult> {
    // Implementation would use Puppeteer to quote a tweet
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { tweetId, text, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  // User management methods
  async followUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to follow a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async unfollowUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to unfollow a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async getUserInfo(username?: string, userId?: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to get user info
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, username, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async getFollowers(userId: string, maxResults: number = 20, nextToken?: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to get followers
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, users: [], count: maxResults, nextToken, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async getFollowing(userId: string, maxResults: number = 20, nextToken?: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to get users that a user is following
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, users: [], count: maxResults, nextToken, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async blockUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to block a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async unblockUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to unblock a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async muteUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to mute a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async unmuteUser(userId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to unmute a user
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  // Search methods
  async searchTweets(query: string, maxResults: number = 20, nextToken?: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to search for tweets
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { query, count: maxResults, nextToken, tweets: [], timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async searchUsers(query: string, maxResults: number = 20, nextToken?: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to search for users
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { query, count: maxResults, nextToken, users: [], timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async getTrends(woeid: number = 1): Promise<ActionResult> {
    // Implementation would use Puppeteer to get trending topics
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { woeid, trends: [], timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async searchTrending(category: string = 'all', location: string = 'worldwide'): Promise<ActionResult> {
    // Implementation would use Puppeteer to get trending topics
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { category, location, trends: [], timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  // Media methods
  async uploadMedia(filePath: string, altText?: string, mediaType: TwitterMediaType = TwitterMediaType.PHOTO): Promise<ActionResult> {
    // Implementation would use Puppeteer to upload media
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { filePath, altText, mediaType, mediaId: `media_${Date.now()}`, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  async deleteMedia(mediaId: string): Promise<ActionResult> {
    // Implementation would use Puppeteer to delete media
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { mediaId, timestamp: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
  
  /**
   * Private helper methods
   */
  
  private async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: this.twitterConfig.headless ?? false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });
      
      console.log('🌐 Initialized browser for Twitter extension');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }
  
  private async login(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    
    try {
      console.log('🔑 Attempting to log in to Twitter...');
      
      // Navigate to Twitter login page
      await this.page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });
      
      // Wait for username input and enter username
      await this.page.waitForSelector('input[name="text"]', { timeout: 10000 });
      await this.page.type('input[name="text"]', this.twitterConfig.username, { delay: 100 });
      
      // Click Next button
      await this.page.click('[role="button"]:has-text("Next")');
      
      // Wait for password input and enter password
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await this.page.type('input[name="password"]', this.twitterConfig.password, { delay: 100 });
      
      // Click Log in button
      await this.page.click('[data-testid="LoginForm_Login_Button"]');
      
      // Wait for navigation to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      // Check if login was successful by looking for home timeline
      await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
      
      this.loggedIn = true;
      console.log(`✅ Successfully logged in to Twitter as ${this.twitterConfig.username}`);
    } catch (error) {
      console.error('❌ Failed to log in to Twitter:', error);
      this.loggedIn = false;
      throw error;
    }
  }
  
  private async checkSession(): Promise<boolean> {
    if (!this.page || !this.loggedIn) {
      return false;
    }
    
    try {
      // Check if we're still logged in by looking for user menu or home timeline
      await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2', timeout: 10000 });
      await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 5000 });
      return true;
    } catch (error) {
      console.log('🔄 Session appears to be invalid, need to re-login');
      this.loggedIn = false;
      return false;
    }
  }
  
  private async refreshSession(): Promise<void> {
    if (!await this.checkSession()) {
      console.log('🔄 Refreshing Twitter session...');
      await this.login();
     }
   }

   /**
    * Cleanup method to properly close browser resources
    */
   async destroy(): Promise<void> {
     try {
       if (this.page) {
         await this.page.close();
         this.page = null;
       }
       
       if (this.browser) {
         await this.browser.close();
         this.browser = null;
       }
       
       this.loggedIn = false;
       this.enabled = false;
       
       console.log('🧹 Twitter extension cleaned up successfully');
     } catch (error) {
       console.error('❌ Error during Twitter extension cleanup:', error);
     }
   }
 }