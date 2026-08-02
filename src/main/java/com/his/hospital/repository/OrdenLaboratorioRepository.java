package com.his.hospital.repository;

import com.his.hospital.entity.OrdenLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrdenLaboratorioRepository extends JpaRepository<OrdenLaboratorio, Long> {
    List<OrdenLaboratorio> findByCitaId(Long citaId);
}