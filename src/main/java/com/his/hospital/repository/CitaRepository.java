package com.his.hospital.repository;

import com.his.hospital.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {

    boolean existsByMedicoIdAndFechaHoraAndEstadoNot(Long medicoId, LocalDateTime fechaHora, String estado);

    List<Cita> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);
    List<Cita> findByMedicoIdOrderByFechaHoraDesc(Long medicoId);
    List<Cita> findAllByOrderByFechaHoraDesc();
    @Query("SELECT COUNT(c) > 0 FROM Cita c " +
            "WHERE c.medicoId = :medicoId " +
            "AND c.estado != 'CANCELADA' " +
            "AND c.fechaHora BETWEEN :inicioVentana AND :finVentana")
    boolean existeChoqueHorarioMedico(
            @Param("medicoId") Long medicoId,
            @Param("inicioVentana") LocalDateTime inicioVentana,
            @Param("finVentana") LocalDateTime finVentana
    );

    @Query("SELECT COUNT(c) > 0 FROM Cita c " +
            "WHERE c.pacienteId = :pacienteId " +
            "AND c.estado != 'CANCELADA' " +
            "AND c.fechaHora BETWEEN :inicio AND :fin")
    boolean existeChoqueHorarioPaciente(
            @Param("pacienteId") Long pacienteId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );


    @Query(value = "SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END " +
            "FROM citas c WHERE c.medico_id = :medicoId " +
            "AND CAST(c.fecha_hora AS VARCHAR) LIKE CONCAT(:fechaHora, '%') " +
            "AND c.estado != 'CANCELADA'",
            nativeQuery = true)
    boolean existsByMedicoIdAndFechaHora(@Param("medicoId") Long medicoId, @Param("fechaHora") String fechaHora);

}