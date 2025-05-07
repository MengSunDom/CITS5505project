document.addEventListener('DOMContentLoaded', function() {
    // Load user data
    fetch('/api/expenses')
        .then(response => response.json())
        .then(expenses => updateDashboard(expenses));

    function updateDashboard(expenses) {
        // Calculate totals
        let total = 0;
        let monthlyTotal = 0;
        const categories = {};
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        expenses.forEach(expense => {
            total += expense.amount;
            const expenseDate = new Date(expense.date);
            if (
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                monthlyTotal += expense.amount;
            }
            categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
        });

        // Update summary cards
        document.getElementById('totalExpenses').textContent = `$${total.toFixed(2)}`;
        document.getElementById('monthlyExpenses').textContent = `$${monthlyTotal.toFixed(2)}`;

        // Find top category
        let topCategory = '-';
        let maxAmount = 0;
        for (const [category, amount] of Object.entries(categories)) {
            if (amount > maxAmount) {
                maxAmount = amount;
                topCategory = category;
            }
        }
        document.getElementById('topCategory').textContent = topCategory;

        // Update recent expenses table
        const tbody = document.getElementById('recentExpensesTable');
        tbody.innerHTML = '';

        // Sort expenses by date and take the 5 most recent
        const recentExpenses = expenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        recentExpenses.forEach(expense => {
            const row = `
                <tr>
                    <td>${expense.date}</td>
                    <td>${expense.category}</td>
                    <td>${expense.description}</td>
                    <td>$${expense.amount.toFixed(2)}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

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