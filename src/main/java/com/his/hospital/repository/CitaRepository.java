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

    // Método para validar que un doctor no tenga choque de horarios
    boolean existsByMedicoIdAndFechaHoraAndEstadoNot(Long medicoId, LocalDateTime fechaHora, String estado);

    // Método para listar citas de un paciente ordenadas desde la más reciente
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

    // CORRECCIÓN: Se unificó el atributo a 'c.fechaHora' para evitar el fallo al arrancar Spring Boot
    @Query("SELECT COUNT(c) > 0 FROM Cita c " +
            "WHERE c.paciente.id = :pacienteId " +
            "AND c.estado != 'CANCELADA' " +
            "AND c.fechaHora BETWEEN :inicio AND :fin")
    boolean existeChoqueHorarioPaciente(
            @Param("pacienteId") Long pacienteId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );

    // CORRECCIÓN: Consulta SQL Nativa para validar disponibilidad recibiendo la fecha como texto (String)
    // Nota: Si tu tabla en PostgreSQL se llama 'cita' en singular en vez de 'citas', quítale la 's' a 'FROM citas'
    @Query(value = "SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END " +
            "FROM citas c WHERE c.medico_id = :medicoId " +
            "AND CAST(c.fecha_hora AS VARCHAR) LIKE CONCAT(:fechaHora, '%') " +
            "AND c.estado != 'CANCELADA'",
            nativeQuery = true)
    boolean existsByMedicoIdAndFechaHora(@Param("medicoId") Long medicoId, @Param("fechaHora") String fechaHora);

}