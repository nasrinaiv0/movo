// Actual MOVO component rendering using isolated synthetic data; no external requests.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const output = process.env.QA_OUTPUT || '/tmp/movo-loan-ui';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    const file = path.join('/tmp/movo-ui-qa', name === '/' ? 'index.html' : path.basename(name));
    const types = { '.js':'text/javascript', '.html':'text/html', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp' };
    fs.readFile(file, (error, data) => {
      res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  let browser;
  const errors = [], results = [];
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    for (const width of [320, 390, 768, 1280]) for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
      try {
      await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4175/') ? route.continue() : route.abort());
      await page.goto('http://127.0.0.1:4175/?screen=planning&mode='+mode, {waitUntil:'networkidle'});
      await page.getByRole('heading',{name:'Financial planning',exact:true}).waitFor({timeout:10000});
      await page.getByRole('button',{name:'Add',exact:true}).click({timeout:10000});
      await page.getByRole('button',{name:'Add a loan or debt',exact:true}).click();
      const dialog = page.getByRole('dialog',{name:'Add a loan or debt'});
      await dialog.waitFor();
      const receiving = dialog.locator('#loan-receiving-account');
      const payment = dialog.locator('#loan-payment-account');
      const proceeds = dialog.locator('input[type="checkbox"]').first();
      await dialog.locator('input[maxlength="120"]').first().fill('Synthetic loan');
      await dialog.locator('input[type="number"]').first().fill('5000');
      assert.equal(await proceeds.isChecked(),false);
      await payment.selectOption('cash');
      assert.equal(await proceeds.isChecked(),false);
      await receiving.selectOption('bank');
      assert.equal(await proceeds.isChecked(),true);
      assert.equal(await payment.inputValue(),'cash');
      const measure = await dialog.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,viewport:innerWidth,
        left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,background:getComputedStyle(el).backgroundColor,
        pageOverflow:document.documentElement.scrollWidth>innerWidth}));
      assert.ok(measure.scroll<=measure.width+1,JSON.stringify(measure));
      assert.ok(measure.left>=-1 && measure.right<=width+1 && !measure.pageOverflow,JSON.stringify(measure));
      if (width===390 || width===1280) {
        await receiving.scrollIntoViewIfNeeded();
        await page.screenshot({path:output+'/'+width+'-'+mode+'-receiving.png'});
        await dialog.getByRole('button',{name:'Save loan / debt',exact:true}).scrollIntoViewIfNeeded();
        await page.screenshot({path:output+'/'+width+'-'+mode+'-save.png'});
      }
      await proceeds.uncheck();
      assert.equal(await receiving.inputValue(),'');
      results.push({width,mode,measure,receivingAutoPosts:true,repaymentPreferenceIndependent:true});
      } catch (error) {
        await page.screenshot({path:output+'/'+width+'-'+mode+'-failure.png',fullPage:true}).catch(()=>{});
        fs.writeFileSync(output+'/'+width+'-'+mode+'-diagnostic.json',JSON.stringify({width,mode,errors,body:await page.locator('body').innerText().catch(()=>''),cause:error.message},null,2));
        throw error;
      } finally { await page.close(); }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(output+'/results.json',JSON.stringify({results,errors},null,2));
    console.log(results.length+' real-component loan form visual checks passed (synthetic data only).');
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exit(1)});
