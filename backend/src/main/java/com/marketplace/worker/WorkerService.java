package com.marketplace.worker;

import com.marketplace.category.Category;
import com.marketplace.category.CategoryRepository;
import com.marketplace.common.exception.BusinessException;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.common.response.PageResponse;
import com.marketplace.worker.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkerService {

    private final WorkerRepository         workerRepository;
    private final WorkerDocumentRepository documentRepository;
    private final CategoryRepository       categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<WorkerListingDTO> listWorkers(
            UUID categoryId, String city, Boolean available, int page, int size) {
        String normalizedCity = (city == null || city.isBlank()) ? null : city.trim();
        var pageable = PageRequest.of(page, Math.min(size, 50));
        return new PageResponse<>(
            workerRepository.findVerifiedWorkers(categoryId, normalizedCity, available, pageable)
                            .map(this::toListingDTO)
        );
    }

    @Transactional(readOnly = true)
    public WorkerProfileDTO getProfile(UUID workerId) {
        WorkerProfile wp = workerRepository.findById(workerId)
                .orElseThrow(() -> new NotFoundException("Worker", workerId));
        List<WorkerDocument> docs = documentRepository.findByWorkerId(workerId);
        return toProfileDTO(wp, docs);
    }

    @Transactional(readOnly = true)
    public WorkerProfileDTO getMyProfile(UUID userId) {
        WorkerProfile wp = workerRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found for user"));
        List<WorkerDocument> docs = documentRepository.findByWorkerId(wp.getId());
        return toProfileDTO(wp, docs);
    }

    @Transactional
    public WorkerProfileDTO updateProfile(UUID userId, WorkerUpdateRequest request) {
        WorkerProfile wp = workerRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));

        if (request.categories() != null && !request.categories().isEmpty()) {
            List<UUID> catIds = request.categories().stream()
                    .map(WorkerUpdateRequest.CategoryInput::categoryId)
                    .toList();
            Map<UUID, Category> catMap = categoryRepository.findAllById(catIds).stream()
                    .collect(Collectors.toMap(Category::getId, c -> c));

            if (catMap.isEmpty()) {
                throw new BusinessException("No valid categories found", HttpStatus.BAD_REQUEST);
            }

            // Rebuild the per-skill experience collection
            wp.getWorkerCategories().clear();
            int maxExp = 0;
            for (WorkerUpdateRequest.CategoryInput input : request.categories()) {
                Category cat = catMap.get(input.categoryId());
                if (cat == null) continue;
                int exp = input.yearsExperience() != null ? input.yearsExperience() : 0;
                wp.getWorkerCategories().add(new WorkerCategory(wp, cat, exp));
                maxExp = Math.max(maxExp, exp);
            }

            // Primary category (first) for listing compat
            Category primaryCat = catMap.get(request.categories().get(0).categoryId());
            if (primaryCat != null) wp.setCategory(primaryCat);

            // Overall experience = max across skills
            wp.setYearsExperience(maxExp);
        }

        if (request.bio()       != null) wp.setBio(request.bio());
        if (request.dailyRate() != null) wp.setDailyRate(request.dailyRate());
        if (request.hourlyRate()!= null) wp.setHourlyRate(request.hourlyRate());
        if (request.city()      != null) wp.setCity(request.city());
        if (request.locality()  != null) wp.setLocality(request.locality());
        if (request.latitude()  != null) wp.setLatitude(request.latitude());
        if (request.longitude() != null) wp.setLongitude(request.longitude());

        workerRepository.save(wp);
        return getMyProfile(userId);
    }

    @Transactional
    public void setAvailability(UUID userId, boolean available) {
        WorkerProfile wp = workerRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));

        if (!"VERIFIED".equals(wp.getVerificationStatus())) {
            throw new BusinessException(
                "Cannot go available: profile is not verified yet", HttpStatus.FORBIDDEN);
        }
        wp.setIsAvailable(available);
        workerRepository.save(wp);
    }

    @Transactional
    public void addDocument(UUID userId, AddDocumentRequest request) {
        WorkerProfile wp = workerRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Worker profile not found"));

        WorkerDocument doc = new WorkerDocument();
        doc.setWorker(wp);
        doc.setDocType(request.docType());
        doc.setS3Key(request.s3Key());
        documentRepository.save(doc);

        if ("PENDING".equals(wp.getVerificationStatus())) {
            wp.setVerificationStatus("UNDER_REVIEW");
            workerRepository.save(wp);
        }
    }

    // --- Mappers ---

    private WorkerListingDTO toListingDTO(WorkerProfile wp) {
        return new WorkerListingDTO(
            wp.getId(),
            wp.getUser().getName(),
            wp.getUser().getProfilePhoto(),
            wp.getCategory() != null ? wp.getCategory().getName() : null,
            wp.getCity(),
            wp.getLocality(),
            wp.getAvgRating(),
            wp.getTotalJobs(),
            wp.getYearsExperience(),
            wp.getDailyRate(),
            wp.getHourlyRate(),
            wp.getIsAvailable()
        );
    }

    private WorkerProfileDTO toProfileDTO(WorkerProfile wp, List<WorkerDocument> docs) {
        List<WorkerProfileDTO.DocumentDTO> docDTOs = docs.stream()
            .map(d -> new WorkerProfileDTO.DocumentDTO(d.getId(), d.getDocType(),
                                                        d.getS3Key(), d.getStatus()))
            .toList();

        List<WorkerProfileDTO.CategoryDTO> catDTOs = wp.getWorkerCategories().stream()
            .map(wc -> new WorkerProfileDTO.CategoryDTO(
                wc.getCategory().getId().toString(),
                wc.getCategory().getName(),
                wc.getYearsExperience()))
            .toList();

        // Primary category: from junction table first, fall back to single FK
        String primaryCatId   = catDTOs.isEmpty()
            ? (wp.getCategory() != null ? wp.getCategory().getId().toString() : null)
            : catDTOs.get(0).categoryId();
        String primaryCatName = catDTOs.isEmpty()
            ? (wp.getCategory() != null ? wp.getCategory().getName() : null)
            : catDTOs.get(0).categoryName();

        return new WorkerProfileDTO(
            wp.getId(),
            wp.getUser().getId(),
            wp.getUser().getName(),
            wp.getUser().getPhone(),
            wp.getUser().getProfilePhoto(),
            primaryCatId,
            primaryCatName,
            catDTOs,
            wp.getBio(),
            wp.getYearsExperience(),
            wp.getDailyRate(),
            wp.getHourlyRate(),
            wp.getCity(),
            wp.getLocality(),
            wp.getIsAvailable(),
            wp.getVerificationStatus(),
            wp.getAvgRating(),
            wp.getTotalJobs(),
            Boolean.TRUE.equals(wp.getAadhaarVerified()),
            Boolean.TRUE.equals(wp.getFaceVerified()),
            docDTOs
        );
    }
}
