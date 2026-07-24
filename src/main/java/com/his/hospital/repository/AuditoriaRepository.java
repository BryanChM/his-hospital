package com.his.hospital.repository;

import com.his.hospital.entity.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditoriaRepository extends JpaRepository<LogAuditoria, Long> {
}