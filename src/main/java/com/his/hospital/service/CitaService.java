package com.his.hospital.service;

import com.his.hospital.dto.CitaDTO;
import com.his.hospital.entity.Cita;
import com.his.hospital.entity.User;
import com.his.hospital.repository.CitaRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CitaService {

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private UserRepository userRepository;

    // Agendar nueva cita con validación de choques de horario
    public Cita agendarCita(CitaDTO dto) {
        User paciente = userRepository.findById(dto.getPacienteId())
                .orElseThrow(() -> new RuntimeException("Error: El paciente especificado no existe."));

        User medico = userRepository.findById(dto.getMedicoId())
                .orElseThrow(() -> new RuntimeException("Error: El médico especificado no existe."));

        LocalDateTime fechaConsulta = dto.getFechaHora();

        if (fechaConsulta.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Error: No puedes agendar una cita en una fecha o hora pasada.");
        }

        boolean choque = citaRepository.existsByMedicoIdAndFechaHoraAndEstadoNot(
                dto.getMedicoId(), fechaConsulta, "CANCELADA");

        if (choque) {
            throw new RuntimeException("Error: El médico ya tiene una consulta agendada exactamente en esa fecha y hora.");
        }

        Cita cita = new Cita();
        cita.setPaciente(paciente);
        cita.setMedico(medico);
        cita.setFechaHora(fechaConsulta);
        cita.setMotivo(dto.getMotivo());
        cita.setObservaciones(dto.getObservaciones());
        cita.setEstado("PROGRAMADA");

        return citaRepository.save(cita);
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

    // ¡AQUÍ ESTÁ EL MÉTODO QUE FALTABA PARA EL ADMINISTRADOR!
    public List<Cita> obtenerTodasLasCitas() {
        return citaRepository.findAll();
    }

    public Cita registrarTriage(Long id, String observaciones) {
        // Buscamos la cita (si tu repositorio se llama diferente, cámbialo aquí)
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));

        // Asignamos las observaciones (si en tu Cita.java se llama diferente, ej: setObs, ajustalo aquí)
        cita.setObservaciones(observaciones);

        // Cambiamos el estado (si usas un Enum en vez de String, sería ej: cita.setEstado(EstadoCita.EN_SALA_DE_ESPERA))
        cita.setEstado("EN_SALA_DE_ESPERA");

        return citaRepository.save(cita);
    }
    public Cita atenderCita(Long id, String receta) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));

        // Conservamos los signos vitales de enfermería y le sumamos la receta del médico
        String triageAnterior = (cita.getObservaciones() != null) ? cita.getObservaciones() + " | " : "";
        cita.setObservaciones(triageAnterior + "Receta: " + receta);

        // ¡LO MÁS IMPORTANTE! Cambiar a ATENDIDA saca al paciente del flujo activo del hospital
        cita.setEstado("ATENDIDA");
        return citaRepository.save(cita);
    }
}