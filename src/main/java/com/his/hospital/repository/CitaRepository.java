package com.his.hospital.repository;

import com.his.hospital.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {

    // Método para validar que un doctor no tenga choque de horarios (Línea 37)
    boolean existsByMedicoIdAndFechaHoraAndEstadoNot(Long medicoId, LocalDateTime fechaHora, String estado);

    // Método para listar citas de un paciente ordenadas desde la más reciente (Línea 57)
    List<Cita> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);

    // Método opcional para listar todas las citas del hospital ordenadas
    List<Cita> findAllByOrderByFechaHoraDesc();

    // Consulta para verificar choques del MÉDICO (ignorando citas canceladas)
    @Query("SELECT COUNT(c) > 0 FROM Cita c " +
            "WHERE c.medico.id = :medicoId " +
            "AND c.estado != 'CANCELADA' " +
            "AND c.fechaHora BETWEEN :inicioVentana AND :finVentana")
    boolean existeChoqueHorarioMedico(
            @Param("medicoId") Long medicoId,
            @Param("inicioVentana") LocalDateTime inicioVentana,
            @Param("finVentana") LocalDateTime finVentana
    );

    // Consulta para verificar choques del PACIENTE (para que no esté en 2 lugares a la vez)
    @Query("SELECT COUNT(c) > 0 FROM Cita c " +
            "WHERE c.paciente.id = :pacienteId " +
            "AND c.estado != 'CANCELADA' " +
            "AND (c.fechaHoraInicio < :fin AND c.fechaHoraFin > :inicio)")
    boolean existeChoqueHorarioPaciente(
            @Param("pacienteId") Long pacienteId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );
}