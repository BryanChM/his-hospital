package com.his.hospital.controller;

import com.his.hospital.service.RecepcionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class RecepcionRestController {

    private final RecepcionService recepcionService;

    // 1. Endpoint para buscar paciente por DPI o Número de Cita (RN-CU05-01)
    @GetMapping("/recepcion/buscar")
    public ResponseEntity<Map<String, Object>> buscarCita(
            @RequestParam("criterio") String criterio,
            @RequestParam("tipoBusqueda") String tipoBusqueda) {
        return ResponseEntity.ok(recepcionService.buscarCita(criterio, tipoBusqueda));
    }

    // 2. Endpoint para el botón "✔️ Registrar Llegada" (Flujo Normal y FA08/FA09)
    @PostMapping("/recepcion/llegada/{id}")
    public ResponseEntity<String> registrarLlegada(@PathVariable("id") Long id) {
        try {
            // Llama al servicio que cambia el estado a PACIENTE_PRESENTE y asigna la hora de llegada
            String mensaje = recepcionService.registrarLlegada(id);
            return ResponseEntity.ok(mensaje);
        } catch (Exception e) {
            // FA09: Manejo de error si la operación falla o la cita no es válida
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}