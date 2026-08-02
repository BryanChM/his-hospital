package com.his.hospital.controller;

import com.his.hospital.entity.Receta;
import com.his.hospital.repository.RecetaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recetas")
@CrossOrigin(origins = "*")
public class RecetaController {

    @Autowired
    private RecetaRepository recetaRepository;

    @PostMapping
    public ResponseEntity<?> crearReceta(@RequestBody Receta receta) {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            Receta guardada = recetaRepository.save(receta);
            respuesta.put("exito", true);
            respuesta.put("mensaje", "Receta médica guardada exitosamente.");
            respuesta.put("receta_id", guardada.getId());
            return new ResponseEntity<>(respuesta, HttpStatus.CREATED);
        } catch (Exception e) {
            respuesta.put("exito", false);
            respuesta.put("error", e.getMessage());
            return new ResponseEntity<>(respuesta, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/cita/{citaId}")
    public ResponseEntity<List<Receta>> obtenerRecetasPorCita(@PathVariable Long citaId) {
        return ResponseEntity.ok(recetaRepository.findByCitaId(citaId));
    }
}