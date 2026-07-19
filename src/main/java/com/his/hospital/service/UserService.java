package com.his.hospital.service;

import com.his.hospital.dto.UserRegisterDTO;
import com.his.hospital.entity.Role;
import com.his.hospital.entity.User;
import com.his.hospital.repository.RoleRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    // --- REGISTRO INTELIGENTE USANDO UserRegisterDTO ---
    public User registrarUsuario(UserRegisterDTO dto) {
        if (dto.getDpi() == null || dto.getDpi().length() != 13) {
            throw new RuntimeException("Error: El DPI debe contener exactamente 13 dígitos.");
        }
        if (userRepository.existsByDpi(dto.getDpi())) {
            throw new RuntimeException("Error: El número de DPI ya está registrado en el hospital.");
        }
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Error: El nombre de usuario ya está en uso. Elija otro.");
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Error: El correo electrónico ya está registrado.");
        }

        User usuario = new User();
        usuario.setNombre(dto.getNombre());
        usuario.setUsername(dto.getUsername());
        usuario.setPassword(dto.getPassword());
        usuario.setEmail(dto.getEmail());
        usuario.setDpi(dto.getDpi());
        usuario.setTelefono(dto.getTelefono());
        usuario.setNit(dto.getNit() != null ? dto.getNit() : "CF");
        usuario.setEspecialidad(dto.getEspecialidad());
        usuario.setPrecioConsulta(dto.getPrecioConsulta());

        // LÓGICA DE ROLES AJUSTADA CON SETTERS:
        if (dto.getEspecialidad() != null && !dto.getEspecialidad().trim().isEmpty()) {
            Role rolMedico = roleRepository.findByNombre("MEDIC")
                    .orElseGet(() -> {
                        Role r = new Role();
                        r.setNombre("MEDIC");
                        r.setDescripcion("Personal Médico");
                        return roleRepository.save(r);
                    });
            usuario.setRole(rolMedico);
        } else {
            Role rolPaciente = roleRepository.findByNombre("PACIENTE")
                    .orElseGet(() -> {
                        Role r = new Role();
                        r.setNombre("PACIENTE");
                        r.setDescripcion("Paciente del Hospital");
                        return roleRepository.save(r);
                    });
            usuario.setRole(rolPaciente);
        }

        usuario.setIntentosFallidos(0);
        usuario.setCuentaBloqueada(false);

        return userRepository.save(usuario);
    }

    // --- LOGIN CON BLOQUEO POR FUERZA BRUTA (5 INTENTOS) ---
    public Map<String, Object> login(String username, String password) {
        Optional<User> optUser = userRepository.findByUsername(username);

        if (optUser.isEmpty()) {
            throw new RuntimeException("Error: Credenciales incorrectas o usuario no encontrado.");
        }

        User usuario = optUser.get();

        // Verificar si la cuenta fue bloqueada usando el getter correcto
        if (usuario.getCuentaBloqueada() != null && usuario.getCuentaBloqueada()) {
            throw new RuntimeException("🔒 Cuenta bloqueada por seguridad tras 5 intentos fallidos. Contacte a Administración.");
        }

        if (!usuario.getPassword().equals(password)) {
            int intentos = (usuario.getIntentosFallidos() != null ? usuario.getIntentosFallidos() : 0) + 1;
            usuario.setIntentosFallidos(intentos);

            if (intentos >= 5) {
                usuario.setCuentaBloqueada(true);
                userRepository.save(usuario);
                throw new RuntimeException("🔒 Cuenta bloqueada automáticamente tras alcanzar 5 intentos fallidos.");
            }

            userRepository.save(usuario);
            throw new RuntimeException("Error: Contraseña incorrecta. Le quedan " + (5 - intentos) + " intentos.");
        }

        usuario.setIntentosFallidos(0);
        userRepository.save(usuario);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("exito", true);
        respuesta.put("usuario", usuario.getNombre());
        respuesta.put("rol", usuario.getRole() != null ? usuario.getRole().getNombre() : "GENERAL");
        respuesta.put("id", usuario.getId());
        return respuesta;
    }

    public List<User> listarTodos() {
        return userRepository.findAll();
    }

    public Optional<User> buscarPorDpi(String dpi) {
        return userRepository.findByDpi(dpi);
    }
    public User buscarPorUsername(String username) {
        // Si tu repositorio aquí adentro se llama diferente (ej: repository o usuarioRepository), cámbialo en esta línea:
        return userRepository.findByUsername(username).orElse(null);
    }
    public boolean eliminarUsuario(Long id) {
        // Verificamos si existe antes de borrar
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
    public User actualizarUsuario(Long id, User datosActualizados) {
        // Buscamos al usuario existente en PostgreSQL
        User usuario = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        // Actualizamos únicamente los campos modificables (Perfil y Tarifas)
        usuario.setNombre(datosActualizados.getNombre());
        usuario.setEmail(datosActualizados.getEmail());
        usuario.setTelefono(datosActualizados.getTelefono());
        usuario.setEspecialidad(datosActualizados.getEspecialidad());
        usuario.setPrecioConsulta(datosActualizados.getPrecioConsulta());

        return userRepository.save(usuario);
    }

}