package com.his.hospital.controller;

import com.his.hospital.dto.ConsultaDTO;
import com.his.hospital.entity.Consulta;
import com.his.hospital.service.ConsultaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/consultas")
@CrossOrigin("*")
public class ConsultaController {

    @Autowired
    private ConsultaService consultaService;

    // POST http://localhost:8080/api/consultas/atender
    @PostMapping("/atender")
    public ResponseEntity<?> atender(@RequestBody ConsultaDTO dto) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Consulta consultaCreada = consultaService.registrarConsulta(dto);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "¡Consulta médica finalizada y receta emitida con éxito!");
            respuesta.put("consulta_id", consultaCreada.getId());
            respuesta.put("paciente", consultaCreada.getCita().getPaciente().getNombre());
            respuesta.put("medico", consultaCreada.getMedico().getNombre());
            respuesta.put("diagnostico", consultaCreada.getDiagnostico());
            respuesta.put("receta", consultaCreada.getRecetaMedica());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    // GET http://localhost:8080/api/consultas/cita/2
    @GetMapping("/cita/{citaId}")
    public ResponseEntity<?> verConsultaPorCita(@PathVariable Long citaId) {
        try {
            return new ResponseEntity<>(consultaService.obtenerPorCita(citaId), HttpStatus.OK);
        } catch (RuntimeException e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("exito", false);
            resp.put("error", e.getMessage());
            return new ResponseEntity<>(resp, HttpStatus.NOT_FOUND);
        }
    }
}