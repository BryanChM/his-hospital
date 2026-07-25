package com.his.hospital.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    // Método asíncrono y blindado contra fallos de red
    @Async
    public void enviarCorreo(String destinatario, String asunto, String cuerpo) {
        if (mailSender == null || destinatario == null || destinatario.trim().isEmpty()) {
            System.out.println("⚠️ No hay configuración de correo o el destinatario está vacío.");
            return;
        }
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom("hospital.his.notificaciones@gmail.com"); // Puedes poner el mismo de properties
            mensaje.setTo(destinatario);
            mensaje.setSubject(asunto);
            mensaje.setText(cuerpo);

            mailSender.send(mensaje);
            System.out.println(" [OK] Correo enviado exitosamente a: " + destinatario);
        } catch (Exception e) {

            System.err.println(" [ERROR] No se pudo enviar el correo a " + destinatario + ": " + e.getMessage());
        }
    }
}