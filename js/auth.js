// js/auth.js
// Handles client-side form submission via AJAX for registration and login pages

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('auth-form');
    
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            // Determine action based on form's data attribute
            const action = authForm.getAttribute('data-action');
            const messageBox = document.getElementById('auth-message');
            
            // Basic client-side validation
            if (!usernameInput || !passwordInput) {
                messageBox.innerHTML = '<div class="alert alert-danger">Please fill in all fields.</div>';
                return;
            }
            
            // Prepare payload
            const payload = {
                action: action,
                username: usernameInput,
                password: passwordInput
            };
            
            // Send AJAX request via Fetch API
            fetch('auth_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display success message
                    messageBox.innerHTML = '<div class="alert alert-success">' + data.message + ' Redirecting...</div>';
                    // Redirect to dashboard (my_recipes.php) after a short delay
                    setTimeout(() => {
                        window.location.href = 'my_recipes.php';
                    }, 1500);
                } else {
                    // Display error message from server
                    messageBox.innerHTML = '<div class="alert alert-danger">' + data.message + '</div>';
                }
            })
            .catch(error => {
                // Display network or processing error
                messageBox.innerHTML = '<div class="alert alert-danger">An error occurred. Please try again.</div>';
                console.error('Error:', error);
            });
        });
    }
});