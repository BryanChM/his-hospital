// Si la web se abre en localhost, usa el backend local; si esta en internet, usa el backend de Azure
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : 'https://hospital-his-acfqghgmgef9gaca.canadacentral-01.azurewebsites.net/api';

let miUsuarioActual = null;
let miPacienteId = null;
let miUsername = null;
let usuariosGlobales = [];
let usuariosFiltrados = [];
let paginaActualUsuarios = 1;
let elementosPorPaginaUsuarios = 10;
let listaSucursales = [];
let listaGlobalSucursalesAdmin = [];


function obtenerIdSucursal(entidad) {
    if (!entidad) return null;
    if (entidad.sucursal && entidad.sucursal.id) return String(entidad.sucursal.id);
    if (entidad.sucursalId) return String(entidad.sucursalId);
    if (entidad.sucursal_id) return String(entidad.sucursal_id);
    if (typeof entidad.sucursal === 'number' || typeof entidad.sucursal === 'string') return String(entidad.sucursal);
    return null;
}

function obtenerIdMedico(cita) {
    if (!cita) return null;
    if (cita.medico && cita.medico.id) return String(cita.medico.id);
    if (cita.medicoId) return String(cita.medicoId);
    if (cita.medico_id) return String(cita.medico_id);
    if (typeof cita.medico === 'number' || typeof cita.medico === 'string') return String(cita.medico);
    return null;
}

function cambiarVista(idVista) {
    document.querySelectorAll(".section-view").forEach(v => v.style.display = "none");
    const vista = document.getElementById(idVista);
    if (vista) vista.style.display = "block";
}


async function verificarDpi() {
    const dpiInput = document.getElementById("input-dpi-check").value.trim();
    const alertBox = document.getElementById("dpi-alert");
    if (alertBox) alertBox.style.display = "none";

    if (dpiInput.length !== 13 || isNaN(dpiInput)) {
        if (alertBox) {
            alertBox.className = "alert alert-warning font-weight-bold";
            alertBox.innerText = "Por favor ingrese un numero de DPI valido de exactamente 13 digitos numericos.";
            alertBox.style.display = "block";
        } else {
            alert("Por favor ingrese un numero de DPI valido de exactamente 13 digitos numericos.");
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
            alertBox.innerText = "No se pudo conectar con el endpoint /api/users/dpi.";
            alertBox.style.display = "block";
        }
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
            }
            else if (rol === "PACIENTE") {
                cambiarVista("view-dashboard-paciente");
                cargarCitasDePacienteLogueado(usernameInput);
                cargarSucursalesPaciente();
            }
            else if (rol === "MEDIC" || rol === "MEDICO") {
                cambiarVista("view-dashboard-medico");
                cargarAgendaMedico(datos.id);
            }
            else if (rol === "RECEPCION" || rol === "ADMISION") {
                cambiarVista("panel-admision");
                cargarCitasRecepcion();
            }
            else if (rol === "ADMIN" || rol === "ADMINISTRADOR") {
                cambiarVista("view-dashboard-admin");
                cargarTodasLasCitasAdmin();
            }
            else {
                cambiarVista("view-dashboard-paciente");
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
            alertBox.innerText = "Error de comunicacion con el servidor al intentar iniciar sesion.";
            alertBox.style.display = "block";
        }
    }
}

async function procesarRegistro(event) {
    if (event) event.preventDefault();

    const alertBox = document.getElementById("reg-alert");
    if (alertBox) alertBox.style.display = "none";

    const telInput = document.getElementById("reg-tel") || document.getElementById("reg-telefono");
    const telefono = telInput ? telInput.value.trim() : "";

    if (telefono.length !== 8 || isNaN(telefono)) {
        alert("El numero de telefono debe contener exactamente 8 digitos numericos.");
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
        const respUser = await fetch(`${API_URL}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoUsuario)
        });

        const datosUser = await respUser.json();

        if (respUser.ok) {
            const idGenerado = datosUser.id || datosUser.usuario_id;
            if (typeof registrarAuditoria === "function") registrarAuditoria("CREACION", `Registro de paciente: ${nuevoUsuario.username}`);

            const datosExpediente = {
                pacienteId: idGenerado,
                tipoSangre: "Pendiente",
                alergias: "Ninguna registrada",
                antecedentesMedicos: "Especialidad solicitada: " + especialidadVal,
                contactoEmergencia: "Telefono propio: " + telefono
            };

            await fetch(`${API_URL}/expedientes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosExpediente)
            });

            alert("Cuenta y Expediente Clinico creados con exito");

            setTimeout(() => {
                const nombreLogin = document.getElementById("login-nombre-user");
                const rolBadge = document.getElementById("login-rol-badge");
                const userLogin = document.getElementById("login-username");
                if (nombreLogin) nombreLogin.innerText = nuevoUsuario.nombre;
                if (rolBadge) rolBadge.innerText = "PACIENTE";
                if (userLogin) userLogin.value = nuevoUsuario.username;
                cambiarVista("view-login");
            }, 1800);

        } else {
            alert("Error de registro: " + (datosUser.error || datosUser.mensaje || "No se pudo registrar la cuenta."));
        }
    } catch (error) {
        alert("Error de conexion con el servidor.");
    }
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
    let usuarioCalculado = palabras.length >= 2 ? palabras[0].charAt(0) + palabras[1] : palabras[0];

    if (dpiVal && dpiVal.length >= 4) {
        usuarioCalculado += dpiVal.slice(-4);
    } else {
        usuarioCalculado += Math.floor(100 + Math.random() * 900);
    }

    campoDestino.value = usuarioCalculado;
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
            contenedor.innerHTML = `<div class="alert alert-info text-center my-3">No tiene citas medicas programadas actualmente.</div>`;
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
                btnCancelar = `<button onclick="cancelarCitaPaciente(${c.id})" class="btn btn-outline-danger btn-sm mt-2 font-weight-bold">Cancelar Cita</button>`;
            }

            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3">
                    <div>
                        <h6 class="mb-1 font-weight-bold text-primary">Consulta con: ${c.medico ? c.medico.nombre : 'Medico Asignado'}</h6>
                        <p class="mb-1"><strong>Motivo:</strong> ${c.motivo}</p>
                        ${c.observaciones ? `<p class="mb-1 text-dark"><small><strong>Obs / Diagnostico:</strong> <em>${c.observaciones}</em></small></p>` : ''}
                        <small class="text-secondary"><strong>Fecha programada:</strong> ${c.fechaHora.replace('T', ' a las ')} horas</small>
                        <div class="mt-1">${btnCancelar}</div>
                    </div>
                    <span class="badge ${badge} fs-6 px-3 py-2 rounded-pill">${c.estado}</span>
                </div>`;
        });
        html += `</div>`;
        contenedor.innerHTML = html;
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar su historial de citas.</div>`;
    }
}

