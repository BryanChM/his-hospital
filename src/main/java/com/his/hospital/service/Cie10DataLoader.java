package com.his.hospital.service;

import com.his.hospital.entity.Cie10;
import com.his.hospital.repository.Cie10Repository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class Cie10DataLoader {

    @Autowired
    private Cie10Repository repository;

    @PostConstruct
    public void init() {
        if (repository.count() == 0) {
            Cie10 c1 = new Cie10();
            c1.setCodigo("J00");
            c1.setDescripcion("Rinofaringitis aguda [resfriado común]");
            repository.save(c1);

            Cie10 c2 = new Cie10();
            c2.setCodigo("J02.9");
            c2.setDescripcion("Faringitis aguda, no especificada");
            repository.save(c2);

            Cie10 c3 = new Cie10();
            c3.setCodigo("J11");
            c3.setDescripcion("Influenza debido a virus no identificado");
            repository.save(c3);

            Cie10 c4 = new Cie10();
            c4.setCodigo("K30");
            c4.setDescripcion("Dispepsia");
            repository.save(c4);

            Cie10 c5 = new Cie10();
            c5.setCodigo("I10");
            c5.setDescripcion("Hipertensión esencial (primaria)");
            repository.save(c5);

            Cie10 c6 = new Cie10();
            c6.setCodigo("E11");
            c6.setDescripcion("Diabetes mellitus tipo 2");
            repository.save(c6);

            Cie10 c7 = new Cie10();
            c7.setCodigo("A09");
            c7.setDescripcion("Diarrea y gastroenteritis de presunto origen infeccioso");
            repository.save(c7);
        }
    }
}