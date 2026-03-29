package com.marketplace.notification;

import com.marketplace.booking.Booking;
import com.marketplace.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final FcmService             fcmService;

    public void sendBookingRequest(Booking booking) {
        User worker = booking.getWorker().getUser();
        String title = "New Booking Request!";
        String body  = booking.getCustomer().getName() + " wants to book you for " +
                       booking.getCategory().getName();
        persist(worker, title, body, "BOOKING_REQUEST", booking.getId().toString());
        fcmService.sendPush(worker.getFcmToken(), title, body);
    }

    public void sendBookingConfirmed(Booking booking) {
        User customer = booking.getCustomer();
        String title = "Booking Confirmed!";
        String body  = booking.getWorker().getUser().getName() + " accepted your booking";
        persist(customer, title, body, "STATUS_UPDATE", booking.getId().toString());
        fcmService.sendPush(customer.getFcmToken(), title, body);
    }

    public void sendBookingStarted(Booking booking) {
        User customer = booking.getCustomer();
        String title = "Job Started";
        String body  = "Your " + booking.getCategory().getName() + " job has started";
        persist(customer, title, body, "STATUS_UPDATE", booking.getId().toString());
        fcmService.sendPush(customer.getFcmToken(), title, body);
    }

    public void sendBookingCompleted(Booking booking) {
        User customer = booking.getCustomer();
        String title = "Job Completed!";
        String body  = "Your job is done. Please leave a review for " +
                       booking.getWorker().getUser().getName();
        persist(customer, title, body, "STATUS_UPDATE", booking.getId().toString());
        fcmService.sendPush(customer.getFcmToken(), title, body);
    }

    public void sendBookingCancelled(Booking booking) {
        // Notify the other party
        boolean workerCancelled = "WORKER".equals(booking.getCancelledBy());
        User recipient = workerCancelled ? booking.getCustomer()
                                         : booking.getWorker().getUser();
        String title = "Booking Cancelled";
        String body  = "Booking for " + booking.getCategory().getName() + " was cancelled";
        persist(recipient, title, body, "STATUS_UPDATE", booking.getId().toString());
        fcmService.sendPush(recipient.getFcmToken(), title, body);
    }

    public void sendBookingExpired(Booking booking) {
        User customer = booking.getCustomer();
        String title = "Booking Expired";
        String body  = "Worker didn't respond. Please try booking another worker.";
        persist(customer, title, body, "STATUS_UPDATE", booking.getId().toString());
        fcmService.sendPush(customer.getFcmToken(), title, body);
    }

    private void persist(User user, String title, String body, String type, String refId) {
        Notification n = Notification.builder()
                .user(user)
                .title(title)
                .body(body)
                .type(type)
                .refId(refId != null ? java.util.UUID.fromString(refId) : null)
                .build();
        notificationRepository.save(n);
    }
}