async function cancelarCitaPaciente(citaId) {
    if (!confirm("¿Esta seguro de que desea cancelar esta cita medica?")) return;
    try {
        const respuesta = await fetch(`${API_URL}/citas/cancelar/${citaId}`, { method: "PUT" });
        if (respuesta.ok) {
            alert("La cita ha sido cancelada exitosamente.");
            renderizarMisCitas();
        } else {
            alert("Error: No se pudo cancelar la cita.");
        }
    } catch (error) {
        alert("Error de conexion al intentar cancelar la cita.");
    }
}

async function cargarSucursalesPaciente() {
    const selectSucursal = document.getElementById("cita-sucursal");
    if (!selectSucursal) return;

    selectSucursal.innerHTML = '<option value="">Conectando con el servidor...</option>';
    selectSucursal.disabled = true;

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`);
        if (!respuesta.ok) throw new Error("Servidor rechazo la peticion");

        listaSucursales = await respuesta.json();

        if (!Array.isArray(listaSucursales) || listaSucursales.length === 0) {
            selectSucursal.innerHTML = '<option value="">No hay clinicas registradas</option>';
            return;
        }

        selectSucursal.innerHTML = '<option value="">Seleccione una ubicacion...</option>';
        listaSucursales.forEach(sucursal => {
            selectSucursal.innerHTML += `<option value="${sucursal.id}">${sucursal.nombre} - ${sucursal.direccion}</option>`;
        });
        selectSucursal.disabled = false;

    } catch (error) {
        selectSucursal.innerHTML = '<option value="">Fallo de conexion</option>';
    }
}

function cargarEspecialidadesCascada() {
    const selectSucursal = document.getElementById("cita-sucursal");
    const idSucursal = selectSucursal?.value;
    const selectEspecialidad = document.getElementById("cita-especialidad");
    const selectMedico = document.getElementById("cita-medico");

    if (selectMedico) {
        selectMedico.innerHTML = '<option value="">Esperando fecha y hora...</option>';
        selectMedico.disabled = true;
    }

    if (!idSucursal) {
        if (selectEspecialidad) {
            selectEspecialidad.innerHTML = '<option value="">Primero seleccione sucursal</option>';
            selectEspecialidad.disabled = true;
        }
        return;
    }

    const sucursalSeleccionada = listaSucursales.find(s => String(s.id) === String(idSucursal));

    if (selectEspecialidad) {
        selectEspecialidad.innerHTML = '<option value="">Seleccione especialidad...</option>';

        if (sucursalSeleccionada && sucursalSeleccionada.especialidades && sucursalSeleccionada.especialidades.length > 0) {
            sucursalSeleccionada.especialidades.forEach(esp => {
                selectEspecialidad.innerHTML += `<option value="${esp}">${esp}</option>`;
            });
            selectEspecialidad.disabled = false;
        } else {
            selectEspecialidad.innerHTML = '<option value="">Esta sede no tiene especialidades registradas</option>';
            selectEspecialidad.disabled = true;
        }
    }
}

async function cargarMedicosCascada() {
    const selectSucursal = document.getElementById("cita-sucursal");
    const idSucursal = selectSucursal?.value;
    const selectEspecialidad = document.getElementById("cita-especialidad");
    const especialidad = selectEspecialidad?.value;
    const selectMedico = document.getElementById("cita-medico");

    if (!selectMedico) return;
    selectMedico.innerHTML = '<option value="">Cargando medicos...</option>';
    selectMedico.disabled = true;

    if (!especialidad || !idSucursal) {
        selectMedico.innerHTML = '<option value="">Primero seleccione especialidad</option>';
        return;
    }

    try {
        const espCodificada = encodeURIComponent(especialidad);
        const url = `${API_URL}/users/sucursal/${idSucursal}/especialidad/${espCodificada}`;
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error("Error en servidor");

        const medicos = await respuesta.json();
        selectMedico.innerHTML = '<option value="">Seleccione un medico disponible...</option>';

        if (medicos && medicos.length > 0) {
            medicos.forEach(med => {
                const precio = med.precioConsulta ? ` (Q. ${med.precioConsulta})` : '';
                selectMedico.innerHTML += `<option value="${med.id}">Dr(a). ${med.nombre}${precio}</option>`;
            });
            selectMedico.disabled = false;
        } else {
            selectMedico.innerHTML = '<option value="">No hay medicos asignados a esta especialidad</option>';
            selectMedico.disabled = true;
        }
    } catch (error) {
        selectMedico.innerHTML = '<option value="">Error al cargar la lista de medicos</option>';
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const inputFechaHora = document.getElementById("cita-fecha");
    if (inputFechaHora) {
        inputFechaHora.addEventListener("change", async function() {
            const selectSucursal = document.getElementById("cita-sucursal");
            const sucursalId = selectSucursal?.value;
            const selectEspecialidad = document.getElementById("cita-especialidad");
            const especialidad = selectEspecialidad?.value;
            const fechaHoraVal = this.value;
            const selectMedico = document.getElementById("cita-medico");

            if (!sucursalId || !especialidad || !fechaHoraVal) return;

            if (selectMedico) {
                selectMedico.innerHTML = '<option value="">Buscando medico en el sistema...</option>';
                selectMedico.disabled = true;
            }

            try {
                const url = `${API_URL}/users/asignacion-automatica?sucursalId=${sucursalId}&especialidad=${encodeURIComponent(especialidad)}&fechaHora=${encodeURIComponent(fechaHoraVal)}`;
                const resp = await fetch(url);
                const data = await resp.json();

                if (resp.ok) {
                    if (selectMedico) {
                        selectMedico.innerHTML = `<option value="${data.id}" selected>Asignado automaticamente: Dr(a). ${data.nombre}</option>`;
                        selectMedico.disabled = true;
                    }
                } else {
                    alert(data.error || "No hay medicos disponibles en este horario o especialidad.");
                    if (selectMedico) selectMedico.innerHTML = '<option value="">Sin medicos disponibles</option>';
                    this.value = "";
                }
            } catch (error) {
                if (selectMedico) selectMedico.innerHTML = '<option value="">Error al consultar al servidor</option>';
            }
        });
    }
});

async function agendarCitaPaciente(event) {
    if (event) event.preventDefault();
    if (!miPacienteId) {
        alert("Error de sesion: No se identifico su ID de paciente.");
        return;
    }

    const sucursalId = document.getElementById("cita-sucursal")?.value;
    const especialidad = document.getElementById("cita-especialidad")?.value;
    const fechaHora = document.getElementById("cita-fecha")?.value;
    const motivo = document.getElementById("cita-motivo")?.value.trim();
    const observaciones = document.getElementById("cita-observaciones")?.value.trim() || "";
    const medicoId = document.getElementById("cita-medico")?.value;
    const esEmergencia = document.getElementById("cita-emergencia")?.checked || false;

    if (!sucursalId || !especialidad || !fechaHora || !motivo || !medicoId) {
        alert("Por favor complete todos los campos obligatorios del formulario.");
        return;
    }

    const idSucursalNum = parseInt(sucursalId, 10);
    const idMedicoNum = parseInt(medicoId, 10);

    const nuevaCita = {
        pacienteId: parseInt(miPacienteId),
        medicoId: idMedicoNum,
        sucursal: {
            id: idSucursalNum
        },
        especialidad: especialidad,
        fechaHora: fechaHora,
        motivo: esEmergencia ? `[EMERGENCIA] ${motivo}` : motivo,
        observaciones: observaciones,
        prioridad: esEmergencia ? "EMERGENCIA" : "NORMAL",
        estado: "PROGRAMADA"
    };

    try {
        const respuesta = await fetch(`${API_URL}/citas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevaCita)
        });

        if (respuesta.ok) {
            alert("Cita agendada exitosamente.");
            document.getElementById("form-agendar-cita")?.reset();
            renderizarMisCitas();
        } else {
            alert("No se pudo programar la cita. Verifique la conexion.");
        }
    } catch (error) {
        console.error("Error al agendar:", error);
    }
}




