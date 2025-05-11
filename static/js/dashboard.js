$(document).ready(function () {

    // Display current date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#currentDate').text(now.toLocaleDateString('en-US', options));
    
    // Initialize Bootstrap tabs
    $('#transactionTabs .nav-link').on('click', function(e) {
        e.preventDefault();
        $(this).tab('show');
    });
    
    // Load expense data via AJAX
    $.getJSON('/api/expenses', (data) => {
        const $tbody = $('#recentExpensesTable');
        $tbody.empty();
        let { topCategory, total, monthlyTotal } = updateTransactionTable(data, $tbody, 'expense');
        
        // Update expense metrics
        $('#topCategory').text(topCategory);
        $('#totalExpenses').text(formatCurrency(total));
        $('#monthlyExpenses').text(formatCurrency(monthlyTotal));
        
        // Update budget progress bars
        updateBudgetProgress(data);
    });

    // Load income data via AJAX
    $.getJSON('/api/incomes', (data) => {
        const $tbody = $('#recentIncomeTable');
        $tbody.empty();
        let { topCategory, total, monthlyTotal } = updateTransactionTable(data, $tbody, 'income');
        
        // Update income metrics
        $('#topIncomeCategory').text(topCategory);
        $('#totalIncome').text(formatCurrency(total));
        $('#monthlyIncome').text(formatCurrency(monthlyTotal));
        
        // Calculate and update balance metrics
        calculateBalance();
    });
    
    // Budget edit functionality
    $('#editBudgetBtn').on('click', function() {
        // Load current values
        $('#foodBudget').val(parseCurrency($('.budget-amount[data-category="food"]').text()));
        $('#transportBudget').val(parseCurrency($('.budget-amount[data-category="transport"]').text()));
        $('#entertainmentBudget').val(parseCurrency($('.budget-amount[data-category="entertainment"]').text()));
        $('#utilitiesBudget').val(parseCurrency($('.budget-amount[data-category="utilities"]').text()));
        
        // Show modal
        $('#editBudgetModal').modal('show');
    });
    
    // Save budget changes
    $('#saveBudgetBtn').on('click', function() {
        // Get new values
        const foodBudget = parseFloat($('#foodBudget').val());
        const transportBudget = parseFloat($('#transportBudget').val());
        const entertainmentBudget = parseFloat($('#entertainmentBudget').val());
        const utilitiesBudget = parseFloat($('#utilitiesBudget').val());
        
        // Update displayed budget amounts
        $('.budget-amount[data-category="food"]').text(formatCurrency(foodBudget));
        $('.budget-amount[data-category="transport"]').text(formatCurrency(transportBudget));
        $('.budget-amount[data-category="entertainment"]').text(formatCurrency(entertainmentBudget));
        $('.budget-amount[data-category="utilities"]').text(formatCurrency(utilitiesBudget));
        
        // Update progress bars based on new budgets
        updateBudgetProgress();
        
        // Save to localStorage for persistence
        const budgets = {
            food: foodBudget,
            transport: transportBudget,
            entertainment: entertainmentBudget,
            utilities: utilitiesBudget
        };
        localStorage.setItem('budgets', JSON.stringify(budgets));
        
        // Close modal
        $('#editBudgetModal').modal('hide');
    });
    
    // Savings goal edit functionality
    $('#editSavingsGoalBtn').on('click', function() {
        // Load current values
        $('#savingsGoalNameInput').val($('#savingsGoalName').text());
        $('#savingsTargetInput').val(parseCurrency($('#savingsTarget').text()));
        
        // Show modal
        $('#editSavingsGoalModal').modal('show');
    });
    
    // Save savings goal changes
    $('#saveSavingsGoalBtn').on('click', function() {
        // Get new values
        const goalName = $('#savingsGoalNameInput').val();
        const targetAmount = parseFloat($('#savingsTargetInput').val());
        
        // Update displayed values
        $('#savingsGoalName').text(goalName);
        $('#savingsTarget').text(formatCurrency(targetAmount));
        
        // Save to localStorage for persistence
        const savingsGoal = {
            name: goalName,
            target: targetAmount
        };
        localStorage.setItem('savingsGoal', JSON.stringify(savingsGoal));
        
        // Update progress
        updateSavingsProgress();
        
        // Close modal
        $('#editSavingsGoalModal').modal('hide');
    });
    
    // Load saved values on page load
    function loadSavedValues() {
        // Load budgets
        try {
            const savedBudgets = JSON.parse(localStorage.getItem('budgets'));
            if (savedBudgets) {
                if (savedBudgets.food) $('.budget-amount[data-category="food"]').text(formatCurrency(savedBudgets.food));
                if (savedBudgets.transport) $('.budget-amount[data-category="transport"]').text(formatCurrency(savedBudgets.transport));
                if (savedBudgets.entertainment) $('.budget-amount[data-category="entertainment"]').text(formatCurrency(savedBudgets.entertainment));
                if (savedBudgets.utilities) $('.budget-amount[data-category="utilities"]').text(formatCurrency(savedBudgets.utilities));
            }
        } catch (e) {
            console.log('Error loading saved budgets', e);
        }
        
        // Load savings goal
        try {
            const savedGoal = JSON.parse(localStorage.getItem('savingsGoal'));
            if (savedGoal) {
                if (savedGoal.name) $('#savingsGoalName').text(savedGoal.name);
                if (savedGoal.target) $('#savingsTarget').text(formatCurrency(savedGoal.target));
            }
        } catch (e) {
            console.log('Error loading saved savings goal', e);
        }
    }
    
    // Call on page load
    loadSavedValues();

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

        // Generate rows with enhanced styling
        recent.forEach(transaction => {
            // Format date to be more readable
            const transDate = new Date(transaction.date);
            const formattedDate = transDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create table row without action buttons
            const $row = $(
                `<tr>
                    <td>${formattedDate}</td>
                    <td><span class="badge rounded-pill ${type === 'income' ? 'bg-success' : 'bg-danger'}">${transaction.category}</span></td>
                    <td><span class="remark-tooltip" data-remark="${transaction.description || ''}">${getShortRemark(transaction.description)}</span></td>
                    <td class="text-end fw-bold">${formatCurrency(transaction.amount)}</td>
                </tr>`
            );
            $tbody.append($row);
        });
        
        return { 
            topCategory, 
            total, 
            monthlyTotal
        };
    };
    
    // Calculate and display balance
    function calculateBalance() {
        const totalIncome = parseCurrency($('#totalIncome').text());
        const totalExpenses = parseCurrency($('#totalExpenses').text());
        const balance = totalIncome - totalExpenses;
        
        $('#currentBalance').text(formatCurrency(balance));
        
        // Calculate month-over-month percentage change (using fixed values for now)
        // In a real implementation, this would compare with previous month's data
        let percentChange = 0;
        if (totalIncome > 0) {

            const lastMonthBalance = totalIncome * 0.9 - totalExpenses * 1.1; 
            if (lastMonthBalance !== 0) {
                percentChange = Math.round(((balance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100);
            }
        }
        
        // Update balance trend based on actual value
        const balanceTrend = $('#balanceTrend');
        if (balance >= 0) {
            balanceTrend.html(`<i class="fas fa-arrow-up"></i> ${Math.abs(percentChange)}%`);
            balanceTrend.removeClass('negative').addClass('positive');
        } else {
            balanceTrend.html(`<i class="fas fa-arrow-down"></i> ${Math.abs(percentChange)}%`);
            balanceTrend.removeClass('positive').addClass('negative');
        }
        
        // Update savings progress with balance as current savings
        $('#currentSavings').text(formatCurrency(Math.max(0, balance)));
        updateSavingsProgress();
    }
    
    // Update savings progress
    function updateSavingsProgress() {
        const currentSavings = parseCurrency($('#currentSavings').text());
        const target = parseCurrency($('#savingsTarget').text());
        
        // Calculate percentage (capped at 100%)
        const percentage = target > 0 ? Math.min(100, Math.round((currentSavings / target) * 100)) : 0;
        
        // Update progress bar
        $('#savingsProgress')
            .css('width', `${percentage}%`)
            .attr('aria-valuenow', percentage);
            
        // Update percentage text
        $('#savingsPercentage').text(`${percentage}% Complete`);
        
        // Change color based on percentage
        if (percentage >= 75) {
            $('#savingsProgress').removeClass('bg-info bg-warning').addClass('bg-success');
        } else if (percentage >= 40) {
            $('#savingsProgress').removeClass('bg-success bg-warning').addClass('bg-info');
        } else {
            $('#savingsProgress').removeClass('bg-success bg-info').addClass('bg-warning');
        }
    }
    
    // Update budget progress bars based on actual spending
    function updateBudgetProgress(expenseData) {
        if (!expenseData) {
            // If no data is provided, just update based on current values
            const foodSpent = parseCurrency($('#foodSpent').text());
            const transportSpent = parseCurrency($('#transportSpent').text());
            const entertainmentSpent = parseCurrency($('#entertainmentSpent').text());
            const utilitiesSpent = parseCurrency($('#utilitiesSpent').text());
            
            const foodBudget = parseCurrency($('.budget-amount[data-category="food"]').text());
            const transportBudget = parseCurrency($('.budget-amount[data-category="transport"]').text());
            const entertainmentBudget = parseCurrency($('.budget-amount[data-category="entertainment"]').text());
            const utilitiesBudget = parseCurrency($('.budget-amount[data-category="utilities"]').text());
            
            updateProgressBar('food', foodSpent, foodBudget);
            updateProgressBar('transport', transportSpent, transportBudget);
            updateProgressBar('entertainment', entertainmentSpent, entertainmentBudget);
            updateProgressBar('utilities', utilitiesSpent, utilitiesBudget);
            
            return;
        }
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Define budget categories and amounts
        const budgetCategories = {
            'Food': { id: 'food', budget: parseCurrency($('.budget-amount[data-category="food"]').text()) },
            'Transportation': { id: 'transport', budget: parseCurrency($('.budget-amount[data-category="transport"]').text()) },
            'Entertainment': { id: 'entertainment', budget: parseCurrency($('.budget-amount[data-category="entertainment"]').text()) },
            'Utilities': { id: 'utilities', budget: parseCurrency($('.budget-amount[data-category="utilities"]').text()) }
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
            
            updateProgressBar(info.id, spentAmount, info.budget);
        });
    }
    
    // Helper function to update a single progress bar
    function updateProgressBar(id, spent, budget) {
        // Calculate percentage (capped at 100%)
        const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
        
        // Update DOM elements
        $(`#${id}Spent`).text(formatCurrency(spent));
        $(`#${id}Progress`)
            .css('width', `${percentage}%`)
            .attr('aria-valuenow', percentage);
            
        // Change color based on percentage
        if (percentage >= 85) {
            $(`#${id}Progress`).removeClass('bg-success bg-info bg-warning').addClass('bg-danger');
        } else if (percentage >= 65) {
            $(`#${id}Progress`).removeClass('bg-success bg-info bg-danger').addClass('bg-warning');
        } else {
            $(`#${id}Progress`).removeClass('bg-danger bg-warning').addClass('bg-success');
        }
    }

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