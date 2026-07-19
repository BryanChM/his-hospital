package com.his.hospital.controller;

import com.his.hospital.dto.CitaDTO;
import com.his.hospital.entity.Cita;
import com.his.hospital.service.CitaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/citas")
@CrossOrigin("*")
public class CitaController {

    @Autowired
    private CitaService citaService;

    // Endpoint para agendar cita (POST /api/citas/agendar)
    @PostMapping("/agendar")
    public ResponseEntity<?> agendar(@RequestBody CitaDTO dto) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Cita citaCreada = citaService.agendarCita(dto);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "¡Cita agendada exitosamente en el HIS!");
            respuesta.put("cita_id", citaCreada.getId());
            respuesta.put("paciente", citaCreada.getPaciente().getNombre());
            respuesta.put("medico", citaCreada.getMedico().getNombre());
            respuesta.put("fecha_hora", citaCreada.getFechaHora());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // Endpoint para ver citas de un paciente (GET /api/citas/paciente/1)
    @GetMapping("/paciente/{pacienteId}")
    public ResponseEntity<List<Cita>> verCitasPaciente(@PathVariable Long pacienteId) {
        return new ResponseEntity<>(citaService.obtenerCitasPorPaciente(pacienteId), HttpStatus.OK);
    }

    // Endpoint para cancelar cita (PUT /api/citas/cancelar/1)
    @PutMapping("/cancelar/{citaId}")
    public ResponseEntity<?> cancelar(@PathVariable Long citaId) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Cita citaCancelada = citaService.cancelarCita(citaId);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "La cita médica ha sido cancelada.");
            respuesta.put("estado_actual", citaCancelada.getEstado());
            return new ResponseEntity<>(respuesta, HttpStatus.OK);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // Endpoint para el Administrador: Ver TODAS las citas del hospital (GET /api/citas/todas)
    @GetMapping("/todas")
    public ResponseEntity<List<Cita>> verTodasLasCitas() {
        return new ResponseEntity<>(citaService.obtenerTodasLasCitas(), HttpStatus.OK);
    }
    @PutMapping("/triage/{id}")
    public ResponseEntity<?> registrarTriage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            // Llamamos al servicio en lugar de tocar el repositorio directamente
            citaService.registrarTriage(id, payload.get("observaciones"));
            return ResponseEntity.ok().body(Map.of("mensaje", "Signos vitales registrados con éxito"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @PutMapping("/atender/{id}")
    public ResponseEntity<?> atenderCita(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            citaService.atenderCita(id, payload.get("observaciones"));
            return ResponseEntity.ok().body(Map.of("mensaje", "Consulta finalizada con éxito"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}