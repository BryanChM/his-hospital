package com.his.hospital.repository;

import com.his.hospital.entity.Cie10;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface Cie10Repository extends JpaRepository<Cie10, Long> {
    List<Cie10> findByDescripcionContainingIgnoreCaseOrCodigoContainingIgnoreCase(String desc, String cod);
}