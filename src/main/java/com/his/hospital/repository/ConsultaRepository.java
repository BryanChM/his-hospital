package com.his.hospital.repository;

import com.his.hospital.entity.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Long> {


    boolean existsByCitaId(Long citaId);


    Optional<Consulta> findByCitaId(Long citaId);
}