$(function () {
    function autofillLogin() {
        if (localStorage.getItem('rememberMe') === 'true') {
            $('#username').val(localStorage.getItem('rememberedUsername') || '');
            $('#password').val(localStorage.getItem('rememberedPassword') || '');
            $('#remember_me').prop('checked', true);
        } else {
            $('#password').val('');
            $('#remember_me').prop('checked', false);
        }
    }
    autofillLogin();

    $('#loginForm').on('submit', function (e) {
        e.preventDefault();
        if ($('#remember_me').is(':checked')) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedUsername', $('#username').val());
            localStorage.setItem('rememberedPassword', $('#password').val());
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedUsername');
            localStorage.removeItem('rememberedPassword');
        }
        const data = {
            username: $('#username').val(),
            password: $('#password').val(),
            rememberMe: $('#remember_me').is(':checked'),
            csrf_token: $('input[name="csrf_token"]').val()
        };
        $.ajax({
            url: '/api/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (response) {
                notifications.success('Login successful!');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            },
            error: function (xhr) {
                let msg = 'Login failed. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    msg = xhr.responseJSON.error;
                } else if (xhr.responseText) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.error) msg = data.error;
                    } catch (e) { }
                }
                notifications.error(msg);
            }
        });
    });

    $(window).on('pageshow', autofillLogin);
}); 