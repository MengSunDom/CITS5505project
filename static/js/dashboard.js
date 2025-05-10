$(document).ready(function () {
    // Load expense data via AJAX
    $.getJSON('/api/expenses', (data) => {
        const $tbody = $('#recentExpensesTable');
        $tbody.empty()
        let { topCategory, total, monthlyTotal } = updataTable(data, $tbody)
        $('#topCategory').text(topCategory);
        $('#totalExpenses').text(`$${total.toFixed(2)}`);
        $('#monthlyExpenses').text(`$${monthlyTotal.toFixed(2)}`);
    });

    $.getJSON('/api/incomes', (data) => {
        const $tbody = $('#recentIncomeTable');
        $tbody.empty()
        let { topCategory, total, monthlyTotal } = updataTable(data, $tbody)
        $('#topIncomeCategory').text(topCategory);
        $('#totalIncome').text(`$${total.toFixed(2)}`);
        $('#monthlyIncome').text(`$${monthlyTotal.toFixed(2)}`);
    });

    const updataTable = (data, $tbody) => {
        let total = 0;
        let monthlyTotal = 0;
        const categories = {};
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        data.forEach(expense => {
            const amount = expense.amount;
            const date = new Date(expense.date);
            total += amount;

            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
                monthlyTotal += amount;
            }

            categories[expense.category] = (categories[expense.category] || 0) + amount;
        });

        let topCategory = '-';
        let maxAmount = 0;
        $.each(categories, (category, amount) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                topCategory = category;
            }
        });

        const recent = data
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        recent.forEach(expense => {
            const $row = $(`
                <tr>
                    <td>${expense.date}</td>
                    <td>${expense.category}</td>
                    <td>${expense.description}</td>
                    <td class="text-end">$${expense.amount.toFixed(2)}</td>
                </tr>
            `);
            $tbody.append($row);
        });
        return { topCategory, total, monthlyTotal }
    }

    // Handle navigation buttons
    // document.getElementById('uploadDataBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement upload data functionality
    //     alert('Upload data functionality coming soon!');
    // });

    // document.getElementById('visualizeDataBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement visualize data functionality
    //     alert('Visualize data functionality coming soon!');
    // });

    // document.getElementById('shareDataBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement share data functionality
    //     alert('Share data functionality coming soon!');
    // });

    // // Handle quick action buttons
    // document.getElementById('newUploadBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement new upload functionality
    //     alert('New upload functionality coming soon!');
    // });

    // document.getElementById('recentFilesBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement recent files functionality
    //     alert('Recent files functionality coming soon!');
    // });

    // document.getElementById('sharedWithMeBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // TODO: Implement shared with me functionality
    //     alert('Shared with me functionality coming soon!');
    // });

    // Add active class to current navigation item
    // const currentPath = window.location.pathname;
    // const navLinks = document.querySelectorAll('.nav-link');
    // navLinks.forEach(link => {
    //     if (link.getAttribute('href') === currentPath) {
    //         link.classList.add('active');
    //     }
    // });
});