function ejecutarBusquedaRecepcion() {
    cargarCitasRecepcion();
}

async function cargarCitasRecepcion() {
    const contenedor = document.getElementById('contenedor-resultados-recepcion');
    if (!contenedor) return;

    contenedor.innerHTML = `<div class="text-center my-4"><div class="spinner-border text-primary" role="status"></div><p>Cargando pacientes programados para su sucursal...</p></div>`;

    try {
        const [respCitas, respUsers] = await Promise.all([
            fetch(`${API_URL}/citas`),
            fetch(`${API_URL}/users`)
        ]);

        const citas = await respCitas.json();
        const usuarios = await respUsers.json();
        const mapaUsers = {};
        if (Array.isArray(usuarios)) {
            usuarios.forEach(u => { mapaUsers[String(u.id)] = u; });
        }

        const miId = String(miUsuarioActual?.id || miUsuarioActual?.usuario_id);
        const datosRecepcionista = mapaUsers[miId] || miUsuarioActual || {};
        const sucRecepcionId = obtenerIdSucursal(datosRecepcionista);

        if (!sucRecepcionId) {
            contenedor.innerHTML = `<div class="alert alert-danger text-center fw-bold">Atención: Su usuario de Recepción no tiene una sucursal asignada en el sistema.</div>`;
            return;
        }

        const todasPendientes = citas.filter(c => c.estado === "PROGRAMADA" || c.estado === "AGENDADA");
        const citasRecepcion = todasPendientes.filter(c => {
            const sucCitaId = obtenerIdSucursal(c);
            if (!sucCitaId) return false;
            return (sucCitaId === sucRecepcionId);
        });

        // MENSAJE LIMPIO (SIN DIAGNÓSTICO)
        if (citasRecepcion.length === 0) {
            contenedor.innerHTML = `<div class="alert alert-info text-center p-4 shadow-sm"><h5 class="fw-bold">No hay citas médicas pendientes de llegada en su sucursal.</h5><p class="mb-0 small">Los pacientes agendados aparecerán aquí automáticamente.</p></div>`;
            return;
        }

        contenedor.innerHTML = "";
        citasRecepcion.forEach(cita => {
            const pacId = String(cita.pacienteId || (cita.paciente ? cita.paciente.id : ""));
            const pacObj = mapaUsers[pacId] || cita.paciente || { nombre: cita.nombrePaciente || 'Paciente', dpi: 'N/A' };
            const esEmergencia = cita.motivo && cita.motivo.includes("EMERGENCIA");
            const accionBoton = `<button onclick="confirmarLlegadaRecepcion(${cita.id})" class="btn btn-success btn-lg fw-bold w-100 shadow-sm mt-3">Confirmar Llegada (Pasar a Enfermería)</button>`;

            contenedor.innerHTML += `
                <div class="card shadow-sm mb-3 border-0 ${esEmergencia ? 'border-start border-danger border-5' : 'border-start border-primary border-5'}">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <span class="fw-bold fs-5">Cita #${cita.id}</span>
                        <span class="badge bg-primary fs-6">${cita.estado}</span>
                    </div>
                    <div class="card-body">
                        <h4 class="card-title fw-bold">${pacObj.nombre}</h4>
                        <p class="text-muted font-monospace mb-2">DPI: ${pacObj.dpi || pacObj.cui || 'N/A'}</p>
                        <hr>
                        <div class="row g-2 text-secondary">
                            <div class="col-md-6"><strong>Especialidad:</strong> ${cita.especialidad || 'General'}</div>
                            <div class="col-md-6"><strong>Fecha y Hora:</strong> ${cita.fechaHora ? cita.fechaHora.replace('T', ' ') : 'Hoy'}</div>
                        </div>
                        ${accionBoton}
                    </div>
                </div>`;
        });
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger text-center">Error al conectar con la base de datos.</div>`;
    }
}

async function confirmarLlegadaRecepcion(citaId) {
    try {
        const respuesta = await fetch(`${API_URL}/citas/llegada/${citaId}`, { method: "PUT" });
        if (respuesta.ok) {
            alert("Llegada confirmada. El paciente ha sido transferido a Enfermeria.");
            cargarCitasRecepcion();
        } else {
            const textoError = await respuesta.text();
            alert("No se pudo confirmar la llegada: " + textoError);
        }
    } catch (error) {
        alert("Error de comunicacion con el servidor.");
    }
}

async function confirmarLlegadaRecepcion(citaId) {
    try {
        const respuesta = await fetch(`${API_URL}/citas/llegada/${citaId}`, { method: "PUT" });
        if (respuesta.ok) {
            alert("Llegada confirmada. El paciente ha sido transferido a Enfermeria.");
            cargarCitasRecepcion();
        } else {
            const textoError = await respuesta.text();
            alert("No se pudo confirmar la llegada: " + textoError);
        }
    } catch (error) {
        alert("Error de comunicacion con el servidor.");
    }
}


