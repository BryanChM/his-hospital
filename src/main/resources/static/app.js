const API_URL = "/api";
let miUsuarioActual = null;
let miPacienteId = null;
let miUsername = null;
let usuariosGlobales = [];
let usuariosFiltrados = [];
let paginaActualUsuarios = 1;
let elementosPorPaginaUsuarios = 10;
let listaSucursales = [];
let listaGlobalSucursalesAdmin = [];

async function verificarDpi() {
    const dpiInput = document.getElementById("input-dpi-check").value.trim();
    const alertBox = document.getElementById("dpi-alert");
    if (alertBox) alertBox.style.display = "none";

    if (dpiInput.length !== 13 || isNaN(dpiInput)) {
        if (alertBox) {
            alertBox.className = "alert alert-warning font-weight-bold";
            alertBox.innerText = "Por favor ingrese un número de DPI válido de exactamente 13 dígitos numéricos.";
            alertBox.style.display = "block";
        } else {
            alert("Por favor ingrese un número de DPI válido de exactamente 13 dígitos numéricos.");
        }
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/users/dpi/${dpiInput}`);

        if (respuesta.ok) {
            const usuarioEncontrado = await respuesta.json();
            document.getElementById("login-nombre-user").innerText = usuarioEncontrado.nombre;
            document.getElementById("login-rol-badge").innerText = usuarioEncontrado.role ? usuarioEncontrado.role.nombre : "GENERAL";
            document.getElementById("login-username").value = usuarioEncontrado.username;
            cambiarVista("view-login");
        } else if (respuesta.status === 404) {
            document.getElementById("reg-dpi").value = dpiInput;
            cambiarVista("view-reg");
        } else {
            if (alertBox) {
                alertBox.className = "alert alert-danger";
                alertBox.innerText = "Error inesperado en el servidor al consultar la base de datos.";
                alertBox.style.display = "block";
            }
        }
    } catch (error) {
        if (alertBox) {
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "No se pudo conectar con el endpoint /api/users/dpi. Revisa la consola del navegador (F12).";
            alertBox.style.display = "block";
        }
        console.error("Error detallado:", error);
    }
}

async function procesarLogin() {
    const usernameInput = document.getElementById("login-username").value.trim();
    const passwordInput = document.getElementById("login-password").value;
    const alertBox = document.getElementById("login-alert");
    if (alertBox) alertBox.style.display = "none";

    try {
        const respuesta = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            miUsuarioActual = datos;
            document.getElementById("nav-actions").style.display = "block";
            document.getElementById("user-display").innerText = `${datos.usuario} [${datos.rol}]`;

            const rol = datos.rol ? datos.rol.toUpperCase() : "";

            if (rol.includes("ENFERMER") || rol === "TRIAGE") {
                cambiarVista("view-dashboard-enfermeria");
                cargarTriageEnfermeria();
            } else if (rol === "PACIENTE") {
                cambiarVista("view-dashboard-paciente");
                cargarCitasDePacienteLogueado(usernameInput);
                cargarSucursalesPaciente();
                if (typeof recargarMisCitas === "function") recargarMisCitas();
            } else if (rol === "MEDIC" || rol === "MEDICO") {
                cambiarVista("view-dashboard-medico");
                cargarAgendaMedico(datos.id);
            } else {
                cambiarVista("view-dashboard-admin");
                cargarTodasLasCitasAdmin();
            }
        } else {
            if (alertBox) {
                alertBox.innerText = datos.error || "Credenciales incorrectas.";
                alertBox.style.display = "block";
            } else {
                alert(datos.error || "Credenciales incorrectas.");
            }
        }
    } catch (error) {
        if (alertBox) {
            alertBox.innerText = "Error de comunicación con el servidor al intentar iniciar sesión.";
            alertBox.style.display = "block";
        }
        console.error(error);
    }
}

async function procesarRegistro(event) {
    if (event) event.preventDefault();

    const alertBox = document.getElementById("reg-alert");
    if (alertBox) alertBox.style.display = "none";

    const telInput = document.getElementById("reg-tel") || document.getElementById("reg-telefono");
    const telefono = telInput ? telInput.value.trim() : "";

    if (telefono.length !== 8 || isNaN(telefono)) {
        if (alertBox) {
            alertBox.className = "alert alert-warning font-weight-bold";
            alertBox.innerText = "El número de teléfono debe contener exactamente 8 dígitos numéricos.";
            alertBox.style.display = "block";
        } else {
            alert("El número de teléfono debe contener exactamente 8 dígitos numéricos.");
        }
        return;
    }

    const espInput = document.getElementById("reg-esp") || document.getElementById("reg-especialidad");
    const especialidadVal = espInput ? espInput.value : "Medicina General";

    const nuevoUsuario = {
        nombre: document.getElementById("reg-nombre")?.value.trim() || "",
        username: document.getElementById("reg-username")?.value.trim() || "",
        password: document.getElementById("reg-password")?.value || "",
        email: document.getElementById("reg-email")?.value.trim() || "",
        dpi: document.getElementById("reg-dpi")?.value.trim() || "",
        telefono: telefono,
        especialidad: null,
        nit: "CF",
        role: { nombre: "PACIENTE" }
    };

    try {
        console.log("Enviando datos de nuevo usuario a Spring Boot...", nuevoUsuario);

        const respUser = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoUsuario)
        });

        const datosUser = await respUser.json();

        if (respUser.ok) {
            const idGenerado = datosUser.id || datosUser.usuario_id;
            console.log("Usuario creado con ID:", idGenerado);

            if (typeof registrarAuditoria === "function") {
                registrarAuditoria("CREACIÓN", `Se registró la cuenta y expediente del paciente: ${nuevoUsuario.username}`);
            }

            const datosExpediente = {
                pacienteId: idGenerado,
                tipoSangre: "Pendiente de Triage",
                alergias: "Ninguna registrada",
                antecedentesMedicos: "Especialidad solicitada en registro: " + especialidadVal,
                contactoEmergencia: "Teléfono propio: " + telefono
            };

            await fetch(`${API_URL}/expedientes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosExpediente)
            });

            console.log("Expediente clínico vinculado exitosamente.");

            if (alertBox) {
                alertBox.className = "alert alert-success font-weight-bold";
                alertBox.innerText = "¡Cuenta y Expediente Clínico creados con éxito en PostgreSQL! Redireccionando al portal...";
                alertBox.style.display = "block";
            } else {
                alert("¡Cuenta y Expediente Clínico creados con éxito en PostgreSQL!");
            }

            setTimeout(() => {
                const nombreLogin = document.getElementById("login-nombre-user");
                const rolBadge = document.getElementById("login-rol-badge");
                const userLogin = document.getElementById("login-username");

                if (nombreLogin) nombreLogin.innerText = nuevoUsuario.nombre;
                if (rolBadge) rolBadge.innerText = "PACIENTE";
                if (userLogin) userLogin.value = nuevoUsuario.username;

                if (typeof cambiarVista === "function") {
                    cambiarVista("view-login");
                } else if (typeof mostrarVista === "function") {
                    mostrarVista("view-login");
                }
            }, 1800);

        } else {
            const mensajeError = datosUser.error || datosUser.mensaje || "No se pudo registrar la cuenta.";
            console.warn("Rechazo del servidor:", mensajeError);

            if (alertBox) {
                alertBox.className = "alert alert-danger font-weight-bold";
                alertBox.innerText = "Error de registro: " + mensajeError;
                alertBox.style.display = "block";
            } else {
                alert("Error de registro: " + mensajeError);
            }
        }
    } catch (error) {
        console.error("Error crítico de conexión en procesarRegistro:", error);

        if (alertBox) {
            alertBox.className = "alert alert-danger font-weight-bold";
            alertBox.innerText = "Error de conexión con el servidor hospitalario. Verifique que Spring Boot esté activo.";
            alertBox.style.display = "block";
        } else {
            alert("Error de conexión con el servidor. Verifique que Spring Boot esté activo.");
        }
    }
}

