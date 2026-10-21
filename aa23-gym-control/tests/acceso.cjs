/* Pruebas de la tarjeta 4 (registro y acceso). Ejecutar npm install y npm test con Chrome instalado. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs/capturas-tarjeta4');
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
// Fecha fija para que el estado de las membresías no dependa del día en que se corren las pruebas.
const HOY = new Date('2026-09-29T10:00:00');
const CLAVE = 'gimnasio2026';

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    // reducedMotion evita capturas a mitad de una transición de color.
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.clock.setFixedTime(HOY);
    const errors = [];
    let requests = 0;
    page.on('pageerror', err => errors.push(err.message));
    page.on('request', req => { if (req.url().endsWith('/data/usuarios.json')) requests++; });
    const msgIngreso = () => page.locator('#mensaje-ingreso').textContent();
    const msgRegistro = () => page.locator('#mensaje-registro').textContent();
    const activo = () => page.evaluate(() => document.activeElement.id);
    const ingresar = async (email, clave) => {
      await page.locator('#ingreso-email').fill(email);
      await page.locator('#ingreso-clave').fill(clave);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    };
    const zona = () => page.locator('section.form-section .container');

    await page.goto(base + '/acceso.html');
    assert.equal(await page.locator('#vista-visitante').isVisible(), true);
    assert.equal(await page.locator('#vista-socio').isVisible(), false);
    assert.equal(await page.locator('[data-enlace-acceso]').textContent(), 'Ingresar');
    record('El visitante ve los formularios de ingreso y registro');
    await zona().screenshot({ path: path.join(shots, '01-vista-visitante.png') });

    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    assert.equal(await msgIngreso(), 'Ingresá tu e-mail.');
    assert.equal(await page.locator('#ingreso-email').getAttribute('aria-invalid'), 'true');
    assert.equal(await activo(), 'ingreso-email');
    record('Ingreso con e-mail vacío: mensaje, marca y foco en el campo');
    await ingresar('   ', CLAVE);
    assert.equal(await msgIngreso(), 'Ingresá tu e-mail.');
    record('Un e-mail de solo espacios se considera vacío (trim)');
    await ingresar('lucia.benitez', CLAVE);
    assert.equal(await msgIngreso(), 'Revisá el formato del e-mail.');
    record('E-mail con formato inválido');
    await ingresar('lucia.benitez@gymcontrol.test', '        ');
    assert.equal(await msgIngreso(), 'Ingresá tu clave.');
    record('Clave de solo espacios se considera vacía');
    await ingresar('lucia.benitez@gymcontrol.test', 'corta');
    assert.equal(await msgIngreso(), 'La clave tiene al menos 8 caracteres.');
    assert.equal(requests, 0);
    record('Clave menor a 8 caracteres se rechaza sin llamar al servidor');
    await page.locator('#ingreso-clave').fill('corta2');
    assert.equal(await page.locator('#ingreso-clave').getAttribute('aria-invalid'), null);
    record('Al corregir el campo se quita la marca de error');

    await ingresar('lucia.benitez@gymcontrol.test', 'claveIncorrecta');
    await page.getByText('E-mail o clave incorrectos.', { exact: true }).waitFor();
    assert.equal(await page.locator('#ingreso-clave').inputValue(), '');
    assert.equal(requests, 1);
    record('Clave incorrecta: fetch al JSON y mensaje genérico');
    await zona().screenshot({ path: path.join(shots, '03-credenciales-incorrectas.png') });
    await ingresar('nadie@gymcontrol.test', CLAVE);
    await page.getByText('E-mail o clave incorrectos.', { exact: true }).waitFor();
    assert.equal(requests, 2);
    record('E-mail inexistente recibe el mismo mensaje genérico');

    await ingresar('  Lucia.Benitez@GymControl.test ', CLAVE);
    await page.locator('#vista-socio').waitFor();
    assert.equal(await page.locator('#vista-visitante').isVisible(), false);
    assert.equal(await page.locator('#saludo-socio').textContent(), 'Hola, Lucía');
    assert.equal(await activo(), 'saludo-socio');
    record('Credenciales válidas (mayúsculas y espacios en el e-mail) muestran la vista del socio');
    await page.getByText('Plan Semestral', { exact: true }).waitFor();
    assert.equal(await page.locator('#socio-estado').textContent(), 'Activa');
    assert.equal(await page.locator('#socio-vencimiento').textContent(), '31 de marzo de 2027');
    assert.equal(await page.locator('#socio-dias').textContent(), '183 días');
    assert.equal(await page.locator('#socio-etiqueta').textContent(), 'Socio S-0012');
    record('Membresía activa: plan desde planes.json, vencimiento y días restantes');
    assert.equal(await page.locator('[data-enlace-acceso]').textContent(), 'Mi cuenta');
    record('El encabezado cambia de Ingresar a Mi cuenta');
    const guardado = await page.evaluate(() => sessionStorage.getItem('gymcontrol.sesion'));
    assert.doesNotMatch(guardado, /claveHash|sal|gimnasio2026/);
    record('La sesión no guarda la clave, la sal ni el resumen');
    assert.equal(new URL(page.url()).search, '');
    record('La clave no viaja en la URL');
    await page.locator('#vista-socio').screenshot({ path: path.join(shots, '04-vista-socio.png') });

    await page.reload();
    assert.equal(await page.locator('#vista-socio').isVisible(), true);
    record('La sesión se conserva al recargar la página');
    await page.goto(base + '/index.html');
    assert.equal(await page.locator('[data-enlace-acceso]').textContent(), 'Mi cuenta');
    record('Las demás páginas reconocen al socio autenticado');
    await page.goto(base + '/acceso.html');
    assert.equal(await page.locator('#socio-renovar').getAttribute('href'), 'comprar.html?plan=semestral');
    await page.locator('#socio-renovar').click();
    assert.equal(await page.locator('#plan-semestral').isChecked(), true);
    assert.equal(await page.locator('#nombre').inputValue(), 'Lucía Benítez');
    assert.equal(await page.locator('#email').inputValue(), 'lucia.benitez@gymcontrol.test');
    assert.match(await page.locator('#subtotal').textContent(), /120\.000/);
    record('Renovar lleva a comprar.html con plan marcado, datos precargados y subtotal');
    await page.locator('.selection-form fieldset').first().screenshot({ path: path.join(shots, '05-compra-precargada.png') });

    await page.goto(base + '/acceso.html');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    assert.equal(await page.locator('#vista-visitante').isVisible(), true);
    assert.equal(await page.locator('#vista-socio').isVisible(), false);
    assert.equal(await msgIngreso(), 'Cerraste sesión.');
    assert.equal(await page.locator('[data-enlace-acceso]').textContent(), 'Ingresar');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('gymcontrol.sesion')), null);
    record('Cerrar sesión vuelve a la vista de visitante y borra la sesión');
    await page.goto(base + '/comprar.html');
    assert.equal(await page.locator('#nombre').inputValue(), '');
    record('Sin sesión, el formulario de compra no se precarga');

    await page.goto(base + '/acceso.html');
    await ingresar('martin.rios@gymcontrol.test', CLAVE);
    await page.getByText('Plan Mensual', { exact: true }).waitFor();
    assert.equal(await page.locator('#socio-estado').textContent(), 'Vencida');
    assert.equal(await page.locator('#socio-dias').textContent(), 'Venció hace 29 días');
    assert.match(await page.locator('#socio-aviso').textContent(), /vencida/);
    record('Membresía vencida informa los días transcurridos');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    const socios = JSON.parse(fs.readFileSync(path.join(root, 'data/usuarios.json')));
    const porVencer = [{ ...socios[0], membresia: { planId: 'trimestral', vencimiento: '2026-10-03' } }];
    await page.route('**/data/usuarios.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(porVencer) }));
    await ingresar('lucia.benitez@gymcontrol.test', CLAVE);
    await page.getByText('Plan Trimestral', { exact: true }).waitFor();
    assert.equal(await page.locator('#socio-estado').textContent(), 'Por vencer');
    assert.equal(await page.locator('#socio-dias').textContent(), '4 días');
    record('Membresía a 7 días o menos se marca Por vencer');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.unroute('**/data/usuarios.json');

    await page.reload();
    const registrar = async (nombre, email, clave, repetir) => {
      await page.locator('#registro-nombre').fill(nombre);
      await page.locator('#registro-email').fill(email);
      await page.locator('#registro-clave').fill(clave);
      await page.locator('#registro-repetir').fill(repetir);
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
    };
    await registrar('   ', 'ana@correo.com', CLAVE, CLAVE);
    assert.equal(await msgRegistro(), 'Ingresá tu nombre y apellido.');
    record('Registro con nombre vacío');
    await registrar('Ana Gómez', 'ana@correo.com', 'corta', 'corta');
    assert.equal(await msgRegistro(), 'La clave debe tener al menos 8 caracteres.');
    record('Registro con clave menor a 8 caracteres');
    await registrar('Ana Gómez', 'ana@correo.com', CLAVE, 'gimnasio2025');
    assert.equal(await msgRegistro(), 'Las claves no coinciden.');
    assert.equal(await activo(), 'registro-repetir');
    record('Registro con claves que no coinciden');
    await zona().screenshot({ path: path.join(shots, '02-claves-no-coinciden.png') });
    await registrar('Ana Gómez', 'LUCIA.BENITEZ@gymcontrol.test', CLAVE, CLAVE);
    await page.getByText('Ya existe una cuenta con ese e-mail.', { exact: false }).waitFor();
    record('Registro con e-mail ya existente consultado por fetch');
    await registrar('  Ana   Gómez ', 'ana@correo.com', CLAVE, CLAVE);
    await page.locator('#vista-socio').waitFor();
    assert.equal(await page.locator('#saludo-socio').textContent(), 'Hola, Ana');
    assert.equal(await page.locator('#socio-etiqueta').textContent(), 'Cuenta nueva');
    assert.equal(await page.locator('#socio-estado').textContent(), 'Sin membresía');
    assert.match(await page.locator('#socio-aviso').textContent(), /^Cuenta creada\./);
    assert.equal(await page.locator('#socio-renovar').getAttribute('href'), 'listado_box.html');
    record('Registro válido inicia sesión como socio sin membresía');
    await page.locator('#vista-socio').screenshot({ path: path.join(shots, '06-cuenta-nueva.png') });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await registrar('<img src=x onerror=alert(1)>', 'xss@correo.com', CLAVE, CLAVE);
    await page.locator('#vista-socio').waitFor();
    assert.equal(await page.locator('#vista-socio img').count(), 0);
    record('El nombre ingresado se muestra como texto y no como HTML');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await page.reload();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const cta = await page.locator('.main-nav .nav-cta').boundingBox();
    assert.ok(cta.x + cta.width <= 390);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(shots, '07-vista-movil.png') });
    record('Diseño móvil de 390 px sin desbordamiento y con Elegir plan visible');
    await page.setViewportSize({ width: 1280, height: 1000 });
    assert.deepEqual(errors, []);
    record('Recorrido normal sin errores JavaScript');
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\son(?:click|submit)\s*=/i);
    }
    record('Sin onclick ni onsubmit en las páginas HTML');

    const failures = await context.newPage();
    const errorVisible = () => failures.getByText('No se pudo verificar la cuenta.', { exact: false }).waitFor();
    const ingresarEn = async p => {
      await p.locator('#ingreso-email').fill('lucia.benitez@gymcontrol.test');
      await p.locator('#ingreso-clave').fill(CLAVE);
      await p.getByRole('button', { name: 'Ingresar', exact: true }).click();
    };
    await failures.route('**/data/usuarios.json', route => route.fulfill({ status: 404, body: 'No encontrado' }));
    await failures.goto(base + '/acceso.html');
    await ingresarEn(failures);
    await errorVisible();
    assert.equal(await failures.locator('#vista-socio').isVisible(), false);
    assert.equal(await failures.getByRole('button', { name: 'Ingresar', exact: true }).isEnabled(), true);
    record('HTTP 404 informa el error y rehabilita el botón');
    await failures.locator('section.form-section .container').screenshot({ path: path.join(shots, '08-error-http.png') });
    await failures.unroute('**/data/usuarios.json');
    for (const [name, handler] of [
      ['Fallo de red', route => route.abort('failed')],
      ['JSON malformado', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{invalido' })],
      ['Esquema no array', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })]
    ]) {
      await failures.route('**/data/usuarios.json', handler);
      await failures.reload();
      await ingresarEn(failures);
      await errorVisible();
      assert.equal(await failures.locator('#vista-socio').isVisible(), false);
      record(name + ' no permite el ingreso y muestra el error');
      await failures.unroute('**/data/usuarios.json');
    }
    await failures.reload();
    await ingresarEn(failures);
    await failures.locator('#vista-socio').waitFor();
    record('Restablecido el servidor, el ingreso funciona');

    const result = { fecha: new Date().toISOString().slice(0, 10), navegador: 'Google Chrome', total: checks.length, pruebas: checks };
    fs.writeFileSync(path.join(root, 'docs/pruebas-tarjeta4.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
