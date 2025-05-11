$(document).ready(function () {
    // 🔹 Highlight active nav link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    const message = localStorage.getItem('successMessage');
    if (message) {
        notifications.success(message);
        localStorage.removeItem('successMessage');
    }

    // Handles logout via JWT
    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) {
        logoutLink.addEventListener("click", function (e) {
            e.preventDefault();
            fetch("/api/logout", {
                method: "POST",
                credentials: "same-origin"
            })
                .then(() => {
                    localStorage.setItem('successMessage', 'Logout successful!');
                    window.location.href = "/";
                })
                .catch(err => {
                    console.error("Logout failed:", err);
                });
        });
    }
});