async function cargarCitasDePacienteLogueado(username) {
    miUsername = username;
    const contenedor = document.getElementById("lista-citas-paciente");

    try {
        const respUser = await fetch(`${API_URL}/users`);
        const todos = await respUser.json();
        const yo = todos.find(u => u.username === username);

        if (!yo) return;
        miPacienteId = yo.id;

        renderizarMisCitas();
    } catch (error) {
        if (contenedor) contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar citas del paciente.</div>`;
    }
}

async function renderizarMisCitas() {
    if (!miPacienteId) return;
    const contenedor = document.getElementById("lista-citas-paciente");
    if (!contenedor) return;

    try {
        const respCitas = await fetch(`${API_URL}/citas/paciente/${miPacienteId}`);
        const citas = await respCitas.json();

        if (citas.length === 0) {
            contenedor.innerHTML = `<div class="alert alert-info text-center my-3">No tiene citas médicas programadas actualmente en el hospital.</div>`;
            return;
        }

        let html = `<div class="list-group">`;
        citas.forEach(c => {
            let badge = "bg-primary";
            let btnCancelar = "";

            if (c.estado === "CANCELADA") badge = "bg-danger";
            if (c.estado === "ATENDIDA" || c.estado === "COMPLETADA") badge = "bg-success";
            if (c.estado === "EN_SALA_DE_ESPERA") badge = "bg-info text-dark font-weight-bold";

            if (c.estado === "PROGRAMADA" || c.estado === "AGENDADA" || c.estado === "EN_SALA_DE_ESPERA") {
                btnCancelar = `
                    <button onclick="cancelarCitaPaciente(${c.id})" class="btn btn-outline-danger btn-sm mt-2 font-weight-bold">
                        Cancelar Cita
                    </button>
                `;
            }

            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3">
                    <div>
                        <h6 class="mb-1 font-weight-bold text-primary">Consulta con: ${c.medico ? c.medico.nombre : 'Médico Asignado'}</h6>
                        <p class="mb-1"><strong>Motivo:</strong> ${c.motivo}</p>
                        ${c.observaciones ? `<p class="mb-1 text-dark"><small><strong>Obs / Diagnóstico:</strong> <em>${c.observaciones}</em></small></p>` : ''}
                        <small class="text-secondary"><strong>Fecha programada:</strong> ${c.fechaHora.replace('T', ' a las ')} horas</small>
                        <div class="mt-1">${btnCancelar}</div>
                    </div>
                    <span class="badge ${badge} fs-6 px-3 py-2 rounded-pill">${c.estado}</span>
                </div>
            `;
        });
        html += `</div>`;
        contenedor.innerHTML = html;
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar su historial de citas.</div>`;
    }
}

function recargarMisCitas() {
    renderizarMisCitas();
}

async function agendarCitaPaciente(event) {
    if (event) event.preventDefault();

    const alertBox = document.getElementById("cita-alert");
    if (alertBox) alertBox.style.display = "none";

    // 1. Validar que la sesión del paciente esté activa y su ID exista en memoria
    if (!miPacienteId) {
        alert("Error de sesión: No se identificó el ID de su paciente. Por favor cierre sesión e ingrese nuevamente.");
        return;
    }

    const sucursalId = document.getElementById("cita-sucursal")?.value || document.getElementById("select-sucursal")?.value;
    const especialidad = document.getElementById("cita-especialidad")?.value || document.getElementById("select-especialidad")?.value;
    const fechaHora = document.getElementById("cita-fecha")?.value;
    const motivo = document.getElementById("cita-motivo")?.value.trim();
    const observaciones = document.getElementById("cita-observaciones")?.value.trim() || "";

    const selectMedico = document.getElementById("cita-medico") || document.getElementById("select-medico-cita");
    const medicoId = selectMedico?.value;

    if (!sucursalId || !especialidad || !fechaHora || !motivo) {
        alert("Por favor complete todos los campos obligatorios del formulario (Sucursal, Especialidad, Fecha/Hora y Motivo).");
        return;
    }

    if (!medicoId || medicoId === "") {
        alert("El sistema no ha podido asignar un médico disponible en el horario seleccionado. Por favor verifique la disponibilidad o elija otra fecha.");
        return;
    }

    // 2. CORRECCIÓN: Se incorpora el objeto 'paciente' con su ID para que Spring Boot registre al titular
    const nuevaCita = {
        paciente: { id: parseInt(miPacienteId) },
        sucursal: { id: parseInt(sucursalId) },
        medico: { id: parseInt(medicoId) },
        especialidad: especialidad,
        fechaHora: fechaHora,
        motivo: motivo,
        observaciones: observaciones,
        estado: "PROGRAMADA"
    };

    try {
        console.log("Enviando solicitud de agendamiento automático...", nuevaCita);

        const respuesta = await fetch(`${API_URL}/citas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevaCita)
        });

        // 3. Manejo blindado de la respuesta (soporta tanto formato JSON como texto plano del servidor)
        const textoRespuesta = await respuesta.text();
        let datosRespuesta = {};
        try {
            datosRespuesta = JSON.parse(textoRespuesta);
        } catch (e) {
            datosRespuesta = { mensaje: textoRespuesta };
        }

        if (respuesta.ok) {
            alert("¡Cita agendada y asignada con éxito! Su médico ha sido reservado para el horario indicado.");

            document.getElementById("form-agendar-cita")?.reset();
            if (selectMedico) {
                selectMedico.innerHTML = '<option value="">Esperando fecha y hora...</option>';
                selectMedico.disabled = true;
            }
            if (typeof renderizarMisCitas === "function") {
                renderizarMisCitas();
            }
        } else {
            const mensajeError = datosRespuesta.error || datosRespuesta.mensaje || textoRespuesta || "Error al programar la cita (404 Not Found).";
            alert("No se pudo programar la cita: " + mensajeError);
        }
    } catch (error) {
        console.error("Error crítico de conexión al agendar cita:", error);
        alert("Error de conexión con el servidor hospitalario al intentar agendar.");
    }
}

