package com.his.hospital.controller;

import com.his.hospital.dto.TriageDTO;
import com.his.hospital.entity.Triage;
import com.his.hospital.service.TriageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/triage")
@CrossOrigin("*")
public class TriageController {

    @Autowired
    private TriageService triageService;

    // POST http://localhost:8080/api/triage/registrar
    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody TriageDTO dto) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Triage triageCreado = triageService.registrarTriage(dto);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "¡Signos vitales registrados y paciente enviado a sala de espera!");
            respuesta.put("triage_id", triageCreado.getId());
            respuesta.put("paciente", triageCreado.getCita().getPaciente().getNombre());
            respuesta.put("enfermera", triageCreado.getEnfermera().getNombre());
            respuesta.put("imc_calculado", triageCreado.getImc());
            respuesta.put("categoria", triageCreado.getCategoria());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // GET http://localhost:8080/api/triage/cita/2
    @GetMapping("/cita/{citaId}")
    public ResponseEntity<?> verTriagePorCita(@PathVariable Long citaId) {
        try {
            return new ResponseEntity<>(triageService.obtenerPorCita(citaId), HttpStatus.OK);
        } catch (RuntimeException e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("exito", false);
            resp.put("error", e.getMessage());
            return new ResponseEntity<>(resp, HttpStatus.NOT_FOUND);
        }
    }
}