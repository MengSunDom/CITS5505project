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
            const $row = $(
                `<tr>
                    <td>${expense.date}</td>
                    <td>${expense.category}</td>
                    <td><span class="remark-tooltip" data-remark="${expense.description || ''}">${getShortRemark(expense.description)}</span></td>
                    <td class="text-end">$${expense.amount.toFixed(2)}</td>
                </tr>`
            );
            $tbody.append($row);
        });
        return { topCategory, total, monthlyTotal }
    }

    // Utility: get short remark for display, with ellipsis if too long
    function getShortRemark(desc, maxLen = 20) {
        if (!desc) return '';
        return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
    }

    function showCustomTooltip($el, text) {
        if (!text) return;
        const $tip = $('<div class="custom-tooltip"></div>').text(text).appendTo('body');
        const offset = $el.offset();
        $tip.css({
            left: offset.left,
            top: offset.top - $tip.outerHeight() - 10,
            position: 'absolute',
            zIndex: 9999,
            background: 'rgba(30,30,40,0.98)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            fontSize: '1em',
            maxWidth: '420px',
            wordBreak: 'break-all',
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
            opacity: 1,
            fontFamily: 'Segoe UI, Arial, sans-serif',
            letterSpacing: '0.01em',
            lineHeight: '1.5'
        });
    }

    $(document).off('mouseenter.remark-tooltip mouseleave.remark-tooltip');
    $(document).on('mouseenter.remark-tooltip', '.remark-tooltip', function() {
        showCustomTooltip($(this), $(this).data('remark'));
    }).on('mouseleave.remark-tooltip', '.remark-tooltip', function() {
        $('.custom-tooltip').remove();
    });

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