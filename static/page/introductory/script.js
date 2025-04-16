document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const sendForm = async (form, endpoint) => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            alert(result.message);
            if (endpoint === '/login') {
                window.location.reload();
            }
        } else {
            alert("❌ " + result.error);
        }
    };

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendForm(loginForm, '/login');
    });

    registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendForm(registerForm, '/register');
    });
});
