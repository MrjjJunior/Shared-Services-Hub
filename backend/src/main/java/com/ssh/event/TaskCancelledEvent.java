package com.ssh.event;

/**
 * Published inside the cancellation transaction once the task has been
 * moved to CANCELLED and every outstanding PENDING application released.
 */
public record TaskCancelledEvent(
    Long taskId,
    Long smeId,
    Long youthId,
    String reason
) {
}
