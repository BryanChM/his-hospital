package com.his.hospital.repository;

import com.his.hospital.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Consultas automáticas generadas por Spring Data JPA
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByDpi(String dpi);
    boolean existsByUsername(String username);
    boolean existsByDpi(String dpi);
    boolean existsByEmail(String email);

    // 1. Obtiene una lista sin repetidos de las especialidades disponibles en una sucursal específica
    @Query("SELECT DISTINCT u.especialidad FROM User u WHERE u.sucursal.id = :sucursalId AND u.especialidad IS NOT NULL AND u.especialidad != ''")
    List<String> findEspecialidadesBySucursal(@Param("sucursalId") Long sucursalId);

    // 2. Obtiene los médicos activos por sucursal y especialidad (Consulta SQL Nativa blindada)
    @Query(value = "SELECT * FROM users u " +
            "WHERE u.sucursal_id = :sucursalId " +
            "AND TRIM(UPPER(u.especialidad)) = TRIM(UPPER(:especialidad)) " +
            "AND (u.cuenta_bloqueada IS NULL OR u.cuenta_bloqueada = false) " +
            "AND (u.estado IS NULL OR u.estado = 1)",
            nativeQuery = true)
    List<User> findMedicosBySucursalAndEspecialidad(@Param("sucursalId") Long sucursalId, @Param("especialidad") String especialidad);

}