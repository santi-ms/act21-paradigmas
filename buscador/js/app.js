document.addEventListener('DOMContentLoaded', () => {
    // === ELEMENTOS DEL DOM ===
    const navPublico    = document.querySelector('#nav-publico');
    const tabLogin      = document.querySelector('#tab-login');
    const tabRegistro   = document.querySelector('#tab-registro');

    const vistaLogin    = document.querySelector('#vista-login');
    const vistaRegistro = document.querySelector('#vista-registro');
    const vistaPanel    = document.querySelector('#vista-panel');

    const formLogin     = document.querySelector('#form-login');
    const formRegistro  = document.querySelector('#form-registro');
    const formBuscar    = document.querySelector('#form-buscar');

    const msgLogin      = document.querySelector('#msg-login');
    const msgRegistro   = document.querySelector('#msg-registro');
    const estado        = document.querySelector('#estado');
    const contenedor    = document.querySelector('#resultados');
    const btnLogout     = document.querySelector('#btn-logout');

    // Al cargar la página se le pregunta al servidor si hay una sesión activa
    comprobarSesion();

    // === NAVEGACIÓN ENTRE PESTAÑAS ===
    tabLogin.addEventListener('click', () => mostrarVistaPublica('login'));
    tabRegistro.addEventListener('click', () => mostrarVistaPublica('registro'));

    // === COMUNICACIÓN CON LA API ===
    async function llamarApi(url, opciones = {}) {
        const res = await fetch(url, opciones);
        const datos = await res.json();
        return { res, datos };
    }

    function enviarJson(datos) {
        return {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        };
    }

    // === 1. SESIÓN ACTIVA (api/perfil.php, endpoint privado) ===
    async function comprobarSesion() {
        try {
            const { res, datos } = await llamarApi('api/perfil.php');

            if (res.ok && datos['estado'] === 'exito') {
                mostrarPanel(datos['data']);
            } else {
                mostrarVistaPublica('login');
            }
        } catch (error) {
            mostrarVistaPublica('login');
        }
    }

    // === 2. LOGIN ===
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarMensaje(msgLogin, 'Autenticando...', 'info');

        try {
            const { res, datos } = await llamarApi('api/login.php', enviarJson({
                email: document.querySelector('#login-email').value.trim(),
                password: document.querySelector('#login-pass').value
            }));

            if (res.ok && datos['estado'] === 'exito') {
                formLogin.reset();
                mostrarMensaje(msgLogin, '', '');
                mostrarPanel(datos['usuario']);
            } else {
                mostrarMensaje(msgLogin, datos['mensaje'] || 'Credenciales inválidas.', 'error');
            }
        } catch (error) {
            mostrarMensaje(msgLogin, 'Error de conexión con el servidor.', 'error');
        }
    });

    // === 3. REGISTRO ===
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarMensaje(msgRegistro, 'Creando cuenta...', 'info');

        try {
            const { res, datos } = await llamarApi('api/registro.php', enviarJson({
                nombre: document.querySelector('#reg-nombre').value.trim(),
                email: document.querySelector('#reg-email').value.trim(),
                password: document.querySelector('#reg-pass').value
            }));

            if (res.ok && datos['estado'] === 'exito') {
                formRegistro.reset();
                mostrarMensaje(msgRegistro, '', '');
                mostrarVistaPublica('login');
                mostrarMensaje(msgLogin, 'Cuenta creada. Ya podés iniciar sesión.', 'exito');
            } else {
                mostrarMensaje(msgRegistro, datos['mensaje'] || 'No se pudo registrar.', 'error');
            }
        } catch (error) {
            mostrarMensaje(msgRegistro, 'Error de conexión con el servidor.', 'error');
        }
    });

    // === 4. LOGOUT ===
    btnLogout.addEventListener('click', async () => {
        try {
            await fetch('api/logout.php', { method: 'POST' });
        } finally {
            volverALogin('Sesión cerrada correctamente.', 'info');
        }
    });

    // === 5. BÚSQUEDA (endpoint protegido por sesión) ===
    formBuscar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const query = document.querySelector('#input-buscar').value.trim();
        contenedor.replaceChildren();
        estado.textContent = 'Buscando en la base de datos...';

        try {
            const { res, datos } = await llamarApi(`api/buscador-seguro.php?q=${encodeURIComponent(query)}`);

            if (res.status === 401) {
                // La sesión venció o fue cerrada: se vuelve al login
                volverALogin('Tu sesión expiró. Volvé a iniciar sesión.', 'error');
            } else if (res.ok && datos['estado'] === 'exito') {
                renderizarProductos(datos['data']);
            } else {
                estado.textContent = datos['mensaje'] || 'No se encontraron productos.';
            }
        } catch (error) {
            estado.textContent = 'Error de conexión con el servidor.';
        }
    });

    function renderizarProductos(productos) {
        if (productos.length === 0) {
            estado.textContent = 'Sin resultados.';
            return;
        }

        estado.textContent = `Se encontraron ${productos.length} producto(s).`;

        const fragmento = document.createDocumentFragment();
        productos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'card-producto';

            // textContent: los datos se muestran como texto, nunca como HTML (previene XSS)
            const categoria = document.createElement('span');
            categoria.className = 'categoria';
            categoria.textContent = prod['categoria'];

            const titulo = document.createElement('h4');
            titulo.textContent = prod['nombre'];

            const precio = document.createElement('p');
            precio.textContent = Number(prod['precio']).toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS'
            });

            const stock = document.createElement('small');
            stock.textContent = `Stock: ${prod['stock']}`;

            card.append(categoria, titulo, precio, stock);
            fragmento.appendChild(card);
        });

        contenedor.appendChild(fragmento);
    }

    // === CONTROL DE VISTAS (alterna el DOM según la sesión) ===
    function mostrarVistaPublica(pestana) {
        navPublico.classList.remove('oculto');
        vistaPanel.classList.add('oculto');

        const esLogin = pestana === 'login';
        tabLogin.classList.toggle('active', esLogin);
        tabRegistro.classList.toggle('active', !esLogin);
        vistaLogin.classList.toggle('oculto', !esLogin);
        vistaRegistro.classList.toggle('oculto', esLogin);
    }

    function mostrarPanel(usuario) {
        navPublico.classList.add('oculto');
        vistaLogin.classList.add('oculto');
        vistaRegistro.classList.add('oculto');
        vistaPanel.classList.remove('oculto');

        // Nombre y datos del usuario siempre con textContent (previene XSS)
        document.querySelector('#user-nombre').textContent = usuario['nombre'] || 'Usuario';
        document.querySelector('#user-email').textContent  = usuario['email']  || '';
        document.querySelector('#user-rol').textContent    = usuario['rol']    || 'cliente';
    }

    function volverALogin(texto, tipo) {
        contenedor.replaceChildren();
        estado.textContent = '';
        document.querySelector('#input-buscar').value = '';
        mostrarVistaPublica('login');
        mostrarMensaje(msgLogin, texto, tipo);
    }

    function mostrarMensaje(elemento, texto, tipo) {
        elemento.textContent = texto;
        elemento.className = tipo ? `mensaje-box ${tipo}` : 'mensaje-box';
    }
});
