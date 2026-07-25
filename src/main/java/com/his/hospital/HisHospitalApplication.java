package com.his.hospital;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication

public class HisHospitalApplication {

	public static void main(String[] args) {
		SpringApplication.run(HisHospitalApplication.class, args);
	}

}
