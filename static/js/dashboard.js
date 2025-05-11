$(document).ready(function () {
    // Display current date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#currentDate').text(now.toLocaleDateString('en-US', options));
    
    // Load expense data via AJAX
    $.getJSON('/api/expenses', (data) => {
        const $tbody = $('#recentExpensesTable');
        $tbody.empty();
        let { topCategory, total, monthlyTotal, allCategories } = updateTransactionTable(data, $tbody, 'expense');
        
        // Update expense metrics
        $('#topCategory').text(topCategory);
        $('#totalExpenses').text(formatCurrency(total));
        $('#monthlyExpenses').text(formatCurrency(monthlyTotal));
        
        // Update budget progress bars
        updateBudgetProgress(data);
        
        // Populate expense categories list
        populateCategoriesList(allCategories, 'expense');
    });

    // Load income data via AJAX
    $.getJSON('/api/incomes', (data) => {
        const $tbody = $('#recentIncomeTable');
        $tbody.empty();
        let { topCategory, total, monthlyTotal, allCategories } = updateTransactionTable(data, $tbody, 'income');
        
        // Update income metrics
        $('#topIncomeCategory').text(topCategory);
        $('#totalIncome').text(formatCurrency(total));
        $('#monthlyIncome').text(formatCurrency(monthlyTotal));
        
        // Populate income categories list
        populateCategoriesList(allCategories, 'income');
        
        // Calculate and update balance metrics
        calculateBalance();
    });
    
    // Toggle between expense and income categories
    $('#topCategoriesExpenses').on('click', function() {
        $(this).addClass('active');
        $('#topCategoriesIncome').removeClass('active');
        $('#topExpenseCategoriesContainer').show();
        $('#topIncomeCategoriesContainer').hide();
    });
    
    $('#topCategoriesIncome').on('click', function() {
        $(this).addClass('active');
        $('#topCategoriesExpenses').removeClass('active');
        $('#topExpenseCategoriesContainer').hide();
        $('#topIncomeCategoriesContainer').show();
    });

    // Function to update transaction tables with enhanced formatting
    const updateTransactionTable = (data, $tbody, type) => {
        let total = 0;
        let monthlyTotal = 0;
        const categories = {};
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Process transaction data
        data.forEach(transaction => {
            const amount = transaction.amount;
            const date = new Date(transaction.date);
            total += amount;

            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
                monthlyTotal += amount;
            }

            // Track categories for finding top category
            categories[transaction.category] = (categories[transaction.category] || 0) + amount;
        });

        // Find top category
        let topCategory = '-';
        let maxAmount = 0;
        $.each(categories, (category, amount) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                topCategory = category;
            }
        });

        // Sort by date and take recent 5
        const recent = data
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        // Generate rows with enhanced styling and action buttons
        recent.forEach(transaction => {
            // Format date to be more readable
            const transDate = new Date(transaction.date);
            const formattedDate = transDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create table row with action buttons
            const $row = $(
                `<tr>
                    <td>${formattedDate}</td>
                    <td><span class="badge rounded-pill ${type === 'income' ? 'bg-success' : 'bg-danger'}">${transaction.category}</span></td>
                    <td><span class="remark-tooltip" data-remark="${transaction.description || ''}">${getShortRemark(transaction.description)}</span></td>
                    <td class="text-end fw-bold">${formatCurrency(transaction.amount)}</td>
                    <td class="text-center">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline-secondary btn-action" data-id="${transaction.id}" data-action="edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" data-id="${transaction.id}" data-action="delete" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`
            );
            $tbody.append($row);
        });
        
        // Set up action button event handlers
        setupActionButtons(type);
        
        // Convert categories to array of objects for sorting
        const categoriesArray = Object.entries(categories).map(([name, amount]) => ({
            name,
            amount
        })).sort((a, b) => b.amount - a.amount);
        
        return { 
            topCategory, 
            total, 
            monthlyTotal,
            allCategories: categoriesArray
        };
    };
    
    // Populate categories list with real data
    function populateCategoriesList(categories, type) {
        const containerId = type === 'expense' ? 'expenseCategoriesList' : 'incomeCategoriesList';
        const $container = $(`#${containerId}`);
        $container.empty();
        
        // Take top 5 categories
        const topCategories = categories.slice(0, 5);
        const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
        
        if (topCategories.length === 0) {
            $container.html('<div class="text-center text-muted py-4">No data available</div>');
            return;
        }
        
        // Create category items
        topCategories.forEach((category, index) => {
            const percentage = total > 0 ? Math.round((category.amount / total) * 100) : 0;
            const bgClass = type === 'expense' ? 'bg-danger' : 'bg-success';
            
            const $item = $(`
                <div class="category-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="d-flex align-items-center">
                            <div class="category-rank">${index + 1}</div>
                            <div class="category-name">${category.name}</div>
                        </div>
                        <div class="category-amount">${formatCurrency(category.amount)}</div>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar ${bgClass}" role="progressbar" style="width: ${percentage}%" 
                            aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="text-end mt-1">
                        <small class="text-muted">${percentage}% of total</small>
                    </div>
                </div>
            `);
            
            $container.append($item);
        });
    }
    
    // Setup action buttons for edit and delete
    function setupActionButtons(type) {
        // Edit button handler
        $(`[data-action="edit"]`).on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/${type === 'income' ? 'income' : 'expenses'}/edit/${id}`;
        });
        
        // Delete button handler
        $(`[data-action="delete"]`).on('click', function() {
            const id = $(this).data('id');
            const endpoint = type === 'income' ? '/api/incomes/delete' : '/api/expenses/delete';
            
            if (confirm("Are you sure you want to delete this item?")) {
                $.ajax({
                    url: endpoint,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ id: id }),
                    success: function() {
                        window.location.reload();
                    },
                    error: function(xhr) {
                        alert('Error: ' + (xhr.responseJSON?.error || 'Could not delete item'));
                    }
                });
            }
        });
    }
    
    // Calculate and display balance
    function calculateBalance() {
        const totalIncome = parseCurrency($('#totalIncome').text());
        const totalExpenses = parseCurrency($('#totalExpenses').text());
        const balance = totalIncome - totalExpenses;
        
        $('#currentBalance').text(formatCurrency(balance));
        
        // Update balance trend based on actual value
        const balanceTrend = $('#balanceTrend');
        if (balance >= 0) {
            balanceTrend.html('<i class="fas fa-arrow-up"></i> 0%');
            balanceTrend.removeClass('negative').addClass('positive');
        } else {
            balanceTrend.html('<i class="fas fa-arrow-down"></i> 0%');
            balanceTrend.removeClass('positive').addClass('negative');
        }
    }
    
    // Update budget progress bars based on actual spending
    function updateBudgetProgress(expenseData) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Define budget categories and amounts
        const budgetCategories = {
            'Food': { id: 'food', budget: 500 },
            'Transportation': { id: 'transport', budget: 300 },
            'Entertainment': { id: 'entertainment', budget: 200 },
            'Utilities': { id: 'utilities', budget: 250 }
        };
        
        // Calculate spending by category for current month
        const categorySpending = {};
        
        expenseData.forEach(expense => {
            const date = new Date(expense.date);
            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
                const category = expense.category;
                categorySpending[category] = (categorySpending[category] || 0) + expense.amount;
            }
        });
        
        // Update progress bars for each budget category
        Object.entries(budgetCategories).forEach(([category, info]) => {
            // Find spending that matches this category or starts with this category name
            const spentAmount = Object.entries(categorySpending).reduce((total, [expCat, amount]) => {
                if (expCat === category || expCat.startsWith(category)) {
                    return total + amount;
                }
                return total;
            }, 0);
            
            // Calculate percentage (capped at 100%)
            const percentage = Math.min(100, Math.round((spentAmount / info.budget) * 100));
            
            // Update DOM elements
            $(`#${info.id}Spent`).text(formatCurrency(spentAmount));
            $(`#${info.id}Progress`)
                .css('width', `${percentage}%`)
                .attr('aria-valuenow', percentage);
                
            // Change color based on percentage
            if (percentage >= 85) {
                $(`#${info.id}Progress`).removeClass('bg-success bg-info bg-warning').addClass('bg-danger');
            } else if (percentage >= 65) {
                $(`#${info.id}Progress`).removeClass('bg-success bg-info bg-danger').addClass('bg-warning');
            }
        });
    }
    
    // Initialize saving goal progress circles
    initializeSavingGoals();
    function initializeSavingGoals() {
        $('.goal-progress-circle').each(function() {
            const percentage = $(this).data('percentage');
            $(this).css('--percentage', `${percentage}%`);
        });
    }
    
    // Add Goal button handler
    $('#addGoalBtn').on('click', function() {
        // In a real app, this would open a modal to add a new saving goal
        alert('This feature will be available in a future update!');
    });

    // Utility: get short remark for display, with ellipsis if too long
    function getShortRemark(desc, maxLen = 20) {
        if (!desc) return '';
        return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
    }
    
    // Format currency with $ symbol
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    // Parse currency string back to number
    function parseCurrency(currencyStr) {
        return parseFloat(currencyStr.replace(/[^0-9.-]+/g, '')) || 0;
    }

    // Custom tooltip functionality
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
});