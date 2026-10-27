"""Prueba HTTP de integración de la API (AA 24).
Usar únicamente contra una base de pruebas, con el administrador de demostración cargado:
    python tests/api_smoke.py http://127.0.0.1:8000
Crea usuarios y disfraces de prueba; no borra datos (los disfraces creados quedan eliminados de forma lógica).
El registro y el login tienen límite de intentos por IP (10 altas y 20 fallos cada 15 minutos): si se ejecuta
muchas veces seguidas, vaciar la tabla intentos_login antes de repetir.
"""
import base64
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000').rstrip('/')
PNG_1X1 = base64.b64encode(base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)).decode()


class Cliente:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.token = None

    def pedir(self, ruta, datos=None, metodo=None, token=True, tipo='application/json', crudo=None):
        headers = {}
        cuerpo = None
        if datos is not None or crudo is not None:
            headers['Content-Type'] = tipo
            cuerpo = crudo if crudo is not None else json.dumps(datos).encode()
        if token and self.token and (cuerpo is not None or metodo in ('DELETE', 'PUT', 'POST')):
            headers['X-CSRF-Token'] = self.token
        req = urllib.request.Request(BASE + '/api/' + ruta, data=cuerpo, headers=headers, method=metodo)
        try:
            res = self.http.open(req)
        except urllib.error.HTTPError as error:
            res = error
        crudo_resp = res.read()
        try:
            salida = json.loads(crudo_resp)
        except ValueError:
            salida = crudo_resp
        if isinstance(salida, dict) and 'csrf_token' in salida:
            self.token = salida['csrf_token']
        return res.status, salida, res.headers

    def sid(self):
        return next((c.value for c in self.cookies if c.name == 'PHPSESSID'), None)


def ok(condicion, mensaje):
    assert condicion, mensaje


def ingresar(nombre, clave):
    c = Cliente()
    c.pedir('csrf.php')
    estado, datos, _ = c.pedir('login.php', {'nombre': nombre, 'password': clave}, 'POST')
    ok(estado == 200, f'login de {nombre} debe dar 200 (dio {estado})')
    return c, datos


# --- Lista pública
anonimo = Cliente()
estado, lista, cab = anonimo.pedir('disfraces.php')
ok(estado == 200 and len(lista['data']) >= 1, 'la lista pública debe responder 200 con disfraces')
ok(cab['Content-Type'].startswith('application/json') and cab['X-Content-Type-Options'] == 'nosniff', 'cabeceras JSON')
ok(all(not d['ya_voto'] for d in lista['data']), 'un visitante no tiene votos propios')
ok(lista['autenticado'] is False, 'el visitante no figura autenticado')
ok('foto_blob' not in lista['data'][0], 'la lista nunca expone los bytes de la imagen')
ok(anonimo.pedir('disfraces.php?id=999999')[0] == 404, 'un disfraz inexistente debe dar 404')
ok(anonimo.pedir('disfraces.php', metodo='PATCH', datos={})[0] == 405, 'método no permitido debe dar 405')

# --- Sin sesión: no se puede votar ni administrar (401)
ok(anonimo.pedir('votar.php', {'id_disfraz': 1}, 'POST')[0] == 401, 'votar sin sesión debe dar 401')
ok(anonimo.pedir('perfil.php')[0] == 401, 'perfil sin sesión debe dar 401')
ok(anonimo.pedir('disfraces.php', {'nombre': 'X', 'descripcion': 'Y'}, 'POST')[0] == 401, 'crear sin sesión debe dar 401')
ok(anonimo.pedir('disfraces.php?id=1', {'nombre': 'X', 'descripcion': 'Y'}, 'PUT')[0] == 401, 'modificar sin sesión debe dar 401')
ok(anonimo.pedir('disfraces.php?id=1', metodo='DELETE')[0] == 401, 'eliminar sin sesión debe dar 401')

# --- CSRF y formato de la petición
c = Cliente()
ok(c.pedir('login.php', {'nombre': 'a', 'password': 'b'}, 'POST', token=False)[0] == 403, 'POST sin token CSRF debe dar 403')
ok(c.pedir('csrf.php')[0] == 200, 'csrf.php debe entregar el token')
ok(c.pedir('login.php', crudo=b'x', tipo='text/plain', metodo='POST')[0] == 415, 'tipo de contenido incorrecto debe dar 415')
ok(c.pedir('login.php', crudo=b'{roto', metodo='POST')[0] == 400, 'JSON roto debe dar 400')

