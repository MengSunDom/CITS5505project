$(function() {
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

    $('#loginForm').on('submit', function(e) {
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
            success: function(response) {
                notifications.success('Login successful!');
                setTimeout(() => {
                window.location.href = '/dashboard';
                }, 1000);
            },
            error: function(xhr) {
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

    // Also autofill on page show (for browser back/forward navigation)
    $(window).on('pageshow', autofillLogin);
}); 