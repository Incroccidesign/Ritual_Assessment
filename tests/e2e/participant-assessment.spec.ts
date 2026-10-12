import { expect, test, type Page } from "@playwright/test";
import { TEST_PROFILES } from "../../scripts/test-data/simulated-assessment-data.mjs";

const publicToken = process.env.PLAYWRIGHT_ASSESSMENT_PUBLIC_TOKEN;
const language = process.env.PLAYWRIGHT_ASSESSMENT_LANGUAGE ?? "it";
const profileCount = Number(process.env.PLAYWRIGHT_PROFILE_COUNT ?? 5);
const expectReportDownload = process.env.PLAYWRIGHT_EXPECT_REPORT_DOWNLOAD !== "false";

test.skip(!publicToken, "Set PLAYWRIGHT_ASSESSMENT_PUBLIC_TOKEN to run participant flow tests.");

for (const [index, baseProfile] of TEST_PROFILES.slice(0, profileCount).entries()) {
  test(`participant completes assessment via UI - ${baseProfile.organizationName}`, async ({ page }) => {
    const profile = {
      ...baseProfile,
      organizationName: `${baseProfile.organizationName}_UI_${String(index + 1).padStart(2, "0")}`
    };

    await page.goto(`/participate/${publicToken}?locale=${language}&uiTest=${index + 1}`);
    await expect(page.getByRole("link", { name: /Ritual/i })).toBeVisible();
    await clickFirstMatchingButton(page, /start|inizia|commencer/i);
    await expect(page.getByRole("button", { name: /start activity|inizia attivita|commencer/i })).toBeVisible();

    for (let step = 0; step < 80; step += 1) {
      const headingText = await page.locator("h1").first().innerText().catch(() => "");
      console.log(`step=${step} heading="${headingText}"`);
      if (await isCompletionReached(page)) break;

      if (await clickButtonByVisibleText(page, /submit assessment|invia assessment|invia le risposte|envoyer/i)) {
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(900);
        if (await isCompletionReached(page)) break;
        continue;
      }

      if (await clickFirstMatchingButton(page, /start activity|inizia attivita|commencer/i, false)) continue;
      if (await clickFirstMatchingButton(page, /next|avanti/i, false)) {
        await page.waitForTimeout(500);
        continue;
      }

      await fillVisibleInputs(page, profile);
      await selectVisibleOptions(page);
      await fillVisibleTextareas(page, profile, step);
      await clickChoiceCards(page);

      if (await clickFirstMatchingButton(page, /complete activity|completa attivita/i, false)) {
        await page.waitForTimeout(900);
        continue;
      }
      await page.waitForTimeout(150);
    }

    await expect.poll(() => isCompletionReached(page), { timeout: 30_000 }).toBe(true);

    if (expectReportDownload) {
      const downloadButton = page.getByRole("button", { name: /download|scarica|telecharger/i });
      if (await downloadButton.isVisible().catch(() => false)) {
        const downloadPromise = page.waitForEvent("download");
        await downloadButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.(docx|doc)$/i);
      }
    }
  });
}

async function fillVisibleInputs(page: Page, profile: typeof TEST_PROFILES[number]) {
  const inputs = page.locator("input:not([type='hidden']):not([disabled])");
  const count = await inputs.count();
  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    if (!(await input.isVisible())) continue;
    const value = await input.inputValue().catch(() => "");
    if (value) continue;
    const labelText = await nearbyText(input);
    await input.fill(valueForLabel(labelText, profile));
  }
}

async function selectVisibleOptions(page: Page) {
  const selects = page.locator("select:not([disabled])");
  const count = await selects.count();
  for (let index = 0; index < count; index += 1) {
    const select = selects.nth(index);
    if (!(await select.isVisible())) continue;
    const options = await select.locator("option").evaluateAll((items) =>
      items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled }))
    );
    const option = options.find((item) => item.value && !item.disabled);
    if (option) await select.selectOption(option.value);
  }
}

async function fillVisibleTextareas(page: Page, profile: typeof TEST_PROFILES[number], step: number) {
  const textareas = page.locator("textarea:not([disabled])");
  const count = await textareas.count();
  for (let index = 0; index < count; index += 1) {
    const textarea = textareas.nth(index);
    if (!(await textarea.isVisible())) continue;
    const value = await textarea.inputValue().catch(() => "");
    if (value) continue;
    await textarea.fill(`${profile.needs} ${profile.shortObjective} Test UI step ${step + 1}.`);
  }
}

async function clickChoiceCards(page: Page) {
  const excluded = /complete|completa|back|indietro|next|avanti|start|inizia|submit|invia|clear|svuota|download|scarica|remove|rimuovi/i;
  const buttons = page.locator("button:not([disabled])");
  const count = await buttons.count();
  let clicked = 0;
  for (let index = 0; index < count && clicked < 4; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible())) continue;
    const text = (await button.innerText().catch(() => "")).trim();
    if (text.length < 3 || excluded.test(text)) continue;
    await button.click();
    clicked += 1;
  }
}

async function clickFirstMatchingButton(page: Page, name: RegExp, required = true) {
  const buttons = page.getByRole("button", { name });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click();
    return true;
  }
  if (!required) return false;
  await expect(buttons.first()).toBeVisible();
  await buttons.first().click();
  return true;
}

async function clickButtonByVisibleText(page: Page, name: RegExp) {
  const buttons = page.locator("button:not([disabled])");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    const text = (await button.innerText().catch(() => "")).trim();
    if (!name.test(text)) continue;
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click();
    return true;
  }
  return false;
}

async function isCompletionReached(page: Page) {
  const completionCopy = page.getByText(
    /assessment submitted|assessment inviato|evaluation envoyee|your planning report|il tuo report di pianificazione|votre rapport de planification/i
  );
  if (await completionCopy.first().isVisible().catch(() => false)) return true;
  const downloadButton = page.getByRole("button", { name: /download report|scarica report|telecharger le rapport/i });
  return downloadButton.isVisible().catch(() => false);
}

async function nearbyText(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate((element) => {
    const label = element.closest("label") ?? element.parentElement;
    return label?.textContent ?? "";
  }).catch(() => "");
}

function valueForLabel(label: string, profile: typeof TEST_PROFILES[number]) {
  const normalized = label.toLowerCase();
  if (normalized.includes("email")) return `ui.${profile.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.test`;
  if (normalized.includes("organization") || normalized.includes("organizzazione") || normalized.includes("organisation") || normalized.includes("azienda")) {
    return profile.organizationName;
  }
  if (normalized.includes("role") || normalized.includes("ruolo")) return profile.respondentRole;
  if (normalized.includes("sector") || normalized.includes("attiv")) return profile.mainActivityArea;
  return `${profile.organizationName} test value`;
}
