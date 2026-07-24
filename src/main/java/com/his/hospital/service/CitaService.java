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
    private UserRepository userRepository;

    @Autowired
    private CitaRepository citaRepository;

    // Agendar nueva cita con validación de choques de horario (BLINDADO)
    @Transactional
    public Cita agendarCita(CitaDTO dto) {
        // 1. EXTRACCIÓN INTELIGENTE DE IDs (Busca tanto en variable plana como en objeto)
        Long idMedicoFinal = (dto.getMedicoId() != null) ? dto.getMedicoId() :
                (dto.getMedico() != null && dto.getMedico().getId() != null) ? dto.getMedico().getId() : null;

        Long idPacienteFinal = (dto.getPacienteId() != null) ? dto.getPacienteId() :
                (dto.getPaciente() != null && dto.getPaciente().getId() != null) ? dto.getPaciente().getId() : null;

        // 2. Validaciones de seguridad
        if (idMedicoFinal == null) {
            throw new RuntimeException("Error: El ID del médico llegó vacío desde el formulario web.");
        }
        if (idPacienteFinal == null) {
            throw new RuntimeException("Error: El ID del paciente llegó vacío desde el formulario web.");
        }
        if (dto.getFechaHora() == null) {
            throw new RuntimeException("Error: La fecha y hora de la consulta es obligatoria.");
        }
        if (dto.getMotivo() == null || dto.getMotivo().trim().isEmpty()) {
            throw new RuntimeException("Error: Debe indicar el motivo de la consulta.");
        }

        // 3. Buscar al médico real en PostgreSQL
        User medico = userRepository.findById(idMedicoFinal)
                .orElseThrow(() -> new RuntimeException("El médico seleccionado (ID: " + idMedicoFinal + ") no existe en la base de datos."));

        // 4. Buscar al paciente real en PostgreSQL
        User paciente = userRepository.findById(idPacienteFinal)
                .orElseThrow(() -> new RuntimeException("El paciente seleccionado (ID: " + idPacienteFinal + ") no existe en la base de datos."));

        // 5. Validación de ventana de tiempo (choque de horarios)
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

        // 6. Armar y guardar la cita médica
        Cita nuevaCita = new Cita();
        nuevaCita.setMedico(medico);
        nuevaCita.setPaciente(paciente);
        nuevaCita.setFechaHora(dto.getFechaHora());
        nuevaCita.setMotivo(dto.getMotivo().trim());
        nuevaCita.setObservaciones(dto.getObservaciones() != null ? dto.getObservaciones().trim() : "");
        nuevaCita.setEstado("AGENDADA");

        return citaRepository.save(nuevaCita);
    }

    // Listar citas por paciente
    public List<Cita> obtenerCitasPorPaciente(Long pacienteId) {
        return citaRepository.findByPacienteIdOrderByFechaHoraDesc(pacienteId);
    }

    // Cancelar cita sin borrar historial
    public Cita cancelarCita(Long citaId) {
        Cita cita = citaRepository.findById(citaId)
                .orElseThrow(() -> new RuntimeException("Error: La cita con ID " + citaId + " no existe."));

        if ("CANCELADA".equals(cita.getEstado())) {
            throw new RuntimeException("Error: Esta cita ya se encontraba cancelada.");
        }

        cita.setEstado("CANCELADA");
        return citaRepository.save(cita);
    }

    // Listar todas las citas para el Administrador
    public List<Cita> obtenerTodasLasCitas() {
        return citaRepository.findAll();
    }

    // Registrar signos vitales (Triage de Enfermería)
    public Cita registrarTriage(Long id, String observaciones) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada."));

        cita.setObservaciones(observaciones);
        cita.setEstado("EN_SALA_DE_ESPERA");

        return citaRepository.save(cita);
    }

    // Finalizar consulta médica con receta
    public Cita atenderCita(Long id, String receta) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada."));

        String triageAnterior = (cita.getObservaciones() != null) ? cita.getObservaciones() + " | " : "";
        cita.setObservaciones(triageAnterior + "Receta: " + receta);
        cita.setEstado("ATENDIDA");

        return citaRepository.save(cita);
    }
}