// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDH1mEOU4mVLQpZmNCcrZKTa39tXz_n0-4",
    authDomain: "tandas-3f8b5.firebaseapp.com",
    projectId: "tandas-3f8b5",
    storageBucket: "tandas-3f8b5.appspot.com",
    messagingSenderId: "456682743605",
    appId: "1:456682743605:web:614d485da44808b7e78e7c"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Objeto principal de la aplicación
const tandaApp = {
    init: function () {
        this.bindEvents();
        this.loadTandas();
        this.loadParticipantes();
    },

    bindEvents: function () {
        // Formulario de Tandas
        document.getElementById('formularioTanda').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarTanda();
        });

        // Formulario de Participantes
        document.getElementById('formularioParticipantes').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarParticipante();
        });

        // Validación de número seleccionado
        document.getElementById('numero').addEventListener('change', (e) => {
            this.validarNumeroSeleccionado(e.target.value);
        });

        // Evento para guardar cambios en la edición
        document.getElementById('btnGuardarCambiosParticipante').addEventListener('click', () => {
            this.guardarCambiosParticipante();
        });
    },


    // Funciones para Tandas
    registrarTanda: function () {
        const nombreTanda = document.getElementById('nombreTanda').value;
        const montoPorParticipante = parseFloat(document.getElementById('montoPorParticipante').value);
        const numeroParticipantes = parseInt(document.getElementById('numeroParticipantes').value);
        const frecuencia = document.getElementById('frecuencia').value;
        const fechaInicio = document.getElementById('fechaInicio').value;

        // Validación básica
        if (!nombreTanda || montoPorParticipante <= 0 || numeroParticipantes < 2 || !frecuencia || !fechaInicio) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }

        // Calcular fechas y montos
        const fechaInicioDate = new Date(fechaInicio);
        let diasPorCiclo = 0;
        if (frecuencia === 'Semanal') diasPorCiclo = 7;
        else if (frecuencia === 'Quincenal') diasPorCiclo = 15;
        else if (frecuencia === 'Mensual') diasPorCiclo = 30;

        const diasTotales = diasPorCiclo * numeroParticipantes;
        const fechaTermino = new Date(fechaInicioDate);
        fechaTermino.setDate(fechaInicioDate.getDate() + diasTotales);

        const montoTotal = montoPorParticipante * (numeroParticipantes - 1);

        // Guardar en Firebase
        db.collection("proyectos").add({
            tanda: nombreTanda,
            montoPorParticipante: montoPorParticipante.toFixed(2),
            participantes: numeroParticipantes,
            frecuencia: frecuencia,
            fechaInicio: fechaInicio,
            fechaTermino: fechaTermino.toISOString().split('T')[0],
            montoTotal: montoTotal.toFixed(2)
        }).then(() => {
            console.log("Tanda registrada");
            document.getElementById('formularioTanda').reset();
        }).catch(error => {
            console.error("Error al registrar tanda:", error);
        });
    },

    loadTandas: function () {
        const tablaTandas = document.getElementById('tablaTandas');

        db.collection("proyectos").onSnapshot((querySnapshot) => {
            tablaTandas.innerHTML = ''; // Limpiar tabla

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fila = `
                    <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-tag me-2 text-secondary"></i>Tanda:</span>
                                <span class="fw-bold">${data.tanda}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-money-bill-wave me-2 text-secondary"></i>Monto por
                                    participante:</span>
                                <span class="fw-bold">${data.montoPorParticipante}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-users me-2 text-secondary"></i>Participantes:</span>
                                <span class="fw-bold">${data.participantes}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-calendar-alt me-2 text-secondary"></i>Frecuencia:</span>
                                <span class="fw-bold">${data.frecuencia}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-calendar-day me-2 text-secondary"></i>Inicio:</span>
                                <span class="fw-bold">${data.fechaInicio}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-calendar-check me-2 text-secondary"></i>Fin:</span>
                                <span class="fw-bold">${data.fechaTermino}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-calculator me-2 text-secondary"></i>Monto Total:</span>
                                <span class="fw-bold">${data.montoTotal}</span>
                            </div>
                            
                            <div class="mt-3 pt-2 border-top">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span><i class="fas fa-check-circle me-1 text-success"></i>Pagados:
                                        <strong>7/11</strong></span>
                                    <span>64% completado</span>
                                </div>
                                <div class="progress progress-tanda mb-2">
                                    <div class="progress-bar progress-bar-tanda" role="progressbar" style="width: 64%"
                                        aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <div class="d-flex justify-content-between small">
                                    <span class="badge bg-rosa-claro text-rosa-oscuro"><i
                                            class="fas fa-clock me-1"></i>4 pendientes</span>
                                </div>
                            </div>
                `;
                tablaTandas.innerHTML += fila;

                // Actualizar select de números
                this.actualizarSelectNumeros(data.participantes);
            });
        });
    },

    // Funciones para Participantes
    registrarParticipante: function () {
        const numero = parseInt(document.getElementById('numero').value);
        const nombre = document.getElementById('nombre').value;
        const medioNumero = document.getElementById('medioNumero').checked;

        if (!numero || !nombre) {
            alert('Por favor complete todos los campos');
            return;
        }

        db.collection("datos").add({
            numero: numero,
            nombre: nombre,
            participacion: medioNumero ? 'Medio número' : 'Completo'
        }).then(() => {
            console.log("Participante registrado");
            document.getElementById('formularioParticipantes').reset();
        }).catch(error => {
            console.error("Error al registrar participante:", error);
        });
    },

    loadParticipantes: function () {
        const tablaCuerpo = document.getElementById('tablaCuerpo');
        const numeroSelect = document.getElementById('numero');

        // Limpiar estados deshabilitados del select
        Array.from(numeroSelect.options).forEach(opcion => {
            if (opcion.value) opcion.disabled = false;
        });

        db.collection("datos").orderBy("numero").onSnapshot((querySnapshot) => {
            const estadoNumeros = {};
            const filas = [];

            // Obtener proyecto activo para cálculos
            db.collection("proyectos").limit(1).get().then((proyectoSnapshot) => {
                const proyectoActivo = proyectoSnapshot.empty ? null : proyectoSnapshot.docs[0].data();

                // Limpiar tabla antes de llenarla
                tablaCuerpo.innerHTML = '';

                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // Rastrear estado de números para validación
                    if (!estadoNumeros[data.numero]) {
                        estadoNumeros[data.numero] = 0;
                    }
                    estadoNumeros[data.numero] += data.participacion === 'Completo' ? 2 : 1;

                    // Calcular montos y fechas basados en el proyecto
                    let montoParticipante = 0;
                    let montoAEntregar = 0;
                    let fechaEntrega = '';
                    let claseParticipacion = data.participacion === 'Completo' ? 'badge-completo' : 'badge-medio';

                    if (proyectoActivo) {
                        montoParticipante = data.participacion === 'Completo' ?
                            parseFloat(proyectoActivo.montoPorParticipante) :
                            parseFloat(proyectoActivo.montoPorParticipante) / 2;

                        montoAEntregar = montoParticipante * (parseInt(proyectoActivo.participantes) - 1);

                        const fechaInicio = new Date(proyectoActivo.fechaInicio);
                        let diasPorCiclo = 0;
                        if (proyectoActivo.frecuencia === 'Semanal') diasPorCiclo = 7;
                        else if (proyectoActivo.frecuencia === 'Quincenal') diasPorCiclo = 15;
                        else if (proyectoActivo.frecuencia === 'Mensual') diasPorCiclo = 30;

                        const fechaEntregaDate = new Date(fechaInicio);
                        fechaEntregaDate.setDate(fechaInicio.getDate() + (diasPorCiclo * (data.numero - 1)));
                        fechaEntrega = fechaEntregaDate.toISOString().split('T')[0];
                    }

                    // Crear fila HTML
                    const filaHTML = `
                        <tr data-id="${doc.id}">
                        <td class="fw-bold">${data.numero}</td>
                        <td>${data.nombre}</td>
                        <td><span class="badge ${claseParticipacion} rounded-pill">${data.participacion}</span></td>
                        <td class="monto-participante" ${data.pagado ? 'style="text-decoration: line-through;"' : ''}>${montoParticipante.toFixed(2)}</td>
                        <td>
                            <div class="form-check form-switch">
                                <input class="form-check-input check-pagado" type="checkbox" ${data.pagado ? 'checked' : ''}>
                            </div>
                        </td>
                        <td>${montoAEntregar.toFixed(2)}</td>
                        <td>${fechaEntrega}</td>
                        <td>
                            <div class="form-check form-switch">
                                <input class="form-check-input check-entregada" type="checkbox" ${data.entregada ? 'checked' : ''}>
                            </div>
                        </td>
                        <td>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-rosa-oscuro btn-editar" data-bs-toggle="modal" data-bs-target="#editarParticipanteModal">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-eliminar" data-bs-toggle="modal" data-bs-target="#confirmarEliminarModal">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;


                    filas.push({ numero: data.numero, html: filaHTML });
                });

                // Ordenar y mostrar filas
                filas.sort((a, b) => a.numero - b.numero).forEach(fila => {
                    tablaCuerpo.innerHTML += fila.html;
                });

                // Deshabilitar números completados en el select
                for (const numero in estadoNumeros) {
                    const opcion = numeroSelect.querySelector(`option[value="${numero}"]`);
                    if (estadoNumeros[numero] >= 2 && opcion) {
                        opcion.disabled = true;
                    }
                }

                // Configurar eventos de checkboxes
                document.querySelectorAll('.check-pagado').forEach(checkbox => {
                    checkbox.addEventListener('change', function () {
                        const fila = this.closest('tr');
                        const id = fila.getAttribute('data-id');
                        const montoCell = fila.querySelector('.monto-participante');

                        // Aplicar/remover tachado solo al monto
                        if (this.checked) {
                            montoCell.style.textDecoration = 'line-through';
                        } else {
                            montoCell.style.textDecoration = 'none';
                        }

                        // Actualizar en Firebase
                        db.collection("datos").doc(id).update({
                            pagado: this.checked
                        });
                    });
                });


                document.querySelectorAll('.check-entregada').forEach(checkbox => {
                    checkbox.addEventListener('change', function () {
                        const fila = this.closest('tr');
                        const id = fila.getAttribute('data-id');

                        // Aplicar/remover fondo verde solo a la fila
                        if (this.checked) {
                            fila.style.backgroundColor = '#e6ffed';
                        } else {
                            fila.style.backgroundColor = '';
                        }

                        // Actualizar en Firebase
                        db.collection("datos").doc(id).update({
                            entregada: this.checked
                        });
                    });
                });

                // Eventos para botones (mantenidos igual)
                document.querySelectorAll('.btn-editar').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const fila = btn.closest('tr');
                        const id = fila.getAttribute('data-id');

                        db.collection("proyectos").limit(1).get().then((proyectoSnapshot) => {
                            if (proyectoSnapshot.empty) {
                                console.error("No hay proyecto activo");
                                return;
                            }

                            const maxParticipantes = proyectoSnapshot.docs[0].data().participantes;

                            db.collection("datos").get().then(querySnapshot => {
                                const estadoNumeros = {};
                                querySnapshot.forEach(doc => {
                                    const data = doc.data();
                                    if (!estadoNumeros[data.numero]) {
                                        estadoNumeros[data.numero] = 0;
                                    }
                                    estadoNumeros[data.numero] += data.participacion === 'Completo' ? 2 : 1;
                                });

                                db.collection("datos").doc(id).get().then(doc => {
                                    if (doc.exists) {
                                        const data = doc.data();

                                        // Llamada al método del objeto tandaApp
                                        tandaApp.cargarOpcionesEditar(maxParticipantes, estadoNumeros);

                                        document.getElementById('editarNumeroParticipante').value = data.numero;
                                        document.getElementById('editarNombreParticipante').value = data.nombre;
                                        document.getElementById('editarMedioNumero').checked = data.participacion === 'Medio número';

                                        document.getElementById('editarParticipanteModal').setAttribute('data-id', id);

                                        const modal = new bootstrap.Modal(document.getElementById('editarParticipanteModal'));
                                        modal.show();
                                    }
                                });
                            });
                        });
                    });
                });




                // Dentro del objeto tandaApp, en la función loadParticipantes:
                document.querySelectorAll('.btn-eliminar').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const fila = btn.closest('tr');
                        const id = fila.getAttribute('data-id');
                        const nombre = fila.querySelector('td:nth-child(2)').textContent;

                        // Guardar el ID y nombre en el modal
                        const modalEl = document.getElementById('confirmarEliminarModal');
                        modalEl.setAttribute('data-id', id);

                        // Actualizar el mensaje con el nombre
                        const mensaje = modalEl.querySelector('.modal-body p');
                        mensaje.innerHTML = `¿Estás seguro de eliminar a <strong>${nombre}</strong>?<br>Esta acción no se puede deshacer.`;

                        // Mostrar el modal correctamente
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    });
                });

                // Configurar el botón de confirmación (fuera del objeto tandaApp)
                document.getElementById('btnConfirmarEliminar').addEventListener('click', function () {
                    const modalEl = document.getElementById('confirmarEliminarModal');
                    const id = modalEl.getAttribute('data-id');
                    const btn = this;
                    const originalText = btn.innerHTML;

                    // Mostrar loading
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Eliminando...';
                    btn.disabled = true;

                    // Eliminar de Firebase
                    db.collection("datos").doc(id).delete()
                        .then(() => {
                            // Cerrar modal correctamente
                            const modal = bootstrap.Modal.getInstance(modalEl);
                            modal.hide();

                            // Limpiar y restaurar
                            cleanUpModal('confirmarEliminarModal');
                            btn.innerHTML = originalText;
                            btn.disabled = false;
                        })
                        .catch(error => {
                            console.error("Error al eliminar:", error);
                            alert('Error al eliminar participante: ' + error.message);
                            btn.innerHTML = originalText;
                            btn.disabled = false;
                        });
                });

                // Función auxiliar para limpiar modales (añadir al objeto tandaApp)
                function cleanUpModal(modalId) {
                    const modal = document.getElementById(modalId);
                    modal.removeAttribute('data-id');

                    // Limpiar backdrop si existe
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    if (backdrops.length > 0) {
                        backdrops.forEach(backdrop => backdrop.remove());
                    }

                    // Restaurar el body
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';

                    // Limpiar mensajes si es necesario
                    if (modalId === 'confirmarEliminarModal') {
                        const mensaje = modal.querySelector('.modal-body p');
                        mensaje.innerHTML = 'Esta acción no se puede deshacer y se perderán todos los datos asociados.';
                    }
                }

                // Añadir evento hidden.bs.modal al modal de confirmación
                document.getElementById('confirmarEliminarModal').addEventListener('hidden.bs.modal', function () {
                    cleanUpModal('confirmarEliminarModal');
                });
            });
        });
    },

    // Funciones auxiliares
    actualizarSelectNumeros: function (participantes) {
        const numeroSelect = document.getElementById('numero');
        numeroSelect.innerHTML = '<option value="" disabled selected>Selecciona un número</option>';

        for (let i = 1; i <= participantes; i++) {
            numeroSelect.innerHTML += `<option value="${i}">${i}</option>`;
        }
    },

    validarNumeroSeleccionado: function (numero) {
        const medioNumeroCheckbox = document.getElementById('medioNumero');
        const numeroSelect = document.getElementById('numero');

        db.collection("datos").where("numero", "==", parseInt(numero)).get().then((querySnapshot) => {
            let estadoNumero = 0; // 0 = libre, 1 = medio ocupado, 2 = completo

            querySnapshot.forEach(doc => {
                const participacion = doc.data().participacion;
                if (participacion === 'Completo') {
                    estadoNumero = 2;
                } else if (participacion === 'Medio número' && estadoNumero < 2) {
                    estadoNumero += 1;
                }
            });

            // Actualizar checkbox de medio número
            if (estadoNumero >= 2) {
                medioNumeroCheckbox.checked = false;
                medioNumeroCheckbox.disabled = true;
            } else if (estadoNumero === 1) {
                medioNumeroCheckbox.checked = true;
                medioNumeroCheckbox.disabled = true;
            } else {
                medioNumeroCheckbox.checked = false;
                medioNumeroCheckbox.disabled = false;
            }

            // Deshabilitar opción en select si está completo
            const opcion = numeroSelect.querySelector(`option[value="${numero}"]`);
            if (estadoNumero >= 2 && opcion) {
                opcion.disabled = true;
            }
        });
    },

    cargarOpcionesEditar: function (maxParticipantes, estadoNumeros) {
        const select = document.getElementById('editarNumeroParticipante');
        select.innerHTML = '';

        for (let i = 1; i <= maxParticipantes; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;

            // Deshabilitar opción si el número está completo (2 o más)
            if (estadoNumeros[i] >= 2) {
                option.disabled = true;
            }

            select.appendChild(option);
        }
    }
};

document.getElementById('btnGuardarCambiosParticipante').addEventListener('click', () => {
    const id = document.getElementById('editarParticipanteModal').getAttribute('data-id');
    const nuevoNumero = parseInt(document.getElementById('editarNumeroParticipante').value);
    const nuevoNombre = document.getElementById('editarNombreParticipante').value;
    const medioNumero = document.getElementById('editarMedioNumero').checked;

    if (!nuevoNumero || !nuevoNombre) {
        alert('Por favor complete todos los campos correctamente');
        return;
    }

    // Mostrar spinner o indicador de carga (opcional)
    const btn = document.getElementById('btnGuardarCambiosParticipante');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
    btn.disabled = true;

    // Actualizar en Firebase
    db.collection("datos").doc(id).update({
        numero: nuevoNumero,
        nombre: nuevoNombre,
        participacion: medioNumero ? 'Medio número' : 'Completo'
    }).then(() => {
        console.log("Participante actualizado correctamente");

        // Cerrar el modal correctamente
        const modalEl = document.getElementById('editarParticipanteModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();

        // Limpiar el modal después de cerrar
        modalEl.removeAttribute('data-id');
        document.getElementById('formEditarParticipante').reset();

        // Restaurar el botón
        btn.innerHTML = originalText;
        btn.disabled = false;

        // Forzar el foco fuera del modal
        document.body.focus();

        // Eliminar la clase de fondo oscuro si persiste
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

    }).catch(error => {
        console.error("Error al actualizar participante:", error);
        btn.innerHTML = originalText;
        btn.disabled = false;
        alert('Error al actualizar el participante: ' + error.message);
    });
});

// Evento cuando el modal se oculta completamente
document.getElementById('editarParticipanteModal').addEventListener('hidden.bs.modal', function () {
    // Limpiar el modal
    this.removeAttribute('data-id');
    document.getElementById('formEditarParticipante').reset();

    // Limpiar cualquier backdrop persistente
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
});

document.getElementById('btnConfirmarEliminar').addEventListener('click', function () {
    const id = document.getElementById('confirmarEliminarModal').getAttribute('data-id');
    const btn = this;
    const originalText = btn.innerHTML;

    // Mostrar indicador de carga
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Eliminando...';
    btn.disabled = true;

    // Eliminar el documento de Firebase
    db.collection("datos").doc(id).delete()
        .then(() => {
            console.log("Participante eliminado correctamente");

            // Cerrar el modal de confirmación
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarEliminarModal'));
            modal.hide();

            // Limpiar el modal
            document.getElementById('confirmarEliminarModal').removeAttribute('data-id');

            // Restaurar el botón
            btn.innerHTML = originalText;
            btn.disabled = false;

            // No es necesario recargar la página, Firestore actualizará automáticamente la tabla
        })
        .catch(error => {
            console.error("Error al eliminar participante:", error);
            alert('Error al eliminar participante: ' + error.message);

            // Restaurar el botón
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
});

document.getElementById('confirmarEliminarModal').addEventListener('hidden.bs.modal', function () {
    // Limpiar el ID almacenado
    this.removeAttribute('data-id');

    // Restaurar el botón de confirmación
    const btn = document.getElementById('btnConfirmarEliminar');
    btn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Sí, Eliminar';
    btn.disabled = false;
});

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    tandaApp.init();
});