async function cargarTriageEnfermeria() {
    const tabla = document.getElementById("tabla-enfermeria");
    if (!tabla) return;

    tabla.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-info" role="status"></div><p class="mt-2 text-muted">Sincronizando con la estación de enfermería...</p></td></tr>`;

    try {
        const [respCitas, respUsers] = await Promise.all([
            fetch(`${API_URL}/citas`),
            fetch(`${API_URL}/users`)
        ]);

        const citas = await respCitas.json();
        const usuarios = await respUsers.json();
        const mapaUsers = {};
        if (Array.isArray(usuarios)) {
            usuarios.forEach(u => { mapaUsers[String(u.id)] = u; });
        }

        const miId = String(miUsuarioActual?.id || miUsuarioActual?.usuario_id);
        const datosEnfermera = mapaUsers[miId] || miUsuarioActual || {};
        const sucEnfermeraId = obtenerIdSucursal(datosEnfermera);

        if (!sucEnfermeraId) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-danger text-center fw-bold py-4">Atención: Su usuario de Enfermería no tiene una sucursal asignada en el sistema.</td></tr>`;
            return;
        }

        const estadosPendientes = ["EN_ESPERA_TRIAGE", "CONFIRMADA", "PROGRAMADA", "AGENDADA"];
        const todasPendientes = citas.filter(c => estadosPendientes.includes(c.estado));

        const pendientesSucursal = todasPendientes.filter(c => {
            const sucCitaId = obtenerIdSucursal(c);
            if (!sucCitaId) return false;
            return (sucCitaId === sucEnfermeraId);
        });

        // MENSAJE LIMPIO (SIN DIAGNÓSTICO)
        if (pendientesSucursal.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted font-weight-bold">No hay pacientes pendientes de toma de signos vitales en su sucursal en este momento.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        pendientesSucursal.forEach(c => {
            const pacId = String(c.pacienteId || (c.paciente ? c.paciente.id : ""));
            const pacObj = mapaUsers[pacId] || c.paciente || { nombre: c.nombrePaciente || `Paciente #${pacId}`, dpi: c.dpi || "N/A" };
            const medId = String(c.medicoId || (c.medico ? c.medico.id : ""));
            const medObj = mapaUsers[medId] || c.medico || { nombre: c.nombreMedico || `Dr(a). #${medId}`, especialidad: c.especialidad || "General" };
            const esEmergencia = (c.motivo && c.motivo.includes("EMERGENCIA")) || (c.prioridad === "EMERGENCIA");

            tabla.innerHTML += `
                <tr id="fila-paciente-${c.id}" class="${esEmergencia ? 'table-danger' : ''}">
                    <td class="fw-bold">#${c.id}</td>
                    <td><span class="font-monospace">${(c.fechaHora || '').replace('T', ' ')}</span></td>
                    <td>
                        <strong class="text-dark fs-6">${pacObj.nombre} ${esEmergencia ? '<span class="badge bg-danger ms-1">URGENTE</span>' : ''}</strong><br>
                        <small class="text-muted font-monospace">DPI: ${pacObj.dpi || pacObj.cui || 'N/A'}</small>
                    </td>
                    <td><strong class="text-primary fs-6">${medObj.nombre}</strong></td>
                    <td><span class="badge bg-light text-dark border">${c.especialidad || medObj.especialidad || 'General'}</span></td>
                    <td><span class="badge bg-warning text-dark font-weight-bold px-2 py-1">${c.estado}</span></td>
                    <td><button onclick="toggleFilaTriage(${c.id})" class="btn btn-info btn-sm text-dark font-weight-bold shadow-sm">Tomar Signos</button></td>
                </tr>
                <tr id="caja-triage-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="7" class="p-3 border-bottom border-info shadow-inner">
                        <div class="card card-body border-info bg-white shadow-sm p-3">
                            <h6 class="font-weight-bold text-info mb-3">Signos Vitales: ${pacObj.nombre}</h6>
                            <div class="row g-2 align-items-end">
                                <div class="col-md-3"><label class="form-label small">Presión Arterial</label><input type="text" id="pa-${c.id}" class="form-control form-control-sm" placeholder="Ej: 120/80"></div>
                                <div class="col-md-3"><label class="form-label small">Temperatura (°C)</label><input type="number" step="0.1" id="temp-${c.id}" class="form-control form-control-sm" placeholder="Ej: 36.5"></div>
                                <div class="col-md-3"><label class="form-label small">Pulso (lpm)</label><input type="number" id="pulso-${c.id}" class="form-control form-control-sm" placeholder="Ej: 75"></div>
                                <div class="col-md-3"><button onclick="guardarTriageInline(${c.id}, '${pacObj.nombre}')" class="btn btn-success btn-sm w-100 font-weight-bold">Guardar y Enviar al Médico</button></div>
                            </div>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">Error al conectar con la estación de enfermería.</td></tr>`;
    }
}

function toggleFilaTriage(citaId) {
    const filaFormulario = document.getElementById(`caja-triage-${citaId}`);
    if (filaFormulario.style.display === "none") {
        document.querySelectorAll("[id^='caja-triage-']").forEach(f => f.style.display = "none");
        filaFormulario.style.display = "table-row";
        const inputPA = document.getElementById(`pa-${citaId}`);
        if (inputPA) inputPA.focus();
    } else {
        filaFormulario.style.display = "none";
    }
}

