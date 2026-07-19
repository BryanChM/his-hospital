package com.his.hospital.repository;

import com.his.hospital.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Spring Data JPA crea la consulta SQL en automático solo leyendo el nombre del método:
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByDpi(String dpi);
    boolean existsByUsername(String username);
    boolean existsByDpi(String dpi);
    boolean existsByEmail(String email);
}