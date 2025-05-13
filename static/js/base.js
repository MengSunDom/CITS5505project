document.addEventListener('DOMContentLoaded', function() {
    // Handle active state for navbar links
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar .nav-link');
    
    // For insights/expenses/income/shared pages, map to their respective routes
    const routeMapping = {
        '/insights': ['/insights', '/insights/'],
        '/expenses': ['/expenses', '/expenses/'],
        '/income': ['/income', '/income/'],
        '/shared-data': ['/shared-data', '/shared-data/']
    };
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Don't apply hover effects to user greeting
        if (link.classList.contains('user-greeting')) {
            return;
        }
        
        // Skip if href is not defined or empty
        if (!href) return;
        
        // Set active class based on current path
        if (href === currentPath) {
            link.classList.add('active');
        }
        
        // Check for mapped routes (for insights, expenses, etc)
        Object.keys(routeMapping).forEach(route => {
            if (href === route && routeMapping[route].includes(currentPath)) {
                link.classList.add('active');
            }
        });
        
        // For nested paths
        if (href !== '/' && href !== '#' && currentPath.startsWith(href)) {
            link.classList.add('active');
        }
    });
    
    // Add animation effect to navbar
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.classList.add('navbar-loaded');
    }
});