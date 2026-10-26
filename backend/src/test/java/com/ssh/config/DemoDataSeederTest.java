package com.ssh.config;

import com.ssh.repository.SMERepository;
import com.ssh.repository.UserRepository;
import com.ssh.repository.YouthRepository;
import com.ssh.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Guards the sign-screen demo accounts:
 * missing accounts get seeded, existing databases are left alone,
 * and the ssh.seed-demo-data=false switch turns the runner into a no-op.
 */
@ExtendWith(MockitoExtension.class)
class DemoDataSeederTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private YouthRepository youthRepository;
    @Mock
    private SMERepository smeRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private ApplicationArguments args;

    @BeforeEach
    void setUp() {
        args = mock(ApplicationArguments.class);
    }

    @Test
    void seedsAllMissingDemoAccounts() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");

        new DemoDataSeeder(userRepository, youthRepository, smeRepository,
                passwordEncoder, true).run(args);

        verify(userRepository).save(argThat(user ->
            "thabo@example.com".equals(user.getEmail()) && "YOUTH".equals(user.getRole())));
        verify(youthRepository).save(any());
        verify(userRepository).save(argThat(user ->
            "sme@craftworks.co.za".equals(user.getEmail()) && "SME".equals(user.getRole())));
        verify(smeRepository).save(any());
        verify(userRepository).save(argThat(user ->
            "corporate@standardbank.co.za".equals(user.getEmail())
                    && "CORPORATE".equals(user.getRole())));
        verify(userRepository).save(argThat(user ->
            "admin@ssh.org.za".equals(user.getEmail()) && "ADMIN".equals(user.getRole())));
    }

    @Test
    void skipsAccountsThatAlreadyExist() {
        when(userRepository.findByEmail(anyString()))
                .thenReturn(Optional.of(new User()));

        new DemoDataSeeder(userRepository, youthRepository, smeRepository,
                passwordEncoder, true).run(args);

        verify(userRepository, never()).save(any(User.class));
        verify(youthRepository, never()).save(any());
        verify(smeRepository, never()).save(any());
    }

    @Test
    void disabledSeederDoesNothing() {
        new DemoDataSeeder(userRepository, youthRepository, smeRepository,
                passwordEncoder, false).run(args);

        verify(userRepository, never()).save(any(User.class));
        verify(youthRepository, never()).save(any());
        verify(smeRepository, never()).save(any());
    }
}
