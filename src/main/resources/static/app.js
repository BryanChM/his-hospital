const API_URL = "/api";
let miUsuarioActual = null;
let miPacienteId = null;
let miUsername = null;

// =========================================================================
// PASO 1: VERIFICAR DPI EN EL HOSPITAL (CU-01 / CU-02)
// =========================================================================
async function verificarDpi() {
    const dpiInput = document.getElementById("input-dpi-check").value.trim();
    const alertBox = document.getElementById("dpi-alert");
    alertBox.style.display = "none";

    if (dpiInput.length !== 13 || isNaN(dpiInput)) {
        alertBox.className = "alert alert-warning font-weight-bold";
        alertBox.innerText = "⚠️ Por favor ingrese un número de DPI válido de exactamente 13 dígitos numéricos.";
        alertBox.style.display = "block";
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
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "❌ Error inesperado en el servidor al consultar la base de datos.";
            alertBox.style.display = "block";
        }
    } catch (error) {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "❌ No se pudo conectar con el endpoint /api/users/dpi. Revisa la consola del navegador (F12).";
        alertBox.style.display = "block";
        console.error("Error detallado:", error);
    }
}

// =========================================================================
// PASO 2A: LOGIN Y ENRUTADOR INTELIGENTE POR 4 ROLES
// =========================================================================
async function procesarLogin() {
    const usernameInput = document.getElementById("login-username").value.trim();
    const passwordInput = document.getElementById("login-password").value;
    const alertBox = document.getElementById("login-alert");
    alertBox.style.display = "none";

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
            document.getElementById("user-display").innerText = `👤 ${datos.usuario} [${datos.rol}]`;

            const rol = datos.rol ? datos.rol.toUpperCase() : "";

            // 1. PORTAL DE ENFERMERÍA / TRIAGE
            if (rol.includes("ENFERMER") || rol === "TRIAGE") {
                cambiarVista("view-dashboard-enfermeria");
                cargarTriageEnfermeria();
            }
            // 2. PORTAL DEL PACIENTE
            else if (rol === "PACIENTE") {
                cambiarVista("view-dashboard-paciente");
                cargarCitasDePacienteLogueado(usernameInput);
            }
            // 3. PORTAL DEL MÉDICO
            else if (rol === "MEDIC" || rol === "MEDICO") {
                cambiarVista("view-dashboard-medico");
                cargarAgendaMedico(datos.id);
            }
            // 4. PORTAL ADMINISTRADOR / RECEPCIÓN
            else {
                cambiarVista("view-dashboard-admin");
                cargarTodasLasCitasAdmin();
            }
        } else {
            alertBox.innerText = datos.error || "Credenciales incorrectas.";
            alertBox.style.display = "block";
        }
    } catch (error) {
        alertBox.innerText = "Error de comunicación con el servidor al intentar iniciar sesión.";
        alertBox.style.display = "block";
        console.error(error);
    }
}

// =========================================================================
// PASO 2B: REGISTRAR EXPEDIENTE NUEVO (PACIENTE)
// =========================================================================
async function procesarRegistro() {
    const alertBox = document.getElementById("reg-alert");
    alertBox.style.display = "none";

    const telefono = document.getElementById("reg-tel").value.trim();
    if (telefono.length !== 8 || isNaN(telefono)) {
        alertBox.className = "alert alert-warning font-weight-bold";
        alertBox.innerText = "⚠️ El número de teléfono debe contener exactly 8 dígitos numéricos.";
        alertBox.style.display = "block";
        return;
    }

    const especialidadVal = document.getElementById("reg-esp").value;

    const nuevoUsuario = {
        nombre: document.getElementById("reg-nombre").value.trim(),
        username: document.getElementById("reg-username").value.trim(),
        password: document.getElementById("reg-password").value,
        email: document.getElementById("reg-email").value.trim(),
        dpi: document.getElementById("reg-dpi").value.trim(),
        telefono: telefono,
        especialidad: especialidadVal,
        nit: "CF"
    };

    try {
        const respuesta = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoUsuario)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alertBox.className = "alert alert-success font-weight-bold";
            alertBox.innerText = "✅ ¡Expediente creado con éxito! Redireccionando al login...";
            alertBox.style.display = "block";

            setTimeout(() => {
                document.getElementById("login-nombre-user").innerText = nuevoUsuario.nombre;
                document.getElementById("login-rol-badge").innerText = "PACIENTE";
                document.getElementById("login-username").value = nuevoUsuario.username;
                cambiarVista("view-login");
            }, 1800);
        } else {
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "❌ " + (datos.error || "Error al registrar expediente.");
            alertBox.style.display = "block";
        }
    } catch (error) {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "Error de conexión al intentar registrar.";
        alertBox.style.display = "block";
    }
}

