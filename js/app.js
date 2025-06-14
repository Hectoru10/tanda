// Objeto principal de la aplicación
const tandaApp = {
    // Estado de la aplicación
    currentTandaId: null,
    unsubscribeListeners: {
        proyectos: null,
        participantes: null,
        entregas: null
    },

    // Inicialización
    init: function () {
        this.bindEvents();
        this.loadData();
    },

    // Limpieza al salir
    cleanup: function () {
        this.unsubscribeAllListeners();
    },

    // Manejo de eventos
    bindEvents: function () {
        // Eventos de Tandas
        document.getElementById('formularioTanda').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarTanda(e);
        });

        document.addEventListener("DOMContentLoaded", function() {
    grecaptcha.ready(function() {
        grecaptcha.execute('TU_CLAVE_DEL_SITIO', {action: 'submit'}).then(function(token) {
            console.log("reCAPTCHA Token:", token);
        });
    });
});


        // Eventos de Participantes
        document.getElementById('btnGuardarParticipante').addEventListener('click', (e) => {
            e.preventDefault();
            this.registrarParticipante();
        });

        document.getElementById('numero').addEventListener('change', (e) => {
            this.validarNumeroSeleccionado(e.target.value);
        });

        document.getElementById('btnGuardarCambiosParticipante').addEventListener('click', () => {
            this.guardarCambiosParticipante();
        });

        // Eventos de Modales
        document.getElementById('editarTandaModal').addEventListener('show.bs.modal', () => {
            this.cargarDatosParaEdicion();
        });

        document.getElementById('btnGuardarCambiosTanda').addEventListener('click', () => {
            this.guardarCambiosTanda();
        });

        document.getElementById('btnConfirmarEliminar').addEventListener('click', () => {
            const modal = document.getElementById('confirmarEliminarModal');
            const tipo = modal.getAttribute('data-tipo');

            if (tipo === 'tanda') {
                this.eliminarTandaConfirmada();
            } else {
                this.eliminarParticipanteConfirmado();
            }
        });

        document.getElementById('btnEliminarTanda').addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentTandaId) {
                this.prepararEliminacionTanda();
            } else {
                this.mostrarAlerta('No hay tanda activa para eliminar', 'warning');
            }
        });

        // Eventos de cierre de modales
        document.getElementById('editarParticipanteModal').addEventListener('hidden.bs.modal', () => {
            this.cleanupModal('editarParticipanteModal');
        });

        document.getElementById('confirmarEliminarModal').addEventListener('hidden.bs.modal', () => {
            this.cleanupModal('confirmarEliminarModal');
        });
    },

    // Manejo de datos
    loadData: function () {
        this.unsubscribeAllListeners();
        this.loadTandas();
        this.loadParticipantes();
    },

    unsubscribeAllListeners: function () {
        Object.values(this.unsubscribeListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        this.unsubscribeListeners = {
            proyectos: null,
            participantes: null,
            entregas: null
        };
    },

    // Funciones de Tandas
    registrarTanda: function (e) {
        e.preventDefault();
        const form = document.getElementById('formularioTanda');
        const btn = document.getElementById('btnGuardarTanda');
        const originalText = btn.innerHTML;

        // Validación manual adicional
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            btn.innerHTML = originalText;
            return;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Registrando...';
        btn.disabled = true;

        const tandaData = {
            tanda: document.getElementById('nombreTanda').value.trim(),
            montoPorParticipante: parseFloat(document.getElementById('montoParticipante').value),
            participantes: parseInt(document.getElementById('numParticipantes').value),
            frecuencia: document.getElementById('frecuenciaPagos').value,
            fechaInicio: document.getElementById('fechaInicio').value,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'activa'
        };

        // Calcular fecha de término
        tandaData.fechaTermino = this.calcularFechaTermino(
            tandaData.fechaInicio,
            tandaData.frecuencia,
            tandaData.participantes
        );

        // Calcular monto total
        tandaData.montoTotal = tandaData.montoPorParticipante * (tandaData.participantes - 1);

        db.collection("proyectos").add(tandaData)
            .then((docRef) => {
                this.currentTandaId = docRef.id;
                this.mostrarAlerta('Tanda creada correctamente', 'success');

                // Resetear y cerrar el modal
                form.reset();
                form.classList.remove('was-validated');
                bootstrap.Modal.getInstance(document.getElementById('nuevaTandaModal')).hide();

                // Actualizar la UI
                this.loadData();
            })
            .catch(error => {
                console.error("Error al registrar tanda:", error);
                this.mostrarAlerta(`Error al crear tanda: ${error.message}`, 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    loadTandas: function () {
        const tablaTandas = document.getElementById('tablaTandas');
        const nuevaTandaBtn = document.querySelector('[data-bs-target="#nuevaTandaModal"]');
        const editarTandaBtn = document.getElementById('btnEditarTanda');
        const eliminarTandaBtn = document.getElementById('btnEliminarTanda');
        const agregarParticipanteBtn = document.getElementById('btnAgregarParticipante');

        this.unsubscribeListeners.proyectos = db.collection("proyectos").onSnapshot((snapshot) => {
            tablaTandas.innerHTML = '';

            const tieneTandas = !snapshot.empty;

            // Controlar estado de los botones
            nuevaTandaBtn.classList.toggle('disabled', tieneTandas);
            nuevaTandaBtn.setAttribute('aria-disabled', tieneTandas.toString());

            if (tieneTandas) {
                const doc = snapshot.docs[0];
                this.currentTandaId = doc.id;
                const data = doc.data();
                this.renderTandaInfo(data);

                // Habilitar botones cuando hay tanda
                editarTandaBtn.disabled = false;
                eliminarTandaBtn.disabled = false;
                agregarParticipanteBtn.disabled = false;
            } else {
                this.currentTandaId = null;

                // Deshabilitar botones cuando no hay tanda
                editarTandaBtn.disabled = true;
                eliminarTandaBtn.disabled = true;
                agregarParticipanteBtn.disabled = true;

                // Mostrar mensaje de que no hay tandas
                tablaTandas.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-hand-holding-heart fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No hay tandas activas</h5>
                    <p class="small">Crea una nueva tanda para comenzar</p>
                    <button class="btn btn-sm bg-rosa-primario text-white" data-bs-toggle="modal" 
                            data-bs-target="#nuevaTandaModal">
                        <i class="fas fa-plus-circle me-1"></i> Crear Tanda
                    </button>
                </div>
            `;
            }
        }, error => {
            console.error("Error al cargar tandas:", error);
            this.mostrarAlerta('Error al cargar información de tandas', 'danger');
        });
    },

    renderTandaInfo: function (tandaData) {
        const tablaTandas = document.getElementById('tablaTandas');
        const totalParticipantes = tandaData.participantes || 1;

        db.collection("datos").where("entregada", "==", true).get().then((entregadosSnapshot) => {
            const entregados = entregadosSnapshot.size;
            const porcentaje = Math.round((entregados / totalParticipantes) * 100);
            const pendientes = totalParticipantes - entregados;

            const tandaHTML = `
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-tag me-2 text-secondary"></i>Tanda:</span>
                    <span class="fw-bold">${tandaData.tanda}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-money-bill-wave me-2 text-secondary"></i>Monto por participante:</span>
                    <span class="fw-bold">$${parseFloat(tandaData.montoPorParticipante).toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-users me-2 text-secondary"></i>Participantes:</span>
                    <span class="fw-bold">${totalParticipantes}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-calendar-alt me-2 text-secondary"></i>Frecuencia:</span>
                    <span class="fw-bold">${tandaData.frecuencia}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-calendar-day me-2 text-secondary"></i>Inicio:</span>
                    <span class="fw-bold">${tandaData.fechaInicio}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-calendar-check me-2 text-secondary"></i>Fin:</span>
                    <span class="fw-bold">${tandaData.fechaTermino}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span><i class="fas fa-calculator me-2 text-secondary"></i>Monto Total:</span>
                    <span class="fw-bold">$${parseFloat(tandaData.montoTotal).toFixed(2)}</span>
                </div>
                
                <div class="mt-3 pt-2 border-top">
                    <div class="d-flex justify-content-between small mb-1">
                        <span><i class="fas fa-check-circle me-1 text-success"></i>Entregados:
                            <strong id="entregados-count">${entregados}/${totalParticipantes}</strong></span>
                        <span id="porcentaje">${porcentaje}% completado</span>
                    </div>
                    <div class="progress progress-tanda mb-2" style="height: 10px;">
                        <div id="progress-bar" 
                            class="progress-bar progress-bar-tanda bg-success" 
                            role="progressbar" 
                            style="width: ${porcentaje}%"
                            aria-valuenow="${porcentaje}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                        </div>
                    </div>
                    <div class="d-flex justify-content-between small">
                        <span class="badge bg-rosa-claro text-rosa-oscuro" id="pendientes">
                            <i class="fas fa-clock me-1"></i>${pendientes} pendientes
                        </span>
                    </div>
                </div>
            `;

            tablaTandas.innerHTML = tandaHTML;
            this.actualizarSelectNumeros(totalParticipantes);
            this.setupEntregasListener(totalParticipantes);
            this.cargarProximasAcciones(tandaData);
        });
    },

    renderProximasAcciones: function (pagosPendientes, proximoEnRecibir, siguienteEnRecibir) {
        const listaPagosPendientes = document.getElementById('listaPagosPendientes');
        const listaProximasEntregas = document.getElementById('listaProximasEntregas');
        const contadorPendientes = document.getElementById('contadorPendientes');
        const contadorEntregas = document.getElementById('contadorEntregas');

        // Actualizar contadores
        contadorPendientes.textContent = pagosPendientes.length;
        contadorEntregas.textContent = proximoEnRecibir ? 1 : 0;

        // Renderizar pagos pendientes (máximo 3 visibles inicialmente)
        listaPagosPendientes.innerHTML = pagosPendientes.slice(0, 10).map(pago => {
            return `<li>
                <span>${pago.nombre} - $${pago.monto.toFixed(2)}</span>
                <span class="text-muted small">Pendiente </span>
            </li>`;
        }).join('');

        if (pagosPendientes.length === 0) {
            listaPagosPendientes.innerHTML = '<li class="text-muted">No hay pagos pendientes</li>';
        } else if (pagosPendientes.length > 10) {
            listaPagosPendientes.innerHTML += `<li class="text-center text-rosa-oscuro small">
                +${pagosPendientes.length - 10} más...
            </li>`;
        }

        // Renderizar próximas entregas
        if (proximoEnRecibir) {
            listaProximasEntregas.innerHTML = `
                <li>
                    <span>${proximoEnRecibir.nombre}</span>
                    <span>
                        <span class="text-muted small">el ${proximoEnRecibir.fechaEntrega}</span>
                        <span class="badge bg-rosa-primario text-white ms-2">$${proximoEnRecibir.monto.toFixed(2)}</span>
                    </span</li>
            `;

            if (siguienteEnRecibir) {
                listaProximasEntregas.innerHTML += `
                    <li>
                        <span>${siguienteEnRecibir.nombre}</span>
                        <span class="text-muted small">el ${siguienteEnRecibir.fechaEntrega}</span>
                    </li>
                `;
            }
        } else {
            listaProximasEntregas.innerHTML = '<li class="text-muted">Tanda completada</li>';
        }
    },

    actualizarEstadoBotones: function(habilitar) {
        const editarTandaBtn = document.getElementById('btnEditarTanda');
        const eliminarTandaBtn = document.getElementById('btnEliminarTanda');
        const agregarParticipanteBtn = document.getElementById('btnAgregarParticipante');
        
        if (editarTandaBtn) editarTandaBtn.disabled = !habilitar;
        if (eliminarTandaBtn) eliminarTandaBtn.disabled = !habilitar;
        if (agregarParticipanteBtn) agregarParticipanteBtn.disabled = !habilitar;
    },

    marcarParticipanteComoPagado: function (numero) {
        // Buscar el participante por número
        db.collection("datos")
            .where("numero", "==", parseInt(numero))
            .get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    return db.collection("datos").doc(doc.id).update({
                        pagado: true
                    });
                }
            })
            .then(() => {
                this.mostrarAlerta('Participante marcado como pagado', 'success');
                // Recargar los datos
                db.collection("proyectos").limit(1).get().then((snapshot) => {
                    if (!snapshot.empty) {
                        const doc = snapshot.docs[0];
                        this.currentTandaId = doc.id;
                        const data = doc.data();
                        this.cargarProximasAcciones(data);
                    }
                });
            })
            .catch(error => {
                console.error("Error al marcar como pagado:", error);
                this.mostrarAlerta('Error al marcar como pagado', 'danger');
            });
    },

    setupEntregasListener: function (totalParticipantes) {
        this.unsubscribeListeners.entregas = db.collection("datos").where("entregada", "==", true)
            .onSnapshot((snapshot) => {
                const entregados = snapshot.size;
                const porcentaje = Math.round((entregados / totalParticipantes) * 100);
                const pendientes = totalParticipantes - entregados;

                if (document.getElementById('entregados-count')) {
                    document.getElementById('entregados-count').textContent = `${entregados}/${totalParticipantes}`;
                    document.getElementById('porcentaje').textContent = `${porcentaje}% completado`;
                    document.getElementById('progress-bar').style.width = `${porcentaje}%`;
                    document.getElementById('progress-bar').setAttribute('aria-valuenow', porcentaje);
                    document.getElementById('pendientes').innerHTML = `<i class="fas fa-clock me-1"></i>${pendientes} pendientes`;
                }
            });
    },

    cargarDatosParaEdicion: function () {
        const btn = document.getElementById('btnGuardarCambiosTanda');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cargando...';
        btn.disabled = true;

        if (!this.currentTandaId) {
            this.mostrarAlerta('No hay tanda activa para editar', 'warning');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        db.collection("proyectos").doc(this.currentTandaId).get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    document.getElementById('editarNombreTanda').value = data.tanda || '';
                    document.getElementById('editarMontoParticipante').value = data.montoPorParticipante || '';
                    document.getElementById('editarNumParticipantes').value = data.participantes || '';
                    document.getElementById('editarFrecuenciaPagos').value = data.frecuencia || 'Semanal';
                    document.getElementById('editarFechaInicio').value = data.fechaInicio || '';
                }
            })
            .catch(error => {
                console.error("Error al cargar datos para edición:", error);
                this.mostrarAlerta('Error al cargar datos para edición', 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    guardarCambiosTanda: function () {
        const btn = document.getElementById('btnGuardarCambiosTanda');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
        btn.disabled = true;

        if (!this.currentTandaId) {
            this.mostrarAlerta('No se encontró la tanda para actualizar', 'danger');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        const tandaActualizada = {
            tanda: document.getElementById('editarNombreTanda').value,
            montoPorParticipante: parseFloat(document.getElementById('editarMontoParticipante').value),
            participantes: parseInt(document.getElementById('editarNumParticipantes').value),
            frecuencia: document.getElementById('editarFrecuenciaPagos').value,
            fechaInicio: document.getElementById('editarFechaInicio').value,
            fechaTermino: this.calcularFechaTermino(
                document.getElementById('editarFechaInicio').value,
                document.getElementById('editarFrecuenciaPagos').value,
                parseInt(document.getElementById('editarNumParticipantes').value)
            ),
            montoTotal: parseFloat(document.getElementById('editarMontoParticipante').value) *
                (parseInt(document.getElementById('editarNumParticipantes').value) - 1)
        };

        // Validación
        if (!tandaActualizada.tanda || isNaN(tandaActualizada.montoPorParticipante) ||
            isNaN(tandaActualizada.participantes) || !tandaActualizada.fechaInicio) {
            this.mostrarAlerta('Por favor complete todos los campos correctamente', 'warning');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        db.collection("proyectos").doc(this.currentTandaId).update(tandaActualizada)
            .then(() => {
                this.mostrarAlerta('Tanda actualizada correctamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editarTandaModal')).hide();
                this.loadData();
            })
            .catch(error => {
                console.error("Error al actualizar tanda:", error);
                this.mostrarAlerta('Error al actualizar tanda: ' + error.message, 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    // Funciones de Participantes
    registrarParticipante: function () {
        const form = document.getElementById('formularioParticipantes');
        const btn = document.getElementById('btnGuardarParticipante');
        const originalText = btn.innerHTML;

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
        btn.disabled = true;

        const participanteData = {
            numero: parseInt(document.getElementById('numero').value),
            nombre: document.getElementById('nombre').value.trim(),
            participacion: document.getElementById('medioNumero').checked ? 'Medio número' : 'Completo',
            pagado: false,
            entregada: false,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("datos").add(participanteData)
            .then(() => {
                this.mostrarAlerta('Participante agregado correctamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('nuevoParticipante')).hide();
                form.reset();
                form.classList.remove('was-validated');
            })
            .catch(error => {
                console.error("Error al agregar participante:", error);
                this.mostrarAlerta(`Error: ${error.message}`, 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    loadParticipantes: function () {
        const tablaCuerpo = document.getElementById('tablaCuerpo');

        this.unsubscribeListeners.participantes = db.collection("datos")
            .orderBy("numero")
            .onSnapshot((querySnapshot) => {
                this.renderParticipantes(querySnapshot);
            }, error => {
                console.error("Error al cargar participantes:", error);
                this.mostrarAlerta('Error al cargar lista de participantes', 'danger');
            });
    },

    cargarProximasAcciones: async function (tandaData) {
        try {
            // Obtener participantes ordenados por número
            const participantesSnapshot = await db.collection("datos")
                .orderBy("numero")
                .get();

            // Obtener la fecha de inicio y frecuencia
            const fechaInicio = new Date(tandaData.fechaInicio);
            let diasPorCiclo = 0;
            if (tandaData.frecuencia === 'Semanal') diasPorCiclo = 7;
            else if (tandaData.frecuencia === 'Quincenal') diasPorCiclo = 15;
            else if (tandaData.frecuencia === 'Mensual') diasPorCiclo = 30;

            // Procesar participantes para encontrar:
            // - Pagos pendientes (no pagados)
            // - Próximo en recibir (primero no entregado)
            const pagosPendientes = [];
            let proximoEnRecibir = null;
            let siguienteEnRecibir = null;

            participantesSnapshot.forEach(doc => {
                const data = doc.data();

                // Calcular fecha de entrega
                const fechaEntrega = new Date(fechaInicio);
                fechaEntrega.setDate(fechaInicio.getDate() + (diasPorCiclo * (data.numero - 1)));

                // Formatear fecha para mostrar
                const opcionesFecha = { day: 'numeric', month: 'short' };
                const fechaFormateada = fechaEntrega.toLocaleDateString('es-MX', opcionesFecha);

                // Verificar si está pagado
                if (!data.pagado) {
                    pagosPendientes.push({
                        nombre: data.nombre,
                        monto: data.participacion === 'Completo' ?
                            tandaData.montoPorParticipante :
                            tandaData.montoPorParticipante / 2,
                        fechaVencimiento: fechaFormateada,
                        numero: data.numero
                    });
                }

                // Verificar próximo en recibir (no entregado)
                if (!data.entregada) {
                    if (!proximoEnRecibir || data.numero < proximoEnRecibir.numero) {
                        // Si encontramos un número menor que aún no ha recibido
                        if (proximoEnRecibir) {
                            siguienteEnRecibir = {
                                nombre: proximoEnRecibir.nombre,
                                fechaEntrega: proximoEnRecibir.fechaEntrega
                            };
                        }
                        proximoEnRecibir = {
                            nombre: data.nombre,
                            monto: tandaData.montoPorParticipante * (tandaData.participantes - 1),
                            fechaEntrega: fechaFormateada,
                            numero: data.numero
                        };
                    } else if (!siguienteEnRecibir && data.numero > proximoEnRecibir.numero) {
                        siguienteEnRecibir = {
                            nombre: data.nombre,
                            fechaEntrega: fechaFormateada
                        };
                    }
                }
            });

            // Ordenar pagos pendientes por número (fecha)
            pagosPendientes.sort((a, b) => a.numero - b.numero);

            // Renderizar la sección de próximas acciones
            this.renderProximasAcciones(pagosPendientes, proximoEnRecibir, siguienteEnRecibir);

        } catch (error) {
            console.error("Error al cargar próximas acciones:", error);
        }
    },

    renderParticipantes: async function (querySnapshot) {
        const tablaCuerpo = document.getElementById('tablaCuerpo');
        const numeroSelect = document.getElementById('numero');
        const estadoNumeros = {};
        const filas = [];

        // Resetear select
        Array.from(numeroSelect.options).forEach(opcion => {
            if (opcion.value) opcion.disabled = false;
        });

        // Obtener datos de la tanda para cálculos
        const proyectoSnapshot = await db.collection("proyectos").limit(1).get();
        const proyectoActivo = proyectoSnapshot.empty ? null : proyectoSnapshot.docs[0].data();

        // Limpiar tabla
        tablaCuerpo.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Actualizar estado de números
            if (!estadoNumeros[data.numero]) {
                estadoNumeros[data.numero] = 0;
            }
            estadoNumeros[data.numero] += data.participacion === 'Completo' ? 2 : 1;

            // Calcular montos y fechas
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
                    <td class="monto-entregar" ${data.entregada ? 'style="text-decoration: line-through;"' : ''}>${montoAEntregar.toFixed(2)}</td>
                    <td class="fecha-entrega" ${data.entregada ? 'style="text-decoration: line-through;"' : ''}>${fechaEntrega}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input check-entregada" type="checkbox" ${data.entregada ? 'checked' : ''}>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-rosa-oscuro btn-editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar">
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

        // Configurar eventos de la tabla
        this.setupTableEvents();
    },

    setupTableEvents: function () {
        // Eventos de checkboxes
        document.querySelectorAll('.check-pagado').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const fila = e.target.closest('tr');
                const id = fila.getAttribute('data-id');
                const montoCell = fila.querySelector('.monto-participante');
                montoCell.style.textDecoration = e.target.checked ? 'line-through' : 'none';

                db.collection("datos").doc(id).update({
                    pagado: e.target.checked
                })
                    .then(() => {
                        // Recargar la tanda para actualizar próximas acciones
                        db.collection("proyectos").limit(1).get().then((snapshot) => {
                            if (!snapshot.empty) {
                                const doc = snapshot.docs[0];
                                this.currentTandaId = doc.id;
                                const data = doc.data();
                                this.cargarProximasAcciones(data);
                            }
                        });
                    })
                    .catch(error => {
                        console.error("Error al actualizar estado de pago:", error);
                        e.target.checked = !e.target.checked;
                        montoCell.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                    });
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-marcar-pagado')) {
                e.preventDefault();
                const numeroParticipante = e.target.getAttribute('data-numero');
                this.marcarParticipanteComoPagado(numeroParticipante);
            }
        });

        document.querySelectorAll('.check-entregada').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const fila = e.target.closest('tr');
                const id = fila.getAttribute('data-id');
                const montoCell = fila.querySelector('.monto-entregar');
                const fechaCell = fila.querySelector('.fecha-entrega');

                if (e.target.checked) {
                    fila.style.backgroundColor = '#e6ffed';
                    montoCell.style.textDecoration = 'line-through';
                    fechaCell.style.textDecoration = 'line-through';
                } else {
                    fila.style.backgroundColor = '';
                    montoCell.style.textDecoration = 'none';
                    fechaCell.style.textDecoration = 'none';
                }

                db.collection("datos").doc(id).update({
                    entregada: e.target.checked
                }).catch(error => {
                    console.error("Error al actualizar estado de entrega:", error);
                    e.target.checked = !e.target.checked;
                    if (e.target.checked) {
                        fila.style.backgroundColor = '#e6ffed';
                        montoCell.style.textDecoration = 'line-through';
                        fechaCell.style.textDecoration = 'line-through';
                    } else {
                        fila.style.backgroundColor = '';
                        montoCell.style.textDecoration = 'none';
                        fechaCell.style.textDecoration = 'none';
                    }
                });
            });
        });

        // Eventos de botones
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fila = e.target.closest('tr');
                const id = fila.getAttribute('data-id');
                this.cargarParticipanteParaEdicion(id);
            });
        });

        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fila = e.target.closest('tr');
                const id = fila.getAttribute('data-id');
                const nombre = fila.querySelector('td:nth-child(2)').textContent;
                this.prepararEliminacionParticipante(id, nombre);
            });
        });
    },

    cargarParticipanteParaEdicion: async function (id) {
        const modal = document.getElementById('editarParticipanteModal');
        const btn = modal.querySelector('#btnGuardarCambiosParticipante');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cargando...';
        btn.disabled = true;

        try {
            // Obtener datos del proyecto para validación
            const proyectoSnapshot = await db.collection("proyectos").limit(1).get();
            if (proyectoSnapshot.empty) {
                throw new Error("No hay proyecto activo");
            }
            const maxParticipantes = proyectoSnapshot.docs[0].data().participantes;

            // Obtener estado actual de números
            const participantesSnapshot = await db.collection("datos").get();
            const estadoNumeros = {};
            participantesSnapshot.forEach(doc => {
                const data = doc.data();
                if (!estadoNumeros[data.numero]) {
                    estadoNumeros[data.numero] = 0;
                }
                estadoNumeros[data.numero] += data.participacion === 'Completo' ? 2 : 1;
            });

            // Cargar datos del participante
            const doc = await db.collection("datos").doc(id).get();
            if (!doc.exists) {
                throw new Error("Participante no encontrado");
            }

            const data = doc.data();
            this.cargarOpcionesEditar(maxParticipantes, estadoNumeros);

            document.getElementById('editarNumeroParticipante').value = data.numero;
            document.getElementById('editarNombreParticipante').value = data.nombre;
            document.getElementById('editarMedioNumero').checked = data.participacion === 'Medio número';
            modal.setAttribute('data-id', id);

            // Mostrar modal
            bootstrap.Modal.getOrCreateInstance(modal).show();
        } catch (error) {
            console.error("Error al cargar participante para edición:", error);
            this.mostrarAlerta('Error al cargar datos del participante', 'danger');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    guardarCambiosParticipante: function () {
        const modal = document.getElementById('editarParticipanteModal');
        const id = modal.getAttribute('data-id');
        const btn = document.getElementById('btnGuardarCambiosParticipante');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
        btn.disabled = true;

        const nuevoNumero = parseInt(document.getElementById('editarNumeroParticipante').value);
        const nuevoNombre = document.getElementById('editarNombreParticipante').value.trim();
        const medioNumero = document.getElementById('editarMedioNumero').checked;

        if (!nuevoNumero || !nuevoNombre) {
            this.mostrarAlerta('Por favor complete todos los campos correctamente', 'warning');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        const updateData = {
            numero: nuevoNumero,
            nombre: nuevoNombre,
            participacion: medioNumero ? 'Medio número' : 'Completo'
        };

        db.collection("datos").doc(id).update(updateData)
            .then(() => {
                this.mostrarAlerta('Participante actualizado correctamente', 'success');
                bootstrap.Modal.getInstance(modal).hide();
                this.cleanupModal('editarParticipanteModal');
            })
            .catch(error => {
                console.error("Error al actualizar participante:", error);
                this.mostrarAlerta('Error al actualizar participante: ' + error.message, 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    prepararEliminacionParticipante: function (id, nombre) {
        const modal = document.getElementById('confirmarEliminarModal');
        modal.setAttribute('data-id', id);

        const mensaje = modal.querySelector('.modal-body p');
        mensaje.innerHTML = `¿Estás seguro de eliminar a <strong>${nombre}</strong>?<br>Esta acción no se puede deshacer.`;

        bootstrap.Modal.getOrCreateInstance(modal).show();
    },

    prepararEliminacionTanda: function () {
        const modal = document.getElementById('confirmarEliminarModal');
        modal.setAttribute('data-tipo', 'tanda');

        document.getElementById('tituloConfirmacion').textContent = '¿Eliminar toda la tanda?';
        document.getElementById('mensajeConfirmacion').innerHTML =
            'Esta acción eliminará la tanda y <strong>TODOS</strong> los participantes asociados.<br>Esta acción no se puede deshacer.';

        bootstrap.Modal.getOrCreateInstance(modal).show();
    },

    eliminarTandaConfirmada: function() {
        const modal = document.getElementById('confirmarEliminarModal');
        const btn = document.getElementById('btnConfirmarEliminar');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Eliminando...';
        btn.disabled = true;
    
        // Primero eliminamos todos los participantes
        db.collection("datos").get().then(querySnapshot => {
            const batch = db.batch();
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            // Luego eliminamos la tanda
            return db.collection("proyectos").doc(this.currentTandaId).delete();
        })
        .then(() => {
            this.mostrarAlerta('Tanda eliminada correctamente', 'success');
            this.currentTandaId = null;
            bootstrap.Modal.getInstance(modal).hide();
            this.cleanupModal('confirmarEliminarModal');
            
            // Deshabilitar botones después de eliminar
            this.actualizarEstadoBotones(false);
            
            // Recargar datos
            this.loadData();
        })
        .catch(error => {
            console.error("Error al eliminar tanda:", error);
            this.mostrarAlerta('Error al eliminar tanda: ' + error.message, 'danger');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    },

    eliminarParticipanteConfirmado: function () {
        const modal = document.getElementById('confirmarEliminarModal');
        const id = modal.getAttribute('data-id');
        const btn = document.getElementById('btnConfirmarEliminar');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Eliminando...';
        btn.disabled = true;

        db.collection("datos").doc(id).delete()
            .then(() => {
                this.mostrarAlerta('Participante eliminado correctamente', 'success');
                bootstrap.Modal.getInstance(modal).hide();
                this.cleanupModal('confirmarEliminarModal');
            })
            .catch(error => {
                console.error("Error al eliminar participante:", error);
                this.mostrarAlerta('Error al eliminar participante: ' + error.message, 'danger');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    },

    // Funciones auxiliares
    calcularFechaTermino: function (fechaInicio, frecuencia, participantes) {
        const fecha = new Date(fechaInicio);
        let diasPorCiclo = 7; // Semanal por defecto

        if (frecuencia === 'Quincenal') diasPorCiclo = 15;
        else if (frecuencia === 'Mensual') diasPorCiclo = 30;

        fecha.setDate(fecha.getDate() + (diasPorCiclo * (participantes - 1)));
        return fecha.toISOString().split('T')[0];
    },

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
            let estadoNumero = 0;

            querySnapshot.forEach(doc => {
                const participacion = doc.data().participacion;
                if (participacion === 'Completo') {
                    estadoNumero = 2;
                } else if (participacion === 'Medio número' && estadoNumero < 2) {
                    estadoNumero += 1;
                }
            });

            // Actualizar checkbox de medio número
            medioNumeroCheckbox.checked = estadoNumero === 1;
            medioNumeroCheckbox.disabled = estadoNumero >= 1;

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
            option.disabled = estadoNumeros[i] >= 2;
            select.appendChild(option);
        }
    },

    mostrarAlerta: function (mensaje, tipo) {
        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo} alert-dismissible fade show fixed-top mx-auto mt-2`;
        alerta.style.width = '80%';
        alerta.style.zIndex = '1100';
        alerta.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alerta);

        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alerta);
            bsAlert.close();
        }, 3000);
    },

    cleanupModal: function (modalId) {
        const modal = document.getElementById(modalId);
        modal.removeAttribute('data-id');

        if (modalId === 'confirmarEliminarModal') {
            const mensaje = modal.querySelector('.modal-body p');
            mensaje.innerHTML = 'Esta acción no se puede deshacer y se perderán todos los datos asociados.';
        } else if (modalId === 'editarParticipanteModal') {
            document.getElementById('formEditarParticipante').reset();
        }

        // Limpiar backdrop si existe
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0) {
            backdrops.forEach(backdrop => backdrop.remove());
        }

        // Restaurar el body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
};


// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    tandaApp.init();
});

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    tandaApp.cleanup();
});
