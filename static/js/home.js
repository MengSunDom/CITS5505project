// home.js - Enhance home page interactivity

document.addEventListener('DOMContentLoaded', function () {
    // Smooth scroll to features section
    const scrollBtn = document.getElementById('scrollToFeatures');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', function () {
            const featuresSection = document.getElementById('featuresSection');
            if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Carousel auto-play (Bootstrap 5 already handles interval, but ensure it resumes on hover out)
    const featureCarousel = document.getElementById('featureCarousel');
    if (featureCarousel) {
        featureCarousel.addEventListener('mouseenter', function () {
            // Pause carousel on hover
            const carousel = bootstrap.Carousel.getOrCreateInstance(featureCarousel);
            carousel.pause();
        });
        featureCarousel.addEventListener('mouseleave', function () {
            // Resume carousel on mouse leave
            const carousel = bootstrap.Carousel.getOrCreateInstance(featureCarousel);
            carousel.cycle();
        });
    }

    // Card hover: add a subtle shadow and pointer (handled by CSS, but can add JS for extra effect)
    document.querySelectorAll('.feature-card').forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            card.style.boxShadow = '0 8px 24px rgba(33, 150, 243, 0.18)';
            card.style.transform = 'translateY(-8px) scale(1.03)';
        });
        card.addEventListener('mouseleave', function() {
            card.style.boxShadow = '';
            card.style.transform = '';
        });
        card.style.cursor = 'pointer';
    });

    // Change mouse pointer for carousel controls
    document.querySelectorAll('.carousel-control-prev, .carousel-control-next').forEach(function(btn) {
        btn.style.cursor = 'pointer';
    });
}); 