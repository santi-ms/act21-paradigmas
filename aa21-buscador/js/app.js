document.addEventListener('DOMContentLoaded', () => {
    const formBuscar  = document.querySelector('#form-buscar');
    const inputBuscar = document.querySelector('#input-buscar');
    const selectModo  = document.querySelector('#select-modo');
    const estado      = document.querySelector('#estado');
    const contenedor  = document.querySelector('#resultados');

    formBuscar.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene la recarga del navegador

        const query = inputBuscar.value.trim();
        const endpoint = selectModo.value;

        contenedor.innerHTML = '';
        estado.textContent = "Buscando en la base de datos...";

        try {
            // Petición GET con parámetro Query String en la URL
            const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
            const resultado = await res.json();

            if (res.ok && resultado['estado'] === 'exito') {
                renderizarProductos(resultado['data']);
            } else {
                estado.textContent = resultado['mensaje'] ?? "No se encontraron productos.";
            }
        } catch (error) {
            estado.textContent = "Error de conexión con el servidor.";
        }
    });

    function renderizarProductos(productos) {
        if (productos.length === 0) {
            estado.textContent = "Sin resultados.";
            return;
        }

        estado.textContent = `Se encontraron ${productos.length} producto(s).`;

        const fragmento = document.createDocumentFragment();
        productos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'card-producto';

            // Renderizado seguro en el DOM con textContent
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
});