// =========================================================================
// PORTAL 1: ÁREA DE PACIENTES (CITAS MÉDICAS Y RECETAS)
// =========================================================================
async function cargarCitasDePacienteLogueado(username) {
    miUsername = username;
    const contenedor = document.getElementById("lista-citas-paciente");
    const selectMedico = document.getElementById("cita-medico");

    try {
        const respUser = await fetch(`${API_URL}/users`);
        const todos = await respUser.json();
        const yo = todos.find(u => u.username === username);

        if (!yo) return;
        miPacienteId = yo.id;

        selectMedico.innerHTML = '<option value="">-- Seleccione un Médico Especialista --</option>';
        todos.forEach(u => {
            let esMedico = (u.role && (u.role.nombre === "MEDIC" || u.role.nombre === "MEDICO")) ||
                (u.especialidad && u.especialidad !== "" && !u.especialidad.includes("Enfermer") && !u.especialidad.includes("Caja")) ||
                (u.nombre.startsWith("Dr.") || u.nombre.startsWith("Dra."));

            if (esMedico && u.id !== yo.id) {
                let textoEspecialidad = u.especialidad ? ` - ${u.especialidad}` : " - Medicina General";
                let textoPrecio = u.precioConsulta ? ` [Q. ${u.precioConsulta.toFixed(2)}]` : "";
                selectMedico.innerHTML += `<option value="${u.id}">${u.nombre}${textoEspecialidad}${textoPrecio}</option>`;
            }
        });

        renderizarMisCitas();
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar médicos disponibles.</div>`;
    }
}

async function renderizarMisCitas() {
    if (!miPacienteId) return;
    const contenedor = document.getElementById("lista-citas-paciente");

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
                        ❌ Cancelar Cita
                    </button>
                `;
            }

            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3">
                    <div>
                        <h6 class="mb-1 font-weight-bold text-primary">🩺 Consulta con: ${c.medico ? c.medico.nombre : 'Médico Asignado'}</h6>
                        <p class="mb-1"><strong>Motivo:</strong> ${c.motivo}</p>
                        ${c.observaciones ? `<p class="mb-1 text-dark"><small>💡 <strong>Obs / Diagnóstico:</strong> <em>${c.observaciones}</em></small></p>` : ''}
                        <small class="text-secondary">🕒 <strong>Fecha programada:</strong> ${c.fechaHora.replace('T', ' a las ')} horas</small>
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

async function agendarCitaPaciente() {
    const alertBox = document.getElementById("cita-alert");
    alertBox.style.display = "none";

    const medicoId = document.getElementById("cita-medico").value;
    let fechaVal = document.getElementById("cita-fecha").value;
    const motivo = document.getElementById("cita-motivo").value.trim();
    const obs = document.getElementById("cita-obs").value.trim();

    if (!medicoId || !fechaVal || !motivo) {
        alertBox.className = "alert alert-warning";
        alertBox.innerText = "⚠️ Por favor complete el médico, la fecha y el motivo de la consulta.";
        alertBox.style.display = "block";
        return;
    }

    if (fechaVal.length === 16) fechaVal += ":00";

    const nuevaCita = {
        pacienteId: miPacienteId,
        medicoId: parseInt(medicoId),
        fechaHora: fechaVal,
        motivo: motivo,
        observaciones: obs
    };

    try {
        const respuesta = await fetch(`${API_URL}/citas/agendar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevaCita)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alertBox.className = "alert alert-success";
            alertBox.innerText = "✅ " + (datos.mensaje || "Cita agendada exitosamente.");
            alertBox.style.display = "block";

            document.getElementById("cita-motivo").value = "";
            document.getElementById("cita-obs").value = "";
            document.getElementById("cita-fecha").value = "";

            renderizarMisCitas();
        } else {
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "❌ " + (datos.error || "El médico o el paciente ya tienen un compromiso en este horario.");
            alertBox.style.display = "block";
        }
    } catch (error) {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "Error de conexión al intentar agendar la cita.";
        alertBox.style.display = "block";
    }
}

async function cancelarCitaPaciente(citaId) {
    if (!confirm("¿Está seguro de que desea cancelar esta cita médica?")) return;

    try {
        const respuesta = await fetch(`${API_URL}/citas/cancelar/${citaId}`, {
            method: "PUT"
        });
        if (respuesta.ok) {
            alert("✅ La cita ha sido cancelada exitosamente.");
            renderizarMisCitas();
        } else {
            const datos = await respuesta.json();
            alert("❌ Error: " + (datos.error || "No se pudo cancelar."));
        }
    } catch (error) {
        alert("Error de conexión al intentar cancelar.");
    }
}

// =========================================================================
// PORTAL 2: MÉDICO ESPECIALISTA (Menú en línea para redactar recetas)
// =========================================================================
async function cargarAgendaMedico(idMedico) {
    const tabla = document.getElementById("tabla-agenda-medico");
    try {
        const respuesta = await fetch(`${API_URL}/citas/todas`);
        const todasLasCitas = await respuesta.json();

        // BLINDAJE POR ESTADO: El médico SÓLO ve citas en estado "EN_SALA_DE_ESPERA" asignadas a él
        const misCitas = todasLasCitas.filter(c =>
            c.medico &&
            Number(c.medico.id) === Number(idMedico) &&
            c.estado === "EN_SALA_DE_ESPERA"
        );

        if (misCitas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted font-weight-bold">⏳ No tiene pacientes en consultorio en este momento. Los pacientes aparecerán aquí automáticamente en cuanto Enfermería tome sus signos vitales.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        misCitas.forEach(c => {
            let vitales = `<span class="badge bg-info text-dark font-monospace fs-6 px-2 py-1 shadow-sm">${c.observaciones || 'Triage tomado'}</span>`;
            let pacId = c.paciente ? c.paciente.id : null;
            let botonExpediente = pacId ?
                `<button onclick="verExpedientePaciente(${pacId})" class="btn btn-outline-primary btn-sm mb-1 font-weight-bold" title="Ver Historial">📋 Ver Expediente</button><br>` : '';

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
                            🩺 Atender y Recetar
                        </button>
                    </td>
                </tr>

                <!-- FILA DESPLEGABLE PARA LA RECETA MÉDICA -->
                <tr id="caja-receta-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="6" class="p-3 border-bottom border-success shadow-inner">
                        <div class="card card-body border-success bg-white shadow-sm p-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="font-weight-bold text-success mb-0">🩺 Atención Clínica y Receta para: <span class="text-dark">${c.paciente ? c.paciente.nombre : ''}</span></h6>
                                <span class="badge bg-light text-info border font-monospace">${c.observaciones || ''}</span>
                            </div>
                            <div class="row g-2">
                                <div class="col-md-9">
                                    <label class="form-label small font-weight-bold mb-1">Escriba el Diagnóstico, Tratamiento y Medicamentos:</label>
                                    <textarea id="receta-${c.id}" class="form-control form-control-sm font-weight-bold" rows="2" placeholder="Ej: Amoxicilina 500mg cada 8 horas por 7 días. Tomar abundante agua y reposo absoluto."></textarea>
                                </div>
                                <div class="col-md-3 d-flex flex-column justify-content-end gap-2">
                                    <button onclick="guardarRecetaInline(${c.id}, '${c.paciente ? c.paciente.nombre : ''}')" class="btn btn-success btn-sm w-100 font-weight-bold shadow-sm">
                                        💾 Guardar Receta y Finalizar
                                    </button>
                                    <button onclick="toggleFilaReceta(${c.id})" class="btn btn-outline-secondary btn-sm" title="Cancelar / Cerrar">❌ Cancelar</button>
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
        alert("⚠️ Por favor escribe las indicaciones médicas o medicamentos antes de finalizar la consulta.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/citas/atender/${citaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: receta })
        });

        if (respuesta.ok) {
            alert(`✅ Consulta finalizada. El paciente pasa a estado ATENDIDA y sale de la cola activa.\n\nIndicaciones guardadas:\n"${receta}"`);
            if (miUsuarioActual) cargarAgendaMedico(miUsuarioActual.id);
        } else {
            alert("❌ Error al guardar la receta en la base de datos.");
        }
    } catch (error) {
        alert("Error de conexión al intentar guardar la receta.");
    }
}

// =========================================================================
// PORTAL 3: ENFERMERÍA / TRIAGE (Ve pendientes y abre menú desplegable)
// =========================================================================
async function cargarTriageEnfermeria() {
    const tabla = document.getElementById("tabla-enfermeria");
    try {
        const respuesta = await fetch(`${API_URL}/citas/todas`);
        const citas = await respuesta.json();

        // BLINDAJE POR ESTADO: Si ya está EN_SALA_DE_ESPERA, ATENDIDA o COMPLETADA, jamás volverá a aparecer aquí
        const pendientes = citas.filter(c => c.estado !== "EN_SALA_DE_ESPERA" && c.estado !== "ATENDIDA" && c.estado !== "COMPLETADA" && c.estado !== "CANCELADA");

        if (pendientes.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted font-weight-bold">✅ No hay pacientes pendientes de tomar signos vitales en la sala de espera.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        pendientes.forEach(c => {
            let pacId = c.paciente ? c.paciente.id : null;
            let botonExpediente = pacId ?
                `<button onclick="verExpedientePaciente(${pacId})" class="btn btn-outline-info btn-sm text-dark font-weight-bold mt-1" title="Ver Antecedentes">📋 Ver Expediente</button>` : '';

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
                    <td><span class="badge bg-warning text-dark font-weight-bold px-2 py-1">⚠️ Sin Signos (Pendiente)</span></td>
                    <td>
                        <button onclick="toggleFilaTriage(${c.id})" class="btn btn-info btn-sm text-dark font-weight-bold shadow-sm">
                            💓 Tomar Signos
                        </button>
                    </td>
                </tr>
                
                <!-- FILA DESPLEGABLE DE TRIAGE EN LÍNEA -->
                <tr id="caja-triage-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="7" class="p-3 border-bottom border-info shadow-inner">
                        <div class="card card-body border-info bg-white shadow-sm p-3">
                            <h6 class="font-weight-bold text-info mb-3">💓 Ingresar Signos Vitales para: <span class="text-dark">${c.paciente ? c.paciente.nombre : ''}</span></h6>
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
                                        💾 Guardar y Enviar al Médico
                                    </button>
                                    <button onclick="toggleFilaTriage(${c.id})" class="btn btn-outline-secondary btn-sm" title="Cancelar / Cerrar">❌</button>
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
        alert("⚠️ Por favor completa los 3 signos vitales (Presión, Temperatura y Pulso) antes de enviar al médico.");
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
            alert("❌ Error en el servidor al intentar guardar el triage.");
        }
    } catch (error) {
        alert("❌ Error de comunicación con el servidor de base de datos.");
        console.error(error);
    }
}

// =========================================================================
// PORTAL 4: RECEPCIÓN Y ADMINISTRACIÓN (Acceso Maestro, Cobros y Baja)
// =========================================================================
function verPestanaAdmin(idPestana, botonClickeado) {
    document.querySelectorAll(".admin-pestana").forEach(p => p.style.display = "none");
    document.querySelectorAll("#adminTabs .nav-link").forEach(b => b.classList.remove("active"));

    document.getElementById(idPestana).style.display = "block";
    botonClickeado.classList.add("active");

    if (idPestana === "panel-citas") cargarTodasLasCitasAdmin();
    if (idPestana === "panel-directorio") cargarUsuariosAdmin();
}

async function cargarTodasLasCitasAdmin() {
    const tabla = document.getElementById("tabla-todas-citas");
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

async function crearPersonalAdmin() {
    const alertBox = document.getElementById("medico-alert");
    const btnGuardar = document.getElementById("btn-guardar-personal");
    alertBox.style.display = "none";

    const telefono = document.getElementById("med-tel").value.trim();
    if (telefono.length !== 8 || isNaN(telefono)) {
        alertBox.className = "alert alert-warning font-weight-bold";
        alertBox.innerText = "⚠️ El número de teléfono debe contener exactly 8 dígitos numéricos.";
        alertBox.style.display = "block";
        return;
    }

    const rolSeleccionado = document.getElementById("emp-rol").value;
    let especialidadVal = "";
    let precioVal = 0.0;

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
        role: { nombre: rolSeleccionado }
    };

    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = "⏳ Guardando en PostgreSQL...";
        }

        const respuesta = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoEmpleado)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alertBox.className = "alert alert-success font-weight-bold";
            alertBox.innerText = `✅ ¡Personal registrado exitosamente como ${rolSeleccionado === 'ENFERMERO' ? 'Enfermero/a' : rolSeleccionado}!`;
            alertBox.style.display = "block";

            const formAlta = document.getElementById("form-alta-personal");
            if (formAlta) formAlta.reset();

            if (typeof cargarUsuariosAdmin === "function") cargarUsuariosAdmin();
        } else {
            alertBox.className = "alert alert-danger";
            alertBox.innerText = "❌ Error al registrar: " + (datos.error || "El usuario, DPI o correo ya existen.");
            alertBox.style.display = "block";
        }
    } catch (error) {
        alertBox.className = "alert alert-danger";
        alertBox.innerText = "❌ Error de conexión al intentar comunicarse con el servidor.";
        alertBox.style.display = "block";
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = "👨‍⚕️ Registrar Empleado en PostgreSQL";
        }
    }
}

// =========================================================================
// DIRECTORIO GENERAL CON BOTONES DE EDITAR Y ELIMINAR EN LÍNEA
// =========================================================================
async function cargarUsuariosAdmin() {
    const tabla = document.getElementById("tabla-usuarios-admin");
    try {
        const respuesta = await fetch(`${API_URL}/users`);
        const usuarios = await respuesta.json();

        tabla.innerHTML = "";
        usuarios.forEach(u => {
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

            let esp = u.especialidad ? `<strong class="text-primary">${u.especialidad}</strong>` : '<span class="text-muted">---</span>';
            let precioVal = u.precioConsulta ? u.precioConsulta : 0.0;
            let precio = precioVal > 0 ? `<span class="badge bg-success fs-6">Q. ${precioVal.toFixed(2)}</span>` : '<span class="text-muted">---</span>';

            let botonesAccion = u.username === miUsuarioActual?.username ?
                '<span class="badge bg-light text-muted border">Mi Cuenta</span>' :
                `
                <div class="d-flex justify-content-center gap-1">
                    <button onclick="toggleFilaEditarUsuario(${u.id})" class="btn btn-outline-primary btn-sm font-weight-bold shadow-sm" title="Editar datos">✏️ Editar</button>
                    <button onclick="eliminarUsuario(${u.id}, '${u.nombre}')" class="btn btn-outline-danger btn-sm font-weight-bold shadow-sm" title="Eliminar cuenta">🗑️</button>
                </div>
                `;

            tabla.innerHTML += `
                <tr id="fila-user-${u.id}">
                    <td><strong>#${u.id}</strong></td>
                    <td><strong id="lbl-nom-${u.id}">${u.nombre}</strong><br><small class="text-muted font-monospace">${u.email || ''}</small></td>
                    <td><span class="font-monospace">${u.dpi}</span><br><small class="text-muted font-monospace">Tel: ${u.telefono || 'N/A'}</small></td>
                    <td><span class="badge ${colorRol}">${rolNombre}</span></td>
                    <td>${esp}</td>
                    <td>${precio}</td>
                    <td>${u.cuentaBloqueada ? '<span class="badge bg-danger">🔒 BLOQUEADO</span>' : '<span class="badge bg-success">🟢 ACTIVO</span>'}</td>
                    <td class="text-center">${botonesAccion}</td>
                </tr>

                <!-- FILA DESPLEGABLE DE EDICIÓN EN LÍNEA -->
                <tr id="caja-editar-${u.id}" style="display: none;" class="bg-light">
                    <td colspan="8" class="p-3 border-bottom border-primary shadow-inner">
                        <div class="card card-body border-primary bg-white shadow-sm p-3">
                            <h6 class="font-weight-bold text-primary mb-3">✏️ Modificando Datos de: <span class="text-dark">${u.nombre}</span> (DPI: ${u.dpi})</h6>
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
                                    <input type="number" step="0.01" id="edit-pre-${u.id}" class="form-control form-control-sm text-success font-weight-bold" value="${precioVal}">
                                </div>
                                <div class="col-12 d-flex justify-content-end gap-2 mt-3">
                                    <button onclick="toggleFilaEditarUsuario(${u.id})" class="btn btn-outline-secondary btn-sm px-3">❌ Cancelar</button>
                                    <button onclick="guardarEdicionUsuario(${u.id}, '${u.nombre}')" class="btn btn-primary btn-sm font-weight-bold px-4 shadow-sm">
                                        💾 Guardar Cambios en PostgreSQL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error al cargar la tabla de usuarios</td></tr>`;
    }
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
    const nomVal = document.getElementById(`edit-nom-${idUsuario}`).value.trim();
    const telVal = document.getElementById(`edit-tel-${idUsuario}`).value.trim();
    const emailVal = document.getElementById(`edit-email-${idUsuario}`).value.trim();
    const espVal = document.getElementById(`edit-esp-${idUsuario}`).value.trim();
    const preVal = parseFloat(document.getElementById(`edit-pre-${idUsuario}`).value) || 0.0;

    if (!nomVal) {
        alert("⚠️ El nombre del usuario no puede quedar vacío.");
        return;
    }
    if (telVal.length !== 8 || isNaN(telVal)) {
        alert("⚠️ El número de teléfono debe tener exactamente 8 dígitos numéricos.");
        return;
    }

    const datosEditados = {
        nombre: nomVal,
        telefono: telVal,
        email: emailVal,
        especialidad: espVal,
        precioConsulta: preVal
    };

    try {
        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosEditados)
        });

        if (respuesta.ok) {
            alert(`✅ ¡Los datos de "${nomVal}" han sido actualizados exitosamente en PostgreSQL!`);
            cargarUsuariosAdmin();
        } else {
            const errorData = await respuesta.json().catch(() => ({}));
            alert("❌ Error al modificar: " + (errorData.error || "No se pudieron guardar los cambios en la base de datos."));
        }
    } catch (error) {
        alert("❌ Error de comunicación con el servidor al intentar actualizar.");
        console.error(error);
    }
}

async function eliminarUsuario(idUsuario, nombreUsuario) {
    if (!confirm(`⚠️ ¿Estás completamente seguro de que deseas eliminar permanentemente a:\n\n👤 "${nombreUsuario}"?\n\nEsta acción borrará su acceso del hospital.`)) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, {
            method: "DELETE"
        });

        if (respuesta.ok) {
            alert(`✅ El usuario "${nombreUsuario}" ha sido eliminado de PostgreSQL.`);
            cargarUsuariosAdmin();
        } else {
            const datos = await respuesta.json().catch(() => ({}));
            alert("❌ No se pudo eliminar: " + (datos.error || "Es probable que este usuario tenga citas o historiales médicos asociados y el sistema lo proteja."));
        }
    } catch (error) {
        alert("❌ Error de comunicación con el servidor al intentar eliminar.");
    }
}

// =========================================================================
// VISUALIZADOR MAGNO DE EXPEDIENTES CLÍNICOS (MODAL CONECTADO)
// =========================================================================
async function verExpedientePaciente(pacienteId) {
    const contenedor = document.getElementById("exp-contenido");
    const modalElement = document.getElementById('modalExpediente');

    if (!modalElement) {
        alert("⚠️ Error: No se encontró el componente del modal en el HTML. Asegúrate de haber actualizado también el archivo index.html.");
        return;
    }

    const modal = new bootstrap.Modal(modalElement);

    contenedor.innerHTML = `<p class="text-center text-muted py-3">🔍 Consultando expediente en PostgreSQL...</p>`;
    modal.show();

    try {
        const respuesta = await fetch(`${API_URL}/expedientes/paciente/${pacienteId}`);

        if (!respuesta.ok) {
            contenedor.innerHTML = `
                <div class="alert alert-warning text-center m-0">
                    ⚠️ Este paciente aún no cuenta con un expediente clínico registrado en la base de datos del hospital.
                </div>`;
            return;
        }

        const exp = await respuesta.json();

        contenedor.innerHTML = `
            <div class="border-bottom pb-2 mb-3 text-center">
                <h4 class="text-primary font-monospace mb-0">${exp.numeroExpediente || 'Sin número'}</h4>
                <small class="text-muted">ID de Registro Hospitalario: #${exp.id}</small>
            </div>
            <p class="mb-2"><strong>🩸 Tipo de Sangre:</strong> <span class="badge bg-danger fs-6">${exp.tipoSangre || 'No registrado'}</span></p>
            <p class="mb-2"><strong>⚠️ Alergias Conocidas:</strong> <span class="text-dark">${exp.alergias || 'Ninguna'}</span></p>
            <p class="mb-2"><strong>🏥 Antecedentes Médicos:</strong> <br><span class="text-muted">${exp.antecedentesMedicos || 'Sin antecedentes relevantes'}</span></p>
            <hr>
            <p class="mb-0 text-danger"><strong>🚨 Contacto de Emergencia:</strong> <br><span>${exp.contactoEmergencia || 'No especificado'}</span></p>
        `;
    } catch (error) {
        console.error("Error al obtener el expediente:", error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error de red al intentar conectar con el endpoint del expediente.</div>`;
    }
}

// =========================================================================
// UTILIDADES DE VISTAS Y LOGOUT
// =========================================================================
function cambiarVista(idVista) {
    document.querySelectorAll(".section-view").forEach(v => v.style.display = "none");
    document.getElementById(idVista).style.display = "block";
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