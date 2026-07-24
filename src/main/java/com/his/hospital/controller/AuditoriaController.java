package com.his.hospital.controller;

import com.his.hospital.entity.LogAuditoria;
import com.his.hospital.repository.AuditoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

    @Autowired
    private AuditoriaRepository auditoriaRepository;

    @PostMapping
    public ResponseEntity<LogAuditoria> registrar(@RequestBody LogAuditoria log) {
        return ResponseEntity.ok(auditoriaRepository.save(log));
    }
}