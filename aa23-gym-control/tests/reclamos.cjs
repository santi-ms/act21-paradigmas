/* Pruebas del formulario de reclamos (tarjeta 11). Ejecutar con Chrome instalado. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs/capturas-tarjeta11');
fs.mkdirSync(shots, { recursive: true });
const checks = [];
const record = caso => checks.push({ caso, resultado: 'Correcto' });
const server = http.createServer((req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript' };
    res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    let requests = 0;
    page.on('pageerror', err => errors.push(err.message));
    page.on('request', req => { if (req.url().endsWith('/data/confirmacion-reclamo.json')) requests++; });

    await page.goto(base + '/producto.html');
    const textarea = page.locator('#comentario-reclamo');
    const contador = page.locator('#contador-reclamo');
    const mensaje = page.locator('#mensaje-reclamo');
    const boton = page.locator('#enviar-reclamo');

    assert.equal(await contador.textContent(), '0 / 500 caracteres');
    record('El contador inicia en 0 / 500 caracteres');

    await textarea.fill('Cinta rota en el sector 3');
    assert.equal(await contador.textContent(), '25 / 500 caracteres');
    record('El contador reacciona al evento input sin enviar el formulario');

    await textarea.fill('corto');
    await boton.click();
    await mensaje.getByText('Escribí al menos', { exact: false }).waitFor();
    assert.equal(requests, 0);
    record('Menos de 10 caracteres bloquea el envío sin llamar a fetch');

    await textarea.fill('   ');
    await boton.click();
    await mensaje.getByText('Escribí al menos', { exact: false }).waitFor();
    record('Un reclamo de solo espacios se rechaza por trim()');

    await textarea.fill('La cinta número 3 hace un ruido fuerte y se detiene sola.');
    await boton.click();
    await mensaje.getByText('Gracias', { exact: false }).waitFor();
    assert.equal(requests, 1);
    record('Un reclamo válido dispara un único fetch asíncrono');
    assert.equal(await textarea.inputValue(), '');
    record('El formulario se limpia tras la confirmación');
    await page.locator('.claims-form').screenshot({ path: path.join(shots, '01-reclamo-enviado.png') });

    const largo = 'a'.repeat(501);
    await textarea.fill(largo);
    assert.equal(await contador.textContent(), '501 / 500 caracteres');
    assert.equal(await contador.evaluate(el => el.classList.contains('field-hint-alerta')), true);
    await boton.click();
    await mensaje.getByText('supera los', { exact: false }).waitFor();
    record('Más de 500 caracteres se rechaza y resalta el contador');
    await page.locator('.claims-form').screenshot({ path: path.join(shots, '02-limite-superado.png') });

    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\son(?:click|submit)\s*=/i);
    }
    record('Sin onclick ni onsubmit en las páginas HTML');

    const failures = await browser.newPage();
    await failures.goto(base + '/producto.html');
    await failures.route('**/data/confirmacion-reclamo.json', route => route.fulfill({ status: 500, body: 'Error' }));
    await failures.locator('#comentario-reclamo').fill('Reclamo por un problema con el equipamiento.');
    await failures.locator('#enviar-reclamo').click();
    await failures.getByText('No pudimos enviar tu reclamo.', { exact: false }).waitFor();
    record('Error HTTP 500 muestra el mensaje de error, no bloquea el formulario');
    await failures.unroute('**/data/confirmacion-reclamo.json');
    await failures.locator('#enviar-reclamo').click();
    await failures.getByText('Gracias', { exact: false }).waitFor();
    record('Reintentar el envío después del error funciona');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('.claims-form').screenshot({ path: path.join(shots, '03-vista-movil.png') });
    record('Diseño móvil de 390 px sin desbordamiento horizontal');

    assert.deepEqual(errors, []);
    record('Recorrido normal sin errores JavaScript');

    const result = { fecha: new Date().toISOString().slice(0, 10), navegador: 'Google Chrome', total: checks.length, pruebas: checks };
    fs.writeFileSync(path.join(root, 'docs/pruebas-tarjeta11.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