async function guardarTriageInline(citaId, nombrePaciente) {
    const pA = document.getElementById(`pa-${citaId}`).value.trim();
    const temp = document.getElementById(`temp-${citaId}`).value.trim();
    const pulso = document.getElementById(`pulso-${citaId}`).value.trim();

    if (!pA || !temp || !pulso) {
        alert("Por favor completa los 3 signos vitales antes de enviar al medico.");
        return;
    }

    const textoTriage = `Triage: PA ${pA} | Temp ${temp} C | Pulso ${pulso} lpm`;

    try {
        const respuesta = await fetch(`${API_URL}/citas/triage/${citaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: textoTriage })
        });

        if (respuesta.ok) {
            alert(`Signos vitales guardados para ${nombrePaciente}.\nEl paciente pasa a sala de espera en la agenda del medico.`);
            cargarTriageEnfermeria();
        } else {
            const errText = await respuesta.text();
            alert("Error en el servidor al intentar guardar el triage: " + errText);
        }
    } catch (error) {
        alert("Error de comunicacion con el servidor.");
    }
}


async function cargarAgendaMedico(idMedico) {
    const tabla = document.getElementById("tabla-agenda-medico");
    if (!tabla) return;
    tabla.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Consultando pacientes en sala de espera...</p></td></tr>`;

    try {
        const [respCitas, respUsers] = await Promise.all([
            fetch(`${API_URL}/citas`),
            fetch(`${API_URL}/users`)
        ]);

        const todasLasCitas = await respCitas.json();
        const usuarios = await respUsers.json();
        const mapaUsers = {};
        if (Array.isArray(usuarios)) {
            usuarios.forEach(u => { mapaUsers[String(u.id)] = u; });
        }

        const miId = String(idMedico || miUsuarioActual?.id || miUsuarioActual?.usuario_id);
        const datosMedico = mapaUsers[miId] || miUsuarioActual || {};
        const sucMedicoId = obtenerIdSucursal(datosMedico);

        if (!sucMedicoId) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-danger text-center fw-bold py-4">Atencion: Su perfil de Medico no tiene una sucursal asignada.</td></tr>`;
            return;
        }

        const misCitas = todasLasCitas.filter(c => {
            const medCitaId = obtenerIdMedico(c);
            const sucCitaId = obtenerIdSucursal(c);
            if (!medCitaId || !sucCitaId) return false;

            const esMiPaciente = (medCitaId === miId);
            const coincideSucursal = (sucCitaId === sucMedicoId);
            const estaEnSala = ["EN_ESPERA_TRIAGE", "EN_SALA_DE_ESPERA", "PACIENTE_PRESENTE"].includes(c.estado);

            return esMiPaciente && coincideSucursal && estaEnSala;
        });

        if (misCitas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted font-weight-bold">No tiene pacientes en sala de espera asignados a usted en esta clinica.</td></tr>`;
            return;
        }

        tabla.innerHTML = "";
        misCitas.forEach(c => {
            const pacId = String(c.pacienteId || (c.paciente ? c.paciente.id : ""));
            const pacObj = mapaUsers[pacId] || c.paciente || { nombre: c.nombrePaciente || 'Paciente', dpi: 'N/A' };
            const vitales = `<span class="badge bg-info text-dark font-monospace fs-6 px-2 py-1 shadow-sm">${c.observaciones || 'En proceso'}</span>`;
            const botonExpediente = pacId ? `<button onclick="verExpedientePaciente(${pacId})" class="btn btn-outline-primary btn-sm mb-1 font-weight-bold">Ver Expediente</button><br>` : '';

            tabla.innerHTML += `
                <tr id="fila-medico-${c.id}">
                    <td><strong class="text-primary font-monospace">${(c.fechaHora || '').replace('T', ' ')}</strong></td>
                    <td><strong class="fs-6">${pacObj.nombre}</strong></td>
                    <td>${botonExpediente}<span class="font-monospace text-muted">DPI: ${pacObj.dpi || pacObj.cui || 'N/A'}</span></td>
                    <td>${c.motivo || ''}</td>
                    <td>${vitales}</td>
                    <td><button onclick="toggleFilaReceta(${c.id})" class="btn btn-success btn-sm font-weight-bold shadow-sm">Atender y Recetar</button></td>
                </tr>
                <tr id="caja-receta-${c.id}" style="display: none;" class="bg-light">
                    <td colspan="6" class="p-3 border-bottom border-success shadow-inner">
                        <div class="card card-body border-success bg-white shadow-sm p-3">
                            <h6 class="font-weight-bold text-success mb-2">Atencion Clinica para: <span class="text-dark">${pacObj.nombre}</span></h6>
                            <div class="row g-2">
                                <div class="col-md-9">
                                    <textarea id="receta-${c.id}" class="form-control form-control-sm font-weight-bold" rows="2" placeholder="Ingrese diagnostico y receta..."></textarea>
                                </div>
                                <div class="col-md-3">
                                    <button onclick="guardarRecetaInline(${c.id}, '${pacObj.nombre}')" class="btn btn-success btn-sm w-100 font-weight-bold mb-1">Finalizar Consulta</button>
                                    <button onclick="toggleFilaReceta(${c.id})" class="btn btn-outline-secondary btn-sm w-100">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error al cargar su agenda medica.</td></tr>`;
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
        alert("Por favor escribe las indicaciones medicas o medicamentos antes de finalizar la consulta.");
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
        alert("Error de conexion al intentar guardar la receta.");
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
    if (idPestana === "panel-crear-medico") cargarSucursalesAdmin();
}

async function cargarTodasLasCitasAdmin() {
    const contenedor = document.getElementById("contenedor-acordeon-citas");
    if (!contenedor) return;
    contenedor.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Conectando con el servidor y agrupando expedientes...</p></div>`;

    try {
        const respCitas = await fetch(`${API_URL}/citas`);
        if (!respCitas.ok) throw new Error(`Error HTTP`);
        const citas = await respCitas.json();

        let usuarios = [];
        try {
            const respUsers = await fetch(`${API_URL}/users`);
            if (respUsers.ok) usuarios = await respUsers.json();
        } catch (e) {}

        const mapaUsuarios = {};
        if (Array.isArray(usuarios)) usuarios.forEach(u => { mapaUsuarios[u.id] = u; });

        window.citasAdminGlobales = citas;
        window.mapaUsuariosGlobal = mapaUsuarios;

        renderizarCitasAgrupadas(citas, mapaUsuarios);
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger text-center my-4 p-4 shadow-sm"><h5 class="fw-bold">No se pudieron cargar las citas medicas</h5></div>`;
    }
}

function renderizarCitasAgrupadas(citas, mapaUsuarios) {
    const contenedor = document.getElementById("contenedor-acordeon-citas");
    if (!contenedor) return;

    if (!citas || citas.length === 0) {
        contenedor.innerHTML = `<div class="alert alert-info text-center my-4">No hay citas registradas en el sistema en este momento.</div>`;
        return;
    }

    const grupos = {};
    citas.forEach(cita => {
        const idPac = cita.pacienteId || (cita.paciente ? cita.paciente.id : 'desconocido');
        const pacObj = mapaUsuarios[idPac] || cita.paciente || { nombre: cita.nombrePaciente || `Paciente ID #${idPac}`, dpi: cita.dpi || 'N/A' };

        if (!grupos[idPac]) grupos[idPac] = { paciente: pacObj, citas: [] };
        grupos[idPac].citas.push(cita);
    });

    let htmlAcordeon = `<div class="accordion shadow-sm" id="acordeonPacientesAdmin">`;
    Object.keys(grupos).forEach((idPac, index) => {
        const grupo = grupos[idPac];
        const pac = grupo.paciente;
        const totalCitas = grupo.citas.length;
        const idCollapse = `collapsePac_${index}`;
        const pendientes = grupo.citas.filter(c => c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA').length;
        const badgePendientes = pendientes > 0 ? `<span class="badge bg-warning text-dark ms-2">${pendientes} Pendiente(s)</span>` : `<span class="badge bg-success ms-2">Al dia</span>`;

        htmlAcordeon += `
            <div class="accordion-item border mb-3 rounded shadow-sm">
                <h2 class="accordion-header" id="heading_${index}">
                    <button class="accordion-button ${index !== 0 ? 'collapsed' : ''} bg-light py-3" type="button" data-bs-toggle="collapse" data-bs-target="#${idCollapse}">
                        <div class="d-flex align-items-center w-100 me-3">
                            <span class="fs-5 fw-bold text-dark me-2">${pac.nombre || 'Paciente Desconocido'}</span>
                            <span class="badge bg-secondary font-monospace me-auto">DPI: ${pac.dpi || pac.cui || 'N/A'}</span>
                            <span class="badge bg-primary fs-6 me-1">${totalCitas} Cita(s)</span>
                            ${badgePendientes}
                        </div>
                    </button>
                </h2>
                <div id="${idCollapse}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#acordeonPacientesAdmin">
                    <div class="accordion-body p-0 table-responsive">
                        <table class="table table-hover table-striped mb-0 align-middle">
                            <thead class="table-dark text-center">
                                <tr><th># ID</th><th>Fecha y Hora</th><th>Medico Asignado</th><th>Especialidad</th><th>Precio</th><th>Estado</th><th>Accion / Caja</th></tr>
                            </thead>
                            <tbody class="text-center">`;

        grupo.citas.forEach(cita => {
            const medId = cita.medicoId || (cita.medico ? cita.medico.id : null);
            const medObj = mapaUsuarios[medId] || cita.medico || { nombre: cita.nombreMedico || `Dr. ID #${medId}`, especialidad: cita.especialidad || 'General', precio: 350.00 };

            let badgeEstado = `<span class="badge bg-secondary">${cita.estado || 'PROGRAMADA'}</span>`;
            if (cita.estado === 'ATENDIDA') badgeEstado = `<span class="badge bg-success">ATENDIDA</span>`;
            else if (cita.estado === 'CANCELADA') badgeEstado = `<span class="badge bg-danger">CANCELADA</span>`;
            else if (cita.estado === 'EN_SALA_DE_ESPERA' || cita.estado === 'PACIENTE_PRESENTE') badgeEstado = `<span class="badge bg-info text-dark fw-bold">EN SALA DE ESPERA</span>`;
            else if (cita.estado === 'AGENDADA' || cita.estado === 'CONFIRMADA') badgeEstado = `<span class="badge bg-primary">${cita.estado}</span>`;

            const precioVal = cita.precio || medObj.precio || 350.00;
            const precioFormatted = `Q. ${parseFloat(precioVal).toFixed(2)}`;

            htmlAcordeon += `
                                <tr>
                                    <td class="fw-bold text-secondary">#${cita.id}</td>
                                    <td>${cita.fechaHora || 'Sin fecha'}</td>
                                    <td class="text-primary fw-bold text-start">${medObj.nombre || 'Sin asignar'}</td>
                                    <td><span class="badge bg-light text-dark border">${cita.especialidad || medObj.especialidad || 'General'}</span></td>
                                    <td class="fw-bold text-success fs-6">${precioFormatted}</td>
                                    <td>${badgeEstado}</td>
                                    <td>
                                        ${cita.estado !== 'CANCELADA' && cita.estado !== 'ATENDIDA' ? `<button onclick="cancelarCitaAdmin(${cita.id})" class="btn btn-sm btn-outline-danger fw-bold">Cancelar</button>` : `<span class="text-muted small">---</span>`}
                                    </td>
                                </tr>`;
        });
        htmlAcordeon += `</tbody></table></div></div></div>`;
    });
    htmlAcordeon += `</div>`;
    contenedor.innerHTML = htmlAcordeon;
}

function filtrarCitasAdmin() {
    const texto = document.getElementById("busqueda-citas-admin").value.trim().toLowerCase();
    const citas = window.citasAdminGlobales || [];
    const mapa = window.mapaUsuariosGlobal || {};
    if (!texto) { renderizarCitasAgrupadas(citas, mapa); return; }

    const citasFiltradas = citas.filter(c => {
        const idPac = c.pacienteId || (c.paciente ? c.paciente.id : null);
        const pacObj = mapa[idPac] || c.paciente || {};
        const nombrePac = (pacObj.nombre || c.nombrePaciente || "").toLowerCase();
        const dpiPac = (pacObj.dpi || pacObj.cui || "").toLowerCase();
        return nombrePac.includes(texto) || dpiPac.includes(texto) || String(c.id).includes(texto);
    });
    renderizarCitasAgrupadas(citasFiltradas, mapa);
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
    window.usuariosDirectorioCache = typeof listaUsuarios !== 'undefined' ? listaUsuarios : usuariosFiltrados;
    if (!tabla) return;
    const totalRegistros = usuariosFiltrados.length;

    if (totalRegistros === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron usuarios.</td></tr>`;
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
            rolNombre = "ENFERMERO/A"; colorRol = "bg-info text-dark font-weight-bold";
        }
        if (rolNombre === "MEDIC" || rolNombre === "MEDICO") {
            rolNombre = "MEDICO"; colorRol = "bg-primary text-white";
        }
        if (rolNombre === "RECEPCION") colorRol = "bg-warning text-dark";

        let botonDesbloquear = u.cuentaBloqueada || u.cuenta_bloqueada ? `<li><a class="dropdown-item text-success font-weight-bold" href="#" onclick="event.preventDefault(); desbloquearUsuario(${u.id}, '${u.nombre}')">Desbloquear Cuenta</a></li><li><hr class="dropdown-divider"></li>` : "";
        let botonesAccion = u.username === miUsuarioActual?.username ? '<span class="badge bg-light text-muted border">Mi Cuenta</span>' : `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Acciones</button>
                <ul class="dropdown-menu shadow">
                    ${botonDesbloquear}
                    <li><a class="dropdown-item text-primary font-weight-bold" href="#" onclick="event.preventDefault(); verDetallesUsuario(${u.id})">Ver Detalles</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); toggleFilaEditarUsuario(${u.id})">Editar</a></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="event.preventDefault(); eliminarUsuario(${u.id}, '${u.nombre}')">Eliminar</a></li>
                </ul>
            </div>`;

        tabla.innerHTML += `
            <tr id="fila-user-${u.id}">
                <td><strong>#${u.id}</strong></td>
                <td><strong id="lbl-nom-${u.id}">${u.nombre || ''}</strong></td>
                <td><span class="font-monospace">${u.dpi || '---'}</span></td>
                <td><span class="font-monospace">${u.email || '---'}</span></td>
                <td><span class="badge ${colorRol}">${rolNombre}</span></td>
                <td><span class="font-monospace text-primary">${u.username || '---'}</span></td>
                <td>${u.cuentaBloqueada || u.cuenta_bloqueada ? '<span class="badge bg-danger">BLOQUEADO</span>' : '<span class="badge bg-success">ACTIVO</span>'}</td>
                <td class="text-center">${botonesAccion}</td>
            </tr>
            <tr id="caja-editar-${u.id}" style="display: none;" class="bg-light">
                <td colspan="8" class="p-3 border-bottom border-primary shadow-inner">
                    <div class="card card-body border-primary bg-white shadow-sm p-3">
                        <div class="row g-2 align-items-end">
                            <div class="col-md-3"><label class="form-label small">Nombre Completo</label><input type="text" id="edit-nom-${u.id}" class="form-control form-control-sm" value="${u.nombre}"></div>
                            <div class="col-md-2"><label class="form-label small">Telefono</label><input type="text" id="edit-tel-${u.id}" class="form-control form-control-sm" value="${u.telefono || ''}" maxlength="8"></div>
                            <div class="col-md-3"><label class="form-label small">Correo Electronico</label><input type="email" id="edit-email-${u.id}" class="form-control form-control-sm" value="${u.email || ''}"></div>
                            <div class="col-md-2"><label class="form-label small">Especialidad</label><input type="text" id="edit-esp-${u.id}" class="form-control form-control-sm" value="${u.especialidad || ''}"></div>
                            <div class="col-md-2"><label class="form-label small">Precio Consulta</label><input type="number" step="0.01" id="edit-pre-${u.id}" class="form-control form-control-sm" value="${u.precioConsulta || 0.0}"></div>
                            <div class="col-12 d-flex justify-content-end gap-2 mt-3"><button onclick="toggleFilaEditarUsuario(${u.id})" class="btn btn-outline-secondary btn-sm px-3">Cancelar</button><button onclick="guardarEdicionUsuario(${u.id})" class="btn btn-primary btn-sm px-4">Guardar Cambios</button></div>
                        </div>
                    </div>
                </td>
            </tr>`;
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
    } else {
        filaEdicion.style.display = "none";
    }
}

async function guardarEdicionUsuario(idUsuario) {
    try {
        const nomInput = document.getElementById(`edit-nom-${idUsuario}`);
        if (!nomInput) return;
        const nomVal = nomInput.value.trim();
        const telVal = document.getElementById(`edit-tel-${idUsuario}`).value.trim();
        const emailVal = document.getElementById(`edit-email-${idUsuario}`).value.trim();
        const espVal = document.getElementById(`edit-esp-${idUsuario}`).value.trim();
        const preVal = parseFloat(document.getElementById(`edit-pre-${idUsuario}`).value) || 0.0;

        if (!nomVal) { alert("El nombre del usuario no puede quedar vacio."); return; }

        const datosEditados = { nombre: nomVal, telefono: telVal || "00000000", email: emailVal, especialidad: espVal, precioConsulta: preVal };
        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datosEditados) });

        if (respuesta.ok) {
            alert(`Los datos de "${nomVal}" han sido actualizados exitosamente`);
            cargarUsuariosAdmin();
        } else {
            alert("Error en el servidor al modificar. Java rechazo los datos.");
        }
    } catch (error) {
        alert("Fallo de conexion critico.");
    }
}

async function eliminarUsuario(idUsuario, nombreUsuario) {
    if (!confirm(`¿Estas seguro de que deseas eliminar permanentemente a: "${nombreUsuario}"?`)) return;
    try {
        const respuesta = await fetch(`${API_URL}/users/${idUsuario}`, { method: "DELETE" });
        if (respuesta.ok) {
            alert(`El usuario "${nombreUsuario}" ha sido eliminado`);
            cargarUsuariosAdmin();
        } else {
            alert("No se pudo eliminar: El sistema protege usuarios con historiales medicos.");
        }
    } catch (error) {
        alert("Error de comunicacion con el servidor al intentar eliminar.");
    }
}

async function verExpedientePaciente(pacienteId) {
    const contenedor = document.getElementById("exp-contenido");
    const modalElement = document.getElementById('modalExpediente');
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    contenedor.innerHTML = `<p class="text-center text-muted py-3">Consultando expediente...</p>`;
    modal.show();

    try {
        const respuesta = await fetch(`${API_URL}/expedientes/paciente/${pacienteId}`);
        if (!respuesta.ok) {
            contenedor.innerHTML = `<div class="alert alert-warning text-center m-0">Este paciente aun no cuenta con un expediente clinico registrado.</div>`;
            return;
        }

        const exp = await respuesta.json();
        contenedor.innerHTML = `
            <div class="border-bottom pb-2 mb-3 text-center">
                <h4 class="text-primary font-monospace mb-0">${exp.numeroExpediente || 'Sin numero'}</h4>
                <small class="text-muted">ID de Registro Hospitalario: #${exp.id}</small>
            </div>
            <p class="mb-2"><strong>Tipo de Sangre:</strong> <span class="badge bg-danger fs-6">${exp.tipoSangre || 'No registrado'}</span></p>
            <p class="mb-2"><strong>Alergias Conocidas:</strong> <span class="text-dark">${exp.alergias || 'Ninguna'}</span></p>
            <p class="mb-2"><strong>Antecedentes Medicos:</strong> <br><span class="text-muted">${exp.antecedentesMedicos || 'Sin antecedentes'}</span></p>
            <hr>
            <p class="mb-0 text-danger"><strong>Contacto de Emergencia:</strong> <br><span>${exp.contactoEmergencia || 'No especificado'}</span></p>
        `;
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error de red al intentar conectar con el expediente.</div>`;
    }
}

async function cargarSucursalesAdmin() {
    const tabla = document.getElementById("tabla-sucursales-listado");
    const selectAlta = document.getElementById("reg-sucursal");

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`);
        if (!respuesta.ok) throw new Error("Error HTTP");
        listaGlobalSucursalesAdmin = await respuesta.json();

        if (selectAlta) {
            selectAlta.innerHTML = '<option value="">Seleccione una clinica / sucursal...</option>';
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

                tabla.innerHTML += `<tr><td><strong>#${s.id}</strong></td><td class="font-weight-bold">${s.nombre}</td><td>${s.direccion}</td><td>${especialidadesBadge}</td></tr>`;
            });
        }
    } catch (error) {
        if (selectAlta) selectAlta.innerHTML = '<option value="">Error al conectar con el servidor</option>';
        if (tabla) tabla.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Error al conectar con la base de datos</td></tr>`;
    }
}

async function registrarAuditoria(accionRealizada, detalleCambio) {
    const usuarioEjecutor = miUsuarioActual ? miUsuarioActual.usuario : "SISTEMA";
    const logAuditoria = { accion: accionRealizada, detalle: detalleCambio, usuarioEjecutor: usuarioEjecutor, fechaHora: new Date().toISOString() };
    try { await fetch(`${API_URL}/auditoria`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logAuditoria) }); } catch (error) {}
}

async function crearPersonalAdmin() {
    const alertBox = document.getElementById("medico-alert");
    if (alertBox) alertBox.style.display = "none";

    const rol = document.getElementById("emp-rol").value;
    const sucursalVal = document.getElementById("reg-sucursal").value;
    const nombre = document.getElementById("med-nombre").value.trim();
    const dpi = document.getElementById("med-dpi").value.trim();
    const usuario = document.getElementById("med-user").value.trim();
    const password = document.getElementById("med-pass").value;
    const email = document.getElementById("med-email").value.trim();
    const telefono = document.getElementById("med-tel").value.trim();
    const especialidad = (rol === "MEDIC") ? document.getElementById("med-esp").value : "General";
    const precio = (rol === "MEDIC") ? parseFloat(document.getElementById("med-precio").value || 0) : 0.00;

    if (!sucursalVal) { mostrarAlertaPersonal("Por favor seleccione una clinica / sucursal para continuar.", "warning"); return; }
    if (dpi.length !== 13) { mostrarAlertaPersonal("El DPI / CUI debe contener exactamente 13 digitos numericos.", "warning"); return; }

    const idSucursalNum = parseInt(sucursalVal, 10);
    const nuevoEmpleado = { nombre: nombre, dpi: dpi, cui: dpi, usuario: usuario, username: usuario, password: password, pass: password, contrasena: password, email: email, correo: email, telefono: telefono || "00000000", nit: "CF", role: { nombre: rol }, rol: { nombre: rol }, sucursal: idSucursalNum ? { id: idSucursalNum } : null, sucursalId: idSucursalNum, especialidad: especialidad, precio: precio, precioConsulta: precio, estado: "ACTIVO", cuentaBloqueada: false };

    try {
        const respuesta = await fetch(`${API_URL}/users/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nuevoEmpleado) });
        const datos = await respuesta.json();
        if (respuesta.ok || datos.exito || datos.id) {
            mostrarAlertaPersonal(`El usuario ha sido registrado exitosamente en el hospital.`, "success");
            document.getElementById("form-alta-personal").reset();
            if (typeof cargarUsuariosAdmin === "function") cargarUsuariosAdmin();
        } else {
            mostrarAlertaPersonal("Rechazo del servidor: " + (datos.error || datos.mensaje), "danger");
        }
    } catch (error) {
        mostrarAlertaPersonal("Error de red: No se pudo conectar con el endpoint.", "danger");
    }
}

