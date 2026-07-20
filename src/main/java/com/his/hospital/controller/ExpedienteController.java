package com.his.hospital.controller;

import com.his.hospital.dto.ExpedienteDTO;
import com.his.hospital.entity.Expediente;
import com.his.hospital.service.ExpedienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/expedientes")
public class ExpedienteController {

    @Autowired
    private ExpedienteService expedienteService;

    // POST /api/expedientes (Crear el expediente)
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody ExpedienteDTO dto) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Expediente creado = expedienteService.crearExpediente(dto);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "✅ Expediente clínico creado exitosamente en el HIS!");
            respuesta.put("numero_expediente", creado.getNumeroExpediente());
            respuesta.put("id", creado.getId());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // GET /api/expedientes/paciente/{id} (Buscar expediente por ID del paciente)
    @GetMapping("/paciente/{pacienteId}")
    public ResponseEntity<?> obtenerPorPaciente(@PathVariable Long pacienteId) {
        try {
            Expediente exp = expedienteService.obtenerPorPaciente(pacienteId);
            return ResponseEntity.ok(exp);
        } catch (RuntimeException e) {
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.NOT_FOUND);
        }
    }
}