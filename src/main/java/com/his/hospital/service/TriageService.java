package com.his.hospital.service;

import com.his.hospital.dto.TriageDTO;
import com.his.hospital.entity.Cita;
import com.his.hospital.entity.Triage;
import com.his.hospital.entity.User;
import com.his.hospital.repository.CitaRepository;
import com.his.hospital.repository.TriageRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TriageService {

    @Autowired
    private TriageRepository triageRepository;

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private UserRepository userRepository;

    public Triage registrarTriage(TriageDTO dto) {
        // 1. Buscar si la cita y la enfermera existen
        Cita cita = citaRepository.findById(dto.getCitaId())
                .orElseThrow(() -> new RuntimeException("Error: La cita médica especificada no existe."));

        User enfermera = userRepository.findById(dto.getEnfermeraId())
                .orElseThrow(() -> new RuntimeException("Error: El usuario de enfermería no está registrado."));

        // 2. VALIDACIONES CLINICAS
        if ("CANCELADA".equals(cita.getEstado())) {
            throw new RuntimeException("Error: No se pueden registrar signos vitales a una cita CANCELADA.");
        }
        if (triageRepository.existsByCitaId(dto.getCitaId())) {
            throw new RuntimeException("Error: Esta cita ya pasó por triage anteriormente.");
        }
        if (dto.getAltura() <= 0 || dto.getPeso() <= 0) {
            throw new RuntimeException("Error: El peso y la altura deben ser valores mayores a cero.");
        }

        // 3. CÁLCULO AUTOMÁTICO DEL IMC (Peso / Altura al cuadrado)
        // Redondeamos el resultado a 2 decimales para que sea legible (ej: 23.70)
        double calculoImc = dto.getPeso() / Math.pow(dto.getAltura(), 2);
        double imcRedondeado = Math.round(calculoImc * 100.0) / 100.0;

        // 4. Armar la entidad Triage
        Triage triage = new Triage();
        triage.setCita(cita);
        triage.setEnfermera(enfermera);
        triage.setTemperatura(dto.getTemperatura());
        triage.setPresionArterial(dto.getPresionArterial());
        triage.setFrecuenciaCardiaca(dto.getFrecuenciaCardiaca());
        triage.setFrecuenciaRespiratoria(dto.getFrecuenciaRespiratoria());
        triage.setSaturacionOxigeno(dto.getSaturacionOxigeno());
        triage.setPeso(dto.getPeso());
        triage.setAltura(dto.getAltura());
        triage.setImc(imcRedondeado); // ¡Aquí guardamos el cálculo automático!
        triage.setCategoria(dto.getCategoria());
        triage.setObservaciones(dto.getObservaciones());
        triage.setFechaHora(LocalDateTime.now());

        // 5. ACTUALIZAR ESTADO DE LA CITA
        // Al terminar el triage, el paciente pasa formalmente a esperar al doctor
        cita.setEstado("EN_SALA_DE_ESPERA");
        citaRepository.save(cita);

        return triageRepository.save(triage);
    }

    public Triage obtenerPorCita(Long citaId) {
        return triageRepository.findByCitaId(citaId)
                .orElseThrow(() -> new RuntimeException("Aún no se ha registrado triage para la cita con ID: " + citaId));
    }
}