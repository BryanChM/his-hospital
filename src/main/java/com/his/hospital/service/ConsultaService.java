package com.his.hospital.service;

import com.his.hospital.dto.ConsultaDTO;
import com.his.hospital.entity.Cita;
import com.his.hospital.entity.Consulta;
import com.his.hospital.entity.User;
import com.his.hospital.repository.CitaRepository;
import com.his.hospital.repository.ConsultaRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ConsultaService {

    @Autowired
    private ConsultaRepository consultaRepository;

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private UserRepository userRepository;

    public Consulta registrarConsulta(ConsultaDTO dto) {
        // 1. Buscar que la cita y el médico existan en la base de datos
        Cita cita = citaRepository.findById(dto.getCitaId())
                .orElseThrow(() -> new RuntimeException("Error: La cita médica especificada no existe."));

        User medico = userRepository.findById(dto.getMedicoId())
                .orElseThrow(() -> new RuntimeException("Error: El médico especificado no está registrado en el sistema."));

        // 2. VALIDACIONES CLÍNICAS ESTRICTAS
        if (consultaRepository.existsByCitaId(dto.getCitaId())) {
            throw new RuntimeException("Error: Esta cita ya fue atendida y cuenta con una consulta médica registrada.");
        }

        // REGLA CLAVE: El paciente debe haber pasado por Triage primero (su estado debe ser EN_SALA_DE_ESPERA)
        if (!"EN_SALA_DE_ESPERA".equals(cita.getEstado())) {
            throw new RuntimeException("Error Clínico: No se puede atender al paciente. Su cita está en estado '"
                    + cita.getEstado() + "'. El paciente debe pasar primero por Enfermería (Triage) antes de entrar a consulta.");
        }

        // 3. Crear y armar la entidad Consulta
        Consulta consulta = new Consulta();
        consulta.setCita(cita);
        consulta.setMedico(medico);
        consulta.setDiagnostico(dto.getDiagnostico());
        consulta.setSintomasYEvolucion(dto.getSintomasYEvolucion());
        consulta.setRecetaMedica(dto.getRecetaMedica());
        consulta.setIndicacionesGenerales(dto.getIndicacionesGenerales());
        consulta.setFechaHora(LocalDateTime.now());

        // 4. ACTUALIZAR EL ESTADO DE LA CITA
        // La cita ha culminado con éxito y el paciente puede pasar a farmacia o a su casa
        cita.setEstado("ATENDIDA");
        citaRepository.save(cita);

        return consultaRepository.save(consulta);
    }

    public Consulta obtenerPorCita(Long citaId) {
        return consultaRepository.findByCitaId(citaId)
                .orElseThrow(() -> new RuntimeException("Aún no se ha registrado una consulta médica para la cita con ID: " + citaId));
    }
}