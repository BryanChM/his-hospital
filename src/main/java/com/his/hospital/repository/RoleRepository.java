package com.his.hospital.repository;

import com.his.hospital.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    // Nos permitirá buscar un rol por su nombre exacto en la base de datos:
    Optional<Role> findByNombre(String nombre);
}