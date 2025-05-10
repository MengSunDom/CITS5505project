$(document).ready(function() {
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        
        const username = $('#username').val();
        const password = $('#password').val();
        const csrf_token = $('input[name="csrf_token"]').val();
        const rememberMe = $('#rememberMe').is(':checked');
        
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
}); 