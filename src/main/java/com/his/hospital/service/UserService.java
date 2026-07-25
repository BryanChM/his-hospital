package com.his.hospital.service;

import com.his.hospital.dto.UserRegisterDTO;
import com.his.hospital.entity.Role;
import com.his.hospital.entity.Sucursal;
import com.his.hospital.entity.User;
import com.his.hospital.repository.RoleRepository;
import com.his.hospital.repository.SucursalRepository;
import com.his.hospital.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private EmailService emailService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private SucursalRepository sucursalRepository;


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


        if (dto.getSucursal() != null && dto.getSucursal().getId() != null) {

            Sucursal sucursalAsignada = sucursalRepository.findById(dto.getSucursal().getId())
                    .orElseThrow(() -> new RuntimeException("La sucursal seleccionada no existe"));
            usuario.setSucursal(sucursalAsignada);

        } else if (dto.getSucursalId() != null) {

            Sucursal sucursalAsignada = sucursalRepository.findById(dto.getSucursalId())
                    .orElseThrow(() -> new RuntimeException("La sucursal seleccionada no existe"));
            usuario.setSucursal(sucursalAsignada);

        } else {

            usuario.setSucursal(null);
        }



        String nombreRolObjetivo = "PACIENTE";

        if (dto.getRole() != null && dto.getRole().getNombre() != null && !dto.getRole().getNombre().trim().isEmpty()) {
            nombreRolObjetivo = dto.getRole().getNombre().toUpperCase().trim();
        } else if (dto.getEspecialidad() != null && !dto.getEspecialidad().trim().isEmpty() && dto.getPrecioConsulta() != null) {
            nombreRolObjetivo = "MEDIC";
        }

        final String rolFinal = nombreRolObjetivo;
        Role rolAsignado = roleRepository.findByNombre(rolFinal)
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setNombre(rolFinal);
                    r.setDescripcion("Rol del sistema: " + rolFinal);
                    return roleRepository.save(r);
                });
        usuario.setRole(rolAsignado);

        usuario.setIntentosFallidos(0);
        usuario.setCuentaBloqueada(false);

        User usuarioGuardado = userRepository.save(usuario);


        String asunto = " ¡Bienvenido al Portal Hospitalario HIS!";
        String cuerpo = "Hola " + usuarioGuardado.getNombre() + ",\n\n" +
                "Tu expediente y cuenta en el Hospital HIS han sido creados exitosamente.\n\n" +
                " TUS DATOS Y CREDENCIALES DE ACCESO:\n" +
                "--------------------------------------------------\n" +
                "• Usuario de ingreso: " + usuarioGuardado.getUsername() + "\n" +
                "• Rol asignado: " + usuarioGuardado.getRole().getNombre() + "\n" +
                "• DPI / Expediente: " + usuarioGuardado.getDpi() + "\n" +
                "--------------------------------------------------\n\n" +
                "Por seguridad, no compartas estas credenciales con nadie. Ya puedes iniciar sesión desde nuestro portal web.\n\n" +
                "Atentamente,\nAdministración del Hospital HIS";

        emailService.enviarCorreo(usuarioGuardado.getEmail(), asunto, cuerpo);

        return usuarioGuardado;
    }



    @Transactional(noRollbackFor = RuntimeException.class)
    public User login(String username, String password) {
        // 1. Buscar al usuario en PostgreSQL
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: El usuario '" + username + "' no existe en el sistema."));

        if (Boolean.TRUE.equals(user.getCuentaBloqueada())) {
            throw new RuntimeException("Error: Esta cuenta se encuentra BLOQUEADA por seguridad tras 5 intentos fallidos. Contacte a un Administrador para desbloquearla.");
        }


        if (!user.getPassword().equals(password)) {

            int intentosActuales = (user.getIntentosFallidos() == null) ? 0 : user.getIntentosFallidos();
            intentosActuales++; // Sumamos 1 al intento fallido

            user.setIntentosFallidos(intentosActuales);


            if (intentosActuales >= 5) {
                user.setCuentaBloqueada(true);
                userRepository.save(user);
                System.out.println("🔒 Cuenta bloqueada automáticamente por exceder el límite de fallos: " + username);
                throw new RuntimeException("Error: Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido BLOQUEADA por seguridad.");
            }

            userRepository.save(user);
            System.out.println("⚠️ Intento fallido " + intentosActuales + " de 5 para el usuario: " + username);
            throw new RuntimeException("Contraseña incorrecta. Intento fallido " + intentosActuales + " de 5.");
        }


        user.setIntentosFallidos(0);
        user.setCuentaBloqueada(false);
        userRepository.save(user);

        return user;
    }

    public List<User> listarTodos() {
        return userRepository.findAll();
    }

    public Optional<User> buscarPorDpi(String dpi) {
        return userRepository.findByDpi(dpi);
    }

    public User buscarPorUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public boolean eliminarUsuario(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public User actualizarUsuario(Long id, User datosActualizados) {
        User usuario = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        usuario.setNombre(datosActualizados.getNombre());
        usuario.setEmail(datosActualizados.getEmail());
        usuario.setTelefono(datosActualizados.getTelefono());
        usuario.setEspecialidad(datosActualizados.getEspecialidad());
        usuario.setPrecioConsulta(datosActualizados.getPrecioConsulta());

        return userRepository.save(usuario);
    }

    @Transactional
    public void desbloquearUsuario(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con el ID: " + id));

        user.setCuentaBloqueada(false);
        user.setIntentosFallidos(0);

        userRepository.save(user);
        System.out.println(" Cuenta desbloqueada por el Administrador: " + user.getUsername());
    }

}