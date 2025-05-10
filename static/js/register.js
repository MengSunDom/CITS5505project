$(document).ready(function() {
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        
        const username = $('#username').val();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        const csrf_token = $('input[name="csrf_token"]').val();
        
        if (password !== confirmPassword) {
            notifications.error('Passwords do not match!');
            return;
        }
        
        $.ajax({
            url: '/api/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username,
                password: password,
                csrf_token: csrf_token
            }),
            success: function(response) {
                notifications.success('Registration successful! Please login.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            },
            error: function(xhr) {
                let msg = 'Registration failed. Please try again.';
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