async function cancelarCitaPaciente(citaId) {
    if (!confirm("¿Está seguro de que desea cancelar esta cita médica?")) return;

    try {
        const respuesta = await fetch(`${API_URL}/citas/cancelar/${citaId}`, {
            method: "PUT"
        });
        if (respuesta.ok) {
            alert("La cita ha sido cancelada exitosamente.");
            if (typeof renderizarMisCitas === "function") {
                renderizarMisCitas();
            }
        } else {
            const textoRespuesta = await respuesta.text();
            let datos = {};
            try {
                datos = JSON.parse(textoRespuesta);
            } catch (e) {
                datos = { error: textoRespuesta };
            }
            alert("Error: " + (datos.error || "No se pudo cancelar la cita."));
        }
    } catch (error) {
        alert("Error de conexión al intentar cancelar la cita.");
    }
}

async function cargarAgendaMedico(idMedico) {
    const tabla = document.getElementById("tabla-agenda-medico");
    if (!tabla) return;
    try {
        const respuesta = await fetch(`${API_URL}/citas/todas`);
        const todasLasCitas = await respuesta.json();

        const misCitas = todasLasCitas.filter(c =>
            c.medico &&
            Number(c.medico.id) === Number(idMedico) &&
            c.estado === "EN_SALA_DE_ESPERA"
        );

        if (misCitas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted font-weight-bold">No tiene pacientes en consultorio en este momento. Los pacientes aparecerán aquí automáticamente en cuanto Enfermería tome sus signos vitales.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        misCitas.forEach(c => {
            let vitales = `<span class="badge bg-info text-dark font-monospace fs-6 px-2 py-1 shadow-sm">${c.observaciones || 'Triage tomado'}</span>`;
            let pacId = c.paciente ? c.paciente.id : null;
            let botonExpediente = pacId ?
                `<button onclick="verExpedientePaciente(${pacId})" class="btn btn-outline-primary btn-sm mb-1 font-weight-bold" title="Ver Historial">Ver Expediente</button><br>` : '';

            tabla.innerHTML += `
                <tr id="fila-medico-${c.id}">
                    <td><strong class="text-primary font-monospace">${c.fechaHora.replace('T', ' ')}</strong></td>
                    <td><strong class="fs-6">${c.paciente ? c.paciente.nombre : 'Anónimo'}</strong></td>
                    <td>
                        ${botonExpediente}
                        <span class="font-monospace text-muted">DPI: ${c.paciente ? c.paciente.dpi : 'N/A'}</span>
                    </td>
                    <td>${c.motivo}</td>
                    <td>${vitales}</td>
                    <td>
                        <button onclick="toggleFilaReceta(${c.id})" class="btn btn-success btn-sm font-weight-bold shadow-sm">
                             Atender y Recetar
                        </button>
                    </td>
                </tr>

                <tr id="caja-receta-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="6" class="p-3 border-bottom border-success shadow-inner">
                        <div class="card card-body border-success bg-white shadow-sm p-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="font-weight-bold text-success mb-0">Atención Clínica y Receta para: <span class="text-dark">${c.paciente ? c.paciente.nombre : ''}</span></h6>
                                <span class="badge bg-light text-info border font-monospace">${c.observaciones || ''}</span>
                            </div>
                            <div class="row g-2">
                                <div class="col-md-9">
                                    <label class="form-label small font-weight-bold mb-1">Escriba el Diagnóstico, Tratamiento y Medicamentos:</label>
                                    <textarea id="receta-${c.id}" class="form-control form-control-sm font-weight-bold" rows="2" placeholder="Ej: Amoxicilina 500mg cada 8 horas por 7 días. Tomar abundante agua y reposo absoluto."></textarea>
                                </div>
                                <div class="col-md-3 d-flex flex-column justify-content-end gap-2">
                                    <button onclick="guardarRecetaInline(${c.id}, '${c.paciente ? c.paciente.nombre : ''}')" class="btn btn-success btn-sm w-100 font-weight-bold shadow-sm">
                                         Guardar Receta y Finalizar
                                    </button>
                                    <button onclick="toggleFilaReceta(${c.id})" class="btn btn-outline-secondary btn-sm" title="Cancelar / Cerrar">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error al cargar su agenda médica.</td></tr>`;
    }
}

function toggleFilaReceta(citaId) {
    const filaFormulario = document.getElementById(`caja-receta-${citaId}`);
    if (filaFormulario.style.display === "none") {
        document.querySelectorAll("[id^='caja-receta-']").forEach(f => f.style.display = "none");
        filaFormulario.style.display = "table-row";
        document.getElementById(`receta-${citaId}`).focus();
    } else {
        filaFormulario.style.display = "none";
    }
}

async function guardarRecetaInline(citaId, nombrePaciente) {
    const recetaInput = document.getElementById(`receta-${citaId}`);
    const receta = recetaInput ? recetaInput.value.trim() : "";

    if (!receta) {
        alert("Por favor escribe las indicaciones médicas o medicamentos antes de finalizar la consulta.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/citas/atender/${citaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: receta })
        });

        if (respuesta.ok) {
            alert(`Consulta finalizada. El paciente pasa a estado ATENDIDA y sale de la cola activa.\n\nIndicaciones guardadas:\n"${receta}"`);
            if (miUsuarioActual) cargarAgendaMedico(miUsuarioActual.id);
        } else {
            alert("Error al guardar la receta en la base de datos.");
        }
    } catch (error) {
        alert("Error de conexión al intentar guardar la receta.");
    }
}

