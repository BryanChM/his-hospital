package com.his.hospital.controller;

import com.his.hospital.entity.Sucursal;
import com.his.hospital.repository.SucursalRepository; // (Debes crear esta interfaz JpaRepository básica)
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sucursales")
public class SucursalController {
    @Autowired private SucursalRepository sucursalRepository;

    @GetMapping
    public List<Sucursal> listarTodas() {
        return sucursalRepository.findAll();
    }
    @PostMapping
    public ResponseEntity<Sucursal> crearSucursal(@RequestBody Sucursal sucursal) {
        return ResponseEntity.ok(sucursalRepository.save(sucursal));
    }
}