# --- Registro: política de usuario y de claves
usuario = 'qa' + uuid.uuid4().hex[:8]
clave = 'Calabaza-Mágica-2026'
ok(c.pedir('registro.php', {'nombre': 'a b', 'password': clave}, 'POST')[0] == 400, 'usuario con espacios debe dar 400')
ok(c.pedir('registro.php', {'nombre': usuario, 'password': 'corta'}, 'POST')[0] == 422, 'clave corta debe dar 422')
ok(c.pedir('registro.php', {'nombre': usuario, 'password': 'halloween2026'}, 'POST')[0] == 422, 'clave común debe dar 422')
ok(c.pedir('registro.php', {'nombre': usuario, 'password': usuario + '12345'}, 'POST')[0] == 422, 'clave con el usuario debe dar 422')
ok(c.pedir('registro.php', {'nombre': usuario, 'password': clave}, 'POST')[0] == 201, 'registro válido debe dar 201')
ok(c.pedir('registro.php', {'nombre': usuario, 'password': clave}, 'POST')[0] == 409, 'usuario repetido debe dar 409')
estado, _, _ = c.pedir('registro.php', {'nombre': usuario + 'x', 'password': clave, 'rol': 'admin'}, 'POST')
ok(estado == 201, 'el campo rol enviado por el cliente se ignora')

# --- Login y sesión renovada
ok(c.pedir('login.php', {'nombre': usuario, 'password': 'Incorrecta-123456'}, 'POST')[0] == 401, 'clave incorrecta debe dar 401')
sid_anonimo, token_anonimo = c.sid(), c.token
estado, login, _ = c.pedir('login.php', {'nombre': usuario, 'password': clave}, 'POST')
ok(estado == 200 and login['usuario']['rol'] == 'votante', 'login válido da 200 y rol votante')
ok(c.sid() != sid_anonimo, 'el ID de sesión debe renovarse tras el login')
ok(c.token != token_anonimo, 'el token CSRF debe renovarse tras el login')

# --- Votación: una vez por disfraz
estado, lista, _ = c.pedir('disfraces.php')
disfraz = lista['data'][0]
votos_antes = disfraz['votos']
estado, voto, _ = c.pedir('votar.php', {'id_disfraz': disfraz['id']}, 'POST')
ok(estado == 201 and voto['votos'] == votos_antes + 1, 'el voto debe sumar uno')
ok(c.pedir('votar.php', {'id_disfraz': disfraz['id']}, 'POST')[0] == 409, 'votar dos veces por el mismo disfraz debe dar 409')
ok(c.pedir('votar.php', {'id_disfraz': 999999}, 'POST')[0] == 404, 'votar por un disfraz inexistente debe dar 404')
ok(c.pedir('votar.php', {'id_disfraz': 'abc'}, 'POST')[0] == 400, 'id inválido debe dar 400')
ok(c.pedir('votar.php', {'id_disfraz': disfraz['id']}, 'POST', token=False)[0] == 403, 'votar sin token CSRF debe dar 403')
estado, lista2, _ = c.pedir('disfraces.php')
propio = next(d for d in lista2['data'] if d['id'] == disfraz['id'])
ok(propio['ya_voto'] is True and propio['votos'] == votos_antes + 1, 'la lista marca el voto propio')

# --- Un votante común no administra (403)
ok(c.pedir('disfraces.php', {'nombre': 'X', 'descripcion': 'Y'}, 'POST')[0] == 403, 'un votante no puede crear (403)')
ok(c.pedir('disfraces.php?id=1', metodo='DELETE')[0] == 403, 'un votante no puede eliminar (403)')

# --- Administrador: CRUD completo con imagen
admin, datos = ingresar('admin', 'Halloween-Admin-2026')
ok(datos['usuario']['rol'] == 'admin', 'el administrador de demostración tiene rol admin')
nombre = 'Disfraz QA ' + uuid.uuid4().hex[:6]
ok(admin.pedir('disfraces.php', {'nombre': '', 'descripcion': 'x'}, 'POST')[0] == 400, 'alta sin nombre debe dar 400')
ok(admin.pedir('disfraces.php', {'nombre': nombre, 'descripcion': 'x', 'foto_base64': base64.b64encode(b'no soy imagen').decode()}, 'POST')[0] == 415,
   'una imagen falsa debe dar 415')
