package com.his.hospital.service;

import com.his.hospital.dto.CitaDTO;
import com.his.hospital.entity.Cita;
import com.his.hospital.entity.User;
import com.his.hospital.repository.CitaRepository;
import com.his.hospital.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CitaService {

    @Autowired
    private EmailService emailService;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CitaRepository citaRepository;

    @Transactional
    public Cita agendarCita(CitaDTO dto) {
        Long idMedicoFinal = (dto.getMedicoId() != null) ? dto.getMedicoId() :
                (dto.getMedico() != null && dto.getMedico().getId() != null) ? dto.getMedico().getId() : null;

        Long idPacienteFinal = (dto.getPacienteId() != null) ? dto.getPacienteId() :
                (dto.getPaciente() != null && dto.getPaciente().getId() != null) ? dto.getPaciente().getId() : null;

        Long idSucursalFinal = (dto.getSucursalId() != null) ? dto.getSucursalId() :
                (dto.getSucursal() != null && dto.getSucursal().getId() != null) ? dto.getSucursal().getId() : null;

        if (idMedicoFinal == null) {
            throw new RuntimeException("Error: El ID del médico llegó vacío desde el formulario web.");
        }
        if (idPacienteFinal == null) {
            throw new RuntimeException("Error: El ID del paciente llegó vacío desde el formulario web.");
        }
        if (idSucursalFinal == null) {
            throw new RuntimeException("Error: El ID de la sucursal llegó vacío desde el formulario web.");
        }
        if (dto.getFechaHora() == null) {
            throw new RuntimeException("Error: La fecha y hora de la consulta es obligatoria.");
        }
        if (dto.getMotivo() == null || dto.getMotivo().trim().isEmpty()) {
            throw new RuntimeException("Error: Debe indicar el motivo de la consulta.");
        }

        User medico = userRepository.findById(idMedicoFinal)
                .orElseThrow(() -> new RuntimeException("El médico seleccionado (ID: " + idMedicoFinal + ") no existe en la base de datos."));

        User paciente = userRepository.findById(idPacienteFinal)
                .orElseThrow(() -> new RuntimeException("El paciente seleccionado (ID: " + idPacienteFinal + ") no existe en la base de datos."));

        LocalDateTime inicioVentana = dto.getFechaHora().minusMinutes(29);
        LocalDateTime finVentana = dto.getFechaHora().plusMinutes(29);

        boolean choqueMedico = citaRepository.existeChoqueHorarioMedico(
                idMedicoFinal,
                inicioVentana,
                finVentana
        );

        if (choqueMedico) {
            throw new RuntimeException("Horario no disponible: El médico seleccionado ya tiene una consulta programada en ese rango de hora.");
        }

        Cita nuevaCita = new Cita();
        nuevaCita.setMedicoId(medico.getId());
        nuevaCita.setPacienteId(paciente.getId());

        // CORRECCIÓN 1: Creamos un objeto Sucursal solo con el ID para satisfacer a Cita.java
        com.his.hospital.entity.Sucursal sucursalAsignada = new com.his.hospital.entity.Sucursal();
        sucursalAsignada.setId(idSucursalFinal);
        nuevaCita.setSucursal(sucursalAsignada);

        nuevaCita.setEspecialidad(dto.getEspecialidad());

        // CORRECCIÓN 2: Asignamos "NORMAL" directamente porque el DTO no tiene ese campo
        nuevaCita.setPrioridad("NORMAL");

        nuevaCita.setFechaHora(dto.getFechaHora());
        nuevaCita.setMotivo(dto.getMotivo().trim());
        nuevaCita.setObservaciones(dto.getObservaciones() != null ? dto.getObservaciones().trim() : "");
        nuevaCita.setEstado("AGENDADA");

        Cita citaGuardada = citaRepository.save(nuevaCita);

        String fechaLimpia = dto.getFechaHora().toString().replace("T", " a las ") + " hrs";
        String asuntoCita = " Confirmación de Cita Médica - Hospital HIS";
        String cuerpoCita = "Hola " + paciente.getNombre() + ",\n\n" +
                "Te confirmamos que tu cita médica ha sido programada y registrada en nuestro sistema clínico.\n\n" +
                " DETALLES DE TU CONSULTA:\n" +
                "--------------------------------------------------\n" +
                "• Fecha y Hora: " + fechaLimpia + "\n" +
                "• Médico Especialista: Dr(a). " + medico.getNombre() + "\n" +
                "• Especialidad / Clínica: " + medico.getEspecialidad() + "\n" +
                "• Motivo registrado: " + dto.getMotivo() + "\n" +
                "--------------------------------------------------\n\n" +
                " RECOMENDACIÓN:\n" +
                "Por favor preséntate en la recepción de la clínica 15 minutos antes de tu horario programado con tu DPI en mano para la toma de signos vitales (Triage).\n\n" +
                "¡Esperamos verte pronto!\nPortal Clínico Hospital HIS";

        emailService.enviarCorreo(paciente.getEmail(), asuntoCita, cuerpoCita);

        return citaGuardada;
    }

    public List<Cita> obtenerCitasPorPaciente(Long pacienteId) {
        return citaRepository.findByPacienteIdOrderByFechaHoraDesc(pacienteId);
    }

    public List<Cita> obtenerCitasPorMedico(Long medicoId) {
        return citaRepository.findByMedicoIdOrderByFechaHoraDesc(medicoId);
    }

    public Cita cancelarCita(Long citaId) {
        Cita cita = citaRepository.findById(citaId)
                .orElseThrow(() -> new RuntimeException("Error: La cita con ID " + citaId + " no existe."));

        if ("CANCELADA".equals(cita.getEstado())) {
            throw new RuntimeException("Error: Esta cita ya se encontraba cancelada.");
        }

        cita.setEstado("CANCELADA");
        return citaRepository.save(cita);
    }

    public List<Cita> obtenerTodasLasCitas() {
        return citaRepository.findAll();
    }

    public Cita registrarTriage(Long id, String observaciones) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada."));

        cita.setObservaciones(observaciones);
        cita.setEstado("EN_SALA_DE_ESPERA");

        return citaRepository.save(cita);
    }

    public Cita atenderCita(Long id, String receta) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada."));

        String triageAnterior = (cita.getObservaciones() != null) ? cita.getObservaciones() + " | " : "";
        cita.setObservaciones(triageAnterior + "Receta: " + receta);
        cita.setEstado("ATENDIDA");

        return citaRepository.save(cita);
    }

    // Método para registrar la llegada del paciente en Recepción
    public Cita registrarLlegada(Long id) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró ninguna cita con el ID: " + id));

        cita.setEstado("EN_ESPERA_TRIAGE");
        return citaRepository.save(cita);
    }
}