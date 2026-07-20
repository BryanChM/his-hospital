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



    // Agendar nueva cita con validación de choques de horario
    @Transactional
    public Cita agendarCita(CitaDTO dto) {

        // 1. Validar que el ID no llegue nulo desde el frontend
        if (dto.getMedicoId() == null) {
            throw new RuntimeException("Error: El ID del médico llegó vacío desde el formulario web.");
        }
        if (dto.getPacienteId() == null) {
            throw new RuntimeException("Error: El ID del paciente llegó vacío.");
        }

        // 2. BUSCAR AL MÉDICO REAL EN POSTGRESQL
        User medico = userRepository.findById(dto.getMedicoId())
                .orElseThrow(() -> new RuntimeException("El médico seleccionado (ID: " + dto.getMedicoId() + ") no existe en la base de datos."));

        // 3. BUSCAR AL PACIENTE REAL
        User paciente = userRepository.findById(dto.getPacienteId())
                .orElseThrow(() -> new RuntimeException("El paciente seleccionado no existe."));
        LocalDateTime inicioVentana = dto.getFechaHora().minusMinutes(29);
        LocalDateTime finVentana = dto.getFechaHora().plusMinutes(29);

        boolean choqueMedico = citaRepository.existeChoqueHorarioMedico(
                dto.getMedicoId(),
                inicioVentana,
                finVentana
        );

        if (choqueMedico) {
            throw new RuntimeException("⚠️ Horario no disponible: El médico seleccionado ya tiene una consulta programada en ese rango de hora.");
        }
        // 4. Armar la cita con los objetos encontrados
        Cita nuevaCita = new Cita();
        nuevaCita.setMedico(medico);       // <-- Aquí le pasamos el objeto completo, ¡ya nunca será null!
        nuevaCita.setPaciente(paciente);
        nuevaCita.setFechaHora(dto.getFechaHora());
        nuevaCita.setMotivo(dto.getMotivo());
        nuevaCita.setEstado("AGENDADA");

        // 5. Guardar sin errores de Hibernate
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