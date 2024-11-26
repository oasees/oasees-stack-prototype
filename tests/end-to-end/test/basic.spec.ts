import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from './wallet-setup/basic.setup'

// Set up the test environment with Synpress and MetaMask fixtures, using the basic setup configuration
const test = testWithSynpress(metaMaskFixtures(basicSetup))

const { expect } = test


test.describe('Two different tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('01. Connect to the OASEES portal and publish an asset.', async ({ context, page, metamaskPage, extensionId }) => {
      // Create a new MetaMask instance with the provided context, page, password, and extension ID
      test.setTimeout(90000);
      const metamask = new MetaMask(context, metamaskPage, basicSetup.walletPassword, extensionId)

      // Navigate to the root page
      await page.goto('/')

      // Click the connect button to initiate the wallet connection
      await page.getByRole('button', { name: 'Connect', exact: true }).click()

      // Connect dApp to MetaMask
      await metamask.connectToDapp()



      
      await page.getByRole('button', { name: 'Marketplaceicon Marketplace' }).click();
      await page.waitForTimeout(1000);
      const count_before_upload = await page.getByText('Playwright Asset').count();
      await page.getByRole('button', { name: 'Publishicon Publish' }).click();
      await page.getByLabel('Asset Name *').click();
      await page.getByLabel('Asset Name *').fill('Playwright Asset');
      await page.getByPlaceholder('Select asset type').click();
      await page.getByText('Algorithm').click();
      await page.getByRole('textbox', { name: 'Tags ⓘ' }).click();
      await page.getByRole('textbox', { name: 'Tags ⓘ' }).fill('TEST TAG');
      await page.getByRole('textbox', { name: 'Tags ⓘ' }).press('Enter');
      await page.getByRole('textbox', { name: 'Description * ⓘ' }).click();
      await page.getByRole('textbox', { name: 'Description * ⓘ' }).fill('This is a playwright test');
      await page.getByLabel('Price (eth) *').click();
      await page.getByLabel('Price (eth) *').fill('2');
      await page.getByRole('tab', { name: 'Upload From Local UPLOAD' }).click();
      await page.getByLabel('Upload From Local').locator('input').first().setInputFiles('test.txt');
      await page.getByRole('button', { name: 'Upload to OASEES Marketplace' }).click();
      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);
      await metamask.confirmTransaction();
      await expect(page.getByText('The asset was published successfully.')).toBeVisible();
      await page.locator('.mantine-Modal-close').click();
      await page.getByRole('button', { name: 'Marketplaceicon Marketplace' }).click();
      await page.waitForTimeout(1000);
      const count_after_upload = await page.getByText('Playwright Asset').count();
      expect(count_after_upload).toBeGreaterThan(count_before_upload);

  });

  test('02. Connect to the OASEES portal and purchase the asset.', async ({ context, page, metamaskPage, extensionId }) =>{
    test.setTimeout(90000);
    const metamask = new MetaMask(context, metamaskPage, basicSetup.walletPassword, extensionId);
    await page.goto('/');
    await metamask.switchAccount('Account 1');
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await metamask.connectToDapp();
    await page.waitForTimeout(1000);
    const count_before_purchase = await page.getByText('Playwright Asset').count();
    await page.getByRole('button', { name: 'Marketplaceicon Marketplace' }).click();
    await page.waitForTimeout(1000);
    const count = await page.getByText('Playwright Asset').count();
    await page.getByText('Playwright Asset').nth(count-1).click();
    await page.getByRole('button', { name: 'PURCHASE' }).click();
    await metamask.confirmTransaction();
    await expect(page.getByText('Your purchase was completed successfully.')).toBeVisible();
    await page.locator('.mantine-Modal-close').click();
    await page.getByRole('button', { name: 'Homeicon Home' }).click();
    await page.waitForTimeout(1000);
    const count_after_purchase = await page.getByText('Playwright Asset').count();
    expect(count_after_purchase).toBeGreaterThan(count_before_purchase);

  })
})
