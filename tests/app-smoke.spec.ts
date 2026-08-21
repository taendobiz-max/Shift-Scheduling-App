import { expect, test } from '@playwright/test';

test('ログイン画面が生成され、Reactアプリが描画される', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('シフト管理システム');
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10000 });
});
