/* Pruebas del catálogo. Ejecutar npm install y npm test con Chrome instalado. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs/capturas-tarjeta3');
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
    page.on('request', req => { if (req.url().endsWith('/data/planes.json')) requests++; });
    const ready = p => p.getByText('planes encontrados.', { exact: false }).waitFor();
    const cards = () => page.locator('#catalogo-planes article');
    const search = text => page.locator('#buscar-plan').fill(text);
    await page.goto(base + '/listado_box.html');
    await ready(page);
    assert.equal(requests, 1);
    assert.equal(await cards().count(), 4);
    record('Carga HTTP del JSON y cuatro tarjetas dinámicas');
    assert.equal(await page.locator('#catalogo-planes').getAttribute('aria-busy'), 'false');
    record('Finalización del estado de carga');
    await page.locator('section.section .container').screenshot({ path: path.join(shots, '01-catalogo-completo.png') });
    for (const [term, result] of [['plan mensual', 'Plan Mensual'], ['  TRIMESTRAL  ', 'Plan Trimestral'], ['renovacion', 'Plan Mensual'], ['progreso', 'Plan Semestral'], ['opción', 'Plan Anual']]) {
      await search(term);
      assert.equal(await cards().count(), 1);
      assert.equal(await cards().locator('h2').textContent(), result);
      record('Búsqueda por ' + term.trim() + ' devuelve ' + result);
    }
    await search('mensual');
    assert.equal(await cards().count(), 2);
    record('Mensual encuentra también la descripción de valor mensual del plan anual');
    await page.locator('#limpiar-filtros').click();
    for (const [months, result] of [['1', 'Plan Mensual'], ['3', 'Plan Trimestral'], ['6', 'Plan Semestral'], ['12', 'Plan Anual']]) {
      await page.locator('#filtrar-duracion').selectOption(months);
      assert.equal(await cards().count(), 1);
      assert.equal(await cards().locator('h2').textContent(), result);
      record('Filtro de duración ' + months + ' meses');
    }
    await search('compromiso');
    assert.equal(await cards().count(), 1);
    record('Texto y duración se combinan con condición AND');
    await page.locator('section.section .container').screenshot({ path: path.join(shots, '02-filtros-combinados.png') });
    await page.locator('#filtrar-duracion').selectOption('1');
    assert.equal(await cards().count(), 0);
    assert.equal(await page.locator('#sin-resultados').isVisible(), true);
    assert.equal(await page.locator('#estado-catalogo').textContent(), '0 de 4 planes encontrados.');
    record('Filtros incompatibles muestran cero resultados y mensaje');
    await page.locator('section.section .container').screenshot({ path: path.join(shots, '03-sin-resultados.png') });
    await page.locator('#limpiar-filtros').click();
    assert.equal(await cards().count(), 4);
    assert.equal(await page.locator('#buscar-plan').inputValue(), '');
    assert.equal(await page.locator('#filtrar-duracion').inputValue(), '');
    assert.equal(await page.locator('#buscar-plan').evaluate(el => el === document.activeElement), true);
    record('Limpiar restaura el catálogo y devuelve el foco a la búsqueda');
    await search('   ');
    assert.equal(await cards().count(), 4);
    record('Una búsqueda de espacios equivale a buscar todos');
    await search('plan-no-existente');
    assert.equal(await cards().count(), 0);
    record('Texto desconocido no muestra tarjetas');
    await page.locator('#limpiar-filtros').click();
    assert.equal(requests, 1);
    record('Los filtros trabajan en memoria y no repiten fetch');
    assert.equal(await page.locator('.plan-featured h2').textContent(), 'Plan Semestral');
    record('Se conserva el plan destacado del TP1');
    assert.equal(await page.getByRole('link', { name: 'Ver detalle del Plan Mensual', exact: true }).getAttribute('href'), 'producto.html');
    record('La ficha mensual conserva su enlace de detalle');
    await page.getByRole('link', { name: 'Elegir Plan Trimestral', exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get('plan'), 'trimestral');
    assert.equal(await page.locator('#plan-trimestral').isChecked(), true);
    assert.match(await page.locator('#subtotal').textContent(), /67\.500/);
    record('El enlace conserva el plan elegido y activa el subtotal existente');
    await page.locator('#cantidad').fill('2');
    assert.match(await page.locator('#subtotal').textContent(), /135\.000/);
    record('El subtotal del compañero mantiene su funcionamiento');
    await page.locator('#codigo-cupon').fill('UCP10');
    await page.locator('#validar-cupon').click();
    assert.match(await page.locator('#mensaje-cupon').textContent(), /10%/);
    record('La validación del cupón original sigue funcionando');
    await page.goto(base + '/comprar.html?plan=inexistente');
    assert.equal(await page.locator('input[name="plan"]:checked').count(), 0);
    record('Identificador de plan desconocido no preselecciona otro');
    await page.goto(base + '/listado_box.html');
    await ready(page);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#filtrar-duracion').selectOption('6');
    await page.locator('section.section .container').screenshot({ path: path.join(shots, '04-vista-movil.png') });
    record('Diseño móvil de 390 px sin desbordamiento horizontal');
    assert.deepEqual(errors, []);
    record('Recorrido normal sin errores JavaScript');
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\son(?:click|submit)\s*=/i);
    }
    record('Sin onclick ni onsubmit en las páginas HTML');
    const failures = await browser.newPage();
    await failures.route('**/data/planes.json', route => route.fulfill({ status: 404, body: 'No encontrado' }));
    await failures.goto(base + '/listado_box.html');
    const errorState = () => failures.getByText('No se pudieron cargar los planes.', { exact: false }).waitFor();
    await errorState();
    assert.equal(await failures.locator('#buscar-plan').isDisabled(), true);
    assert.equal(await failures.locator('#reintentar-catalogo').isVisible(), true);
    record('HTTP 404 informa el error y bloquea filtros');
    await failures.locator('section.section .container').screenshot({ path: path.join(shots, '05-error-http.png') });
    await failures.unroute('**/data/planes.json');
    await failures.locator('#reintentar-catalogo').click();
    await ready(failures);
    assert.equal(await failures.locator('#catalogo-planes article').count(), 4);
    record('Reintentar recupera el catálogo después del error');
    const original = JSON.parse(fs.readFileSync(path.join(root, 'data/planes.json')));
    for (const [name, body] of [
      ['JSON malformado', '{invalido'],
      ['Esquema no array', '{}'],
      ['Precio inválido', JSON.stringify([{ ...original[0], precio: -1 }])],
      ['Identificador duplicado', JSON.stringify([original[0], original[0]])]
    ]) {
      await failures.route('**/data/planes.json', route => route.fulfill({ status: 200, contentType: 'application/json', body }));
      await failures.reload();
      await errorState();
      assert.equal(await failures.locator('#catalogo-planes article').count(), 0);
      record(name + ' no se presenta como un catálogo válido');
      await failures.unroute('**/data/planes.json');
    }
    await failures.route('**/data/planes.json', route => route.abort('failed'));
    await failures.reload();
    await errorState();
    record('Fallo de red muestra estado de error');
    await failures.unroute('**/data/planes.json');
    await failures.route('**/data/planes.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await failures.reload();
    await failures.getByText('No hay planes disponibles en el catálogo.', { exact: true }).waitFor();
    assert.equal(await failures.locator('#sin-resultados').isVisible(), true);
    record('Catálogo vacío muestra un estado distinto del fallo HTTP');
    await failures.unroute('**/data/planes.json');
    const hostile = [{ ...original[0], nombre: '<img src=x onerror=alert(1)>' }];
    await failures.route('**/data/planes.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hostile) }));
    await failures.reload();
    await ready(failures);
    assert.equal(await failures.locator('#catalogo-planes img').count(), 0);
    assert.equal(await failures.locator('#catalogo-planes h2').textContent(), hostile[0].nombre);
    record('El contenido del JSON se inserta como texto y no como HTML');
    const result = { fecha: new Date().toISOString().slice(0, 10), navegador: 'Google Chrome', total: checks.length, pruebas: checks };
    fs.writeFileSync(path.join(root, 'docs/pruebas-tarjeta3.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
