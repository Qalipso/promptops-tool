import { expect, test } from '@playwright/test';

/** Critical path: build an agent from scratch → preview → release a version. */
test('builder flow: create agent, compile, release', async ({ page }) => {
  const id = `e2e.agent.${Date.now()}`;

  // Create the agent.
  await page.goto('/builder/new');
  await page.getByPlaceholder('team.agent.use-case').fill(id);
  await page.getByRole('button', { name: /Start building/ }).click();

  // Land in the wizard on Business Brief.
  await expect(page.getByRole('heading', { name: 'Agent builder' })).toBeVisible();
  await page.getByPlaceholder('Booking Assistant').fill('E2E Greeter');
  await page.getByPlaceholder('Book salon appointments via chat.').fill('Greet users by name.');

  // Behavior — persona drives the compiled system prompt.
  await page.getByRole('button', { name: /Agent Behavior$/ }).click();
  await page.getByPlaceholder('a friendly, efficient booking assistant').fill('a warm greeter');

  // Preview compiles the spec.
  await page.getByRole('button', { name: /Prompt Preview$/ }).click();
  await expect(page.getByText('warm greeter')).toBeVisible({ timeout: 10_000 });

  // Release → creates a version and navigates to it.
  await page.getByRole('button', { name: /Release$/ }).click();
  await page.getByRole('button', { name: /Create version/ }).click();
  await page.waitForURL(/\/assets\/.+\/versions\/.+/, { timeout: 15_000 });
  await expect(page.getByText('active', { exact: true }).first()).toBeVisible();
});
