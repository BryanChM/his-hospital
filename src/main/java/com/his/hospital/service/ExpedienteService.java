package com.his.hospital.service;

import com.his.hospital.dto.ExpedienteDTO;
import com.his.hospital.entity.Expediente;
import com.his.hospital.entity.User;
import com.his.hospital.repository.ExpedienteRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class ExpedienteService {

    @Autowired
    private ExpedienteRepository expedienteRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Expediente crearExpediente(ExpedienteDTO dto) {

        // 1. Validar ID de paciente
        if (dto.getPacienteId() == null) {
            throw new RuntimeException("Error: Debe indicar el ID del paciente.");
        }

        // 2. Validar que el paciente no tenga ya un expediente (evitar duplicados)
        if (expedienteRepository.existsByPacienteId(dto.getPacienteId())) {
            throw new RuntimeException("⚠️ El paciente seleccionado ya cuenta con un expediente clínico activo.");
        }

        // 3. Buscar el objeto paciente en la base de datos
        User paciente = userRepository.findById(dto.getPacienteId())
                .orElseThrow(() -> new RuntimeException("El paciente con ID " + dto.getPacienteId() + " no existe."));

        // 4. Generar un número de expediente único (Ej: EXP-2026-ID)
        String numeroGenerado = "EXP-2026-" + String.format("%04d", dto.getPacienteId());

        // 5. Crear y poblar la entidad
        Expediente nuevo = new Expediente();
        nuevo.setPaciente(paciente);
        nuevo.setNumeroExpediente(numeroGenerado);
        nuevo.setTipoSangre(dto.getTipoSangre() != null ? dto.getTipoSangre() : "No especificado");
        nuevo.setAlergias(dto.getAlergias() != null ? dto.getAlergias() : "Ninguna");
        nuevo.setAntecedentesMedicos(dto.getAntecedentesMedicos() != null ? dto.getAntecedentesMedicos() : "Ninguno");
        nuevo.setContactoEmergencia(dto.getContactoEmergencia());
        nuevo.setFechaCreacion(LocalDateTime.now());

        return expedienteRepository.save(nuevo);
    }

    // Método extra para obtener el expediente de un paciente
    public Expediente obtenerPorPaciente(Long pacienteId) {
        return expedienteRepository.findByPacienteId(pacienteId)
                .orElseThrow(() -> new RuntimeException("No se encontró ningún expediente para el paciente ID: " + pacienteId));
    }
}