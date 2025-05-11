$(function () {
    function autofillLogin() {
        if (localStorage.getItem('rememberMe') === 'true') {
            $('#username').val(localStorage.getItem('rememberedUsername') || '');
            $('#password').val(localStorage.getItem('rememberedPassword') || '');
            $('#rememberMe').prop('checked', true);
        } else {
            $('#password').val('');
            $('#rememberMe').prop('checked', false);
        }
    }

    autofillLogin();

    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const username = $('#username').val();
        const password = $('#password').val();
        const csrf_token = $('input[name="csrf_token"]').val();
        const rememberMe = $('#rememberMe').is(':checked');

        // Save or clear credentials in localStorage
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedUsername', username);
            localStorage.setItem('rememberedPassword', password);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedUsername');
            localStorage.removeItem('rememberedPassword');
        }

        $.ajax({
            url: '/api/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username,
                password: password,
                csrf_token: csrf_token,
                rememberMe: rememberMe
            }),
            success: function (response) {
                console.log("Login successful, verifying token via /api/me...");

                fetch('/api/me')
                    .then(res => {
                        console.log("Response status from /api/me:", res.status);
                        if (!res.ok) throw new Error('JWT invalid or missing');
                        return res.json();
                    })
                    .then(user => {
                        console.log("Authenticated as:", user);
                        localStorage.setItem('successMessage', 'Login successful!');
                        window.location.href = '/dashboard';
                    })
                    .catch(err => {
                        console.error("Failed to verify login:", err);
                        notifications.error("Login verification failed. Please try again.");
                    });
            },
            error: function (xhr) {
                let msg = 'Login failed. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    msg = xhr.responseJSON.error;
                } else if (xhr.responseText) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.error) msg = data.error;
                    } catch (e) {}
                }
                notifications.error(msg);
            }
        });
    });

    // Autofill on browser navigation
    $(window).on('pageshow', autofillLogin);
});