function mostrarAlertaPersonal(mensaje, tipo) {
    const alertBox = document.getElementById("medico-alert");
    if (alertBox) {
        alertBox.className = `alert alert-${tipo} text-center fw-bold mt-3`;
        alertBox.innerText = mensaje;
        alertBox.style.display = "block";
    } else { alert(mensaje); }
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

    const sucursalSelec = listaGlobalSucursalesAdmin.find(s => String(s.id) === String(idSucursal));
    selEsp.innerHTML = '<option value="">Seleccione especialidad medica...</option>';

    if (sucursalSelec && sucursalSelec.especialidades && sucursalSelec.especialidades.length > 0) {
        sucursalSelec.especialidades.forEach(e => { selEsp.innerHTML += `<option value="${e}">${e}</option>`; });
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

    if (!nombre || !direccion) { alert("Debe ingresar el nombre y la direccion de la sucursal."); return; }
    if (listaEspecialidades.length === 0) { alert("Debe seleccionar al menos una especialidad medica antes de guardar."); return; }

    const payload = { nombre: nombre, direccion: direccion, especialidades: listaEspecialidades };

    try {
        const respuesta = await fetch(`${API_URL}/sucursales`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (respuesta.ok) {
            alert("La sucursal y sus especialidades fueron guardadas con exito.");
            document.getElementById("nueva-suc-nombre").value = "";
            document.getElementById("nueva-suc-dir").value = "";
            document.querySelectorAll(".chk-esp").forEach(casilla => casilla.checked = false);
            cargarSucursalesAdmin();
        } else {
            alert("El servidor rechazo los datos. Codigo: " + respuesta.status);
        }
    } catch (error) {
        alert("Fallo de comunicacion con el servidor.");
    }
}

function agregarEspecialidadAlMenu() {
    const inputNueva = document.getElementById("input-nueva-especialidad");
    const nombreEspecialidad = inputNueva.value.trim();

    if (!nombreEspecialidad) { alert("Por favor escriba el nombre de la nueva especialidad medica."); return; }

    const contenedor = document.getElementById("contenedor-esp-sucursal");
    const existentes = Array.from(contenedor.querySelectorAll(".chk-esp")).map(chk => chk.value.toLowerCase());
    if (existentes.includes(nombreEspecialidad.toLowerCase())) { alert("Esa especialidad ya se encuentra en la lista."); inputNueva.value = ""; return; }

    const idUnico = "esp-custom-" + Date.now();
    const nuevoDiv = document.createElement("div");
    nuevoDiv.className = "col-md-3";
    nuevoDiv.innerHTML = `<div class="form-check"><input class="form-check-input chk-esp" type="checkbox" value="${nombreEspecialidad}" id="${idUnico}" checked><label class="form-check-label font-weight-bold text-success" for="${idUnico}">${nombreEspecialidad}</label></div>`;
    contenedor.appendChild(nuevoDiv);
    inputNueva.value = "";
}

function verDetallesUsuario(id) {
    const u = window.usuariosDirectorioCache?.find(user => user.id === id);
    if (!u) { alert("No se pudieron cargar los detalles. Actualice la tabla e intente de nuevo."); return; }

    const rolNombre = u.role?.nombre || u.rol || "USUARIO";
    const sucursalNombre = u.sucursal?.nombre || u.sucursal?.direccion || (u.sucursalId ? `Sucursal #${u.sucursalId}` : null);
    const estadoTexto = (u.estado === 1 || u.estado === true || u.estado === "ACTIVO") ? "ACTIVO" : "INACTIVO";
    const colorEstado = estadoTexto === "ACTIVO" ? "success" : "danger";

    let camposHtml = "";
    camposHtml += `<div class="col-12 mb-2"><small class="text-muted d-block">Nombre Completo:</small><strong>${u.nombre || 'No registrado'}</strong></div>`;
    if (u.username) camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">Usuario:</small><span class="badge bg-secondary">${u.username}</span></div>`;
    if (rolNombre) camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">Rol:</small><span class="badge bg-primary">${rolNombre}</span></div>`;
    if (u.dpi) camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">DPI / CUI:</small><strong>${u.dpi}</strong></div>`;
    if (u.email) camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">Correo Electronico:</small><strong>${u.email}</strong></div>`;

    if (u.telefono && u.telefono !== "") camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">Telefono:</small><strong>${u.telefono}</strong></div>`;
    if (u.nit && u.nit !== "" && u.nit !== "CF") camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">NIT:</small><strong>${u.nit}</strong></div>`;
    else if (u.nit === "CF") camposHtml += `<div class="col-6 mb-2"><small class="text-muted d-block">NIT:</small><span class="text-muted">Consumidor Final (CF)</span></div>`;

    if (u.especialidad && u.especialidad !== "" && u.especialidad !== "[NULL]") {
        camposHtml += `<div class="col-12 mb-2 p-2 bg-light rounded border-start border-info border-4"><small class="text-muted d-block">Especialidad Medica:</small><strong class="text-dark fs-6">${u.especialidad}</strong></div>`;
    }
    if (sucursalNombre) camposHtml += `<div class="col-12 mb-2"><small class="text-muted d-block">Clinica / Sucursal Asignada:</small><strong>${sucursalNombre}</strong></div>`;

    camposHtml += `<hr class="my-2">`;
    camposHtml += `<div class="col-6 mb-1"><small class="text-muted d-block">Estado de la cuenta:</small><span class="badge bg-${colorEstado}">${estadoTexto}</span></div>`;
    if (u.intentos_fallidos !== undefined && u.intentos_fallidos > 0) camposHtml += `<div class="col-6 mb-1"><small class="text-muted d-block">Intentos fallidos:</small><span class="badge bg-warning text-dark">${u.intentos_fallidos} de 3</span></div>`;
    if (u.cuenta_bloqueada) camposHtml += `<div class="col-12 mt-2"><div class="alert alert-danger p-2 mb-0 text-center"><b>Esta cuenta se encuentra bloqueada por seguridad</b></div></div>`;

    const contenedor = document.getElementById("contenido-detalles-usuario");
    if (contenedor) {
        contenedor.innerHTML = `<div class="row g-2">${camposHtml}</div>`;
        new bootstrap.Modal(document.getElementById("modalDetallesUsuario")).show();
    }
}

function desbloquearUsuario(id, nombre) {
    if (!confirm(`¿Estas seguro de que deseas desbloquear y rehabilitar el acceso al usuario: ${nombre}?`)) return;
    fetch(`${API_URL}/users/${id}/desbloquear`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } })
        .then(response => { if (!response.ok) throw new Error("Error en servidor."); return response.json(); })
        .then(data => { alert(`La cuenta de ${nombre} ha sido desbloqueada.`); if (typeof cargarUsuariosAdmin === "function") { cargarUsuariosAdmin(); } else { location.reload(); } })
        .catch(error => { alert("No se pudo desbloquear al usuario."); });
}
function recargarMisCitas() {
    // 1. Verificamos que tengamos el ID del paciente guardado en memoria
    if (!miPacienteId) {
        document.getElementById("lista-citas-paciente").innerHTML =
            '<p class="text-danger text-center my-3">Error de sesión. Por favor inicie sesión de nuevo.</p>';
        return;
    }

    // 2. Mostramos el mensaje de carga
    const contenedor = document.getElementById("lista-citas-paciente");
    if (contenedor) {
        contenedor.innerHTML = '<p class="text-muted text-center my-3">Actualizando su historial médico...</p>';
    }

    // 3. Llamamos a tu función nativa que ya pinta las citas correctamente
    renderizarMisCitas();
}