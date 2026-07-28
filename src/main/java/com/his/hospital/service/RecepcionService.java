package com.his.hospital.service;

import com.his.hospital.entity.*;
import com.his.hospital.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RecepcionService {

    private final CitaRepository citaRepository;
    private final UserRepository userRepository;

    // Método para buscar citas (usado en la línea 21 de tu controlador)
    public Map<String, Object> buscarCita(String criterio, String tipoBusqueda) {
        Map<String, Object> resultado = new HashMap<>();

        if ("POR_CITA".equalsIgnoreCase(tipoBusqueda)) {
            try {
                Optional<Cita> citaOpt = citaRepository.findById(Long.valueOf(criterio));
                if (citaOpt.isPresent()) {
                    resultado.put("tipoResultado", "ENCONTRADA");
                    resultado.put("citas", List.of(citaOpt.get()));
                    return resultado;
                }
            } catch (NumberFormatException e) {
                // Si no es un número válido, pasa al error
            }
        } else if ("POR_DPI".equalsIgnoreCase(tipoBusqueda)) {
            Optional<User> userOpt = userRepository.findByDpi(criterio);

            if (userOpt.isEmpty()) {
                resultado.put("tipoResultado", "NO_REGISTRADO_FA03");
                resultado.put("mensaje", "No se encontró ningún paciente con el DPI: " + criterio);
                resultado.put("subTexto", "Es necesario registrar al paciente antes de continuar.");
                return resultado;
            } else {
                List<Cita> todasLasCitas = citaRepository.findAll();
                List<Cita> citasDelPaciente = todasLasCitas.stream()
                        .filter(c -> "CONFIRMADA".equalsIgnoreCase(String.valueOf(c.getEstado())) ||
                                "PENDIENTE_PAGO".equalsIgnoreCase(String.valueOf(c.getEstado())) ||
                                "PROGRAMADA".equalsIgnoreCase(String.valueOf(c.getEstado())))
                        .toList();

                if (!citasDelPaciente.isEmpty()) {
                    resultado.put("tipoResultado", "ENCONTRADA");
                    resultado.put("citas", citasDelPaciente);
                    return resultado;
                }

                resultado.put("tipoResultado", "SIN_CITAS_FA04");
                resultado.put("paciente", userOpt.get());
                resultado.put("mensaje", "El paciente está registrado pero no tiene citas activas.");
                resultado.put("subTexto", "Puede crear una nueva cita (Walk-in) para este paciente.");
                return resultado;
            }
        }

        resultado.put("tipoResultado", "ERROR");
        resultado.put("mensaje", "No se encontraron resultados con los criterios proporcionados.");
        return resultado;
    }

    // Método para registrar llegada (usado en la línea 29 de tu controlador)
    @Transactional
    public String registrarLlegada(Long citaId) {
        Cita cita = citaRepository.findById(citaId)
                .orElseThrow(() -> new RuntimeException("Error al registrar la llegada: Cita no encontrada."));

        if (!"CONFIRMADA".equalsIgnoreCase(cita.getEstado()) && !"PROGRAMADA".equalsIgnoreCase(cita.getEstado())) {
            throw new IllegalStateException("Operación no permitida. La cita no está en estado Confirmada o Programada.");
        }

        cita.setEstado("PACIENTE_PRESENTE");
        cita.setHoraLlegada(LocalDateTime.now());
        citaRepository.save(cita);

        if ("EMERGENCIA".equalsIgnoreCase(String.valueOf(cita.getPrioridad()))) {
            return "Paciente registrado con prioridad de EMERGENCIA. El paciente debe pasar directamente a toma de signos vitales.";
        }

        return "La llegada del paciente ha sido registrada exitosamente. El paciente debe pasar a la sala de espera.";
    }
}