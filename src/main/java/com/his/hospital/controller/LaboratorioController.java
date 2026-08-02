package com.his.hospital.controller;

import com.his.hospital.entity.OrdenLaboratorio;
import com.his.hospital.repository.OrdenLaboratorioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/laboratorio")
@CrossOrigin(origins = "*")
public class LaboratorioController {

    @Autowired
    private OrdenLaboratorioRepository ordenLaboratorioRepository;

    @PostMapping
    public ResponseEntity<?> crearOrden(@RequestBody OrdenLaboratorio orden) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            orden.setNumeroOrden("LAB-" + Math.floor(1000 + Math.random() * 9000));
            OrdenLaboratorio guardada = ordenLaboratorioRepository.save(orden);

            respuesta.put("exito", true);
            respuesta.put("mensaje", "Orden de laboratorio generada con éxito.");
            respuesta.put("numero_orden", guardada.getNumeroOrden());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (Exception e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/cita/{citaId}")
    public ResponseEntity<List<OrdenLaboratorio>> obtenerOrdenesPorCita(@PathVariable Long citaId) {
        return ResponseEntity.ok(ordenLaboratorioRepository.findByCitaId(citaId));
    }
}