async function cargarTriageEnfermeria() {
    const tabla = document.getElementById("tabla-enfermeria");
    if (!tabla) return;
    try {
        const respuesta = await fetch(`${API_URL}/citas/todas`);
        const citas = await respuesta.json();

        const pendientes = citas.filter(c => c.estado !== "EN_SALA_DE_ESPERA" && c.estado !== "ATENDIDA" && c.estado !== "COMPLETADA" && c.estado !== "CANCELADA");

        if (pendientes.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted font-weight-bold">No hay pacientes pendientes de tomar signos vitales en la sala de espera.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        pendientes.forEach(c => {
            let pacId = c.paciente ? c.paciente.id : null;
            let botonExpediente = pacId ?
                `<button onclick="verExpedientePaciente(${pacId})" class="btn btn-outline-info btn-sm text-dark font-weight-bold mt-1" title="Ver Antecedentes">Ver Expediente</button>` : '';

            tabla.innerHTML += `
                <tr id="fila-paciente-${c.id}">
                    <td><strong>#${c.id}</strong></td>
                    <td><span class="font-monospace">${c.fechaHora.replace('T', ' ')}</span></td>
                    <td>
                        <strong class="text-dark fs-6">${c.paciente ? c.paciente.nombre : 'Anónimo'}</strong><br>
                        <small class="text-muted">DPI: ${c.paciente ? c.paciente.dpi : ''}</small><br>
                        ${botonExpediente}
                    </td>
                    <td><strong class="text-primary fs-6">${c.medico ? c.medico.nombre : 'Sin Asignar'}</strong></td>
                    <td><span class="badge bg-light text-dark border">${c.medico && c.medico.especialidad ? c.medico.especialidad : 'General'}</span></td>
                    <td><span class="badge bg-warning text-dark font-weight-bold px-2 py-1">Sin Signos (Pendiente)</span></td>
                    <td>
                        <button onclick="toggleFilaTriage(${c.id})" class="btn btn-info btn-sm text-dark font-weight-bold shadow-sm">
                             Tomar Signos
                        </button>
                    </td>
                </tr>
                
                <tr id="caja-triage-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="7" class="p-3 border-bottom border-info shadow-inner">
                        <div class="card card-body border-info bg-white shadow-sm p-3">
                            <h6 class="font-weight-bold text-info mb-3">Ingresar Signos Vitales para: <span class="text-dark">${c.paciente ? c.paciente.nombre : ''}</span></h6>
                            <div class="row g-2 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label small font-weight-bold mb-1">1. Presión Arterial</label>
                                    <input type="text" id="pa-${c.id}" class="form-control form-control-sm text-center font-monospace font-weight-bold" placeholder="Ej: 120/80">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small font-weight-bold mb-1">2. Temperatura (°C)</label>
                                    <input type="number" step="0.1" id="temp-${c.id}" class="form-control form-control-sm text-center font-monospace font-weight-bold" placeholder="Ej: 36.5">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small font-weight-bold mb-1">3. Pulso / Frecuencia (LPM)</label>
                                    <input type="number" id="pulso-${c.id}" class="form-control form-control-sm text-center font-monospace font-weight-bold" placeholder="Ej: 75">
                                </div>
                                <div class="col-md-3 d-flex gap-2">
                                    <button onclick="guardarTriageInline(${c.id}, '${c.paciente ? c.paciente.nombre : ''}')" class="btn btn-success btn-sm w-100 font-weight-bold shadow-sm">
                                        Guardar y Enviar al Médico
                                    </button>
                                    <button onclick="toggleFilaTriage(${c.id})" class="btn btn-outline-secondary btn-sm" title="Cancelar / Cerrar">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Error al conectar con la estación de enfermería.</td></tr>`;
    }
}

function toggleFilaTriage(citaId) {
    const filaFormulario = document.getElementById(`caja-triage-${citaId}`);
    if (filaFormulario.style.display === "none") {
        document.querySelectorAll("[id^='caja-triage-']").forEach(f => f.style.display = "none");
        filaFormulario.style.display = "table-row";
        document.getElementById(`pa-${citaId}`).focus();
    } else {
        filaFormulario.style.display = "none";
    }
}

async function guardarTriageInline(citaId, nombrePaciente) {
    const pA = document.getElementById(`pa-${citaId}`).value.trim();
    const temp = document.getElementById(`temp-${citaId}`).value.trim();
    const pulso = document.getElementById(`pulso-${citaId}`).value.trim();

    if (!pA || !temp || !pulso) {
        alert("Por favor completa los 3 signos vitales (Presión, Temperatura y Pulso) antes de enviar al médico.");
        return;
    }

    const textoTriage = `Triage: PA ${pA} | Temp ${temp}°C | Pulso ${pulso} lpm`;

    try {
        const respuesta = await fetch(`${API_URL}/citas/triage/${citaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: textoTriage })
        });

        if (respuesta.ok) {
            cargarTriageEnfermeria();
        } else {
            alert("Error en el servidor al intentar guardar el triage.");
        }
    } catch (error) {
        alert("Error de comunicación con el servidor de base de datos.");
        console.error(error);
    }
}

function verPestanaAdmin(idPestana, botonClickeado) {
    document.querySelectorAll(".admin-pestana").forEach(p => p.style.display = "none");
    document.querySelectorAll("#adminTabs .nav-link").forEach(b => b.classList.remove("active"));

    document.getElementById(idPestana).style.display = "block";
    botonClickeado.classList.add("active");

    if (idPestana === "panel-citas") cargarTodasLasCitasAdmin();
    if (idPestana === "panel-directorio") cargarUsuariosAdmin();
    if (idPestana === "panel-sucursales") cargarSucursalesAdmin();
}

async function cargarTodasLasCitasAdmin() {
    const tabla = document.getElementById("tabla-todas-citas");
    if (!tabla) return;
    try {
        const respuesta = await fetch(`${API_URL}/citas/todas`);
        const citas = await respuesta.json();

        if (citas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay citas médicas registradas en el hospital.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        citas.forEach(c => {
            let badge = "bg-primary";
            if (c.estado === "CANCELADA") badge = "bg-danger";
            if (c.estado === "ATENDIDA" || c.estado === "COMPLETADA") badge = "bg-success";
            if (c.estado === "EN_SALA_DE_ESPERA") badge = "bg-info text-dark font-weight-bold";

            let precio = c.medico && c.medico.precioConsulta ? `Q. ${c.medico.precioConsulta.toFixed(2)}` : "N/A";
            let esp = c.medico && c.medico.especialidad ? c.medico.especialidad : "General";

            tabla.innerHTML += `
                <tr>
                    <td><strong>#${c.id}</strong></td>
                    <td><span class="font-monospace">${c.fechaHora.replace('T', ' ')}</span></td>
                    <td><strong class="text-primary">${c.paciente ? c.paciente.nombre : 'Anónimo'}</strong><br><small class="text-muted">DPI: ${c.paciente ? c.paciente.dpi : ''}</small></td>
                    <td><strong class="text-success">${c.medico ? c.medico.nombre : 'Sin asignar'}</strong><br><small class="text-muted">${esp}</small></td>
                    <td><strong class="text-dark">${precio}</strong></td>
                    <td><span class="badge ${badge} px-2 py-1">${c.estado}</span></td>
                    <td>
                        ${c.estado !== "CANCELADA" ? `<button onclick="cancelarCitaPaciente(${c.id}); setTimeout(cargarTodasLasCitasAdmin, 500);" class="btn btn-outline-danger btn-sm">Cancelar</button>` : '<span class="text-muted small">---</span>'}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Error al cargar la lista maestra de citas</td></tr>`;
    }
}

async function crearPersonalAdmin(event) {
    if (event) event.preventDefault();

    const alertBox = document.getElementById("medico-alert");
    const btnGuardar = document.getElementById("btn-guardar-personal");
    if (alertBox) alertBox.style.display = "none";

    const telefono = document.getElementById("med-tel").value.trim();
    if (telefono.length !== 8 || isNaN(telefono)) {
        if (alertBox) {
            alertBox.className = "alert alert-warning font-weight-bold";
            alertBox.innerText = "El número de teléfono debe contener exactamente 8 dígitos numéricos.";
            alertBox.style.display = "block";
        } else {
            alert("El número de teléfono debe contener exactamente 8 dígitos numéricos.");
        }
        return;
    }

    const rolSeleccionado = document.getElementById("emp-rol").value;
    let especialidadVal = "";
    let precioVal = 0.0;

    const idSucursal = document.getElementById("reg-sucursal") ? document.getElementById("reg-sucursal").value : null;

    if (rolSeleccionado === "MEDIC") {
        especialidadVal = document.getElementById("med-esp").value;
        const precioInput = document.getElementById("med-precio").value;
        precioVal = precioInput ? parseFloat(precioInput) : 350.00;
    } else {
        especialidadVal = rolSeleccionado === "ENFERMERO" ? "Enfermero / Enfermera" : "Atención al Cliente / Caja";
        precioVal = 0.0;
    }

    const nuevoEmpleado = {
        nombre: document.getElementById("med-nombre").value.trim(),
        username: document.getElementById("med-user").value.trim(),
        password: document.getElementById("med-pass").value,
        email: document.getElementById("med-email").value.trim(),
        dpi: document.getElementById("med-dpi").value.trim(),
        telefono: telefono,
        especialidad: especialidadVal,
        precioConsulta: precioVal,
        nit: "CF",
        role: { nombre: rolSeleccionado },
        sucursal: idSucursal ? { id: parseInt(idSucursal) } : null
    };

    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = "Guardando...";
        }

        const respuesta = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoEmpleado)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            if (alertBox) {
                alertBox.className = "alert alert-success font-weight-bold";
                alertBox.innerText = `¡Personal registrado exitosamente como ${rolSeleccionado === 'ENFERMERO' ? 'Enfermero/a' : rolSeleccionado}!`;
                alertBox.style.display = "block";
            } else {
                alert(`¡Personal registrado exitosamente como ${rolSeleccionado}!`);
            }

            if (typeof registrarAuditoria === "function") {
                registrarAuditoria("CREACIÓN", `Se creó el usuario de personal: ${nuevoEmpleado.username} (${rolSeleccionado})`);
            }

            const formAlta = document.getElementById("form-alta-personal");
            if (formAlta) formAlta.reset();

            if (typeof cargarUsuariosAdmin === "function") cargarUsuariosAdmin();
        } else {
            if (alertBox) {
                alertBox.className = "alert alert-danger";
                alertBox.innerText = "Error al registrar: " + (datos.error || "El usuario, DPI o correo ya existen.");
                alertBox.style.display = "block";
            } else {
                alert("Error al registrar: " + (datos.error || "El usuario ya existe."));
            }
        }
    } catch (error) {
        if (alertBox) {
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "Error de conexión al intentar comunicarse con el servidor.";
            alertBox.style.display = "block";
        } else {
            alert("Error de conexión al intentar comunicarse con el servidor.");
        }
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = "Registrar Empleado en PostgreSQL";
        }
    }
}

async function cargarUsuariosAdmin() {
    const tabla = document.getElementById("tabla-usuarios-admin");
    if (!tabla) return;
    try {
        const respuesta = await fetch(`${API_URL}/users`);
        usuariosGlobales = await respuesta.json();
        usuariosFiltrados = [...usuariosGlobales];
        paginaActualUsuarios = 1;
        renderizarTablaUsuarios();
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error al cargar la tabla de usuarios</td></tr>`;
    }
}

function buscarUsuarios() {
    const campo = document.getElementById("filtro-campo").value;
    const texto = document.getElementById("filtro-texto").value.trim().toLowerCase();

    if (!texto) {
        usuariosFiltrados = [...usuariosGlobales];
    } else {
        usuariosFiltrados = usuariosGlobales.filter(u => {
            let valor = "";
            if (campo === "id") valor = String(u.id || "");
            if (campo === "nombre") valor = String(u.nombre || "").toLowerCase();
            if (campo === "email") valor = String(u.email || "").toLowerCase();
            if (campo === "rol") valor = u.role ? String(u.role.nombre || "").toLowerCase() : "";
            if (campo === "username") valor = String(u.username || "").toLowerCase();
            if (campo === "dpi") valor = String(u.dpi || "");
            return valor.includes(texto);
        });
    }
    paginaActualUsuarios = 1;
    renderizarTablaUsuarios();
}

function cambiarElementosPorPagina() {
    elementosPorPaginaUsuarios = parseInt(document.getElementById("elementos-por-pagina").value, 10);
    paginaActualUsuarios = 1;
    renderizarTablaUsuarios();
}

function cambiarPagina(delta) {
    const totalPaginas = Math.ceil(usuariosFiltrados.length / elementosPorPaginaUsuarios);
    paginaActualUsuarios += delta;
    if (paginaActualUsuarios < 1) paginaActualUsuarios = 1;
    if (paginaActualUsuarios > totalPaginas) paginaActualUsuarios = totalPaginas;
    renderizarTablaUsuarios();
}

function renderizarTablaUsuarios() {
    const tabla = document.getElementById("tabla-usuarios-admin");
    if (!tabla) return;
    const totalRegistros = usuariosFiltrados.length;

    if (totalRegistros === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron usuarios con ese criterio de búsqueda.</td></tr>`;
        document.getElementById("conteo-registros").innerText = "Mostrando 0 de 0 registros";
        document.getElementById("btn-prev-pag").disabled = true;
        document.getElementById("btn-next-pag").disabled = true;
        return;
    }

    const inicio = (paginaActualUsuarios - 1) * elementosPorPaginaUsuarios;
    const fin = Math.min(inicio + elementosPorPaginaUsuarios, totalRegistros);
    const usuariosPagina = usuariosFiltrados.slice(inicio, fin);

    tabla.innerHTML = "";
    usuariosPagina.forEach(u => {
        let colorRol = "bg-secondary";
        let rolNombre = u.role ? u.role.nombre.toUpperCase() : "GENERAL";

        if (rolNombre === "ADMIN") colorRol = "bg-danger";
        if (rolNombre === "PACIENTE") colorRol = "bg-success";
        if (rolNombre.includes("ENFERMER") || (u.especialidad && u.especialidad.includes("Enfermer"))) {
            rolNombre = "ENFERMERO/A";
            colorRol = "bg-info text-dark font-weight-bold";
        }
        if (rolNombre === "MEDIC" || rolNombre === "MEDICO") {
            rolNombre = "MÉDICO";
            colorRol = "bg-primary text-white";
        }
        if (rolNombre === "RECEPCION") colorRol = "bg-warning text-dark";

        let botonesAccion = u.username === miUsuarioActual?.username ?
            '<span class="badge bg-light text-muted border">Mi Cuenta</span>' :
            `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Acciones
                </button>
                <ul class="dropdown-menu shadow">
                    <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); toggleFilaEditarUsuario(${u.id})">Editar</a></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="event.preventDefault(); eliminarUsuario(${u.id}, '${u.nombre}')">Eliminar</a></li>
                </ul>
            </div>
            `;

        tabla.innerHTML += `
            <tr id="fila-user-${u.id}">
                <td><strong>#${u.id}</strong></td>
                <td><strong id="lbl-nom-${u.id}">${u.nombre || ''}</strong></td>
                <td><span class="font-monospace">${u.dpi || '---'}</span></td>
                <td><span class="font-monospace">${u.email || '---'}</span></td>
                <td><span class="badge ${colorRol}">${rolNombre}</span></td>
                <td><span class="font-monospace text-primary">${u.username || '---'}</span></td>
                <td>${u.cuentaBloqueada ? '<span class="badge bg-danger">BLOQUEADO</span>' : '<span class="badge bg-success">ACTIVO</span>'}</td>
                <td class="text-center">${botonesAccion}</td>
            </tr>

            <tr id="caja-editar-${u.id}" style="display: none;" class="bg-light">
                <td colspan="8" class="p-3 border-bottom border-primary shadow-inner">
                    <div class="card card-body border-primary bg-white shadow-sm p-3">
                        <h6 class="font-weight-bold text-primary mb-3">Modificando Datos de: <span class="text-dark">${u.nombre}</span> (DPI: ${u.dpi || 'N/A'})</h6>
                        <div class="row g-2 align-items-end">
                            <div class="col-md-3">
                                <label class="form-label small font-weight-bold mb-1">Nombre Completo</label>
                                <input type="text" id="edit-nom-${u.id}" class="form-control form-control-sm font-weight-bold" value="${u.nombre}">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small font-weight-bold mb-1">Teléfono (8 dígitos)</label>
                                <input type="text" id="edit-tel-${u.id}" class="form-control form-control-sm font-monospace" value="${u.telefono || ''}" maxlength="8">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small font-weight-bold mb-1">Correo Electrónico</label>
                                <input type="email" id="edit-email-${u.id}" class="form-control form-control-sm" value="${u.email || ''}">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small font-weight-bold mb-1">Especialidad / Puesto</label>
                                <input type="text" id="edit-esp-${u.id}" class="form-control form-control-sm text-primary font-weight-bold" value="${u.especialidad || ''}">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small font-weight-bold mb-1">Precio Consulta (Q.)</label>
                                <input type="number" step="0.01" id="edit-pre-${u.id}" class="form-control form-control-sm text-success font-weight-bold" value="${u.precioConsulta || 0.0}">
                            </div>
                            <div class="col-12 d-flex justify-content-end gap-2 mt-3">
                                <button onclick="toggleFilaEditarUsuario(${u.id})" class="btn btn-outline-secondary btn-sm px-3">Cancelar</button>
                                <button onclick="guardarEdicionUsuario(${u.id}, '${u.nombre}')" class="btn btn-primary btn-sm font-weight-bold px-4 shadow-sm">
                                    Guardar Cambios en PostgreSQL
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    document.getElementById("conteo-registros").innerText = `Mostrando ${inicio + 1} a ${fin} de ${totalRegistros} registros`;
    document.getElementById("btn-prev-pag").disabled = (paginaActualUsuarios <= 1);
    document.getElementById("btn-next-pag").disabled = (fin >= totalRegistros);
}

function toggleFilaEditarUsuario(idUsuario) {
    const filaEdicion = document.getElementById(`caja-editar-${idUsuario}`);
    if (filaEdicion.style.display === "none") {
        document.querySelectorAll("[id^='caja-editar-']").forEach(f => f.style.display = "none");
        filaEdicion.style.display = "table-row";
        document.getElementById(`edit-nom-${idUsuario}`).focus();
    } else {
        filaEdicion.style.display = "none";
    }
}

async function guardarEdicionUsuario(idUsuario, nombreAntiguo) {
    console.log("1. Botón presionado. Intentando guardar ID:", idUsuario);

    try {
        const nomInput = document.getElementById(`edit-nom-${idUsuario}`);
        if (!nomInput) {
            console.error("No se encontró la caja de texto edit-nom-" + idUsuario);
            alert("Error en la interfaz: No se encontraron los campos. Por favor recarga la página (Ctrl + F5).");
            return;
        }

        const nomVal = nomInput.value.trim();
        const telVal = document.getElementById(`edit-tel-${idUsuario}`).value.trim();
        const emailVal = document.getElementById(`edit-email-${idUsuario}`).value.trim();
        const espVal = document.getElementById(`edit-esp-${idUsuario}`).value.trim();
        const preVal = parseFloat(document.getElementById(`edit-pre-${idUsuario}`).value) || 0.0;

        if (!nomVal) {
            alert("El nombre del usuario no puede quedar vacío.");
            return;
        }

        const datosEditados = {
            nombre: nomVal,
            telefono: telVal || "00000000",
            email: emailVal,
            especialidad: espVal,
            precioConsulta: preVal
        };

        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosEditados)
        });

        if (respuesta.ok) {
            alert(`Los datos de "${nomVal}" han sido actualizados exitosamente en PostgreSQL.`);

            try {
                if (typeof registrarAuditoria === "function") {
                    registrarAuditoria("ACTUALIZACIÓN", `Se modificó el perfil del usuario ID #${idUsuario}.`);
                }
            } catch (errorAuditoria) {
                console.warn("El usuario se guardó, pero hubo un problema al registrar la auditoría:", errorAuditoria);
            }

            cargarUsuariosAdmin();
        } else {
            alert("Error en el servidor al modificar. Java rechazó los datos (Código " + respuesta.status + ").");
        }
    } catch (error) {
        console.error("Error crítico en JavaScript:", error);
        alert("Fallo de conexión crítico. Revisa la consola F12.");
    }
}

