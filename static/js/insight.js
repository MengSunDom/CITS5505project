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
    
    // Add a function to fix chart text strikethrough issues - add this at document ready
    function fixChartTextDecorations() {
        console.log("Applying text decoration fixes");
        
        // Fix for Chart.js legend text
        const fixLegendText = () => {
            // Target all elements that might have text decorations in charts
            const selectors = [
                '.chartjs-legend li', 
                '.chartjs-legend span',
                '.chart-legend li', 
                '.chart-legend span',
                '#categoryPieChart span',
                '#categoryPieChart li',
                '.chart-container span',
                '.chart-container li'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Completely remove all text decoration
                    el.style.setProperty('text-decoration', 'none', 'important');
                    el.style.setProperty('border-bottom', 'none', 'important');
                    el.style.setProperty('text-decoration-line', 'none', 'important');
                    el.style.setProperty('box-shadow', 'none', 'important');
                });
            });
        };
        
        // Run the fix immediately
        fixLegendText();
        
        // Keep checking for new elements and fix them
        const observer = new MutationObserver(mutations => {
            fixLegendText();
        });
        
        // Start observing the document
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Also inject a global style to prevent the issue
        const style = document.createElement('style');
        style.textContent = `
            /* Force no text decorations on chart elements */
            .chartjs-legend li, 
            .chartjs-legend span,
            .chart-legend li, 
            .chart-legend span,
            #categoryPieChart span,
            #categoryPieChart li,
            .chart-container span,
            .chart-container li,
            .chartjs-render-monitor + div span,
            .chartjs-render-monitor + div li {
                text-decoration: none !important;
                border-bottom: none !important;
                text-decoration-line: none !important;
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Run the fix on page load
    fixChartTextDecorations();
    
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
        const startDateStr = $('#startDate').val(); // Get start date from input
        const endDateStr = $('#endDate').val(); // Get end date from input

        // Convert to Date objects for comparison
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        const today = new Date();

        // Check if start date is after end date
        if (startDate > endDate) {
            alert("Invalid period specified: Start date cannot be after end date."); // Show error if start date is after end date
            return; // Exit the function
        }

        // Check if both dates are in the future
        if (startDate > today && endDate > today) {
            alert("Invalid period specified: Dates cannot be in the future."); // Show error if both dates are in the future
            return; // Exit the function
        }
        
        // Set the active period to custom
        $('.period-selector .btn').removeClass('active');
        $('.period-selector .btn[data-period="custom"]').addClass('active');

        // If validation passes, load data with the selected date range
        loadAllData(); // Load data if validation passes
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
                // For custom range, include the end date by setting it to the next day
                const nextDay = new Date(endDateObj);
                nextDay.setDate(nextDay.getDate() + 1);
                endDate = formatDateForInput(nextDay);
                break;
                
            default:
                // Default to using the exact end date
                endDate = endDateStr;
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
        const filters = getFilterSettings();
        
        console.log(`Loading summary cards for period: ${activePeriod} using direct period API`);
        
        // For custom date range, use the fallback method directly
        if (activePeriod === 'custom') {
            console.log('Using fallback method for custom date range');
            fallbackLoadSummaryCards(callback);
            return;
        }
        
        // Use the direct period-summary API for standard periods
        $.ajax({
            url: '/api/insights/period-summary',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                period: activePeriod,
                startDate: filters.startDate,
                endDate: filters.endDate
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
                $('#averageDailyIncome').text(`${formatCurrency(averageDailyIncome)}`);
                $('#averageDailyExpense').text(`${formatCurrency(averageDailyExpense)}`);
                
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
    
    // Fallback method for loading summary cards
    function fallbackLoadSummaryCards(callback) {
        const filters = getFilterSettings();
        
        console.log('Using fallback method for summary cards');
        
        // Load income data
        $.ajax({
            url: '/api/income-summary',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (incomeData) => {
                console.log('Income data received:', incomeData);
                
                // Load expense data
                $.ajax({
                    url: '/api/expense-summary',
                    method: 'GET',
                    xhrFields: {
        withCredentials: true
    },
                    data: { 
                        startDate: filters.startDate, 
                        endDate: filters.endDate
                    },
                    dataType: 'json',
                    success: (expenseData) => {
                        console.log('Expense data received:', expenseData);
                        
                        // Calculate average daily amounts
                        const daysInPeriod = getDaysInPeriod($('.period-selector .btn.active').data('period'));
                        const averageDailyIncome = (incomeData.totalAmount / daysInPeriod).toFixed(2);
                        const averageDailyExpense = (expenseData.totalAmount / daysInPeriod).toFixed(2);
                        
                        // Update the summary cards
                        updateSummaryCardsWithPeriodData(incomeData, expenseData, 
                            { totalAmount: 0 }, { totalAmount: 0 });
                        
                        // Display average daily amounts
                        $('#averageDailyIncome').text(`${formatCurrency(averageDailyIncome)}`);
                        $('#averageDailyExpense').text(`${formatCurrency(averageDailyExpense)}`);
                        
                        // Continue with other charts
                        if (callback) callback();
                    },
                    error: (xhr, status, error) => {
                        console.error("Error fetching expense data:", error);
                        handleAjaxError(xhr, status, error);
                        
                        // Still try to update with income data only
                        updateSummaryCardsWithPeriodData(incomeData, { totalAmount: 0 }, 
                            { totalAmount: 0 }, { totalAmount: 0 });
                        
                        if (callback) callback();
                    }
                });
            },
            error: (xhr, status, error) => {
                console.error("Error fetching income data:", error);
                handleAjaxError(xhr, status, error);
                
                // Try to load expense data anyway
                $.ajax({
                    url: '/api/expense-summary',
                    method: 'GET',
                    xhrFields: {
        withCredentials: true
    },
                    data: { 
                        startDate: filters.startDate, 
                        endDate: filters.endDate
                    },
                    dataType: 'json',
                    success: (expenseData) => {
                        console.log('Expense data received:', expenseData);
                        
                        // Update with expense data only
                        updateSummaryCardsWithPeriodData({ totalAmount: 0 }, expenseData, 
                            { totalAmount: 0 }, { totalAmount: 0 });
                        
                        if (callback) callback();
                    },
                    error: (xhr, status, error) => {
                        console.error("Error fetching expense data:", error);
                        handleAjaxError(xhr, status, error);
                        
                        // Update with empty data
                        updateSummaryCardsWithPeriodData({ totalAmount: 0 }, { totalAmount: 0 }, 
                            { totalAmount: 0 }, { totalAmount: 0 });
                        
                        if (callback) callback();
                    }
                });
            }
        });
    }
    
    // Calculate previous period data based on current period
    function calculatePreviousPeriodData(filters) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        const periodLength = end - start;

        // Calculate previous period dates
        const prevEnd = new Date(start);
        const prevStart = new Date(prevEnd - periodLength);

        // Format dates for API
        const prevStartStr = prevStart.toISOString().split('T')[0];
        const prevEndStr = prevEnd.toISOString().split('T')[0];

        // Return empty data structure (will be populated by API calls)
        return {
            income: { totalAmount: 0 },
            expense: { totalAmount: 0 },
            startDate: prevStartStr,
            endDate: prevEndStr
        };
    }
    
    // Update summary cards with period comparison data
    function updateSummaryCardsWithPeriodData(currentIncome, currentExpense, prevIncome, prevExpense) {
        // Update income card
        $('#totalIncome').text(formatCurrency(currentIncome.totalAmount));
        const incomeChange = calculateChange(currentIncome.totalAmount, prevIncome.totalAmount);
        updateChangeIndicator('#incomeChange', incomeChange);

        // Update expense card
        $('#totalExpenses').text(formatCurrency(currentExpense.totalAmount));
        const expenseChange = calculateChange(currentExpense.totalAmount, prevExpense.totalAmount);
        updateChangeIndicator('#expenseChange', expenseChange);

        // Update balance card
        const currentBalance = currentIncome.totalAmount - currentExpense.totalAmount;
        const prevBalance = prevIncome.totalAmount - prevExpense.totalAmount;
        $('#netBalance').text(formatCurrency(currentBalance));
        const balanceChange = calculateChange(currentBalance, prevBalance);
        updateChangeIndicator('#balanceChange', balanceChange);
    }
    
    // Calculate percentage change
    function calculateChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / Math.abs(previous)) * 100;
    }
    
    // Update change indicator with color and arrow
    function updateChangeIndicator(selector, change) {
        const element = $(selector);
        element.text(`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`);
        
        if (change > 0) {
            element.removeClass('text-danger').addClass('text-success');
            element.html(`<i class="fas fa-arrow-up"></i> ${change.toFixed(1)}%`);
        } else if (change < 0) {
            element.removeClass('text-success').addClass('text-danger');
            element.html(`<i class="fas fa-arrow-down"></i> ${Math.abs(change).toFixed(1)}%`);
        } else {
            element.removeClass('text-success text-danger');
            element.html(`0%`);
        }
    }
    
    // Load trend chart
    function loadTrendChart() {
        const filters = getFilterSettings();
        const trendPeriod = $('.chart-period-selector .btn.active').data('trend-period') || 'daily';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading trend chart data for period: ${activePeriod} (view: ${trendPeriod})`);
        
        // Use the exact end date from filters
        const endDate = new Date(filters.endDate);
        
        // Continue with the AJAX request
        $.ajax({
            url: '/api/income-expense-comparison',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                startDate: filters.startDate, 
                endDate: endDate.toISOString().split('T')[0]
            },
            dataType: 'json',
            success: (data) => {
                console.log(`Trend data received with ${data.labels ? data.labels.length : 0} data points`);
                console.log('Raw trend data:', data);
                
                // Check if we need to transform the data
                if (data.income && data.expense && !data.series) {
                    console.log('Transforming income/expense arrays to series format');
                } else if (data.series) {
                    console.log('Data already has series format:', data.series.length);
                }
                
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
        try {
            // 重新组织数据结构，同时支持新旧格式
            let transformedData = data;
            
            // 检查是否是旧格式（带income和expense数组）
            if (data.income && data.expense && !data.series) {
                console.log('Converting legacy data format to Chart.js format');
                
                // 如果不是daily且数据有效，按period分组
                if (period !== 'daily' && data.labels && data.labels.length > 0) {
                    transformedData = groupDataByPeriod(data, period);
                }
                
                // 转换为Chart.js期望的格式
                transformedData = {
                    labels: transformedData.labels,
                    series: [
                        {
                            name: 'Income',
                            data: transformedData.income.map(val => parseFloat(val) || 0)
                        },
                        {
                            name: 'Expenses',
                            data: transformedData.expense.map(val => parseFloat(val) || 0)
                        }
                    ]
                };
            }
            
            // 确保数据结构正确
            if (!transformedData || !transformedData.labels) {
                console.error('Invalid trend data structure:', data);
                $('#trendChart').html('<div class="alert alert-danger">Invalid data structure</div>');
                return;
            }
            
            // 获取容器元素
            const container = document.getElementById('trendChart');
            if (!container) {
                console.error('Trend chart container element not found in DOM');
                return;
            }
            
            // 检查是否有已存在的canvas，如果没有则创建一个
            let canvas = container.querySelector('canvas');
            if (!canvas) {
                // 先清空容器
                container.innerHTML = '';
                
                // 创建新的canvas元素
                canvas = document.createElement('canvas');
                container.appendChild(canvas);
            }
            
            // 应用直接样式到容器
            if (container) {
                container.style.backgroundColor = '#ffffff';
                container.style.border = '1px solid #e0e0e0';
                container.style.borderRadius = '8px';
            }
            
            // 尝试获取上下文
            let ctx;
            try {
                ctx = canvas.getContext('2d');
                console.log('Trend Chart canvas context:', ctx);
            } catch (contextError) {
                console.error('Error getting canvas context:', contextError);
                $('#trendChart').html('<div class="alert alert-danger">Error getting canvas context: ' + contextError.message + '</div>');
                return;
            }
            
            // 如果存在以前的图表实例，销毁它
            if (window.trendChart instanceof Chart) {
                window.trendChart.destroy();
            }
            
            // 生成数据集
            const datasets = [];
            const colors = {
                'Income': {
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderColor: 'rgba(25, 135, 84, 0.8)',
                    pointBackgroundColor: 'rgba(25, 135, 84, 1)'
                },
                'Expenses': {
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderColor: 'rgba(220, 53, 69, 0.8)',
                    pointBackgroundColor: 'rgba(220, 53, 69, 1)'
                }
            };


            Chart.defaults.color = '#666666';
            Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
            

            $(canvas).css('background-color', '#ffffff');
            

            if (transformedData.series && transformedData.series.length > 0) {
                transformedData.series.forEach(series => {
                    if (series.name && colors[series.name]) {
                        datasets.push({
                            label: series.name,
                            data: series.data,
                            fill: true,
                            backgroundColor: colors[series.name].backgroundColor,
                            borderColor: colors[series.name].borderColor,
                            pointBackgroundColor: colors[series.name].pointBackgroundColor,
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 3
                        });
                    }
                });
            }

            if (transformedData.labels.length === 0 || datasets.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No data available for the selected period</div>';
                return;
            }
            
            console.log('Creating trend chart with data:', {labels: transformedData.labels, datasets: datasets});
            

            window.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: transformedData.labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: period.charAt(0).toUpperCase() + period.slice(1),
                                color: '#555'
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#555',
                                maxRotation: 45,  
                                autoSkip: false,  
                                callback: function(value, index, values) {
                                    const label = transformedData.labels[index];

                                    return label.length > 10 ? label.substr(0, 8) + '...' : label;
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Amount ($)',
                                color: '#555'
                            },
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                color: '#555',
                                callback: function(value) {

                                    if (value >= 1000) {
                                        return '$' + (value / 1000).toFixed(1) + 'k';
                                    }
                                    return '$' + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#555',
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            titleColor: '#333',
                            bodyColor: '#333',
                            borderColor: '#ccc',
                            borderWidth: 1,
                            cornerRadius: 4,
                            caretSize: 5,
                            padding: 10,
                            callbacks: {
                                title: function(tooltipItems) {

                                    const index = tooltipItems[0].dataIndex;
                                    return transformedData.labels[index];
                                },
                                label: function(context) {

                                    const value = context.parsed.y;
                                    return context.dataset.label + ': $' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
            console.log('Trend chart created successfully');
        } catch (error) {
            console.error('Error plotting trend chart:', error);
            $('#trendChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Load and draw category pie chart
    function loadCategoryPieChart() {
        const filters = getFilterSettings();
        const pieType = $('[data-pie-type].active').data('pie-type') || 'expense';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading ${pieType} category distribution data for period: ${activePeriod}`);
        
        // For custom date ranges, use the fallback method directly
        if (activePeriod === 'custom') {
            console.log('Using fallback method for custom date range category pie chart');
            fallbackLoadCategoryPieChart(pieType, filters);
            return;
        }
        
        // First try to use the period-summary API for standard periods
        if (activePeriod === 'month' || activePeriod === 'prev-month' || activePeriod === 'year') {
            $.ajax({
                url: '/api/insights/period-summary',
                method: 'GET',
                xhrFields: {
        withCredentials: true
    },
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
                            xhrFields: {
        withCredentials: true
    },
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
            // For other date ranges, use the original method
            fallbackLoadCategoryPieChart(pieType, filters);
        }
    }
    
    /**
     * Fallback method to load category pie chart for custom date ranges
     * @param {string} pieType - 'expense' or 'income'
     * @param {object} filters - filter settings with startDate and endDate
     */
    function fallbackLoadCategoryPieChart(pieType, filters) {
        let url = pieType === 'expense' ? '/api/expense-summary' : '/api/income-summary';
        $.ajax({
            url: url,
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: {
                startDate: filters.startDate,
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (data) => {
                drawCategoryPieChart(data, pieType);
            },
            error: (xhr, status, error) => {
                handleAjaxError(xhr, status, error);
                drawCategoryPieChart({ categoryDistribution: { labels: [], values: [] } }, pieType);
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
            
            // Use standard colors
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
            
            // Get the container element
            const container = document.getElementById('categoryPieChart');
            if (!container) {
                console.error('Category pie chart container element not found in DOM');
                return;
            }
            
            // First, remove all existing content to ensure no styling remains
            $(container).empty();
            
            // Apply direct styling to container
            container.style.backgroundColor = '#ffffff';
            container.style.border = '1px solid #e0e0e0';
            container.style.borderRadius = '8px';
            container.style.padding = '10px';
            container.style.minHeight = '320px';
            container.style.height = '350px';
            container.style.display = 'flex'; // Use flex layout for side-by-side arrangement
            
            // Create chart container for the left side
            const chartContainer = document.createElement('div');
            chartContainer.style.cssText = 'flex: 1; position: relative;';
            container.appendChild(chartContainer);
            
            // Create legend container for the right side
            const legendContainer = document.createElement('div');
            legendContainer.style.cssText = 'width: 150px; padding: 10px; display: flex; flex-direction: column; justify-content: center;';
            container.appendChild(legendContainer);
            
            // Create a new canvas element with clean styling
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            chartContainer.appendChild(canvas);
            
            // Try to get the context
            let ctx;
            try {
                ctx = canvas.getContext('2d');
                console.log('Category Pie Chart canvas context:', ctx);
            } catch (contextError) {
                console.error('Error getting canvas context:', contextError);
                $('#categoryPieChart').html('<div class="alert alert-danger">Error getting canvas context: ' + contextError.message + '</div>');
                return;
            }
            
            // Destroy previous chart if it exists
            if (window.categoryPieChart instanceof Chart) {
                window.categoryPieChart.destroy();
            }
            
            // If no data, show a message
            if (labels.length === 0 || values.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No data available for the selected period</div>';
                return;
            }
            
            // Set Chart.js defaults to light mode regardless of system mode
            Chart.defaults.color = '#666666';
            Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            // Set specific chart background color to white
            $(canvas).css('background-color', '#ffffff');
            
            console.log('Creating category pie chart with data:', {labels: labels, values: values});
            
            // Create the chart - DISABLE BUILT-IN LEGEND completely
            window.categoryPieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '40%',
                    plugins: {
                        // Disable the built-in legend with strikethrough issues
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            titleColor: '#333',
                            bodyColor: '#333',
                            borderColor: '#ccc',
                            borderWidth: 1,
                            cornerRadius: 4,
                            caretSize: 5,
                            padding: 10,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Create our own custom legend in side container (not overlapping the chart)
            setTimeout(function() {
                // Create legend title
                const legendTitle = document.createElement('div');
                legendTitle.style.cssText = 'font-weight: 500; margin-bottom: 15px; font-size: 14px; color: #333;';
                legendTitle.textContent = 'Categories';
                legendContainer.appendChild(legendTitle);
                
                // Create legend list
                const legendList = document.createElement('ul');
                legendList.style.cssText = 'list-style: none; padding: 0; margin: 0; width: 100%;';
                
                // Add items for each data point
                labels.forEach((label, i) => {
                    const total = values.reduce((acc, val) => acc + val, 0);
                    const percentage = ((values[i] / total) * 100).toFixed(1);
                    
                    const listItem = document.createElement('li');
                    listItem.style.cssText = 'display: flex; align-items: center; margin-bottom: 12px; width: 100%;';
                    
                    // Create color box
                    const colorBox = document.createElement('span');
                    colorBox.style.cssText = `
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background-color: ${colors[i]};
                        margin-right: 8px;
                        flex-shrink: 0;
                    `;
                    
                    // Create text container to handle wrapping
                    const textContainer = document.createElement('div');
                    textContainer.style.cssText = 'flex: 1; overflow-wrap: break-word;';
                    
                    // Create label text
                    const labelText = document.createElement('span');
                    labelText.textContent = label;
                    labelText.style.cssText = 'font-size: 12px; color: #555; display: block;';
                    
                    // Create percentage text
                    const percentText = document.createElement('span');
                    percentText.textContent = `${percentage}%`;
                    percentText.style.cssText = 'font-size: 11px; color: #777; font-weight: 500;';
                    
                    // Add elements to DOM
                    textContainer.appendChild(labelText);
                    textContainer.appendChild(percentText);
                    
                    listItem.appendChild(colorBox);
                    listItem.appendChild(textContainer);
                    legendList.appendChild(listItem);
                });
                
                // Add the legend list to container
                legendContainer.appendChild(legendList);
                
                console.log('Added custom side legend to pie chart');
            }, 100);
            
            console.log('Category pie chart created successfully');
        } catch (error) {
            console.error('Error plotting pie chart:', error);
            $('#categoryPieChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
        }
    }
    
    // Load top categories chart
    function loadTopCategoriesChart() {
        const filters = getFilterSettings();
        console.log(`Loading top categories with date range: ${filters.startDate} to ${filters.endDate}`);
        
        // Check if the canvas element exists
        const chartElement = document.getElementById('topCategoriesChart');
        if (!chartElement) {
            console.error('Top categories chart element not found in DOM');
            return;
        }
        console.log('Chart element found:', chartElement, 'Type:', chartElement.tagName);
        
        // Load both expense and income data
        const expensePromise = $.ajax({
            url: '/api/insights/top-categories',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                startDate: filters.startDate,
                endDate: filters.endDate
            },
            dataType: 'json'
        });
        
        const incomePromise = $.ajax({
            url: '/api/income-summary',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                startDate: filters.startDate,
                endDate: filters.endDate
            },
            dataType: 'json'
        });
        
        // Use Promise.all to wait for both requests
        Promise.all([expensePromise, incomePromise])
            .then(([expenseData, incomeData]) => {
                console.log('Top expense categories data received:', expenseData);
                console.log('Income data received:', incomeData);
                
                // Update top category in summary card if data exists
                if (expenseData.labels && expenseData.labels.length > 0) {
                    const totalExpense = parseFloat($('#totalExpenses').text().replace(/[^0-9.-]+/g, ''));
                    const topCategoryAmount = expenseData.values[0];
                    const percentage = totalExpense > 0 ? Math.round((topCategoryAmount / totalExpense) * 100) : 0;
                    
                    // Set emoji based on category
                    let emoji = '🍔'; // Default food emoji
                    const categoryName = expenseData.labels[0];
                    if (categoryName) {
                        const categoryLC = categoryName.toLowerCase();
                        if (categoryLC.includes('food') || categoryLC.includes('grocery')) {
                            emoji = '🍔';
                        } else if (categoryLC.includes('transport') || categoryLC.includes('car')) {
                            emoji = '🚗';
                        } else if (categoryLC.includes('house') || categoryLC.includes('rent')) {
                            emoji = '🏠';
                        } else if (categoryLC.includes('utility') || categoryLC.includes('bill')) {
                            emoji = '💡';
                        } else if (categoryLC.includes('shopping')) {
                            emoji = '🛍️';
                        }
                    }
                    
                    $('#topCategoryIcon').text(emoji);
                    $('#topCategoryName').text(categoryName);
                    $('#topCategoryAmount').text(formatCurrency(topCategoryAmount));
                    $('#categoryPercentage').text(`${percentage}% of total`);
                }
                
                // Combine and process expense and income data
                let combinedData = {
                    labels: [],
                    values: [],
                    types: []
                };
                
                // Add expense data
                if (expenseData.labels && expenseData.labels.length > 0) {
                    expenseData.labels.forEach((label, index) => {
                        combinedData.labels.push(label);
                        combinedData.values.push(expenseData.values[index]);
                        combinedData.types.push('expense');
                    });
                }
                
                // Add income data from income categories
                if (incomeData.categoryDistribution && incomeData.categoryDistribution.labels) {
                    incomeData.categoryDistribution.labels.forEach((label, index) => {
                        combinedData.labels.push(label);
                        combinedData.values.push(incomeData.categoryDistribution.values[index]);
                        combinedData.types.push('income');
                    });
                }
                
                // Sort by value (descending) and take top 10 combined
                let sortedIndices = Array.from({length: combinedData.values.length}, (_, i) => i);
                sortedIndices.sort((a, b) => combinedData.values[b] - combinedData.values[a]);
                
                // Take top 10 (or fewer if not enough data)
                const topCount = Math.min(10, sortedIndices.length);
                const topLabels = [];
                const topValues = [];
                const topTypes = [];
                
                for (let i = 0; i < topCount; i++) {
                    const idx = sortedIndices[i];
                    // Add type indicator to label
                    const typeIndicator = combinedData.types[idx] === 'income' ? '📈 ' : '📉 ';
                    topLabels.push(typeIndicator + combinedData.labels[idx]);
                    topValues.push(combinedData.values[idx]);
                    topTypes.push(combinedData.types[idx]);
                }
                
                // Draw the chart if we have data
                if (topLabels.length > 0) {
                    try {
                        // Find the parent container of the canvas
                        const parentContainer = chartElement.parentElement;
                        
                        // Reset the parent container to ensure proper sizing
                        if (parentContainer) {
                            // Apply styling to parent container for better chart display
                            parentContainer.style.backgroundColor = '#ffffff';
                            parentContainer.style.border = '1px solid #e0e0e0';
                            parentContainer.style.borderRadius = '8px';
                            parentContainer.style.padding = '10px';
                            
                            // Calculate dynamic height based on number of categories
                            // Minimum height of 300px, plus 30px per category for better spacing
                            const dynamicHeight = Math.max(300, 100 + (topLabels.length * 30));
                            parentContainer.style.height = `${dynamicHeight}px`;
                            parentContainer.style.minHeight = '300px';
                        }
                        
                        // Add extra verification for the canvas element
                        if (chartElement.tagName.toLowerCase() !== 'canvas') {
                            console.error('Element is not a canvas:', chartElement);
                            $('#topCategoriesChart').parent().html('<div class="alert alert-danger">Chart element is not a canvas element</div>');
                            return;
                        }
                        
                        // Clear the existing canvas
                        chartElement.innerHTML = '';
                        
                        // Set canvas to fill parent container
                        chartElement.style.width = '100%';
                        chartElement.style.height = '100%';
                        
                        // Try to get the context
                        let ctx;
                        try {
                            ctx = chartElement.getContext('2d');
                            console.log('Canvas context:', ctx);
                        } catch (contextError) {
                            console.error('Error getting canvas context:', contextError);
                            $('#topCategoriesChart').parent().html('<div class="alert alert-danger">Error getting canvas context: ' + contextError.message + '</div>');
                            return;
                        }
                        
                        // Properly destroy existing chart if it exists
                        if (window.topCategoriesChart instanceof Chart) {
                            // Always destroy the previous chart before creating a new one to prevent container growth and stacking
                            window.topCategoriesChart.destroy();
                        }
                
                        // Create colors based on type - use light mode colors always
                        const colors = topTypes.map(type => {
                            if (type === 'income') {
                                return 'rgba(25, 135, 84, 0.8)'; // green for income
                            } else {
                                return 'rgba(220, 53, 69, 0.8)'; // red for expense
                            }
                        });
                        
                        // Set text color based on mode - always dark for white background
                        const textColor = '#666666';
                        const gridColor = 'rgba(0, 0, 0, 0.05)';
                        
                        console.log('Creating new chart with data:', {labels: topLabels, values: topValues, types: topTypes});
                        
                        // Set Chart.js defaults to light mode regardless of system mode
                        Chart.defaults.color = '#666666';
                        Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
                        
                        // Set specific chart background color to white
                        $(chartElement).css('background-color', '#ffffff');
                        
                        window.topCategoriesChart = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: topLabels,
                                datasets: [{
                                    label: 'Amount ($)',
                                    data: topValues,
                                    backgroundColor: colors,
                                    borderColor: colors.map(c => c.replace('0.8', '1')),
                                    borderWidth: 1,
                                    // Adjust bar thickness for better appearance
                                    maxBarThickness: 25,
                                    minBarLength: 5 // Ensure small values are visible
                                }]
                            },
                            options: {
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false, // Important: don't maintain aspect ratio to fill container
                                layout: {
                                    padding: {
                                        left: 10,
                                        right: 25,
                                        top: 15,
                                        bottom: 15
                                    }
                                },
                                plugins: {
                                    legend: {
                                        display: false,
                                        labels: {
                                            color: textColor
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        titleColor: '#333333',
                                        bodyColor: '#333333',
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                        borderWidth: 1,
                                        callbacks: {
                                            title: function(tooltipItems) {
                                        
                                                const index = tooltipItems[0].dataIndex;
                                                return topLabels[index];
                                            },
                                            label: function(context) {
                                                const idx = context.dataIndex;
                                                const type = topTypes[idx];
                                                let label = type === 'income' ? 'Income' : 'Expense';
                                                label += ': ' + formatCurrency(context.raw);
                                                return label;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        grid: {
                                            drawBorder: false,
                                            color: gridColor
                                        },
                                        ticks: {
                                            color: textColor,
                                            callback: function(value) {

                                                if (value >= 1000) {
                                                    return '$' + (value / 1000).toFixed(1) + 'k';
                                                }
                                                return '$' + value;
                                            }
                                        }
                                    },
                                    y: {
                                        grid: {
                                            display: false,
                                            drawBorder: false
                                        },
                                        ticks: {
                                            color: textColor,
                                            // Increase font size slightly for better readability
                                            font: {
                                                size: 11
                                            },
                                            callback: function(value, index) {
    
                                                const label = topLabels[index];
                                                if (label && label.length > 20) {
                                                    return label.substr(0, 18) + '...';
                                                }
                                                return label;
                                            }
                                        }
                                    }
                                },
                                // Animation configuration for better visual appearance
                                animation: {
                                    duration: 1000,
                                    easing: 'easeOutQuart'
                                }
                            }
                        });
                        console.log('Top categories chart created successfully');
                        
                        // Force a resize to ensure the chart fills the container properly
                        setTimeout(() => {
                            if (window.topCategoriesChart) {
                                window.topCategoriesChart.resize();
                            }
                        }, 50);
                        
                    } catch (error) {
                        console.error('Error creating top categories chart:', error);
                        $('#topCategoriesChart').parent().html('<div class="alert alert-danger">Error creating chart: ' + error.message + '</div>');
                    }
                } else {
                    console.log('No data for top categories chart');
                    $('#topCategoriesChart').parent().html('<div class="alert alert-info">No category data available for this period</div>');
                }
            })
            .catch(error => {
                console.error('Error loading categories data:', error);
                handleAjaxError(null, 'error', error);
                $('#topCategoriesChart').parent().html('<div class="alert alert-danger">Error loading data</div>');
            });
    }
    
    // Load monthly comparison chart
    function loadMonthlyComparisonChart() {
        const filters = getFilterSettings();
        const compareType = $('[data-compare-type].active').data('compare-type') || 'income-expense';
        const activePeriod = $('.period-selector .btn.active').data('period');
        
        console.log(`Loading monthly comparison data for ${compareType}, period: ${activePeriod}`);
        
        // For custom date ranges, we need to use month-specific endpoints
        if (activePeriod === 'custom') {
            // For income vs expense mode
            if (compareType === 'income-expense') {
                let expensePromise = $.ajax({
                    url: '/api/expenses-by-month',
                    method: 'GET',
                    xhrFields: {
        withCredentials: true
    },
                    data: { 
                        startDate: filters.startDate,
                        endDate: filters.endDate
                    },
                    dataType: 'json'
                });
                
                let incomePromise = $.ajax({
                    url: '/api/income-by-month',
                    method: 'GET',
                    xhrFields: {
        withCredentials: true
    },
                    data: { 
                        startDate: filters.startDate, 
                        endDate: filters.endDate
                    },
                    dataType: 'json'
                });
                
                // Use Promise.all to wait for both requests
                Promise.all([incomePromise, expensePromise])
                    .then(([incomeData, expenseData]) => {
                        console.log(`Monthly comparison data received for custom period`);
                        
                        // Combine the data, ensuring we have all months
                        let allLabels = [...new Set([...incomeData.labels, ...expenseData.labels])];
                        allLabels.sort(); // Sort chronologically
                        
                        // Create combined data structure
                        let data = {
                            labels: allLabels,
                            series: []
                        };
                        
                        // Add income data
                        let incomeValues = allLabels.map(label => {
                            let idx = incomeData.labels.indexOf(label);
                            return idx >= 0 ? incomeData.values[idx] : 0;
                        });
                        data.series.push({
                            name: 'Income',
                            data: incomeValues
                        });
                        
                        // Add expense data
                        let expenseValues = allLabels.map(label => {
                            let idx = expenseData.labels.indexOf(label);
                            return idx >= 0 ? expenseData.values[idx] : 0;
                        });
                        data.series.push({
                            name: 'Expenses',
                            data: expenseValues
                        });
                        
                        // Draw the chart
                        drawMonthlyComparisonChartFromMonthlyData(data, compareType);
                    })
                    .catch(error => {
                        console.error('Error loading monthly comparison data:', error);
                        handleAjaxError(null, 'error', error);
                        drawMonthlyComparisonChartFromMonthlyData({
                            labels: [],
                            series: []
                        }, compareType);
                    });
            } else if (compareType === 'monthly-progress') {
                // For monthly progress, just use the expense data
                $.ajax({
                    url: '/api/expenses-by-month',
                    method: 'GET',
                    xhrFields: {
        withCredentials: true
    },
                    data: { 
                        startDate: filters.startDate,
                        endDate: filters.endDate
                    },
                    dataType: 'json',
                    success: (expensesByMonth) => {
                        console.log(`Monthly progress data received with ${expensesByMonth.labels ? expensesByMonth.labels.length : 0} months`);
                        
                        // For monthly progress we just need one series
                        const monthlyData = {
                            labels: expensesByMonth.labels,
                            series: [{
                                name: 'Monthly Expenses',
                                data: expensesByMonth.values
                            }]
                        };
                        
                        // Find current month for highlighting
                        const currentYear = new Date().getFullYear();
                        const currentMonthLabel = `${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date())} ${currentYear}`;
                        const currentMonthIndex = expensesByMonth.labels.indexOf(currentMonthLabel);
                        
                        drawMonthlyComparisonChartFromMonthlyData(monthlyData, compareType, currentMonthIndex);
                    },
                    error: (xhr, status, error) => {
                        handleAjaxError(xhr, status, error);
                        drawMonthlyComparisonChartFromMonthlyData({
                            labels: [],
                            series: []
                        }, compareType);
                    }
                });
            }
            return;
        }
        
        // For standard periods, use the month-by-month queries
        $.ajax({
            url: '/api/expenses-by-month',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
            data: { 
                startDate: filters.startDate, 
                endDate: filters.endDate
            },
            dataType: 'json',
            success: (expensesByMonth) => {
                if (compareType === 'income-expense') {
                    // Also fetch income data for income-expense comparison
                    $.ajax({
                        url: '/api/income-by-month',
                        method: 'GET',
                        xhrFields: {
        withCredentials: true
    },
                        data: { 
                            startDate: filters.startDate, 
                            endDate: filters.endDate
                        },
                        dataType: 'json',
                        success: (incomeByMonth) => {
                            console.log(`Monthly comparison data received: ${expensesByMonth.labels.length} expense months, ${incomeByMonth.labels.length} income months`);
                            
                            // Combine the data, ensuring we have all months
                            let allLabels = [...new Set([...incomeByMonth.labels, ...expensesByMonth.labels])];
                            allLabels.sort(); // Sort chronologically
                            
                            // Create combined data structure
                            let data = {
                                labels: allLabels,
                                series: []
                            };
                            
                            // Add income data
                            let incomeValues = allLabels.map(label => {
                                let idx = incomeByMonth.labels.indexOf(label);
                                return idx >= 0 ? incomeByMonth.values[idx] : 0;
                            });
                            data.series.push({
                                name: 'Income',
                                data: incomeValues
                            });
                            
                            // Add expense data
                            let expenseValues = allLabels.map(label => {
                                let idx = expensesByMonth.labels.indexOf(label);
                                return idx >= 0 ? expensesByMonth.values[idx] : 0;
                            });
                            data.series.push({
                                name: 'Expenses',
                                data: expenseValues
                            });
                            
                            // Draw the chart
                            drawMonthlyComparisonChartFromMonthlyData(data, compareType);
                        },
                        error: (xhr, status, error) => {
                            handleAjaxError(xhr, status, error);
                            
                            // Still try to draw with expense data only
                            const data = {
                                labels: expensesByMonth.labels,
                                series: [{
                                    name: 'Expenses',
                                    data: expensesByMonth.values
                                }]
                            };
                            drawMonthlyComparisonChartFromMonthlyData(data, compareType);
                        }
                    });
                } else if (compareType === 'monthly-progress') {
                    // For monthly progress, just use the expense data
                    console.log(`Monthly progress data received with ${expensesByMonth.labels ? expensesByMonth.labels.length : 0} months`);
                    
                    // For monthly progress we just need one series
                    const monthlyData = {
                        labels: expensesByMonth.labels,
                        series: [{
                            name: 'Monthly Expenses',
                            data: expensesByMonth.values
                        }]
                    };
                    
                    // Find current month for highlighting
                    const currentYear = new Date().getFullYear();
                    const currentMonthLabel = `${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date())} ${currentYear}`;
                    const currentMonthIndex = expensesByMonth.labels.indexOf(currentMonthLabel);
                    
                    drawMonthlyComparisonChartFromMonthlyData(monthlyData, compareType, currentMonthIndex);
                }
            },
            error: (xhr, status, error) => {
                handleAjaxError(xhr, status, error);
                drawMonthlyComparisonChartFromMonthlyData({
                    labels: [],
                    series: []
                }, compareType);
            }
        });
    }
    
    // Draw monthly comparison chart from monthly data
    function drawMonthlyComparisonChartFromMonthlyData(data, type, highlightIndex = -1) {
        try {
            // Data should already be grouped by month from the API
            const months = data.labels || [];
            
            // Get the container element
            const container = document.getElementById('monthlyComparisonChart');
            if (!container) {
                console.error('Monthly comparison chart container element not found in DOM');
                return;
            }
            
            // Check if there's an existing canvas, if not create one
            let canvas = container.querySelector('canvas');
            if (!canvas) {
                // Clear container first
                container.innerHTML = '';
                
                // Create a new canvas element
                canvas = document.createElement('canvas');
                container.appendChild(canvas);
            }
            
            // Apply direct styling to container
            if (container) {
                container.style.backgroundColor = '#ffffff';
                container.style.border = '1px solid #e0e0e0';
                container.style.borderRadius = '8px';
            }
            
            // Try to get the context
            let ctx;
            try {
                ctx = canvas.getContext('2d');
                console.log('Monthly Comparison Chart canvas context:', ctx);
            } catch (contextError) {
                console.error('Error getting canvas context:', contextError);
                $('#monthlyComparisonChart').html('<div class="alert alert-danger">Error getting canvas context: ' + contextError.message + '</div>');
                return;
            }
            
            // Destroy previous chart if it exists
            if (window.monthlyComparisonChart instanceof Chart) {
                window.monthlyComparisonChart.destroy();
            }
            
            // If no data, show a message
            if (!months.length || !data.series || !data.series.length) {
                container.innerHTML = '<div class="alert alert-info">No data available for the selected period</div>';
                return;
            }
            
            // Set Chart.js defaults to light mode regardless of system mode
            Chart.defaults.color = '#666666';
            Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            // Set specific chart background color to white
            $(canvas).css('background-color', '#ffffff');
            
            // Prepare datasets based on type
            const datasets = [];
            
            if (type === 'income-expense') {
                // Income-expense comparison mode - show both bars
                if (data.series && data.series.length > 0) {
                    // Income trace (if available)
                    if (data.series.length > 0 && data.series[0].name === 'Income') {
                        datasets.push({
                            label: 'Income',
                            data: data.series[0].data,
                            backgroundColor: 'rgba(25, 135, 84, 0.7)',
                            borderColor: 'rgba(25, 135, 84, 1)',
                            borderWidth: 1
                        });
                    }
                    
                    // Expense trace (if available)
                    if (data.series.length > 1 && data.series[1].name === 'Expenses') {
                        datasets.push({
                            label: 'Expenses',
                            data: data.series[1].data,
                            backgroundColor: 'rgba(220, 53, 69, 0.7)',
                            borderColor: 'rgba(220, 53, 69, 1)',
                            borderWidth: 1
                        });
                    }
                }
            } else {
                // Monthly progress mode - show one series with highlighting
                if (data.series && data.series.length > 0) {
                    const values = data.series[0].data || [];
                    
                    // Set colors array with highlight
                    let colors = Array(months.length).fill('rgba(13, 110, 253, 0.7)');
                    let borderColors = Array(months.length).fill('rgba(13, 110, 253, 1)');
                    
                    // Highlight the selected index if valid
                    if (highlightIndex >= 0 && highlightIndex < months.length) {
                        colors[highlightIndex] = 'rgba(25, 135, 84, 0.9)';
                        borderColors[highlightIndex] = 'rgba(25, 135, 84, 1)';
                    }
                    
                    datasets.push({
                        label: 'Amount',
                        data: values,
                        backgroundColor: colors,
                        borderColor: borderColors,
                        borderWidth: 1
                    });
                }
            }
            
            console.log('Creating monthly comparison chart with data:', {
                type: type,
                labels: months,
                datasets: datasets
            });
            
            // Create the chart
            window.monthlyComparisonChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#555',
                                boxWidth: 12,
                                padding: 10
                            }
                        },
                        title: {
                            display: true,
                            text: type === 'income-expense' ? 'Monthly Income vs Expenses' : 'Monthly Expense Trend',
                            color: '#333',
                            font: {
                                size: 16
                            },
                            padding: {
                                top: 10,
                                bottom: 10
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            titleColor: '#333',
                            bodyColor: '#333',
                            borderColor: '#ccc',
                            borderWidth: 1,
                            cornerRadius: 4,
                            caretSize: 5,
                            padding: 10,
                            callbacks: {
                                title: function(tooltipItems) {
                        
                                    const index = tooltipItems[0].dataIndex;
                                    return months[index];
                                },
                                label: function(context) {
                               
                                    const value = context.parsed.y;
                                    return `${context.dataset.label}: $${value.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#555',
                                maxRotation: 45,
                                minRotation: 45,

                                callback: function(value, index) {
                                    const month = months[index];

                                    if (month && month.length > 10) {
                                        return month.substr(0, 3) + '...';
                                    }
                                    return month;
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                color: '#555',
                                callback: function(value) {

                                    if (value >= 1000) {
                                        return '$' + (value / 1000).toFixed(1) + 'k';
                                    }
                                    return '$' + value;
                                }
                            },
                            title: {
                                display: true,
                                text: 'Amount ($)',
                                color: '#555',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            console.log('Monthly comparison chart created successfully');
        } catch (error) {
            console.error('Error plotting monthly comparison chart:', error);
            $('#monthlyComparisonChart').html('<div class="alert alert-danger">Error plotting chart: ' + error.message + '</div>');
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
    
    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
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
        doc.text(`Total Income: ${$('#totalIncome').text()}`, 20, 45);
        doc.text(`Total Expenses: ${$('#totalExpenses').text()}`, 20, 55);
        doc.text(`Net Balance: ${$('#netBalance').text()}`, 20, 65);
        doc.text(`Largest Category: ${$('#topCategoryName').text()} (${$('#topCategoryAmount').text()})`, 20, 75);
        
        // Add charts as images
        Promise.all([
            // Get trend chart image
            new Promise(resolve => {
                if (window.trendChart instanceof Chart) {
                    resolve(window.trendChart.toBase64Image());
                } else {
                    resolve(null);
                }
            }),
            // Get pie chart image
            new Promise(resolve => {
                if (window.categoryPieChart instanceof Chart) {
                    resolve(window.categoryPieChart.toBase64Image());
                } else {
                    resolve(null);
                }
            }),
            // Get top categories chart image
            new Promise(resolve => {
                if (window.topCategoriesChart instanceof Chart) {
                    resolve(window.topCategoriesChart.toBase64Image());
                } else {
                    resolve(null);
                }
            }),
            // Get monthly comparison chart image
            new Promise(resolve => {
                if (window.monthlyComparisonChart instanceof Chart) {
                    resolve(window.monthlyComparisonChart.toBase64Image());
                } else {
                    resolve(null);
                }
            })
        ]).then(images => {
            let currentY = 85;
            
            // Add trend chart
            if (images[0]) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Income & Expense Trends', 105, 15, null, null, 'center');
                doc.addImage(images[0], 'PNG', 15, 25, 180, 90);
            }
            
            // Add pie chart
            if (images[1]) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Category Distribution', 105, 15, null, null, 'center');
                doc.addImage(images[1], 'PNG', 55, 25, 100, 100);
            }
            
            // Add top categories chart
            if (images[2]) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Top Categories', 105, 15, null, null, 'center');
                doc.addImage(images[2], 'PNG', 15, 25, 180, 90);
            }
            
            // Add monthly comparison chart
            if (images[3]) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Monthly Comparison', 105, 15, null, null, 'center');
                doc.addImage(images[3], 'PNG', 15, 25, 180, 90);
            }
            
            doc.save('financial-insights.pdf');
        }).catch(error => {
            console.error('Error exporting to PDF:', error);
            notifications.error('Error exporting to PDF: ' + error.message);
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
            xhrFields: {
        withCredentials: true
    },
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
            xhrFields: {
        withCredentials: true
    },
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
        console.log(`Display End Date: ${filters.endDate}`);
        
        // Make a direct API call to see what data is available
        $.ajax({
            url: '/api/insights/debug',
            method: 'GET',
            xhrFields: {
        withCredentials: true
    },
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
                    xhrFields: {
        withCredentials: true
    },
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

    /**
     * Get the number of days in the selected period
     * @param {string} period - 'month', 'prev-month', 'year', 'custom'
     * @returns {number}
     */
    function getDaysInPeriod(period) {
        const startDateStr = $('#startDate').val();
        const endDateStr = $('#endDate').val();
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        if (period === 'month' || period === 'prev-month' || period === 'custom') {
            // Calculate the number of days between two dates, inclusive
            const diffTime = endDate.getTime() - startDate.getTime();
            // +1 to include both start and end dates
            return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        } else if (period === 'year') {
            // From Jan 1st this year to Jan 1st next year
            const year = startDate.getFullYear();
            const nextYear = new Date(year + 1, 0, 1);
            const diffTime = nextYear.getTime() - startDate.getTime();
            return Math.round(diffTime / (1000 * 60 * 60 * 24));
        }
        return 1;
    }

    // Load all data on document ready
    $(document).ready(function () {
        console.log('Document ready, loading data...');
        
        // Initialize date handlers
        initDateHandlers();
        
        // Apply direct styling to all chart containers for consistent appearance
        // regardless of dark/light mode
        $('.chart-container').each(function() {
            $(this).css({
                'background-color': '#ffffff',
                'border': '1px solid #e0e0e0',
                'border-radius': '8px'
            });
        });
        
        // Load all data
        loadAllData();
        
        // Force white background on Plotly-generated elements when the DOM changes
        // This uses a MutationObserver to detect when Plotly adds new SVG elements
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    // Force white background on all SVG elements
                    const svgElements = document.querySelectorAll('svg.main-svg');
                    for (let svg of svgElements) {
                        svg.style.backgroundColor = '#ffffff';
                    }
                    
                    // Force white background on all BG elements
                    const bgElements = document.querySelectorAll('.bg');
                    for (let bg of bgElements) {
                        bg.setAttribute('fill', '#ffffff');
                    }
                }
            });
        });
        
        // Start observing the chart containers
        const chartContainers = document.querySelectorAll('.chart-container');
        for (let container of chartContainers) {
            observer.observe(container, { childList: true, subtree: true });
        }
        
        // Detect dark mode changes and refresh charts
        if (window.matchMedia) {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            try {
                // Modern browsers
                darkModeMediaQuery.addEventListener('change', function(e) {
                    console.log('Dark mode preference changed, refreshing charts...');
                    
                    // Reapply white backgrounds to all chart containers
                    $('.chart-container').each(function() {
                        $(this).css({
                            'background-color': '#ffffff',
                            'border': '1px solid #e0e0e0',
                            'border-radius': '8px'
                        });
                    });
                    
                    // Force white backgrounds on SVG elements
                    const svgElements = document.querySelectorAll('svg.main-svg');
                    for (let svg of svgElements) {
                        svg.style.backgroundColor = '#ffffff';
                    }
                    
                    // Force white backgrounds on BG elements
                    const bgElements = document.querySelectorAll('.bg');
                    for (let bg of bgElements) {
                        bg.setAttribute('fill', '#ffffff');
                    }
                    
                    // Refresh the data
                    setTimeout(() => {
                        loadAllData();
                    }, 100);
                });
            } catch (error1) {
                try {
                    // Older browsers
                    darkModeMediaQuery.addListener(function(e) {
                        console.log('Dark mode preference changed (legacy), refreshing charts...');
                        
                        // Reapply white backgrounds to all chart containers
                        $('.chart-container').each(function() {
                            $(this).css({
                                'background-color': '#ffffff',
                                'border': '1px solid #e0e0e0',
                                'border-radius': '8px'
                            });
                        });
                        
                        setTimeout(() => {
                            loadAllData();
                        }, 100);
                    });
                } catch (error2) {
                    console.error('Could not add dark mode change listener:', error2);
                }
            }
        }
        
        // Test if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js is loaded correctly');
            
            // Always use light mode colors for Chart.js
            Chart.defaults.color = '#666666';
            Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            // Force white backgrounds on all canvas charts
            setTimeout(() => {
                $('canvas.chartjs-render-monitor').each(function() {
                    $(this).css('background-color', '#ffffff');
                });
            }, 500);
        } else {
            console.error('Chart.js is not loaded!');
        }
        
        // Test canvas rendering context
        setTimeout(function() {
            const canvas = document.getElementById('topCategoriesChart');
            if (canvas) {
                console.log('Canvas found:', canvas);
                try {
                    const ctx = canvas.getContext('2d');
                    console.log('Canvas context:', ctx);
                    
                    // Draw a test rectangle on the canvas to verify it works
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(10, 10, 50, 50);
                    console.log('Test rectangle drawn');
                    
                    // Set canvas background to white
                    $(canvas).css('background-color', '#ffffff');
                } catch (e) {
                    console.error('Error getting canvas context:', e);
                }
            } else {
                console.error('Canvas element not found!');
            }
        }, 2000);
        
        // Setup export handlers
        setupExportHandlers();
        

        Chart.defaults.font.family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#555';
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        Chart.defaults.plugins.tooltip.titleColor = '#333';
        Chart.defaults.plugins.tooltip.bodyColor = '#333';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 0, 0, 0.1)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 4;
        

        function addTooltipsToText() {

            $('.stats-value span').each(function() {
                const $this = $(this);
                const text = $this.text();
                if (text.length > 10) {
                    $this.attr('data-bs-toggle', 'tooltip');
                    $this.attr('data-bs-placement', 'top');
                    $this.attr('title', text);
                }
            });
            

            $('.card-title').each(function() {
                const $this = $(this);
                const text = $this.text().trim();
                if (text.length > 20) {
                    $this.attr('data-bs-toggle', 'tooltip');
                    $this.attr('data-bs-placement', 'top');
                    $this.attr('title', text);
                }
            });

            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
        

        setTimeout(addTooltipsToText, 1000);
        

        $(window).on('resize', function() {
            setTimeout(addTooltipsToText, 500);
        });
        

        $('.stats-title, .stats-value, .card-title').addClass('text-truncate');
        
        $('.chart-card').on('shown.bs.collapse hidden.bs.collapse', function() {
            setTimeout(addTooltipsToText, 300);
        });
    });
});
