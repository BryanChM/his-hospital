package com.his.hospital.repository;

import com.his.hospital.entity.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Long> {

    // Validar en la base de datos si ya se registró una consulta para esta cita
    boolean existsByCitaId(Long citaId);

    // Buscar una consulta específica por el ID de la cita
    Optional<Consulta> findByCitaId(Long citaId);
}