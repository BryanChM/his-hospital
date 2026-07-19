package com.his.hospital.repository;

import com.his.hospital.entity.Triage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TriageRepository extends JpaRepository<Triage, Long> {

    // Regla de negocio: Verificar si ya se le hizo triage a esta cita anteriormente
    boolean existsByCitaId(Long citaId);

    // Buscar el triage asociado a una cita específica
    Optional<Triage> findByCitaId(Long citaId);
}