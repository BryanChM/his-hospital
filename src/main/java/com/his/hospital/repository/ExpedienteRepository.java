package com.his.hospital.repository;

import com.his.hospital.entity.Expediente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ExpedienteRepository extends JpaRepository<Expediente, Long> {

    // Para buscar si un paciente ya tiene expediente creado
    Optional<Expediente> findByPacienteId(Long pacienteId);

    // Para validar que no se cree un expediente duplicado
    boolean existsByPacienteId(Long pacienteId);
}