$(document).ready(() => {
    /**
     * Debug function to log date information
     * @param {string} label - Label for the log entry
     * @param {*} dateObj - Date object or string to inspect
     */
    function debugDate(label, dateObj) {
        if (!dateObj) {
            console.log(`DEBUG DATE [${label}]: null or undefined`);
            return;
        }
        
        if (typeof dateObj === 'string') {
            console.log(`DEBUG DATE [${label}] (string): ${dateObj}`);
            try {
                const parsedDate = new Date(dateObj);
                console.log(`  → Parsed as: ${parsedDate.toISOString()} (valid: ${!isNaN(parsedDate.getTime())})`);
            } catch (e) {
                console.log(`  → Failed to parse: ${e.message}`);
            }
        } else if (dateObj instanceof Date) {
            console.log(`DEBUG DATE [${label}] (Date object): ${dateObj.toISOString()}`);
            console.log(`  → Year: ${dateObj.getFullYear()}, Month: ${dateObj.getMonth() + 1}, Day: ${dateObj.getDate()}`);
        } else {
            console.log(`DEBUG DATE [${label}] (${typeof dateObj}):`, dateObj);
        }
    }
    
    // Make debug function available globally
    window.debugDate = debugDate;
    
    console.log("Insights page initializing with improved date handling...");
    
    // Set default date range to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Format dates for input fields
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    // Set initial values for date inputs
    $('#startDate').val(formatDateForInput(firstDayOfMonth));
    $('#endDate').val(formatDateForInput(today));
    
    console.log(`Initial date range: ${formatDateForInput(firstDayOfMonth)} to ${formatDateForInput(today)}`);
    
    // Ensure "This Month" button is active by default
    $('.period-selector .btn').removeClass('active');
    $('.period-selector .btn[data-period="month"]').addClass('active');
    
    // Hide custom date range initially
    $('.custom-date-range').hide();
    
    // Load initial data
    console.log("Loading initial data with improved date handling...");
    loadAllData();
    
    // Debug initial request
    setTimeout(() => {
        debugApiRequest('month');
    }, 500);
    
    // Active period selection - completely revised to ensure correct date ranges
    $('.period-selector .btn').on('click', function() {
        $('.period-selector .btn').removeClass('active');
        $(this).addClass('active');
        
        const period = $(this).data('period');
        const today = new Date();
        
        console.log(`Switching to period: ${period}`);
        
        if (period === 'custom') {
            $('.custom-date-range').show();
            return;
        } else {
            $('.custom-date-range').hide();
        }
        
        let startDate, endDate, displayEndDate;
        
        switch(period) {
            case 'month':
                // Current month - from 1st of current month to 1st of next month (exclusive)
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                displayEndDate = new Date(today); // Display today's date
                break;
                
            case 'prev-month':
                // Previous month - from 1st of previous month to 1st of current month (exclusive)
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 1);
                
                // Calculate last day of previous month for display
                displayEndDate = new Date(endDate);
                displayEndDate.setDate(displayEndDate.getDate() - 1);
                break;
                
            case 'year':
                // Current year - from Jan 1 to Jan 1 of next year (exclusive)
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear() + 1, 0, 1);
                displayEndDate = new Date(today); // Display today's date
                break;
        }
        
        // Set the input field values
        $('#startDate').val(formatDateForInput(startDate));
        $('#endDate').val(formatDateForInput(displayEndDate));
        
        console.log(`Period ${period} - Date range: ${formatDateForInput(startDate)} to ${formatDateForInput(endDate)} (displayed as ${formatDateForInput(displayEndDate)})`);
        
        // Debug the API request
        loadAllData();
        
        // Debug the request after loading data
        setTimeout(() => {
            debugApiRequest(period);
        }, 500);
    });
    
    // Apply custom date range
    $('#applyDateRange').on('click', function() {
        loadAllData();
    });
    
    // Toggle between data types
    $('.data-type-filter .btn').on('click', function() {
        $('.data-type-filter .btn').removeClass('active');
        $(this).addClass('active');
        loadAllData();
    });
    
    // Chart period selectors
    $('.chart-period-selector .btn').on('click', function() {
        $(this).parent().find('.btn').removeClass('active');
        $(this).addClass('active');
        loadTrendChart();
    });
    
    // Pie chart type toggle
    $('[data-pie-type]').on('click', function() {
        $(this).parent().find('.btn').removeClass('active');
        $(this).addClass('active');
        loadCategoryPieChart();
    });
    
    // Monthly comparison type toggle
    $('[data-compare-type]').on('click', function() {
        $(this).parent().find('.btn').removeClass('active');
        $(this).addClass('active');
        loadMonthlyComparisonChart();
    });
    
    // Export functionality
    $('#exportPDF').on('click', function(e) {
        e.preventDefault();
        exportToPDF();
    });
    
    $('#exportPNG').on('click', function(e) {
        e.preventDefault();
        exportToPNG();
    });
    
    // Get current filter settings - completely revised for correct date handling
    function getFilterSettings() {
        const startDateStr = $('#startDate').val();
        const endDateStr = $('#endDate').val();
        
        const activePeriod = $('.period-selector .btn.active').data('period');
        console.log(`Getting filter settings for period: ${activePeriod}`);
        
        let startDate = startDateStr;
        let endDate, displayEndDate = endDateStr;
        
        
        
        // Create date objects for manipulation
        const startDateObj = new Date(startDateStr);
        const endDateObj = new Date(endDateStr);
        const today = new Date();
        
        // Handle period-specific date logic
        switch(activePeriod) {
            case 'month':
                // End date should be first day of next month
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                endDate = formatDateForInput(nextMonth);
                break;
                
            case 'prev-month':
                // End date should be first day of current month
                const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = formatDateForInput(thisMonth);
                break;
                
            case 'year':
                // End date should be first day of next year
                const nextYear = new Date(today.getFullYear() + 1, 0, 1);
                endDate = formatDateForInput(nextYear);
                break;
                
            case 'custom':
                // For custom range, we need to add one day to include the end date
                const nextDay = new Date(endDateObj);
                nextDay.setDate(nextDay.getDate() + 1);
                endDate = formatDateForInput(nextDay);
                break;
                
            default:
                // Default to adding one day to include the end date
                const defaultNextDay = new Date(endDateObj);
                defaultNextDay.setDate(defaultNextDay.getDate() + 1);
                endDate = formatDateForInput(defaultNextDay);
        }
        
        console.log(`Final date range: ${startDate} to ${endDate} (displayed as ${displayEndDate})`);
        
        return {
            startDate: startDate,
            endDate: endDate,
            displayEndDate: displayEndDate,
            dataType: $('.data-type-filter .btn.active').data('type') || 'all'
        };
    }
    
    // Load all data with proper error handling
    function loadAllData() {
        const filters = getFilterSettings();
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading all data for period: ${activePeriod}`);
        console.log(`Date range: ${filters.startDate} to ${filters.endDate} (display: ${filters.displayEndDate})`);
        
        
        
        // Store current period for comparison features
        localStorage.setItem('lastActivePeriod', activePeriod);
        
        // First load summary cards (main data) with a fallback chain
        loadSummaryCards(function() {
            // Then load remaining charts
            loadTrendChart();
            loadCategoryPieChart();
            loadTopCategoriesChart();
            loadMonthlyComparisonChart();
            
            // Debug API request for this period
            setTimeout(() => {
                debugApiRequest(activePeriod);
            }, 500);
        });
    }
    
    // Load summary cards data using the direct period-summary API
    function loadSummaryCards(callback) {
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading summary cards for period: ${activePeriod} using direct period API`);
        
        // Use the direct period-summary API for more consistent results
        $.ajax({
            url: '/api/insights/period-summary',
            method: 'GET',
            data: { 
                period: activePeriod
            },
            dataType: 'json',
            success: (periodData) => {
                console.log(`Period ${activePeriod} data received:`, periodData);
                
                // Calculate average daily income and expenses
                const daysInPeriod = getDaysInPeriod(activePeriod);
                const averageDailyIncome = (periodData.income.totalAmount / daysInPeriod).toFixed(2);
                const averageDailyExpense = (periodData.expense.totalAmount / daysInPeriod).toFixed(2);
                
                // Update the summary cards with the period data
                updateSummaryCardsWithPeriodData(periodData.income, periodData.expense, 
                    { totalAmount: 0 }, { totalAmount: 0 });
                
                // Display average daily income and expenses
                $('#averageDailyIncome').text(`Average Daily Income: $${averageDailyIncome}`);
                $('#averageDailyExpense').text(`Average Daily Expense: $${averageDailyExpense}`);
                
                // Continue with other charts
                if (callback) callback();
            },
            error: (xhr, status, error) => {
                console.error("Error fetching period data:", error);
                handleAjaxError(xhr, status, error);
                
                // Fallback to original method if direct API fails
                fallbackLoadSummaryCards(callback);
            }
        });
    }
    
    // Helper function to get the number of days in the selected period
    function getDaysInPeriod(period) {
        const today = new Date();
        switch (period) {
            case 'month':
                return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // Days in current month
            case 'prev-month':
                return new Date(today.getFullYear(), today.getMonth(), 0).getDate(); // Days in previous month
            case 'year':
                return 365; // Approximation for simplicity
            default:
                return 0; // Custom or unknown period
        }
    }
    
    // Update summary cards with period data and comparisons
    function updateSummaryCardsWithPeriodData(incomeData, expenseData, prevIncomeData, prevExpenseData) {
        // Ensure we have valid data objects
        incomeData = incomeData || { totalAmount: 0, categoryDistribution: { labels: [], values: [] } };
        expenseData = expenseData || { totalAmount: 0, categoryDistribution: { labels: [], values: [] } };
        prevIncomeData = prevIncomeData || { totalAmount: 0 };
        prevExpenseData = prevExpenseData || { totalAmount: 0 };
        
        // Ensure properties exist
        incomeData.totalAmount = incomeData.totalAmount || 0;
        if (!incomeData.categoryDistribution) {
            incomeData.categoryDistribution = { labels: [], values: [] };
        }
        
        expenseData.totalAmount = expenseData.totalAmount || 0;
        if (!expenseData.categoryDistribution) {
            expenseData.categoryDistribution = { labels: [], values: [] };
        }
        
        // Income card
        const totalIncome = incomeData.totalAmount;
        $('#totalIncome').text(totalIncome.toFixed(2));
        
        // Calculate income change percentage
        const prevTotalIncome = prevIncomeData.totalAmount || 0; // Previous period's total income
        let incomeChangePercent = 0; // Initialize income change percentage

        if (prevTotalIncome === 0 && totalIncome === 0) {
            incomeChangePercent = 0; // No change if both are zero
        } else if (prevTotalIncome === 0) {
            incomeChangePercent = 100; // Change from 0 to a positive value
        } else if (totalIncome === 0) {
            incomeChangePercent = -100; // Change from a positive value to 0
        } else {
            // Calculate percentage change when both values are greater than 0
            incomeChangePercent = ((totalIncome - prevTotalIncome) / prevTotalIncome * 100).toFixed(1);
        }

        const incomeChangeClass = incomeChangePercent >= 0 ? 'positive' : 'negative';
        const incomeChangeIcon = incomeChangePercent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        $('#incomeChange').attr('class', `change-indicator ${incomeChangeClass}`)
            .html(`<i class="fas ${incomeChangeIcon}"></i> ${Math.abs(incomeChangePercent)}%`);
        
        // Expense card
        const totalExpense = expenseData.totalAmount;
        $('#totalExpenses').text(totalExpense.toFixed(2));
        
        // Calculate expense change percentage
        const prevTotalExpense = prevExpenseData.totalAmount || 0; // Previous period's total expense
        let expenseChangePercent = 0; // Initialize expense change percentage

        if (prevTotalExpense === 0 && totalExpense === 0) {
            expenseChangePercent = 0; // No change if both are zero
        } else if (prevTotalExpense === 0) {
            expenseChangePercent = 100; // Change from 0 to a positive value
        } else if (totalExpense === 0) {
            expenseChangePercent = -100; // Change from a positive value to 0
        } else {
            // Calculate percentage change when both values are greater than 0
            expenseChangePercent = ((totalExpense - prevTotalExpense) / prevTotalExpense * 100).toFixed(1);
        }

        // For expenses, decrease is good (positive), increase is bad (negative)
        const expenseChangeClass = expenseChangePercent <= 0 ? 'positive' : 'negative';
        const expenseChangeIcon = expenseChangePercent <= 0 ? 'fa-arrow-down' : 'fa-arrow-up';
        $('#expenseChange').attr('class', `change-indicator ${expenseChangeClass}`)
            .html(`<i class="fas ${expenseChangeIcon}"></i> ${Math.abs(expenseChangePercent)}%`);
        
        // Net balance card
        const netBalance = totalIncome - totalExpense;
        $('#netBalance').text(netBalance.toFixed(2));
        
        // Calculate net balance change
        const prevNetBalance = prevTotalIncome - prevTotalExpense;
        let balanceChangePercent = 0;
        
        if (Math.abs(prevNetBalance) > 0) {
            balanceChangePercent = ((netBalance - prevNetBalance) / Math.abs(prevNetBalance) * 100).toFixed(1);
        } else if (netBalance !== 0) {
            balanceChangePercent = netBalance > 0 ? 100 : -100;
        }
        
        const balanceChangeClass = balanceChangePercent >= 0 ? 'positive' : 'negative';
        const balanceChangeIcon = balanceChangePercent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        $('#balanceChange').attr('class', `change-indicator ${balanceChangeClass}`)
            .html(`<i class="fas ${balanceChangeIcon}"></i> ${Math.abs(balanceChangePercent)}%`);
        
        // Top category card
        let topCategory = { name: 'None', amount: 0, percentage: 0 };
        let categoryIcon = '🏠';
        
        if (expenseData.categoryDistribution.labels && 
            expenseData.categoryDistribution.labels.length > 0 && 
            expenseData.totalAmount > 0) {
            // Find category with highest amount
            const maxIndex = expenseData.categoryDistribution.values.indexOf(
                Math.max(...expenseData.categoryDistribution.values)
            );
            
            const categoryName = expenseData.categoryDistribution.labels[maxIndex];
            const categoryAmount = expenseData.categoryDistribution.values[maxIndex];
            const categoryPercentage = (categoryAmount / totalExpense * 100).toFixed(1);
            
            topCategory = {
                name: categoryName,
                amount: categoryAmount,
                percentage: categoryPercentage
            };
            
            // Select icon based on category
            switch(categoryName.toLowerCase()) {
                case 'food': categoryIcon = '🍔'; break;
                case 'transportation': categoryIcon = '🚗'; break;
                case 'entertainment': categoryIcon = '🎬'; break;
                case 'shopping': categoryIcon = '🛍️'; break;
                case 'bills': categoryIcon = '📝'; break;
                case 'other': categoryIcon = '📦'; break;
                default: categoryIcon = '💰';
            }
        }
        
        $('#topCategoryName').text(topCategory.name);
        $('#topCategoryAmount').text(topCategory.amount.toFixed(2));
        $('#topCategoryIcon').text(categoryIcon);
        $('#categoryPercentage').text(`${topCategory.percentage}% of total`);
    }
    
    // Fallback to the original method in case the direct API fails
    function fallbackLoadSummaryCards(callback) {
        const filters = getFilterSettings();
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Fallback: Loading summary cards for period: ${activePeriod}`);
        
        // First get income data
        $.ajax({
            url: '/api/income-summary',
            method: 'GET',
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (incomeData) => {
                console.log(`Fallback: Income data received for period ${activePeriod}:`, incomeData);
                
                // Then get expense data
                $.ajax({
                    url: '/api/insights/summary',
                    method: 'GET',
                    data: { 
                        startDate: filters.startDate, 
                        endDate: filters.endDate
                    },
                    dataType: 'json',
                    success: (expenseData) => {
                        console.log(`Fallback: Expense data received for period ${activePeriod}:`, expenseData);
                        
                        // Get previous period data for comparison
                        getPreviousPeriodData(activePeriod, function(prevIncomeData, prevExpenseData) {
                            // Update summary cards with both data sets
                            updateSummaryCardsWithPeriodData(
                                incomeData, expenseData, 
                                prevIncomeData, prevExpenseData
                            );
                            
                            // Continue with other charts
                            if (callback) callback();
                        });
                    },
                    error: (xhr, status, error) => {
                        console.error("Error fetching expense data:", error, xhr.responseText);
                        handleAjaxError(xhr, status, error);
                        
                        // Still update cards with income data only
                        updateSummaryCardsWithPeriodData(
                            incomeData, 
                            { totalAmount: 0, categoryDistribution: { labels: [], values: [] } }, 
                            { totalAmount: 0 }, 
                            { totalAmount: 0 }
                        );
                        
                        // Continue with other charts
                        if (callback) callback();
                    }
                });
            },
            error: (xhr, status, error) => {
                console.error("Error fetching income data:", error, xhr.responseText);
                handleAjaxError(xhr, status, error);
                
                // Try to still get expense data
                $.ajax({
                    url: '/api/insights/summary',
                    method: 'GET',
                    data: { 
                        startDate: filters.startDate, 
                        endDate: filters.endDate
                    },
                    dataType: 'json',
                    success: (expenseData) => {
                        // Update with expense data only
                        updateSummaryCardsWithPeriodData(
                            { totalAmount: 0, categoryDistribution: { labels: [], values: [] } }, 
                            expenseData,
                            { totalAmount: 0 }, 
                            { totalAmount: 0 }
                        );
                        
                        // Continue with other charts
                        if (callback) callback();
                    },
                    error: (xhr, status, error) => {
                        handleAjaxError(xhr, status, error);
                        
                        // Show empty data if both requests fail
                        updateSummaryCardsWithPeriodData(
                            { totalAmount: 0, categoryDistribution: { labels: [], values: [] } }, 
                            { totalAmount: 0, categoryDistribution: { labels: [], values: [] } },
                            { totalAmount: 0 }, 
                            { totalAmount: 0 }
                        );
                        
                        // Continue with other charts
                        if (callback) callback();
                    }
                });
            }
        });
    }
    
    // Load trend chart
    function loadTrendChart() {
        const filters = getFilterSettings();
        const trendPeriod = $('.chart-period-selector .btn.active').data('trend-period') || 'daily';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        // This chart shows day-by-day income vs expense comparison for the selected period
        console.log(`Loading trend chart data for period: ${activePeriod} (view: ${trendPeriod})`);
        
         
        // Calculate end date, ensuring it doesn't include the first day of the next month
        let endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);

        // Continue with the AJAX request
        $.ajax({
            url: '/api/income-expense-comparison',
            method: 'GET',
            data: { 
                startDate: filters.startDate, 
                endDate: endDate.toISOString().split('T')[0]
            },
            dataType: 'json',
            success: (data) => {
                console.log(`Trend data received with ${data.labels ? data.labels.length : 0} data points`);
                drawTrendChart(data, trendPeriod);
            },
            error: (xhr, status, error) => {
                handleAjaxError(xhr, status, error);
                drawTrendChart({
                    labels: [],
                    income: [],
                    expense: []
                }, trendPeriod);
            }
        });
    }
    
    // Draw trend chart with income and expense data
    function drawTrendChart(data, period) {
        
         
        let transformedData = data;
        
        // Check if data is valid
        if (!data || !data.labels || data.labels.length === 0) {
            // Create empty data structure
            transformedData = {
                labels: [],
                income: [],
                expense: []
            };
        }
        else if (period !== 'daily') {
            // If not daily and data is valid, group data by week or month
            transformedData = groupDataByPeriod(data, period);
        }
        
        let traces = [];
        
        if (transformedData.labels.length === 0) {
            // No data, add placeholder annotation
            traces = [{
                x: ['No data available'],
                y: [0],
                type: 'scatter',
                mode: 'markers',
                marker: {
                    color: 'rgba(200, 200, 200, 0.5)',
                    size: 10
                },
                hoverinfo: 'none'
            }];
        } else {

            const labels = transformedData.labels.map(label => {
                
                if (typeof label === 'string' && /^\d{4}-\d{2}-\d{2}/.test(label)) {
                    return label; 
                } else if (label instanceof Date) {
                    return label.toISOString().split('T')[0]; 
                } else {
                    return String(label); 
                }
            });
            
     
            const incomeValues = transformedData.income.map(val => parseFloat(val) || 0);
            const expenseValues = transformedData.expense.map(val => parseFloat(val) || 0);
            
            traces = [
                {
                    x: labels,
                    y: incomeValues,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Income',
                    line: {
                        color: 'rgba(25, 135, 84, 1)',
                        width: 3
                    },
                    marker: {
                        size: 6,
                        color: 'rgba(25, 135, 84, 0.8)'
                    }
                },
                {
                    x: labels,
                    y: expenseValues,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Expenses',
                    line: {
                        color: 'rgba(220, 53, 69, 1)',
                        width: 3
                    },
                    marker: {
                        size: 6,
                        color: 'rgba(220, 53, 69, 0.8)'
                    }
                }
            ];
        }
        
        const layout = {
            margin: { t: 10, r: 10, l: 50, b: 50 },
            hovermode: 'closest',
            xaxis: {
                title: period.charAt(0).toUpperCase() + period.slice(1),
                showgrid: false
            },
            yaxis: {
                title: 'Amount ($)',
                showgrid: true,
                gridcolor: 'rgba(0,0,0,0.05)'
            },
            legend: {
                orientation: 'h',
                y: 1.1
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            annotations: transformedData.labels.length === 0 ? [
                {
                    text: 'No data available for the selected period',
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: 0.5,
                    showarrow: false,
                    font: {
                        size: 14,
                        color: '#888'
                    }
                }
            ] : []
        };
        
        try {
            Plotly.newPlot('trendChart', traces, layout, {responsive: true});
        } catch (error) {
            console.error('Error plotting trend chart:', error);
         
            $('#trendChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Helper function to group data by week or month
    function groupDataByPeriod(data, period) {
        const result = {
            labels: [],
            income: [],
            expense: []
        };
        
        if (data.labels.length === 0) return result;
        
        if (period === 'weekly') {
            // Group by week
            const weeks = {};
            data.labels.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                const weekNum = getWeekNumber(date);
                const weekLabel = `Week ${weekNum}`;
                
                if (!weeks[weekLabel]) {
                    weeks[weekLabel] = { income: 0, expense: 0 };
                }
                
                weeks[weekLabel].income += data.income[index];
                weeks[weekLabel].expense += data.expense[index];
            });
            
            result.labels = Object.keys(weeks);
            result.labels.forEach(label => {
                result.income.push(weeks[label].income);
                result.expense.push(weeks[label].expense);
            });
        } else if (period === 'monthly') {
            // Group by month
            const months = {};
            data.labels.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                const monthLabel = date.toLocaleString('default', { month: 'short' });
                
                if (!months[monthLabel]) {
                    months[monthLabel] = { income: 0, expense: 0 };
                }
                
                months[monthLabel].income += data.income[index];
                months[monthLabel].expense += data.expense[index];
            });
            
            result.labels = Object.keys(months);
            result.labels.forEach(label => {
                result.income.push(months[label].income);
                result.expense.push(months[label].expense);
            });
        }
        
        return result;
    }
    
    // Helper to get week number
    function getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    
    // Load and draw category pie chart
    function loadCategoryPieChart() {
        const filters = getFilterSettings();
        const pieType = $('[data-pie-type].active').data('pie-type') || 'expense';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading ${pieType} category distribution data for period: ${activePeriod}`);
        
        // First try to use the period-summary API for standard periods
        if (activePeriod === 'month' || activePeriod === 'prev-month' || activePeriod === 'year') {
            $.ajax({
                url: '/api/insights/period-summary',
                method: 'GET',
                data: { 
                    period: activePeriod
                },
                dataType: 'json',
                success: (periodData) => {
                    console.log(`Period ${activePeriod} ${pieType} category data received`);
                    
                    if (pieType === 'expense') {
                        // Use expense data from period summary
                        drawCategoryPieChart(periodData.expense, pieType);
                    } else {
                        // For income, we need to format the data correctly
                        // The period summary has income data but not in category distribution format
                        // So we'll make a separate call for income categories
                        $.ajax({
                            url: '/api/income-summary',
                            method: 'GET',
                            data: { 
                                startDate: filters.startDate, 
                                endDate: filters.endDate
                            },
                            dataType: 'json',
                            success: (incomeData) => {
                                console.log(`Income category data received for period ${activePeriod}`);
                                drawCategoryPieChart(incomeData, pieType);
                            },
                            error: (xhr, status, error) => {
                                handleAjaxError(xhr, status, error);
                                // Draw empty pie chart
                                drawCategoryPieChart({
                                    categoryDistribution: { labels: [], values: [] }
                                }, pieType);
                            }
                        });
                    }
                },
                error: (xhr, status, error) => {
                    // Fallback to original method if period API fails
                    fallbackLoadCategoryPieChart(pieType, filters);
                }
            });
        } else {
            // For custom date ranges, use the original method
            fallbackLoadCategoryPieChart(pieType, filters);
        }
    }
    
    // Fallback method for category pie chart
    function fallbackLoadCategoryPieChart(pieType, filters) {
        // Choose API endpoint based on selected chart type (expense or income)
        let url = pieType === 'expense' ? '/api/insights/summary' : '/api/income-summary';
        
        console.log(`Fallback: Loading ${pieType} category distribution data`);
        
        $.ajax({
            url: url,
            method: 'GET',
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (data) => {
                console.log(`${pieType} category data received with ${data.categoryDistribution ? data.categoryDistribution.labels.length : 0} categories`);
                drawCategoryPieChart(data, pieType);
            },
            error: (xhr, status, error) => {
                handleAjaxError(xhr, status, error);
                // Draw empty pie chart to show the chart frame
                drawCategoryPieChart({
                    categoryDistribution: { labels: [], values: [] }
                }, pieType);
            }
        });
    }
    
    // Draw category distribution pie chart
    function drawCategoryPieChart(data, type) {
        try {
            // Ensure data is properly structured
            if (!data || !data.categoryDistribution || !data.categoryDistribution.labels) {
                data = { categoryDistribution: { labels: [], values: [] } };
            }
            
            // Get category distribution
            const labels = data.categoryDistribution.labels;
            const values = data.categoryDistribution.values;
            
            // Colors for different categories
            const colors = [
                'rgba(25, 135, 84, 0.8)',  // green
                'rgba(13, 110, 253, 0.8)', // blue
                'rgba(220, 53, 69, 0.8)',  // red
                'rgba(255, 193, 7, 0.8)',  // yellow
                'rgba(111, 66, 193, 0.8)', // purple
                'rgba(23, 162, 184, 0.8)'  // cyan
            ];
            
            // Extend colors array if needed
            while(colors.length < labels.length) {
                colors.push(...colors);
            }

            const layout = {
                margin: { t: 10, r: 10, l: 10, b: 10 },
                showlegend: false,
                annotations: [{
                    font: {
                        size: 14,
                        color: '#555'
                    },
                    showarrow: false,
                    text: type === 'expense' ? 'Expenses' : 'Income',
                    x: 0.5,
                    y: 0.5
                }],
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)'
            };
            
            let trace;
            
            // If no data available
            if (labels.length === 0) {
                trace = {
                    labels: ['No Data'],
                    values: [1],
                    type: 'pie',
                    textinfo: 'label',
                    hoverinfo: 'none',
                    marker: {
                        colors: ['rgba(200, 200, 200, 0.7)']
                    },
                    hole: 0.4
                };
                
                // Add no data annotation
                layout.annotations.push({
                    text: 'No data available',
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: 0.2,
                    showarrow: false,
                    font: {
                        size: 12,
                        color: '#888'
                    }
                });
            } else {
                trace = {
                    labels: labels,
                    values: values,
                    type: 'pie',
                    textinfo: 'label+percent',
                    hoverinfo: 'label+value+percent',
                    marker: {
                        colors: colors.slice(0, labels.length)
                    },
                    hole: 0.4,
                    textposition: 'outside',
                    textfont: {
                        size: 12
                    }
                };
            }
            
            Plotly.newPlot('categoryPieChart', [trace], layout, {responsive: true});
        } catch (error) {
            console.error('Error plotting pie chart:', error);
            $('#categoryPieChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Load and draw top categories chart
    function loadTopCategoriesChart() {
        const filters = getFilterSettings();
        const dataType = filters.dataType;
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading top categories for period: ${activePeriod}, data type: ${dataType}`);
        
        // First try to use the period-summary API for standard periods
        if (activePeriod === 'month' || activePeriod === 'prev-month' || activePeriod === 'year') {
            $.ajax({
                url: '/api/insights/period-summary',
                method: 'GET',
                data: { 
                    period: activePeriod
                },
                dataType: 'json',
                success: (periodData) => {
                    console.log(`Period ${activePeriod} summary data received for top categories`);
                    
                    if (dataType === 'all') {
                        // Need to get income category data separately
                        $.ajax({
                            url: '/api/income-summary',
                            method: 'GET',
                            data: { 
                                startDate: filters.startDate, 
                                endDate: filters.endDate
                            },
                            dataType: 'json',
                            success: (incomeData) => {
                                drawTopCategoriesChart(periodData.expense, incomeData);
                            },
                            error: (xhr, status, error) => {
                                handleAjaxError(xhr, status, error);
                                // Still draw with expense data only
                                drawTopCategoriesChart(periodData.expense, null);
                            }
                        });
                    } else if (dataType === 'expense') {
                        drawTopCategoriesChart(periodData.expense, null);
                    } else {
                        // For income only
                        $.ajax({
                            url: '/api/income-summary',
                            method: 'GET',
                            data: { 
                                startDate: filters.startDate, 
                                endDate: filters.endDate
                            },
                            dataType: 'json',
                            success: (incomeData) => {
                                drawTopCategoriesChart(null, incomeData);
                            },
                            error: (xhr, status, error) => {
                                handleAjaxError(xhr, status, error);
                                drawTopCategoriesChart(null, null);
                            }
                        });
                    }
                },
                error: (xhr, status, error) => {
                    // Fallback to original method
                    fallbackLoadTopCategoriesChart(dataType, filters);
                }
            });
        } else {
            // For custom date ranges, use the original method
            fallbackLoadTopCategoriesChart(dataType, filters);
        }
    }
    
    // Fallback method for top categories chart
    function fallbackLoadTopCategoriesChart(dataType, filters) {
        console.log(`Fallback: Loading top categories for data type: ${dataType}`);
        
        // Loading logic differs based on whether we're showing all data, expenses only, or income only
        if (dataType === 'all' || dataType === 'expense') {
            // Load expense data first if needed
            $.ajax({
                url: '/api/insights/summary',
                method: 'GET',
                data: { 
                    startDate: filters.startDate, 
                    endDate: filters.endDate
                },
                dataType: 'json',
                success: (expenseData) => {
                    console.log(`Expense category data received with ${expenseData.categoryDistribution ? expenseData.categoryDistribution.labels.length : 0} categories`);
                    
                    // If showing all data, also get income data
                    if (dataType === 'all') {
                        $.ajax({
                            url: '/api/income-summary',
                            method: 'GET',
                            data: { 
                                startDate: filters.startDate, 
                                endDate: filters.endDate
                            },
                            dataType: 'json',
                            success: (incomeData) => {
                                console.log(`Income category data received with ${incomeData.categoryDistribution ? incomeData.categoryDistribution.labels.length : 0} categories`);
                                drawTopCategoriesChart(expenseData, incomeData);
                            },
                            error: (xhr, status, error) => {
                                handleAjaxError(xhr, status, error);
                                // Still draw with expense data only
                                drawTopCategoriesChart(expenseData);
                            }
                        });
                    } else {
                        // Just show expense data
                        drawTopCategoriesChart(expenseData);
                    }
                },
                error: (xhr, status, error) => {
                    handleAjaxError(xhr, status, error);
                    
                    // If showing all data, still try to get income data
                    if (dataType === 'all') {
                        $.ajax({
                            url: '/api/income-summary',
                            method: 'GET',
                            data: { 
                                startDate: filters.startDate, 
                                endDate: filters.endDate
                            },
                            dataType: 'json',
                            success: (incomeData) => {
                                drawTopCategoriesChart(null, incomeData);
                            },
                            error: (xhr, status, error) => {
                                handleAjaxError(xhr, status, error);
                                // Draw empty chart if both fail
                                drawTopCategoriesChart(null, null);
                            }
                        });
                    } else {
                        // Draw empty chart
                        drawTopCategoriesChart(null, null);
                    }
                }
            });
        } else {
            // If only showing income data
            $.ajax({
                url: '/api/income-summary',
                method: 'GET',
                data: { 
                    startDate: filters.startDate, 
                    endDate: filters.endDate
                },
                dataType: 'json',
                success: (incomeData) => {
                    drawTopCategoriesChart(null, incomeData);
                },
                error: (xhr, status, error) => {
                    handleAjaxError(xhr, status, error);
                    // Draw empty chart
                    drawTopCategoriesChart(null, null);
                }
            });
        }
    }
    
    // Draw top categories chart
    function drawTopCategoriesChart(expenseData, incomeData) {
        try {
            const TOP_LIMIT = 5; // Show top 5 categories
            const traces = [];
            
            // Process expense data
            if (expenseData && expenseData.categoryDistribution && expenseData.categoryDistribution.labels && expenseData.categoryDistribution.labels.length > 0) {
                const categories = [];
                
                // Pair categories with values
                expenseData.categoryDistribution.labels.forEach((label, index) => {
                    categories.push({
                        name: label,
                        value: parseFloat(expenseData.categoryDistribution.values[index]) || 0
                    });
                });
                
                // Sort by value descending
                categories.sort((a, b) => b.value - a.value);
                
                // Take top N categories
                const topCategories = categories.slice(0, TOP_LIMIT);
                
                // Add expense trace
                traces.push({
                    x: topCategories.map(c => c.value),
                    y: topCategories.map(c => c.name),
                    name: 'Expenses',
                type: 'bar',
                    orientation: 'h',
                    marker: {
                        color: 'rgba(220, 53, 69, 0.7)'
                    },
                    hovertemplate: '%{y}: $%{x:.2f}<extra></extra>'
                });
            }
            
            // Process income data
            if (incomeData && incomeData.categoryDistribution && incomeData.categoryDistribution.labels && incomeData.categoryDistribution.labels.length > 0) {
                const categories = [];
                
                // Pair categories with values
                incomeData.categoryDistribution.labels.forEach((label, index) => {
                    categories.push({
                        name: label,
                        value: parseFloat(incomeData.categoryDistribution.values[index]) || 0
                    });
                });
                
                // Sort by value descending
                categories.sort((a, b) => b.value - a.value);
                
                // Take top N categories
                const topCategories = categories.slice(0, TOP_LIMIT);
                
                // Add income trace
                traces.push({
                    x: topCategories.map(c => c.value),
                    y: topCategories.map(c => c.name),
                    name: 'Income',
                    type: 'bar',
                    orientation: 'h',
                    marker: {
                        color: 'rgba(25, 135, 84, 0.7)'
                    },
                    hovertemplate: '%{y}: $%{x:.2f}<extra></extra>'
                });
            }
            
            // If no traces (no data), add placeholder trace
            if (traces.length === 0) {
                traces.push({
                    x: [0],
                    y: ['No data available'],
                    name: 'No Data',
                    type: 'bar',
                    orientation: 'h',
                    marker: {
                        color: 'rgba(200, 200, 200, 0.7)'
                    },
                    hoverinfo: 'none'
                });
            }

            const layout = {
                margin: { t: 20, r: 20, l: 120, b: 30 },
                barmode: 'group',
                xaxis: {
                    title: 'Amount ($)',
                    showgrid: true,
                    gridcolor: 'rgba(0,0,0,0.05)'
                },
                legend: {
                    orientation: 'h',
                    y: 1.1
                },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                annotations: traces.length === 1 && traces[0].name === 'No Data' ? [
                    {
                        text: 'No data available for the selected period',
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.5,
                        y: 0.5,
                        showarrow: false,
                        font: {
                            size: 14,
                            color: '#888'
                        }
                    }
                ] : []
            };
            
            Plotly.newPlot('topCategoriesChart', traces, layout, {responsive: true});
        } catch (error) {
            console.error('Error plotting top categories chart:', error);
            $('#topCategoriesChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Monthly comparison chart - use real monthly data
    function loadMonthlyComparisonChart() {
        const filters = getFilterSettings();
        const compareType = $('[data-compare-type].active').data('compare-type') || 'expense';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading monthly comparison data for period: ${activePeriod}, type: ${compareType}`);
        
        
        // Get data for the last 6 months
        const today = new Date();
        // Start date is 6 months ago from the first day of current month
        const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        // End date is the first day of next month
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        
        const formattedStart = formatDateForInput(startDate);
        const formattedEnd = formatDateForInput(endDate);
        
        // Log the date range for debugging
        console.log(`Loading monthly comparison data from ${formattedStart} to ${formattedEnd}`);
        
        // Check if we just changed the period selector
        const periodChanged = localStorage.getItem('lastActivePeriod') !== activePeriod;
        if (periodChanged) {
            localStorage.setItem('lastActivePeriod', activePeriod);
        }
        
        // Use the new monthly data endpoints with consistent range
        const url = compareType === 'expense' ? '/api/expenses-by-month' : '/api/income-by-month';
        
        $.ajax({
            url: url,
            method: 'GET',
            data: { 
                startDate: formattedStart, 
                endDate: formattedEnd
            },
            dataType: 'json',
            success: (data) => {
                console.log(`Monthly ${compareType} data received:`, data);
                
                // Highlight the current period on the chart
                let highlightIndex = -1;
                if (activePeriod === 'month') {
                    // Highlight current month
                    const currentMonthLabel = `${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear()}`;
                    highlightIndex = data.labels.findIndex(label => label === currentMonthLabel);
                } else if (activePeriod === 'prev-month') {
                    // Highlight previous month
                    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const prevMonthLabel = `${prevMonth.toLocaleString('default', { month: 'short' })} ${prevMonth.getFullYear()}`;
                    highlightIndex = data.labels.findIndex(label => label === prevMonthLabel);
                }
                
                drawMonthlyComparisonChartFromMonthlyData(data, compareType, highlightIndex);
            },
            error: (xhr, status, error) => {
                handleAjaxError(xhr, status, error);
                // Draw empty chart to show frame
                drawMonthlyComparisonChartFromMonthlyData({
                    labels: [],
                    values: []
                }, compareType);
            }
        });
    }
    
    // Draw monthly comparison chart with formatted monthly data from the API
    function drawMonthlyComparisonChartFromMonthlyData(data, type, highlightIndex = -1) {
        try {
            // Data should already be grouped by month from the API
            const months = data.labels || [];
            const values = data.values || [];
            
            let trace;
            
            if (months.length === 0) {
                // No data available, create placeholder
                trace = {
                    x: ['No data available'],
                    y: [0],
                    type: 'bar',
                    marker: {
                        color: 'rgba(200, 200, 200, 0.7)'
                    },
                    hoverinfo: 'none'
                };
            } else {
                // Create colors array with highlights
                const colors = Array(months.length).fill(
                    type === 'expense' ? 'rgba(220, 53, 69, 0.7)' : 'rgba(25, 135, 84, 0.7)'
                );
                
                // Highlight the current period if specified
                if (highlightIndex >= 0 && highlightIndex < months.length) {
                    colors[highlightIndex] = type === 'expense' ? 'rgba(220, 53, 69, 1.0)' : 'rgba(25, 135, 84, 1.0)';
                }
                
                trace = {
                    x: months,
                    y: values,
                    type: 'bar',
                    marker: {
                        color: colors
                    },
                    hovertemplate: '%{x}: $%{y:.2f}<extra></extra>'
                };
            }
            
            const layout = {
                margin: { t: 20, r: 20, l: 50, b: 80 },
                xaxis: {
                    title: 'Month',
                    showgrid: false
                },
                yaxis: {
                    title: 'Amount ($)',
                    showgrid: true,
                    gridcolor: 'rgba(0,0,0,0.05)'
                },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                annotations: months.length === 0 ? [
                    {
                        text: 'No data available for the selected period',
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.5,
                        y: 0.5,
                        showarrow: false,
                        font: {
                            size: 14,
                            color: '#888'
                        }
                    }
                ] : []
            };
            
            Plotly.newPlot('monthlyComparisonChart', [trace], layout, {responsive: true});
        } catch (error) {
            console.error('Error plotting monthly comparison chart:', error);
            $('#monthlyComparisonChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Export chart to PDF
    function exportToPDF() {
        const filters = getFilterSettings();
        const doc = new jsPDF();
        doc.setFont('helvetica');
        doc.setFontSize(22);
        doc.text('Financial Insights Report', 105, 15, null, null, 'center');
        
        doc.setFontSize(12);
        doc.text(`Date Range: ${filters.startDate} to ${filters.displayEndDate}`, 105, 25, null, null, 'center');
        
        doc.setFontSize(16);
        doc.text('Summary', 20, 35);
        
        doc.setFontSize(12);
        doc.text(`Total Income: $${$('#totalIncome').text()}`, 20, 45);
        doc.text(`Total Expenses: $${$('#totalExpenses').text()}`, 20, 55);
        doc.text(`Net Balance: $${$('#netBalance').text()}`, 20, 65);
        doc.text(`Largest Category: ${$('#topCategoryName').text()} ($${$('#topCategoryAmount').text()})`, 20, 75);
        
        // Add charts as images
        Plotly.toImage(document.getElementById('trendChart'), {format: 'png', width: 800, height: 400})
            .then(function(dataUrl) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Income & Expense Trends', 105, 15, null, null, 'center');
                doc.addImage(dataUrl, 'PNG', 15, 25, 180, 90);
                
                return Plotly.toImage(document.getElementById('categoryPieChart'), {format: 'png', width: 400, height: 400});
            })
            .then(function(dataUrl) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Category Distribution', 105, 15, null, null, 'center');
                doc.addImage(dataUrl, 'PNG', 55, 25, 100, 100);
                
                return Plotly.toImage(document.getElementById('topCategoriesChart'), {format: 'png', width: 800, height: 400});
            })
            .then(function(dataUrl) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Top Categories', 105, 15, null, null, 'center');
                doc.addImage(dataUrl, 'PNG', 15, 25, 180, 90);
                
                doc.save('financial-insights.pdf');
            });
    }
    
    // Export chart to PNG
    function exportToPNG() {
        html2canvas(document.querySelector('.container'), {
            onrendered: function(canvas) {
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'financial-insights.png';
                link.click();
            }
        });
    }
    
    // Handle AJAX errors
    function handleAjaxError(xhr, status, error) {
        console.error('AJAX Error:', status, error);
        
        // Use the notification system instead of alert
        let errorMessage = 'Error loading data. Please try again later.';
        
        // Try to get more specific error message if available
        if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage = xhr.responseJSON.error;
            console.error('Server error details:', xhr.responseJSON);
        } else if (error) {
            errorMessage = `${error}. Please try again later.`;
        }
        
        // Show error notification
        notifications.error(errorMessage);
    }
    
    // Add a debug function to test date range issues
    window.debugDateRanges = function() {
        const filters = getFilterSettings();
        
        // Make a call to the debug endpoint
        $.ajax({
            url: '/api/insights/debug',
            method: 'GET',
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (data) => {
                console.log("===== DATE RANGE DEBUG INFO =====");
                console.log("Current Period:", $('.period-selector .btn.active').data('period'));
                console.log("Date Filters:", filters);
                console.log("Debug API Response:", data);
                
                // Create a formatted output for a notification
                let message = `
                <strong>Date Range Debug</strong><br>
                Period: ${$('.period-selector .btn.active').data('period')}<br>
                Request: ${filters.startDate} to ${filters.endDate}<br>
                Processed: ${data.processed.startDate} to ${data.processed.endDate}<br>
                <br>
                Data Counts:<br>
                - Expenses: ${data.counts.expenses}<br>
                - Income: ${data.counts.income}<br>
                <br>
                Data Range:<br>
                - Expenses: ${data.dataRange.expenses.oldest || 'none'} to ${data.dataRange.expenses.newest || 'none'}<br>
                - Income: ${data.dataRange.income.oldest || 'none'} to ${data.dataRange.income.newest || 'none'}<br>
                `;
                
                // Show a notification with the debug info
                if (window.notifications && window.notifications.info) {
                    window.notifications.info(message, 30000); // Show for 30 seconds
                } else {
                    alert("Date debug info in console");
                }
            },
            error: (xhr, status, error) => {
                console.error("Debug API Error:", error);
                if (window.notifications && window.notifications.error) {
                    window.notifications.error("Error getting debug info: " + error);
                } else {
                    alert("Error getting debug info: " + error);
                }
            }
        });
    };
    
    // Add a diagnostic function to check date assignments
    window.checkDateAssignments = function() {
        // Make a call to the date diagnostic endpoint
        $.ajax({
            url: '/api/insights/date-diagnostic',
            method: 'GET',
            dataType: 'json',
            success: (data) => {
                console.log("===== DATE ASSIGNMENT DIAGNOSTICS =====");
                console.log("All dates with transactions:", data.dateAssignments);
                
                // Group by month for easier analysis
                const byMonth = {};
                data.dateAssignments.forEach(item => {
                    const key = `${item.year}-${item.month.toString().padStart(2, '0')}`;
                    if (!byMonth[key]) {
                        byMonth[key] = {
                            monthName: item.monthName,
                            year: item.year,
                            dates: []
                        };
                    }
                    byMonth[key].dates.push(item);
                });
                
                console.log("Grouped by month:", byMonth);
                
                // Create a formatted output for a notification
                let message = `<strong>Date Assignment Diagnostics</strong><br>`;
                
                // Add summary by month
                message += `<br><strong>Transactions by Month:</strong><br>`;
                Object.keys(byMonth).sort().forEach(monthKey => {
                    const monthData = byMonth[monthKey];
                    const totalDates = monthData.dates.length;
                    const totalExpense = monthData.dates.reduce((sum, item) => sum + item.expenses, 0);
                    const totalIncome = monthData.dates.reduce((sum, item) => sum + item.income, 0);
                    
                    message += `${monthData.monthName} ${monthData.year}: ${totalDates} days, $${totalExpense.toFixed(2)} expenses, $${totalIncome.toFixed(2)} income<br>`;
                });
                
                // Check for dates at month boundaries to help diagnose issues
                const boundaryDates = data.dateAssignments.filter(item => 
                    item.day === 1 || item.day >= 28
                );
                
                if (boundaryDates.length > 0) {
                    message += `<br><strong>Month Boundary Dates:</strong><br>`;
                    boundaryDates.forEach(item => {
                        message += `${item.date}: $${item.expenses} expense, $${item.income} income`;
                        message += ` (This month: ${item.periods.thisMonth}, Prev month: ${item.periods.prevMonth})<br>`;
                    });
                }
                
                // Show a notification with the debug info
                if (window.notifications && window.notifications.info) {
                    window.notifications.info(message, 30000); // Show for 30 seconds
                } else {
                    alert("Date assignment info in console");
                }
            },
            error: (xhr, status, error) => {
                console.error("Date diagnostic API Error:", error);
                if (window.notifications && window.notifications.error) {
                    window.notifications.error("Error getting date diagnostics: " + error);
                } else {
                    alert("Error getting date diagnostics: " + error);
                }
            }
        });
    };

    // Helper function to debug API requests for current period
    function debugApiRequest(period) {
        const filters = getFilterSettings();
        
        // Get the actual dates being used for API calls
        console.log(`==== DEBUG API REQUEST FOR ${period} ====`);
        console.log(`Start Date: ${filters.startDate}`);
        console.log(`End Date: ${filters.endDate}`);
        console.log(`Display End Date: ${filters.displayEndDate}`);
        
        // Make a direct API call to see what data is available
        $.ajax({
            url: '/api/insights/debug',
            method: 'GET',
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (data) => {
                console.log("Debug API response:", data);
                console.log(`Data counts - Expenses: ${data.counts.expenses}, Income: ${data.counts.income}`);
                console.log(`Date range - Start: ${data.processed.startDate}, End: ${data.processed.endDate}`);
                
                // Check period summary API as well to ensure consistency
                $.ajax({
                    url: '/api/insights/period-summary',
                    method: 'GET',
                    data: { 
                        period: period
                    },
                    dataType: 'json',
                    success: (periodData) => {
                        console.log("Period summary API response:", periodData);
                        console.log(`Period data counts - Expenses: ${periodData.expense.count}, Income: ${periodData.income.count}`);
                        
                        // Verify data consistency
                        const regularTotal = data.counts.expenses + data.counts.income;
                        const periodTotal = periodData.expense.count + periodData.income.count;
                        
                        if (regularTotal !== periodTotal) {
                            console.warn(`DATA INCONSISTENCY: Regular API shows ${regularTotal} records but period API shows ${periodTotal} records`);
                        } else {
                            console.log(`Data consistency check passed: Both APIs report ${regularTotal} total records`);
                        }
                    },
                    error: (xhr, status, error) => {
                        console.error("Period summary debug error:", error);
                    }
                });
            },
            error: (xhr, status, error) => {
                console.error("Debug API error:", error);
            }
        });
    }
});
