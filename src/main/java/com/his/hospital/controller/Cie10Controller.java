package com.his.hospital.controller;

import com.his.hospital.entity.Cie10;
import com.his.hospital.repository.Cie10Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cie10")
@CrossOrigin(origins = "*")
public class Cie10Controller {

    @Autowired
    private Cie10Repository cie10Repository;

    @GetMapping
    public ResponseEntity<List<Cie10>> listarCie10() {
        return ResponseEntity.ok(cie10Repository.findAll());
    }
}