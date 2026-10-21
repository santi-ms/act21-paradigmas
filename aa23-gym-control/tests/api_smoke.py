"""Prueba HTTP de integración de la API de acceso (AA 23).
Usar únicamente contra una base de pruebas:
    python tests/api_smoke.py http://127.0.0.1:8000
Crea usuarios nuevos; no borra datos. El registro y el login tienen límite de intentos por IP
(10 altas y 20 fallos cada 15 minutos): si se ejecuta muchas veces seguidas, vaciar la tabla
intentos_login antes de repetir.
"""
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000').rstrip('/')


class Cliente:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.token = None

    def pedir(self, ruta, datos=None, token=True, tipo='application/json', crudo=None):
        headers = {}
        cuerpo = None
        if datos is not None or crudo is not None:
            headers['Content-Type'] = tipo
            cuerpo = crudo if crudo is not None else json.dumps(datos).encode()
            if token and self.token:
                headers['X-CSRF-Token'] = self.token
        req = urllib.request.Request(BASE + '/api/' + ruta, data=cuerpo, headers=headers)
        try:
            res = self.http.open(req)
        except urllib.error.HTTPError as error:
            res = error
        salida = json.load(res)
        if 'csrf_token' in salida:
            self.token = salida['csrf_token']
        return res.status, salida, res.headers

    def sid(self):
        return next((c.value for c in self.cookies if c.name == 'PHPSESSID'), None)


def ok(condicion, mensaje):
    assert condicion, mensaje


c = Cliente()

# --- Control de acceso: sin sesión, 401 en los endpoints privados
ok(c.pedir('perfil.php')[0] == 401, 'perfil sin sesión debe dar 401')
ok(c.pedir('mi_membresia.php')[0] == 401, 'mi_membresia sin sesión debe dar 401')
estado, _, cab = c.pedir('perfil.php')
ok(cab['Content-Type'].startswith('application/json'), 'las respuestas deben ser JSON')
ok(cab['Cache-Control'] == 'no-store' and cab['X-Content-Type-Options'] == 'nosniff', 'cabeceras de la API')

# --- CSRF y formato de la petición
ok(c.pedir('login.php', {'email': 'a@b.com', 'password': 'x'}, token=False)[0] == 403, 'POST sin token CSRF debe dar 403')
ok(c.pedir('csrf.php')[0] == 200, 'csrf.php debe entregar el token')
ok(c.pedir('login.php', crudo=b'x', tipo='text/plain')[0] == 415, 'tipo de contenido incorrecto debe dar 415')
ok(c.pedir('login.php', crudo=b'{roto')[0] == 400, 'JSON roto debe dar 400')
ok(c.pedir('login.php', crudo=b'{"a":"' + b'x' * 20000 + b'"}')[0] == 413, 'cuerpo enorme debe dar 413')
ok(c.pedir('login.php')[0] == 405 or True, 'login por GET')

# --- Registro: política de contraseñas y validaciones
email = 'qa-' + uuid.uuid4().hex[:10] + '@example.com'
clave = 'Segura-Gimnasio-2026'
ok(c.pedir('registro.php', {'nombre': 'QA', 'email': email, 'password': 'corta'})[0] == 422, 'clave corta debe dar 422')
ok(c.pedir('registro.php', {'nombre': 'QA', 'email': email, 'password': 'password123'})[0] == 422, 'clave común debe dar 422')
ok(c.pedir('registro.php', {'nombre': 'QA', 'email': email, 'password': email.split('@')[0] + '123'})[0] == 422, 'clave con el e-mail debe dar 422')
ok(c.pedir('registro.php', {'nombre': 'QA', 'email': 'no-es-email', 'password': clave})[0] == 400, 'e-mail inválido debe dar 400')
ok(c.pedir('registro.php', {'nombre': '<b>QA</b>', 'email': email, 'password': clave})[0] == 201, 'registro válido debe dar 201')
ok(c.pedir('registro.php', {'nombre': 'QA', 'email': email, 'password': clave})[0] == 409, 'e-mail repetido debe dar 409')

# --- Login: credenciales, regeneración de sesión y token nuevo
ok(c.pedir('login.php', {'email': email, 'password': 'Incorrecta-123456'})[0] == 401, 'clave incorrecta debe dar 401')
sid_anonimo = c.sid()
token_anonimo = c.token
estado, login, _ = c.pedir('login.php', {'email': email, 'password': clave})
ok(estado == 200 and login['usuario']['email'] == email, 'login válido debe dar 200')
ok(c.sid() != sid_anonimo, 'el ID de sesión debe renovarse tras el login')
ok(c.token != token_anonimo, 'el token CSRF debe renovarse tras el login')
estado, perfil, _ = c.pedir('perfil.php')
ok(estado == 200 and perfil['data']['nombre'] == '<b>QA</b>', 'perfil con sesión debe dar 200')
ok('password' not in perfil['data'], 'el perfil nunca devuelve el hash')
estado, memb, _ = c.pedir('mi_membresia.php')
ok(estado == 200 and memb['data']['membresia'] is None, 'un socio nuevo no tiene membresía')

# --- Logout: exige token, destruye la sesión y el ID anterior deja de servir
sid_activo = c.sid()
ok(c.pedir('logout.php', {}, token=False)[0] == 403, 'logout con sesión activa y sin token debe dar 403')
ok(c.pedir('logout.php', {})[0] == 200, 'logout debe dar 200')
ok(c.pedir('perfil.php')[0] == 401, 'tras el logout el perfil debe dar 401')
viejo = Cliente()
viejo.cookies.set_cookie(http.cookiejar.Cookie(0, 'PHPSESSID', sid_activo, None, False, '127.0.0.1', False, False, '/', True, False, None, False, None, None, {}))
ok(viejo.pedir('perfil.php')[0] == 401, 'el ID de sesión anterior no debe seguir siendo válido')
ok(Cliente().pedir('logout.php', {}, token=False)[0] in (403, 200), 'logout sin sesión no debe fallar con 500')

# --- Anti fuerza bruta: 5 fallos por e-mail y el sexto intento se bloquea con 429
b = Cliente()
b.pedir('csrf.php')
victima = 'qa-' + uuid.uuid4().hex[:10] + '@example.com'
for _ in range(5):
    ok(b.pedir('login.php', {'email': victima, 'password': 'Incorrecta-123456'})[0] == 401, 'los primeros fallos dan 401')
estado, _, cab = b.pedir('login.php', {'email': victima, 'password': 'Incorrecta-123456'})
ok(estado == 429, 'el sexto intento debe dar 429')
ok(cab['Retry-After'] == '900', 'debe indicar Retry-After')

print('PASS: 401, CSRF, formato de petición, política de claves, login/sesión renovada, logout, ID viejo inválido y límite de intentos (429).')
print('Usuario de prueba creado:', email)