async function eliminarUsuario(idUsuario, nombreUsuario) {
    if (!confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente a:\n\n "${nombreUsuario}"?\n\nEsta acción borrará su acceso del hospital.`)) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, {
            method: "DELETE"
        });

        if (respuesta.ok) {
            alert(`El usuario "${nombreUsuario}" ha sido eliminado de PostgreSQL.`);
            if (typeof registrarAuditoria === "function") {
                registrarAuditoria("ELIMINACIÓN", `Se eliminó permanentemente del hospital al usuario ID #${idUsuario} (${nombreUsuario})`);
            }
            cargarUsuariosAdmin();
        } else {
            const datos = await respuesta.json().catch(() => ({}));
            alert("No se pudo eliminar: " + (datos.error || "Es probable que este usuario tenga citas o historiales médicos asociados y el sistema lo proteja."));
        }
    } catch (error) {
        alert("Error de comunicación con el servidor al intentar eliminar.");
    }
}

async function verExpedientePaciente(pacienteId) {
    const contenedor = document.getElementById("exp-contenido");
    const modalElement = document.getElementById('modalExpediente');

    if (!modalElement) {
        alert("Error: No se encontró el componente del modal en el HTML. Asegúrate de haber actualizado también el archivo index.html.");
        return;
    }

    const modal = new bootstrap.Modal(modalElement);

    contenedor.innerHTML = `<p class="text-center text-muted py-3">Consultando expediente en PostgreSQL...</p>`;
    modal.show();

    try {
        const respuesta = await fetch(`${API_URL}/expedientes/paciente/${pacienteId}`);

        if (!respuesta.ok) {
            contenedor.innerHTML = `
                <div class="alert alert-warning text-center m-0">
                     Este paciente aún no cuenta con un expediente clínico registrado en la base de datos del hospital.
                </div>`;
            return;
        }

        const exp = await respuesta.json();

        contenedor.innerHTML = `
            <div class="border-bottom pb-2 mb-3 text-center">
                <h4 class="text-primary font-monospace mb-0">${exp.numeroExpediente || 'Sin número'}</h4>
                <small class="text-muted">ID de Registro Hospitalario: #${exp.id}</small>
            </div>
            <p class="mb-2"><strong>Tipo de Sangre:</strong> <span class="badge bg-danger fs-6">${exp.tipoSangre || 'No registrado'}</span></p>
            <p class="mb-2"><strong>Alergias Conocidas:</strong> <span class="text-dark">${exp.alergias || 'Ninguna'}</span></p>
            <p class="mb-2"><strong>Antecedentes Médicos:</strong> <br><span class="text-muted">${exp.antecedentesMedicos || 'Sin antecedentes relevantes'}</span></p>
            <hr>
            <p class="mb-0 text-danger"><strong>Contacto de Emergencia:</strong> <br><span>${exp.contactoEmergencia || 'No especificado'}</span></p>
        `;
    } catch (error) {
        console.error("Error al obtener el expediente:", error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error de red al intentar conectar con el endpoint del expediente.</div>`;
    }
}

function cambiarVista(idVista) {
    document.querySelectorAll(".section-view").forEach(v => v.style.display = "none");
    const vista = document.getElementById(idVista);
    if (vista) vista.style.display = "block";
}

function logout() {
    miUsuarioActual = null;
    miPacienteId = null;
    miUsername = null;
    document.getElementById("nav-actions").style.display = "none";
    document.getElementById("input-dpi-check").value = "";
    if (document.getElementById("login-password")) document.getElementById("login-password").value = "";
    cambiarVista("view-dpi");
}

function generarUsuarioAutomatico(idInputNombre, idInputDpi, idInputDestino) {
    const nombreVal = document.getElementById(idInputNombre).value.trim().toLowerCase();
    const dpiVal = document.getElementById(idInputDpi).value.trim();
    const campoDestino = document.getElementById(idInputDestino);

    if (!nombreVal) {
        campoDestino.value = "";
        return;
    }

    const textoLimpio = nombreVal.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabras = textoLimpio.split(/\s+/);

    let usuarioCalculado = "";

    if (palabras.length >= 2) {
        usuarioCalculado = palabras[0].charAt(0) + palabras[1];
    } else {
        usuarioCalculado = palabras[0];
    }

    if (dpiVal && dpiVal.length >= 4) {
        usuarioCalculado += dpiVal.slice(-4);
    } else {
        usuarioCalculado += Math.floor(100 + Math.random() * 900);
    }

    campoDestino.value = usuarioCalculado;
}

async function registrarAuditoria(accionRealizada, detalleCambio) {
    const usuarioEjecutor = miUsuarioActual ? miUsuarioActual.usuario : "SISTEMA / REGISTRO PÚBLICO";
    const fechaHoraActual = new Date().toISOString();

    const logAuditoria = {
        accion: accionRealizada,
        detalle: detalleCambio,
        usuarioEjecutor: usuarioEjecutor,
        fechaHora: fechaHoraActual
    };

    try {
        await fetch(`${API_URL}/auditoria`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logAuditoria)
        });
    } catch (error) {
        console.error("Fallo de red al intentar enviar el registro de auditoría:", error);
    }
}

// ==========================================
// MÓDULO DE SUCURSALES Y CASCADAS (UNIFICADO)
// ==========================================

async function cargarSucursalesAdmin() {
    const tabla = document.getElementById("tabla-sucursales-listado");
    const selectAlta = document.getElementById("reg-sucursal");

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`);
        listaGlobalSucursalesAdmin = await respuesta.json();

        if (selectAlta) {
            selectAlta.innerHTML = '<option value="">Seleccione una sucursal física...</option>';
            listaGlobalSucursalesAdmin.forEach(s => {
                selectAlta.innerHTML += `<option value="${s.id}">${s.nombre} - ${s.direccion}</option>`;
            });
        }

        if (tabla) {
            tabla.innerHTML = "";
            listaGlobalSucursalesAdmin.forEach(s => {
                const especialidadesBadge = (s.especialidades && s.especialidades.length > 0) ?
                    s.especialidades.map(e => `<span class="badge bg-primary me-1">${e}</span>`).join("") :
                    '<span class="text-muted small">Ninguna registrada</span>';

                tabla.innerHTML += `
                    <tr>
                        <td><strong>#${s.id}</strong></td>
                        <td class="font-weight-bold">${s.nombre}</td>
                        <td>${s.direccion}</td>
                        <td>${especialidadesBadge}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        if (tabla) tabla.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Error al conectar con PostgreSQL</td></tr>`;
    }
}

function filtrarEspecialidadesPorSucursalAdmin() {
    const idSucursal = document.getElementById("reg-sucursal").value;
    const selEsp = document.getElementById("med-esp");
    const rol = document.getElementById("emp-rol").value;

    if (rol !== "MEDIC") return;

    if (!idSucursal) {
        selEsp.innerHTML = '<option value="">Primero seleccione una sucursal arriba</option>';
        selEsp.disabled = true;
        return;
    }

    const sucursalSelec = listaGlobalSucursalesAdmin.find(s => s.id == idSucursal);
    selEsp.innerHTML = '<option value="">Seleccione especialidad médica...</option>';

    if (sucursalSelec && sucursalSelec.especialidades && sucursalSelec.especialidades.length > 0) {
        sucursalSelec.especialidades.forEach(e => {
            selEsp.innerHTML += `<option value="${e}">${e}</option>`;
        });
        selEsp.disabled = false;
    } else {
        selEsp.innerHTML = '<option value="">Esta sucursal no tiene especialidades registradas</option>';
        selEsp.disabled = true;
    }
}

async function guardarNuevaSucursal() {
    const nombre = document.getElementById("nueva-suc-nombre").value.trim();
    const direccion = document.getElementById("nueva-suc-dir").value.trim();

    const casillasMarcadas = document.querySelectorAll("#contenedor-esp-sucursal .chk-esp:checked");
    const listaEspecialidades = Array.from(casillasMarcadas).map(casilla => casilla.value);

    if (!nombre || !direccion) {
        alert("Atención: Debe ingresar el nombre y la dirección de la sucursal.");
        return;
    }

    if (listaEspecialidades.length === 0) {
        alert("Atención: Debe seleccionar al menos una especialidad médica en las casillas antes de guardar.");
        return;
    }

    const payload = {
        nombre: nombre,
        direccion: direccion,
        especialidades: listaEspecialidades
    };

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (respuesta.ok) {
            alert("La sucursal y sus especialidades fueron guardadas con éxito en PostgreSQL.");
            document.getElementById("nueva-suc-nombre").value = "";
            document.getElementById("nueva-suc-dir").value = "";
            document.querySelectorAll(".chk-esp").forEach(casilla => casilla.checked = false);

            if (typeof cargarSucursalesAdmin === "function") {
                cargarSucursalesAdmin();
            }
        } else {
            const mensajeError = await respuesta.text();
            alert("El servidor rechazó los datos. Código de error: " + respuesta.status + " - " + mensajeError);
        }
    } catch (error) {
        alert("Fallo de comunicación con el servidor. Verifique que Spring Boot esté en ejecución.");
    }
}

function agregarEspecialidadAlMenu() {
    const inputNueva = document.getElementById("input-nueva-especialidad");
    const nombreEspecialidad = inputNueva.value.trim();

    if (!nombreEspecialidad) {
        alert("Por favor escriba el nombre de la nueva especialidad médica.");
        return;
    }

    const contenedor = document.getElementById("contenedor-esp-sucursal");

    const existentes = Array.from(contenedor.querySelectorAll(".chk-esp")).map(chk => chk.value.toLowerCase());
    if (existentes.includes(nombreEspecialidad.toLowerCase())) {
        alert("Esa especialidad ya se encuentra en la lista de opciones.");
        inputNueva.value = "";
        return;
    }

    const idUnico = "esp-custom-" + Date.now();

    const nuevoDiv = document.createElement("div");
    nuevoDiv.className = "col-md-3";
    nuevoDiv.innerHTML = `
        <div class="form-check">
            <input class="form-check-input chk-esp" type="checkbox" value="${nombreEspecialidad}" id="${idUnico}" checked>
            <label class="form-check-label font-weight-bold text-success" for="${idUnico}">${nombreEspecialidad}</label>
        </div>
    `;

    contenedor.appendChild(nuevoDiv);
    inputNueva.value = "";
}

async function cargarSucursalesPaciente() {
    const selectSucursal = document.getElementById("cita-sucursal") || document.getElementById("select-sucursal");
    if (!selectSucursal) return;

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`);
        listaSucursales = await respuesta.json();

        selectSucursal.innerHTML = '<option value="">Seleccione una ubicación...</option>';
        listaSucursales.forEach(sucursal => {
            selectSucursal.innerHTML += `<option value="${sucursal.id}">${sucursal.nombre} - ${sucursal.direccion}</option>`;
        });
    } catch (error) {
        selectSucursal.innerHTML = '<option value="">Error al cargar sucursales</option>';
        console.error("Error al obtener sucursales para el paciente:", error);
    }
}

function cargarEspecialidadesCascada() {
    const selectSucursal = document.getElementById("cita-sucursal") || document.getElementById("select-sucursal");
    const idSucursal = selectSucursal?.value;
    const selectEspecialidad = document.getElementById("cita-especialidad") || document.getElementById("select-especialidad");
    const selectMedico = document.getElementById("cita-medico") || document.getElementById("select-medico-cita");
    const etiquetaDireccion = document.getElementById("lbl-direccion");

    if (selectMedico) {
        selectMedico.innerHTML = '<option value="">Esperando fecha y hora...</option>';
        selectMedico.disabled = true;
    }

    if (!idSucursal) {
        if (etiquetaDireccion) etiquetaDireccion.innerText = "";
        if (selectEspecialidad) {
            selectEspecialidad.innerHTML = '<option value="">Primero seleccione sucursal</option>';
            selectEspecialidad.disabled = true;
        }
        return;
    }

    const sucursalSeleccionada = listaSucursales.find(s => s.id == idSucursal);

    if (sucursalSeleccionada && etiquetaDireccion) {
        etiquetaDireccion.innerText = "Dirección: " + sucursalSeleccionada.direccion;
    }

    if (selectEspecialidad) {
        selectEspecialidad.innerHTML = '<option value="">Seleccione especialidad...</option>';

        if (sucursalSeleccionada && sucursalSeleccionada.especialidades && sucursalSeleccionada.especialidades.length > 0) {
            sucursalSeleccionada.especialidades.forEach(esp => {
                selectEspecialidad.innerHTML += `<option value="${esp}">${esp}</option>`;
            });
            selectEspecialidad.disabled = false;
        } else {
            selectEspecialidad.innerHTML = '<option value="">Esta sede no tiene especialidades disponibles</option>';
            selectEspecialidad.disabled = true;
        }
    }
}

async function cargarMedicosCascada() {
    const selectSucursal = document.getElementById("cita-sucursal") || document.getElementById("select-sucursal");
    const idSucursal = selectSucursal?.value;
    const selectEspecialidad = document.getElementById("cita-especialidad") || document.getElementById("select-especialidad");
    const especialidad = selectEspecialidad?.value;
    const selectMedico = document.getElementById("cita-medico") || document.getElementById("select-medico-cita");

    if (!selectMedico) return;

    selectMedico.innerHTML = '<option value="">Cargando médicos...</option>';
    selectMedico.disabled = true;

    if (!especialidad || !idSucursal) {
        selectMedico.innerHTML = '<option value="">Primero seleccione especialidad</option>';
        return;
    }

    try {
        const espCodificada = encodeURIComponent(especialidad);
        const url = `${API_URL}/users/sucursal/${idSucursal}/especialidad/${espCodificada}`;
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("El servidor rechazó la búsqueda de médicos. Código: " + respuesta.status);
        }

        const medicos = await respuesta.json();

        selectMedico.innerHTML = '<option value="">Seleccione un médico disponible...</option>';

        if (medicos && medicos.length > 0) {
            medicos.forEach(med => {
                const precio = med.precioConsulta ? ` (Q. ${med.precioConsulta})` : '';
                selectMedico.innerHTML += `<option value="${med.id}">Dr(a). ${med.nombre}${precio}</option>`;
            });
            selectMedico.disabled = false;
        } else {
            selectMedico.innerHTML = '<option value="">No hay médicos asignados a esta especialidad en esta sede</option>';
            selectMedico.disabled = true;
        }
    } catch (error) {
        console.error("Error al cargar la cascada de médicos:", error);
        selectMedico.innerHTML = '<option value="">Error al cargar la lista de médicos</option>';
    }
}

// AUTOMATIZACIÓN DE ASIGNACIÓN AL CAMBIAR FECHA Y HORA
document.addEventListener("DOMContentLoaded", function() {
    const inputFechaHora = document.getElementById("cita-fecha");

    if (inputFechaHora) {
        inputFechaHora.addEventListener("change", async function() {
            const selectSucursal = document.getElementById("cita-sucursal") || document.getElementById("select-sucursal");
            const sucursalId = selectSucursal?.value;
            const selectEspecialidad = document.getElementById("cita-especialidad") || document.getElementById("select-especialidad");
            const especialidad = selectEspecialidad?.value;
            const fechaHoraVal = this.value;
            const selectMedico = document.getElementById("cita-medico") || document.getElementById("select-medico-cita");

            if (!sucursalId || !especialidad || !fechaHoraVal) {
                return;
            }

            if (selectMedico) {
                selectMedico.innerHTML = '<option value="">Buscando médico en el sistema...</option>';
                selectMedico.disabled = true;
            }

            try {
                const url = `${API_URL}/users/asignacion-automatica?sucursalId=${sucursalId}&especialidad=${encodeURIComponent(especialidad)}&fechaHora=${encodeURIComponent(fechaHoraVal)}`;
                const resp = await fetch(url);
                const data = await resp.json();

                if (resp.ok) {
                    if (selectMedico) {
                        selectMedico.innerHTML = `<option value="${data.id}" selected>Asignado automáticamente: Dr(a). ${data.nombre}</option>`;
                        selectMedico.disabled = true;
                    }
                } else {
                    alert(data.error || "No hay médicos disponibles en este horario o especialidad.");
                    if (selectMedico) {
                        selectMedico.innerHTML = '<option value="">Sin médicos disponibles</option>';
                    }
                    this.value = "";
                }
            } catch (error) {
                console.error("Error al buscar disponibilidad automática:", error);
                if (selectMedico) {
                    selectMedico.innerHTML = '<option value="">Error al consultar al servidor</option>';
                }
            }
        });
    }
});