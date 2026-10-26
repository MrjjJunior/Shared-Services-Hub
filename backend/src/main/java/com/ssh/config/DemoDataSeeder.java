package com.ssh.config;

import com.ssh.entity.SME;
import com.ssh.entity.User;
import com.ssh.entity.Youth;
import com.ssh.repository.SMERepository;
import com.ssh.repository.UserRepository;
import com.ssh.repository.YouthRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the four demo accounts from the sign-in screen's Quick Account
 * Switcher so the live login works without manual registration:
 *
 *   thabo@example.com                YOUTH     (dashboard/portfolio demo)
 *   sme@craftworks.co.za             SME       (Kasi Craftworks)
 *   corporate@standardbank.co.za     CORPORATE (Standard Bank)
 *   admin@ssh.org.za                 ADMIN     (Platform Admin)
 *
 * All four share the password "password123". Accounts are only ever created
 * when the email is free, so existing databases are never overwritten.
 * Controlled by ssh.seed-demo-data (default true; offline environments).
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String DEMO_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final YouthRepository youthRepository;
    private final SMERepository smeRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;

    public DemoDataSeeder(UserRepository userRepository,
                          YouthRepository youthRepository,
                          SMERepository smeRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${ssh.seed-demo-data:true}") boolean enabled) {
        this.userRepository = userRepository;
        this.youthRepository = youthRepository;
        this.smeRepository = smeRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Demo data seeding disabled (ssh.seed-demo-data=false)");
            return;
        }

        createYouth();
        createSme();
        createCorporate();
        createAdmin();
    }

    void createYouth() {
        if (userRepository.findByEmail("thabo@example.com").isPresent()) {
            return;
        }
        User user = userRepository.save(new User(
            "Thabo Mokoena", "thabo@example.com",
            passwordEncoder.encode(DEMO_PASSWORD), "YOUTH"));

        Youth youth = new Youth(user);
        youth.setEducation("BCom Accounting, CPUT");
        youth.setSkills("Excel, Bookkeeping, Data Entry, Customer Support");
        youth.setPortfolio("/portfolio/1");
        youth.setBio("Final-year accounting student in Cape Town. I like turning messy spreadsheets into clear decisions and I am available for short operational sprints.");
        youth.setLocation("Cape Town, Western Cape");
        youth.setAvailability("Weekdays after 2pm · weekends");
        // Thabo opted in so the demo ledger persona shows feedback publicly.
        youth.setShareFeedbackPublicly(true);
        youth.setAlumni(false);
        youthRepository.save(youth);

        log.info("Seeded demo YOUTH account thabo@example.com");
    }

    void createSme() {
        if (userRepository.findByEmail("sme@craftworks.co.za").isPresent()) {
            return;
        }
        User user = userRepository.save(new User(
            "Kasi Craftworks", "sme@craftworks.co.za",
            passwordEncoder.encode(DEMO_PASSWORD), "SME"));

        SME sme = new SME(user, "Kasi Craftworks");
        sme.setIndustry("Retail & Craft");
        smeRepository.save(sme);

        log.info("Seeded demo SME account sme@craftworks.co.za");
    }

    void createCorporate() {
        if (userRepository.findByEmail("corporate@standardbank.co.za").isPresent()) {
            return;
        }
        userRepository.save(new User(
            "Corporate ESD Lead", "corporate@standardbank.co.za",
            passwordEncoder.encode(DEMO_PASSWORD), "CORPORATE"));

        log.info("Seeded demo CORPORATE account corporate@standardbank.co.za");
    }

    void createAdmin() {
        if (userRepository.findByEmail("admin@ssh.org.za").isPresent()) {
            return;
        }
        userRepository.save(new User(
            "Platform Admin", "admin@ssh.org.za",
            passwordEncoder.encode(DEMO_PASSWORD), "ADMIN"));

        log.info("Seeded demo ADMIN account admin@ssh.org.za");
    }
}
