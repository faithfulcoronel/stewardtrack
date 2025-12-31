import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Page Object for Notification Bell and Notification Center interactions
 */
export class NotificationsPage {
  readonly page: Page;

  // Notification Bell elements
  readonly bellButton: Locator;
  readonly unreadBadge: Locator;

  // Notification Center elements
  readonly notificationCenter: Locator;
  readonly markAllReadButton: Locator;
  readonly notificationList: Locator;
  readonly notificationItems: Locator;
  readonly emptyState: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Bell button in the layout header
    this.bellButton = page.locator('[data-testid="notification-bell"]');
    this.unreadBadge = page.locator('[data-testid="notification-badge"]');

    // Notification center popover content
    this.notificationCenter = page.locator('[data-testid="notification-center"]');
    this.markAllReadButton = page.locator('[data-testid="mark-all-read"]');
    this.notificationList = page.locator('[data-testid="notification-list"]');
    this.notificationItems = page.locator('[data-testid="notification-item"]');
    this.emptyState = page.locator('[data-testid="notification-empty"]');
    this.loadingIndicator = page.locator('[data-testid="notification-loading"]');
  }

  /**
   * Check if the notification bell is visible
   */
  async isBellVisible(): Promise<boolean> {
    return this.bellButton.isVisible();
  }

  /**
   * Open the notification center by clicking the bell
   */
  async openNotificationCenter(): Promise<void> {
    await this.bellButton.click();
    await expect(this.notificationCenter).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close the notification center by clicking outside
   */
  async closeNotificationCenter(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.notificationCenter).not.toBeVisible();
  }

  /**
   * Get the unread count from the badge
   */
  async getUnreadCount(): Promise<number> {
    const isVisible = await this.unreadBadge.isVisible();
    if (!isVisible) {
      return 0;
    }
    const text = await this.unreadBadge.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Check if there are any unread notifications
   */
  async hasUnreadNotifications(): Promise<boolean> {
    return this.unreadBadge.isVisible();
  }

  /**
   * Get the count of notification items in the center
   */
  async getNotificationCount(): Promise<number> {
    await this.waitForNotificationsToLoad();
    return this.notificationItems.count();
  }

  /**
   * Wait for notifications to load
   */
  async waitForNotificationsToLoad(): Promise<void> {
    // Wait for loading indicator to disappear
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const isVisible = await this.markAllReadButton.isVisible();
    if (isVisible) {
      await this.markAllReadButton.click();
      // Wait for the badge to disappear
      await expect(this.unreadBadge).not.toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Click the first notification item
   */
  async clickFirstNotification(): Promise<void> {
    const count = await this.notificationItems.count();
    if (count > 0) {
      await this.notificationItems.first().click();
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markNotificationAsRead(index: number): Promise<void> {
    const item = this.notificationItems.nth(index);
    const markReadButton = item.locator('[data-testid="mark-read"]');
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(index: number): Promise<void> {
    const item = this.notificationItems.nth(index);
    const deleteButton = item.locator('[data-testid="delete-notification"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
    }
  }

  /**
   * Check if notification center shows empty state
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Get notification item by index
   */
  getNotificationItem(index: number): Locator {
    return this.notificationItems.nth(index);
  }

  /**
   * Get notification title by index
   */
  async getNotificationTitle(index: number): Promise<string | null> {
    const item = this.notificationItems.nth(index);
    const title = item.locator('[data-testid="notification-title"]');
    return title.textContent();
  }

  /**
   * Get notification message by index
   */
  async getNotificationMessage(index: number): Promise<string | null> {
    const item = this.notificationItems.nth(index);
    const message = item.locator('[data-testid="notification-message"]');
    return message.textContent();
  }

  /**
   * Check if a notification is unread
   */
  async isNotificationUnread(index: number): Promise<boolean> {
    const item = this.notificationItems.nth(index);
    const unreadIndicator = item.locator('[data-testid="unread-indicator"]');
    return unreadIndicator.isVisible();
  }
}
