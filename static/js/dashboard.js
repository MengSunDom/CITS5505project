document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation buttons
    document.getElementById('uploadDataBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement upload data functionality
        alert('Upload data functionality coming soon!');
    });

    document.getElementById('visualizeDataBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement visualize data functionality
        alert('Visualize data functionality coming soon!');
    });

    document.getElementById('shareDataBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement share data functionality
        alert('Share data functionality coming soon!');
    });

    // Handle quick action buttons
    document.getElementById('newUploadBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement new upload functionality
        alert('New upload functionality coming soon!');
    });

    document.getElementById('recentFilesBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement recent files functionality
        alert('Recent files functionality coming soon!');
    });

    document.getElementById('sharedWithMeBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement shared with me functionality
        alert('Shared with me functionality coming soon!');
    });

    // Add active class to current navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}); 