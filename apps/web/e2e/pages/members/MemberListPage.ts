import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Member List Page
 * Single Responsibility: Handles list page interactions
 */
export class MemberListPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly memberRows: Locator;
  readonly stageFilter: Locator;
  readonly centerFilter: Locator;
  readonly dataGrid: Locator;
  readonly addMemberButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.searchInput = page.getByPlaceholder(/search.*member|search.*name|search.*household/i);
    this.memberRows = page.locator('[data-testid="member-row"], table tbody tr, [role="row"]');
    this.stageFilter = page.getByLabel(/stage/i);
    this.centerFilter = page.getByLabel(/center/i);
    this.dataGrid = page.locator('[data-testid="data-grid"], [role="grid"], table');
    this.addMemberButton = page.getByRole('button', { name: /add.*member|new.*member/i }).or(
      page.getByRole('link', { name: /add.*member|new.*member/i })
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/members/list');
  }

  async searchMember(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clickMemberRow(name: string): Promise<void> {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name }).first();
    await row.click();
  }

  async clickEditMember(name: string): Promise<void> {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name }).first();
    const editButton = row.getByRole('button', { name: /edit/i }).or(row.getByRole('link', { name: /edit/i }));
    await editButton.click();
  }

  async clickAddMember(): Promise<void> {
    await this.addMemberButton.click();
  }

  async getMemberCount(): Promise<number> {
    await this.memberRows.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    return await this.memberRows.count();
  }

  async isLoaded(): Promise<boolean> {
    return await this.dataGrid.isVisible({ timeout: 10000 });
  }

  async memberExistsInList(name: string): Promise<boolean> {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name });
    return await row.isVisible({ timeout: 5000 });
  }
}