ok(admin.pedir('disfraces.php', {'nombre': nombre, 'descripcion': 'x', 'foto_base64': base64.b64encode(b'\x00' * 1100000).decode()}, 'POST')[0] in (413, 415),
   'una imagen de más de 1 MB debe rechazarse')
ok(admin.pedir('disfraces.php', {'nombre': nombre, 'descripcion': 'x'}, 'POST', token=False)[0] == 403, 'alta sin token CSRF debe dar 403')
estado, creado, _ = admin.pedir('disfraces.php', {'nombre': nombre, 'descripcion': 'Con foto <b>QA</b>', 'foto_base64': PNG_1X1}, 'POST')
ok(estado == 201, 'alta con imagen válida debe dar 201')
nuevo_id = creado['id']
estado, uno, _ = admin.pedir(f'disfraces.php?id={nuevo_id}')
ok(estado == 200 and uno['data']['tiene_foto'] is True and uno['data']['descripcion'] == 'Con foto <b>QA</b>', 'GET del disfraz creado')
estado, imagen, cab = admin.pedir(f'foto.php?id={nuevo_id}')
ok(estado == 200 and cab['Content-Type'] == 'image/png' and cab['X-Content-Type-Options'] == 'nosniff', 'foto.php sirve la imagen con su tipo y nosniff')
ok(isinstance(imagen, bytes) and imagen[:4] == b'\x89PNG', 'foto.php devuelve los bytes del PNG')
ok(admin.pedir(f'disfraces.php?id={nuevo_id}', {'nombre': nombre + ' v2', 'descripcion': 'Editado'}, 'PUT')[0] == 200, 'modificar debe dar 200')
estado, uno, _ = admin.pedir(f'disfraces.php?id={nuevo_id}')
ok(uno['data']['nombre'] == nombre + ' v2' and uno['data']['tiene_foto'] is True, 'la foto se conserva si no se envía otra')
ok(admin.pedir(f'disfraces.php?id={nuevo_id}', {'nombre': nombre, 'descripcion': 'Sin foto', 'quitar_foto': True}, 'PUT')[0] == 200, 'quitar la foto')
ok(admin.pedir(f'foto.php?id={nuevo_id}')[0] == 404, 'sin foto, foto.php da 404')
ok(admin.pedir('disfraces.php?id=999999', {'nombre': 'X', 'descripcion': 'Y'}, 'PUT')[0] == 404, 'modificar un inexistente da 404')
ok(admin.pedir(f'disfraces.php?id={nuevo_id}', metodo='DELETE')[0] == 200, 'eliminar debe dar 200')
ok(admin.pedir(f'disfraces.php?id={nuevo_id}')[0] == 404, 'un disfraz eliminado ya no aparece')
ok(admin.pedir(f'disfraces.php?id={nuevo_id}', metodo='DELETE')[0] == 404, 'eliminar dos veces da 404')

# --- Logout: exige token, destruye la sesión y el ID anterior deja de servir
sid_activo = c.sid()
ok(c.pedir('logout.php', {}, 'POST', token=False)[0] == 403, 'logout con sesión activa y sin token debe dar 403')
ok(c.pedir('logout.php', {}, 'POST')[0] == 200, 'logout debe dar 200')
ok(c.pedir('perfil.php')[0] == 401, 'tras el logout el perfil debe dar 401')
viejo = Cliente()
viejo.cookies.set_cookie(http.cookiejar.Cookie(0, 'PHPSESSID', sid_activo, None, False, '127.0.0.1', False, False, '/', True, False, None, False, None, None, {}))
ok(viejo.pedir('perfil.php')[0] == 401, 'el ID de sesión anterior no debe seguir siendo válido')

# --- Anti fuerza bruta: 5 fallos por usuario y el sexto intento se bloquea con 429
b = Cliente()
b.pedir('csrf.php')
victima = 'qa' + uuid.uuid4().hex[:8]
for _ in range(5):
    ok(b.pedir('login.php', {'nombre': victima, 'password': 'Incorrecta-123456'}, 'POST')[0] == 401, 'los primeros fallos dan 401')
estado, _, cab = b.pedir('login.php', {'nombre': victima, 'password': 'Incorrecta-123456'}, 'POST')
ok(estado == 429 and cab['Retry-After'] == '900', 'el sexto intento debe dar 429 con Retry-After')

print('PASS: lista, 401/403, CSRF, formato, registro y claves, login/sesión, votos únicos, CRUD con imagen, logout y límite de intentos.')
print('Usuarios de prueba creados:', usuario, usuario + 'x')
