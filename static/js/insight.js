$(document).ready(() => {
    // ----- Global variables -----
    // Track current data source (my-data or shared-data)
    let currentDataSource = "my-data";
    // Track selected sharer ID when viewing shared data
    let selectedSharerId = null;
    // Track charts to destroy them before redrawing
    let trendChart = null;
    let pieChart = null;
    let topCategoriesChart = null;
    let monthlyComparisonChart = null;

    // ----- Helper functions -----
    // Format dates for input fields
    const formatDateForInput = (date) => {
        // Ensure we only return the date part (YYYY-MM-DD) without time
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Format currency
    function formatCurrency(amount) {
        return (
            "$" +
            parseFloat(amount)
                .toFixed(2)
                .replace(/\d(?=(\d{3})+\.)/g, "$&,")
        );
    }

    // Get current filter settings
    function getFilterSettings() {
        const startDateStr = $("#startDate").val();
        const endDateStr = $("#endDate").val();

        return {
            startDate: startDateStr,
            endDate: endDateStr,
            dataSource: currentDataSource,
            sharerId: selectedSharerId,
        };
    }

    // Handle AJAX errors
    function handleAjaxError(xhr, status, error) {
        // Remove existing error alerts to prevent duplicates
        $(".alert-danger").remove();

        let errorMessage = "Error loading data. Please try again later.";

        if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage = xhr.responseJSON.error;
        } else if (error) {
            errorMessage = `${error}. Please try again later.`;
        }

        // Create a single error message at the top of the page
        const errorHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong>Error:</strong> ${errorMessage}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Only add if no error is currently displayed
        $(".container:first").prepend(errorHtml);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            $(".alert-danger").fadeOut("slow", function () {
                $(this).remove();
            });
        }, 5000);
    }

    // ----- Date handling -----
    // Set default date range to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Set initial values for date inputs
    $("#startDate").val(formatDateForInput(firstDayOfMonth));
    $("#endDate").val(formatDateForInput(today));
    
    // Ensure "This Month" button is active by default
    $(".period-selector .btn").removeClass("active");
    $('.period-selector .btn[data-period="month"]').addClass("active");
    
    // Hide custom date range initially
    $(".custom-date-range").removeClass("show");

    // ----- Event Handlers -----
    // Data source selector (My Data / Shared With Me)
    $(".data-source-selector .btn")
        .off("click")
        .on("click", function () {
            const newDataSource = $(this).data("source");

            // Always update button highlight
            $(".data-source-selector .btn").removeClass("active");
            $(this).addClass("active");

            // Only reload if data source changed
            if (newDataSource !== currentDataSource) {
                currentDataSource = newDataSource;

                if (currentDataSource === "my-data") {
                    // Switch back to my data
                    $(".shared-user-selector").hide();
                    selectedSharerId = null;
    loadAllData();
                } else {
                    // Switch to shared data
                    $(".shared-user-selector").show();
                    // Clear all charts and data displays while waiting for user selection
                    clearAllDataDisplays();
                    // Load list of users who shared data
                    loadSharedUsers();
                }

                // Reinitialize chart toggles for consistency
                setTimeout(() => addChartTogglesListeners(), 100);
            }
        });

    // Sharer selection dropdown change
    $("#sharerSelect")
        .off("change")
        .on("change", function () {
            const sharerId = $(this).val();

            if (sharerId) {
                selectedSharerId = sharerId;
                loadAllData();

                // Reinitialize chart toggles for consistency
                setTimeout(() => addChartTogglesListeners(), 100);
            }
        });

    // Back to My Data button
    $("#backToMyData")
        .off("click")
        .on("click", function () {
            $(".data-source-selector .btn").removeClass("active");
            $('.data-source-selector .btn[data-source="my-data"]').addClass("active");
            currentDataSource = "my-data";
            selectedSharerId = null;
            $(".shared-user-selector").hide();
            loadAllData();

            // Reinitialize chart toggles for consistency
            setTimeout(() => addChartTogglesListeners(), 100);
        });

    // Period selection with improved date handling and consistent UI
    $(".period-selector .btn")
        .off("click")
        .on("click", function () {
            $(".period-selector .btn").removeClass("active");
            $(this).addClass("active");

            const period = $(this).data("period");

            if (period === "custom") {
                $(".custom-date-range").addClass("show");
            return;
        } else {
                $(".custom-date-range").removeClass("show");
            }

            let startDate, endDate;
            const today = new Date();

            switch (period) {
                case "month":
                    // Current month - from 1st of current month to today (include full day)
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        23,
                        59,
                        59
                    );
                break;
                
                case "prev-month":
                    // Previous month - from 1st to last day of previous month
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

                    // Calculate the last day of the previous month
                    // This is done by getting the 0th day of current month, which gives last day of previous month
                    if (today.getMonth() === 0) {
                        // If January, previous month is December of last year
                        endDate = new Date(today.getFullYear() - 1, 12, 0); // December 31st
                    } else {
                        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    }
                break;
                
                case "year":
                    // Current year - from January 1st to today (include full day)
                startDate = new Date(today.getFullYear(), 0, 1);
                    endDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        23,
                        59,
                        59
                    );
                break;
        }
        
        // Set the input field values
            $("#startDate").val(formatDateForInput(startDate));
            $("#endDate").val(formatDateForInput(endDate));

            // Show loading indicator
            $(".chart-container").html('<div class="loading-indicator">Loading data...</div>');

            // Load all data with the new date range
            setTimeout(() => loadAllData(), 100);
    });
    
    // Apply custom date range
    $("#applyDateRange")
        .off("click")
        .on("click", function () {
            const startDateStr = $("#startDate").val();
            const endDateStr = $("#endDate").val();
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        const today = new Date();

        if (startDate > endDate) {
                alert("Start date cannot be after end date.");
                return;
        }

        if (startDate > today && endDate > today) {
                alert("Dates cannot be in the future.");
                return;
            }

            // Loading indicator
            $(".chart-container").html('<div class="loading-indicator">Loading data...</div>');

            // Load all data with the new date range
            setTimeout(() => loadAllData(), 100);
        });

    // Set up all event listeners
    function addChartTogglesListeners() {
    // Chart period selectors
        $(".chart-period-selector .btn")
            .off("click")
            .on("click", function () {
                $(this).parent().find(".btn").removeClass("active");
                $(this).addClass("active");
        loadTrendChart();
                // Also update monthly comparison chart with the same period
                loadMonthlyComparisonChart();
    });
    
    // Pie chart type toggle
        $("[data-pie-type]")
            .off("click")
            .on("click", function () {
                $(this).parent().find(".btn").removeClass("active");
                $(this).addClass("active");
        loadCategoryPieChart();
    });
    
        // Top categories type toggle
        $("[data-top-categories-type]")
            .off("click")
            .on("click", function () {
                $(this).parent().find(".btn").removeClass("active");
                $(this).addClass("active");
                loadTopCategoriesChart();
    });
    
    // Monthly comparison type toggle
        $("[data-compare-type]")
            .off("click")
            .on("click", function () {
                $(this).parent().find(".btn").removeClass("active");
                $(this).addClass("active");
        loadMonthlyComparisonChart();
    });
    }
    
    // Export PDF button
    $("#exportPDF").on("click", function (e) {
        e.preventDefault();
        exportToPDF();
    });
    
    // Export PNG button
    $("#exportPNG").on("click", function (e) {
        e.preventDefault();
        exportToPNG();
    });
    
    // ----- Data Loading Functions -----
    // Load shared users (for dropdown) with improved handling
    function loadSharedUsers() {
        $.ajax({
            url: "/api/shared-insights/users",
            method: "GET",
            dataType: "json",
            success: (data) => {
                const dropdown = $("#sharerSelect");
                dropdown.empty();

                // Add an "All Shared Data" option at the top
                dropdown.append('<option value="all" selected>All Shared Data</option>');

                if (data && data.length > 0) {
                    data.forEach((user) => {
                        dropdown.append(`<option value="${user.id}">${user.username}</option>`);
                    });

                    // Automatically select "All Shared Data" and load combined data
                    selectedSharerId = "all";

                    // Now load data after selection is made
                    loadAllData();
                } else {
                    dropdown.append('<option value="" disabled>No shared data available</option>');
                    clearAllDataDisplays();
                }
            },
            error: handleAjaxError,
        });
    }

    // Load all data elements
    function loadAllData() {
        // Clear previous charts first
        clearCharts();

        // If shared data is selected but no sharer is selected, only load the shared user list
        if (currentDataSource === "shared-data" && !selectedSharerId) {
            clearAllDataDisplays();
            return;
        }

        // Then load all data
        loadSummaryCards();
            loadTrendChart();
            loadCategoryPieChart();
            loadTopCategoriesChart();
            loadMonthlyComparisonChart();
    }

    // Ensure all API calls add the correct parameters
    function enhanceAPIParams(params, isSharedData, sharerId) {
        // Only add parameters in shared-data mode
        if (!isSharedData) return params;

        let enhancedParams = { ...params };

        // Always add these parameters for all shared data modes
        enhancedParams.count_all = true;
        enhancedParams.include_merged = true;

        // For "all" mode, we need no additional parameters
        // For individual user, add sharer_id
        if (sharerId && sharerId !== "all") {
            enhancedParams.sharer_id = sharerId;
            // For individual user mode, still process all their shared items
            enhancedParams.process_all_items = true;
        }

        // Add parameter to deduplicate records
        enhancedParams.deduplicate = true;

        return enhancedParams;
    }

    // Load summary cards with improved handling of shared data
    function loadSummaryCards() {
        const filters = getFilterSettings();
        let apiUrl;
        let apiParams = {
            startDate: filters.startDate,
            endDate: filters.endDate,
        };

        if (currentDataSource === "my-data") {
            apiUrl = "/api/insights/summary";
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                apiUrl = "/api/shared-insights/summary-all"; // Endpoint for combined data
            } else if (selectedSharerId) {
                apiUrl = "/api/shared-insights/summary";
            } else {
                // No data source or no sharer selected
                clearAllDataDisplays();
                return;
            }
            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
        } else {
            clearAllDataDisplays();
            return;
        }

        // Load expense summary
        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                if (currentDataSource === "my-data") {
                    // Standard format for my data
                    const totalExpenses = data.totalAmount || 0;
                    $("#totalExpenses").text(formatCurrency(totalExpenses));
                    // Load income summary
                    $.ajax({
                        url: "/api/income-summary",
                        method: "GET",
                        data: apiParams,
                        dataType: "json",
                        success: (incomeData) => {
                            const totalIncome = incomeData.totalAmount || 0;
                            $("#totalIncome").text(formatCurrency(totalIncome));
                            // Calculate net balance
                            const netBalance = totalIncome - totalExpenses;
                            $("#netBalance").text(formatCurrency(netBalance));
                            // Update top category information
                            updateTopCategory(data.categoryDistribution);
                            // Update average daily stats
                            updateAverageDailyStats(totalIncome, totalExpenses, filters);
                        },
                        error: handleAjaxError,
                    });
                } else if (
                    currentDataSource === "shared-data" &&
                    data && data.expense && data.income
                ) {
                    // Shared data format
                    const totalExpenses = data.expense.totalAmount || 0;
                    const totalIncome = data.income.totalAmount || 0;
                    const netBalance = totalIncome - totalExpenses;
                    $("#totalExpenses").text(formatCurrency(totalExpenses));
                    $("#totalIncome").text(formatCurrency(totalIncome));
                    $("#netBalance").text(formatCurrency(netBalance));
                    // Update top category for shared data
                    updateTopCategory(data.expense.categoryDistribution);
                    // Update average daily stats
                    updateAverageDailyStats(totalIncome, totalExpenses, filters);
                } else {
                    // If no data or unexpected format, clear all displays
                    clearAllDataDisplays();
                }
            },
            error: function() {
                // On AJAX error, clear all displays
                clearAllDataDisplays();
                handleAjaxError.apply(this, arguments);
            },
        });
    }

    function updateAverageDailyStats(totalIncome, totalExpenses, filters) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        const daysDiff = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

        const avgDailyIncome = totalIncome / daysDiff;
        const avgDailyExpense = totalExpenses / daysDiff;

        $("#averageDailyIncome").text(formatCurrency(avgDailyIncome));
        $("#averageDailyExpense").text(formatCurrency(avgDailyExpense));
    }

    // Update top category display
    function updateTopCategory(categoryData) {
        if (!categoryData || !categoryData.labels || categoryData.labels.length === 0) {
            $("#topCategoryName").text("No Data");
            $("#topCategoryAmount").text("$0.00");
            $("#categoryPercentage").text("0% of total");
            return;
        }

        // Find the category with the highest value
        let maxIndex = 0;
        let maxValue = categoryData.values[0];

        for (let i = 1; i < categoryData.values.length; i++) {
            if (categoryData.values[i] > maxValue) {
                maxValue = categoryData.values[i];
                maxIndex = i;
            }
        }

        const topCategory = categoryData.labels[maxIndex];
        const topAmount = categoryData.values[maxIndex];

        // Calculate percentage of total
        const totalAmount = categoryData.values.reduce((sum, value) => sum + value, 0);
        const percentage = (topAmount / totalAmount) * 100;

        // Update display
        $("#topCategoryName").text(topCategory);
        $("#topCategoryAmount").text(formatCurrency(topAmount));
        $("#categoryPercentage").text(`${percentage.toFixed(1)}% of total`);

        // Set icon based on category name
        const categoryIcons = {
            Food: "🍔",
            Rent: "🏠",
            Transport: "🚗",
            Utilities: "💡",
            Entertainment: "🎬",
            Shopping: "🛍️",
            Healthcare: "🏥",
            Education: "📚",
            Travel: "✈️",
            Groceries: "🛒",
            Dining: "🍽️",
            Bills: "📝",
            Salary: "💰",
            Investment: "📈",
            Gift: "🎁",
        };

        $("#topCategoryIcon").text(categoryIcons[topCategory] || "💸");
    }

    // Draw trend chart with improved error handling
    function drawTrendChart(data, period) {
        try {
            // Get the proper canvas element
            let canvas = $("#trendChart");
            if (canvas.is("div")) {
                canvas = canvas.find("canvas");
                if (canvas.length === 0) {
                    canvas = $("<canvas>").attr("id", "trendChartCanvas");
                    $("#trendChart").empty().append(canvas);
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                return;
            }
            
            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                return;
            }
            
            // Destroy existing chart if any
            if (trendChart) {
                trendChart.destroy();
                trendChart = null;
            }

            // Check if data exists and is valid
            if (!data || !data.labels || !data.income || !data.expense) {
                $("#trendChart").html(
                    '<div class="chart-error">No data available for selected period</div>'
                );
                return;
            }
            
            // Determine title based on period
            let title = "Daily Income & Expenses";
            if (period === "weekly") {
                title = "Weekly Income & Expenses";
            } else if (period === "monthly") {
                title = "Monthly Income & Expenses";
            }

            // Create chart configuration
            const chartConfig = {
                type: "line",
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: "Income",
                            data: data.income,
                            borderColor: "rgba(75, 192, 192, 1)",
                            backgroundColor: "rgba(75, 192, 192, 0.2)",
                            fill: true,
                            tension: 0.4,
                        },
                        {
                            label: "Expenses",
                            data: data.expense,
                            borderColor: "rgba(255, 99, 132, 1)",
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                            fill: true,
                            tension: 0.4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "top",
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                color: "#333",
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ": $" + context.raw.toFixed(2);
                                },
                            },
                        },
                            title: {
                                display: true,
                            text: title,
                            color: "#333",
                            font: {
                                size: 16,
                                weight: "bold",
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return "$" + value;
                                },
                                color: "#333",
                            },
                            grid: {
                                color: "rgba(0, 0, 0, 0.1)",
                            },
                        },
                        x: {
                            ticks: {
                                color: "#333",
                                maxRotation: 45,
                                minRotation: 0,
                            },
                            grid: {
                                color: "rgba(0, 0, 0, 0.1)",
                            },
                        },
                    },
                },
            };

            // Create the chart
            trendChart = new Chart(ctx, chartConfig);
        } catch (error) {
            $("#trendChart").html('<div class="chart-error">Error creating chart</div>');
        }
    }
    
    // Load category pie chart
    function loadCategoryPieChart() {
        const pieType = $("[data-pie-type].active").data("pie-type") || "expense";
        const filters = getFilterSettings();

        let apiUrl;
        let apiParams = {
            startDate: filters.startDate,
            endDate: filters.endDate,
        };

        if (currentDataSource === "my-data") {
            if (pieType === "expense") {
                apiUrl = "/api/insights/summary";
            } else {
                apiUrl = "/api/income-summary";
            }
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                apiUrl = "/api/shared-insights/summary-all"; // Endpoint for combined data
            } else if (selectedSharerId) {
                apiUrl = "/api/shared-insights/summary";
                    } else {
                return; // No data source or no sharer selected
            }

            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
        } else {
            return; // No data source or no sharer selected
        }

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                if (currentDataSource === "my-data") {
                    // Standard format
                    drawCategoryPieChart(data.categoryDistribution, pieType);
                } else if (currentDataSource === "shared-data") {
                    // Shared data format
                    if (pieType === "expense" && data.expense) {
                        drawCategoryPieChart(data.expense.categoryDistribution, pieType);
                    } else if (pieType === "income" && data.income) {
                        drawCategoryPieChart(data.income.categoryDistribution, pieType);
                    }
                }
            },
            error: handleAjaxError,
        });
    }

    // Draw category pie chart with improved error handling
    function drawCategoryPieChart(data, type) {
        try {
            // Get the proper canvas element
            let canvas = $("#categoryPieChart");
            if (canvas.is("div")) {
                canvas = canvas.find("canvas");
                if (canvas.length === 0) {
                    canvas = $("<canvas>").attr("id", "categoryPieChartCanvas");
                    $("#categoryPieChart").empty().append(canvas);
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                return;
            }
            
            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                return;
            }

            // Check if data is valid
            if (!data || !data.labels || !data.values || data.labels.length === 0) {
                $("#categoryPieChart").html(
                    '<div class="chart-error">No data available for selected period</div>'
                );
                return;
            }
            
            // Destroy existing chart if any
            if (pieChart) {
                pieChart.destroy();
                pieChart = null;
            }

            // Create color arrays based on chart type
            const backgroundColors =
                type === "expense"
                    ? ["#FF6384", "#FF9F40", "#FFCD56", "#4BC0C0", "#36A2EB", "#9966FF", "#C9CBCF"]
                    : ["#4BC0C0", "#36A2EB", "#9966FF", "#FF6384", "#FF9F40", "#FFCD56", "#C9CBCF"];

            // Create the new chart with proper config
            pieChart = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            data: data.values,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors,
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "right",
                            labels: {
                                boxWidth: 15,
                                padding: 15,
                                font: {
                                    size: 12,
                                },
                                color: "#333",
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || "";
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                                },
                            },
                        },
                    },
                },
            });
        } catch (error) {
            $("#categoryPieChart").html('<div class="chart-error">Error creating chart</div>');
        }
    }
    
    // Load top categories chart with improved handling of shared data
    function loadTopCategoriesChart() {
        const filters = getFilterSettings();
        const topCategoriesType =
            $("[data-top-categories-type].active").data("top-categories-type") || "expense";

        let apiUrl;
        let apiParams = {
                startDate: filters.startDate,
            endDate: filters.endDate,
        };

        // Ensure toggle buttons exist
        ensureTopCategoriesToggleButtons();

        // Determine API based on data source and type
        if (currentDataSource === "my-data") {
            if (topCategoriesType === "expense") {
                apiUrl = "/api/insights/top-categories";
            } else {
                apiUrl = "/api/insights/top-income-categories";
            }
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                if (topCategoriesType === "expense") {
                    apiUrl = "/api/shared-insights/top-categories-all";
                } else {
                    apiUrl = "/api/shared-insights/top-income-categories-all";
                }
            } else if (selectedSharerId) {
                if (topCategoriesType === "expense") {
                    apiUrl = "/api/shared-insights/top-categories";
                } else {
                    apiUrl = "/api/shared-insights/top-income-categories";
                }
            } else {
                return; // No data source or no sharer selected
            }

            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
        } else {
            return; // No data source or no sharer selected
        }

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                drawTopCategoriesChart(data, topCategoriesType);
            },
            error: (xhr, status, error) => {
                // If API doesn't exist or returns error, display empty chart
                drawTopCategoriesChart({ labels: [], values: [] }, topCategoriesType);
            },
        });
    }

    // Helper function to ensure toggle buttons exist
    function ensureTopCategoriesToggleButtons() {
        // If toggle buttons don't exist, add them
        if ($(".top-categories-type-selector").length === 0) {
            const toggleButtons =
                '<div class="btn-group btn-group-sm top-categories-type-selector my-2" role="group">' +
                '<button type="button" class="btn btn-outline-secondary active" data-top-categories-type="expense">Expenses</button>' +
                '<button type="button" class="btn btn-outline-secondary" data-top-categories-type="income">Income</button>' +
                "</div>";

            $(".card-header:has(.fa-chart-bar)").append(toggleButtons);

            // Add toggle event
            $("[data-top-categories-type]").on("click", function () {
                $(this).parent().find(".btn").removeClass("active");
                $(this).addClass("active");
                loadTopCategoriesChart();
            });
        }
    }

    // Improved drawing of top categories chart with better empty state
    function drawTopCategoriesChart(data, type) {
        try {
            // Get the proper canvas element
            let canvas = $("#topCategoriesChart");
            if (canvas.length === 0) {
                            return;
                        }
                        
            // Ensure data is valid
            if (!data || !data.labels) {
                data = { labels: [], values: [] };
            }

            // If data is empty, display no data message
            if (data.labels.length === 0) {
                if (topCategoriesChart) {
                    topCategoriesChart.destroy();
                    topCategoriesChart = null;
                }

                // Create an empty chart with "No Data Available" message
                topCategoriesChart = new Chart(canvas, {
                    type: "bar",
                    data: {
                        labels: ["No Data"],
                        datasets: [
                            {
                                label: type === "expense" ? "Expense Amount" : "Income Amount",
                                data: [0],
                                backgroundColor: "rgba(200, 200, 200, 0.3)",
                                borderColor: "rgba(200, 200, 200, 0.5)",
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: "y",
                        plugins: {
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                enabled: false,
                            },
                            title: {
                                display: true,
                                text:
                                    type === "expense"
                                        ? "Top Expense Categories"
                                        : "Top Income Categories",
                                color: "#333",
                                font: {
                                    size: 14,
                                    weight: "bold",
                                },
                            },
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    display: false,
                                },
                                grid: {
                                    display: false,
                                },
                            },
                            y: {
                                ticks: {
                                    color: "#6c757d",
                                },
                                grid: {
                                    display: false,
                                },
                            },
                        },
                    },
                });

                // Add "No Data Available" text in the center
                const ctx = canvas[0].getContext("2d");
                setTimeout(() => {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#6c757d";
                    ctx.fillText(
                        "No data available for selected period",
                        canvas.width / 2,
                        canvas.height / 2
                    );
                    ctx.restore();
                }, 100);

                return;
            }

            // Destroy existing chart
            if (topCategoriesChart) {
                topCategoriesChart.destroy();
                topCategoriesChart = null;
            }

            // Set colors
            const colors =
                type === "expense"
                    ? [
                          "rgba(255, 99, 132, 0.8)",
                          "rgba(255, 159, 64, 0.8)",
                          "rgba(255, 205, 86, 0.8)",
                          "rgba(75, 192, 192, 0.8)",
                          "rgba(54, 162, 235, 0.8)",
                      ]
                    : [
                          "rgba(75, 192, 192, 0.8)",
                          "rgba(54, 162, 235, 0.8)",
                          "rgba(153, 102, 255, 0.8)",
                          "rgba(201, 203, 207, 0.8)",
                          "rgba(255, 159, 64, 0.8)",
                      ];

            // Create chart
            topCategoriesChart = new Chart(canvas, {
                type: "bar",
                            data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: type === "expense" ? "Expense Amount" : "Income Amount",
                            data: data.values,
                                    backgroundColor: colors,
                            borderColor: colors.map((color) => color.replace("0.8", "1")),
                                    borderWidth: 1,
                        },
                    ],
                            },
                            options: {
                                responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    tooltip: {
                                        callbacks: {
                                label: function (context) {
                                    return "$" + context.raw.toFixed(2);
                                },
                            },
                        },
                        title: {
                            display: true,
                            text:
                                type === "expense"
                                    ? "Top Expense Categories"
                                    : "Top Income Categories",
                            color: "#333",
                            font: {
                                size: 14,
                                weight: "bold",
                            },
                        },
                                },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return "$" + value;
                                },
                                color: "#333",
                            },
                                        grid: {
                                color: "rgba(0, 0, 0, 0.1)",
                            },
                                    },
                                    y: {
                            ticks: {
                                color: "#333",
                            },
                                        grid: {
                                            display: false,
                            },
                        },
                    },
                },
            });
                    } catch (error) {
            // Clear error message container if it exists
            if ($("#topCategoriesChart").siblings(".chart-error").length) {
                $("#topCategoriesChart").siblings(".chart-error").remove();
            }
            // Show error message
            $("#topCategoriesChart").after('<div class="chart-error">Error creating chart</div>');
        }
    }

    // Load monthly comparison chart with client-side aggregation
    function loadMonthlyComparisonChart() {
        const filters = getFilterSettings();

        // Get the active period button from the comparison period selector
        const periodButton = $(".comparison-period-selector .btn.active");
        // Get period value, default to daily if not found
        const period =
            periodButton.length > 0 ? periodButton.data("compare-period") || "daily" : "daily";

        // We'll use the same approach as with the trend chart:
        // Get daily data and aggregate it client-side

        // We can reuse the income-expense-comparison endpoint data
        let apiUrl;
        let apiParams = {
                        startDate: filters.startDate, 
            endDate: filters.endDate,
        };

        if (currentDataSource === "my-data") {
            apiUrl = "/api/income-expense-comparison";
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                apiUrl = "/api/shared-insights/comparison-all";
            } else if (selectedSharerId) {
                apiUrl = "/api/shared-insights/comparison";
            } else {
                return; // No data source or no sharer selected
            }

            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
        } else {
            return; // No data source or no sharer selected
        }

                $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                // Aggregate data client-side if needed
                if (period === "weekly" || period === "monthly") {
                    data = aggregateDataByPeriod(data, period);
                }

                // Calculate balance data (income - expense)
                const balanceData = [];
                if (data.income && data.expense) {
                    for (let i = 0; i < data.income.length; i++) {
                        balanceData.push(data.income[i] - data.expense[i]);
                    }
                }

                // Format for chart.js display
                const chartData = {
                    labels: data.labels || ["No Data"],
                    datasets: [
                        {
                            label: "Income",
                            data: data.income || [0],
                            backgroundColor: "rgba(75, 192, 192, 0.7)",
                            borderColor: "rgba(75, 192, 192, 1)",
                            borderWidth: 1,
                        },
                        {
                            label: "Expenses",
                            data: data.expense || [0],
                            backgroundColor: "rgba(255, 99, 132, 0.7)",
                            borderColor: "rgba(255, 99, 132, 1)",
                            borderWidth: 1,
                        },
                        {
                            label: "Balance",
                            data: balanceData,
                            backgroundColor: "rgba(54, 162, 235, 0.7)",
                            borderColor: "rgba(54, 162, 235, 1)",
                            borderWidth: 1,
                        },
                    ],
                };

                drawMonthlyComparisonChart(chartData, period);
                        },
                        error: (xhr, status, error) => {
                // Create empty chart with no data indication
                const emptyChartData = {
                    labels: ["No Data"],
                    datasets: [
                        {
                            label: "Income",
                            data: [0],
                            backgroundColor: "rgba(75, 192, 192, 0.7)",
                            borderColor: "rgba(75, 192, 192, 1)",
                            borderWidth: 1,
                        },
                        {
                            label: "Expenses",
                            data: [0],
                            backgroundColor: "rgba(255, 99, 132, 0.7)",
                            borderColor: "rgba(255, 99, 132, 1)",
                            borderWidth: 1,
                        },
                        {
                            label: "Balance",
                            data: [0],
                            backgroundColor: "rgba(54, 162, 235, 0.7)",
                            borderColor: "rgba(54, 162, 235, 1)",
                            borderWidth: 1,
                        },
                    ],
                };

                drawMonthlyComparisonChart(emptyChartData, period);
                showNotification(
                    "Error loading chart data. Please check console for details.",
                    "error"
                );
            },
        });
    }

    // Improved drawing of monthly comparison chart
    function drawMonthlyComparisonChart(data, period) {
        try {
            // Get the proper canvas element
            let canvas = $("#monthlyComparisonChart");
            if (canvas.is("div")) {
                canvas = canvas.find("canvas");
                if (canvas.length === 0) {
                    canvas = $("<canvas>").attr("id", "monthlyComparisonChartCanvas");
                    $("#monthlyComparisonChart").empty().append(canvas);
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                return;
            }
            
            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                return;
            }
            
            // Check if data is empty
            const isEmptyData =
                data.labels.length === 1 &&
                data.labels[0] === "No Data" &&
                data.datasets[0].data[0] === 0 &&
                data.datasets[1].data[0] === 0;

            // Destroy existing chart if any
            if (monthlyComparisonChart) {
                monthlyComparisonChart.destroy();
                monthlyComparisonChart = null;
            }

            // Set chart title based on period
            let chartTitle;
            if (period === "daily") {
                chartTitle = "Daily Income, Expenses & Balance";
            } else if (period === "weekly") {
                chartTitle = "Weekly Income, Expenses & Balance";
            } else {
                chartTitle = "Monthly Income, Expenses & Balance";
            }

            // Create chart
            monthlyComparisonChart = new Chart(ctx, {
                type: "bar",
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: "top",
                            labels: {
                            font: {
                                    size: 12,
                                },
                                color: "#333",
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ": $" + context.raw.toFixed(2);
                                },
                            },
                            enabled: !isEmptyData,
                        },
                        title: {
                            display: true,
                            text: chartTitle,
                            color: "#333",
                            font: {
                                size: 14,
                                weight: "bold",
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: {
                                color: "rgba(0, 0, 0, 0.1)",
                            },
                            ticks: {
                                color: isEmptyData ? "rgba(0,0,0,0)" : "#333",
                                maxRotation: 45,
                                minRotation: 0,
                            },
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return "$" + value;
                                },
                                display: !isEmptyData,
                            },
                            grid: {
                                color: "rgba(0, 0, 0, 0.1)",
                            },
                        },
                    },
                },
            });

            // Add "No Data Available" text in the center if data is empty
            if (isEmptyData) {
                setTimeout(() => {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#6c757d";
                    ctx.fillText(
                        "No data available for selected period",
                        canvas.width / 2,
                        canvas.height / 2
                    );
                    ctx.restore();
                }, 100);
            }
        } catch (error) {
            $("#monthlyComparisonChart").html(
                '<div class="chart-error">Error creating chart</div>'
            );
        }
    }

    // Export to PDF
    function exportToPDF() {
        // Use html2canvas and jsPDF to export the page
        html2canvas(document.querySelector(".container"), {
            onrendered: function (canvas) {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");
                const width = pdf.internal.pageSize.getWidth();
                const height = (canvas.height * width) / canvas.width;

                pdf.addImage(imgData, "PNG", 0, 0, width, height);
                pdf.save("financial-insights.pdf");
            },
        });
    }

    // Export to PNG
    function exportToPNG() {
        html2canvas(document.querySelector(".container"), {
            onrendered: function (canvas) {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = imgData;
                link.download = "financial-insights.png";
                link.click();
            },
        });
    }

    // ----- Initialize -----
    // Run when document is ready
    $(document).ready(function () {
        // Add insight-page class to the main container for better styling
        $(".container:first").addClass("insight-page");

        // Add classes to summary cards for custom styling
        $("#totalIncome").closest(".card").addClass("summary-card income-card");
        $("#totalExpenses").closest(".card").addClass("summary-card expense-card");
        $("#netBalance").closest(".card").addClass("summary-card balance-card");
        $("#topCategoryName").closest(".card").addClass("summary-card");

        // Add summary-value class to the values
        $("#totalIncome, #totalExpenses, #netBalance").addClass("summary-value");

        // Initialize UI and chart elements
        initializeUI();

        // Load data
        loadAllData();
    });

    // Initialize all charts and UI elements
    function initializeUI() {
        // Initialize chart containers
        initChartContainers();

        // Add period selector for comparison chart
        if ($(".comparison-period-selector").length === 0) {
            // Add period selector buttons before the comparison chart
            const comparisonPeriodSelector = $("<div>")
                .addClass("btn-group btn-group-sm comparison-period-selector mb-3")
                .attr("role", "group")
                .append(
                    $("<button>")
                        .addClass("btn btn-outline-secondary active")
                        .attr("data-compare-period", "daily")
                        .text("Daily"),
                    $("<button>")
                        .addClass("btn btn-outline-secondary")
                        .attr("data-compare-period", "weekly")
                        .text("Weekly"),
                    $("<button>")
                        .addClass("btn btn-outline-secondary")
                        .attr("data-compare-period", "monthly")
                        .text("Monthly")
                );

            // Insert before comparison chart
            $("#monthlyComparisonChart").before(comparisonPeriodSelector);

            // Add event listener for comparison period buttons
            $(".comparison-period-selector .btn").on("click", function () {
                $(".comparison-period-selector .btn").removeClass("active");
                $(this).addClass("active");

                // Reload the comparison chart with the new period
                loadMonthlyComparisonChart();
            });
        }

        // Remove the monthly-progress toggle button since we're only keeping income-expense
        $('[data-compare-type="monthly-progress"]')
            .parent()
            .find('[data-compare-type="income-expense"]')
            .addClass("active");
        $('[data-compare-type="monthly-progress"]').remove();

        // Ensure top categories chart toggle buttons exist
        ensureTopCategoriesToggleButtons();

        // Set up all event listeners
        addChartTogglesListeners();

        // Add trend period selectors if they don't exist
        if ($(".chart-period-selector").length === 0) {
            // Add period selector buttons before the trend chart
            const periodSelector = $("<div>")
                .addClass("btn-group btn-group-sm chart-period-selector mb-3")
                .attr("role", "group")
                .append(
                    $("<button>")
                        .addClass("btn btn-outline-secondary active")
                        .attr("data-trend-period", "daily")
                        .text("Daily"),
                    $("<button>")
                        .addClass("btn btn-outline-secondary")
                        .attr("data-trend-period", "weekly")
                        .text("Weekly"),
                    $("<button>")
                        .addClass("btn btn-outline-secondary")
                        .attr("data-trend-period", "monthly")
                        .text("Monthly")
                );

            // Insert before trend chart
            $("#trendChart").before(periodSelector);
        }

        // Fix for period selector not properly setting data-trend-period
        $(".chart-period-selector .btn").each(function () {
            // If button has period but no trend-period, add it
            if ($(this).data("period") && !$(this).data("trend-period")) {
                const period = $(this).data("period");
                if (period === "day") $(this).attr("data-trend-period", "daily");
                else if (period === "week") $(this).attr("data-trend-period", "weekly");
                else if (period === "month") $(this).attr("data-trend-period", "monthly");
            }
        });
    }

    // Function to properly initialize chart containers by replacing divs with canvas elements if needed
    function initChartContainers() {
        // Ensure top categories chart has the correct canvas element
        if ($("#topCategoriesChart").length === 0) {
            $(".card-body:has(.fa-chart-bar)").append(
                '<canvas id="topCategoriesChart" class="chart-container"></canvas>'
            );
        }

        // Ensure all chart containers have canvas elements
        createCanvasIfNeeded("trendChart");
        createCanvasIfNeeded("categoryPieChart");
        createCanvasIfNeeded("monthlyComparisonChart");

        // Set chart heights
        $("#trendChart").css("height", "300px");
        $("#categoryPieChart").css("height", "300px");
        $("#monthlyComparisonChart").css("height", "300px");
        $("#topCategoriesChart").css("height", "270px");
    }

    // Helper function to ensure each chart container has a canvas element
    function createCanvasIfNeeded(containerId) {
        const container = $("#" + containerId);

        // If the container is a div and doesn't contain a canvas, replace it with a canvas
        if (container.is("div") && container.find("canvas").length === 0) {
            const canvas = $("<canvas>").attr("id", containerId + "Canvas");
            container.empty().append(canvas);
        }
    }

    // Display notification to users
    function showNotification(message, type = "info") {
        const notificationId = "notification-" + Date.now();
        const notificationHtml = `
            <div id="${notificationId}" class="notification notification-${type}">
                ${message}
                <span class="notification-close">&times;</span>
            </div>
        `;

        $("body").append(notificationHtml);

        // Position notification
        const $notification = $(`#${notificationId}`);
        $notification.css({
            top: "20px",
            right: "20px",
        });

        // Add close handler
        $notification.find(".notification-close").on("click", function () {
            $notification.fadeOut(300, function () {
                $(this).remove();
            });
        });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            $notification.fadeOut(300, function () {
                $(this).remove();
            });
        }, 5000);
    }

    // Function to clear all summary and average cards
    function clearAllDataDisplays() {
        // Clear summary cards
        $("#totalIncome").text("$0.00");
        $("#totalExpenses").text("$0.00");
        $("#netBalance").text("$0.00");
        $("#topCategoryName").text("N/A");
        $("#topCategoryAmount").text("$0.00");
        $("#categoryPercentage").text("0% of total");
        // Clear average cards (correct DOM ids)
        $("#averageDailyIncome").text("$0.00");
        $("#averageDailyExpense").text("$0.00");
        // Clear charts
        clearCharts();
    }

    // Clear all charts
    function clearCharts() {
        // Destroy existing charts
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }
        
        if (pieChart) {
            pieChart.destroy();
            pieChart = null;
        }
        
        if (topCategoriesChart) {
            topCategoriesChart.destroy();
            topCategoriesChart = null;
        }
        
        if (monthlyComparisonChart) {
            monthlyComparisonChart.destroy();
            monthlyComparisonChart = null;
        }
        
        // Clear chart containers
        $("#trendChartContainer").empty();
        $("#pieChartContainer").empty();
        $("#topCategoriesChartContainer").empty();
        $("#monthlyComparisonChartContainer").empty();
    }

    // Load trend chart
    function loadTrendChart() {
        const filters = getFilterSettings();
        const period = $(".chart-period-selector .btn.active").data("trend-period") || "daily";

        let apiUrl;
        let apiParams = {
                startDate: filters.startDate, 
            endDate: filters.endDate,
        };

        if (currentDataSource === "my-data") {
            apiUrl = "/api/income-expense-comparison";
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                apiUrl = "/api/shared-insights/comparison-all";
            } else if (selectedSharerId) {
                apiUrl = "/api/shared-insights/comparison";
                } else {
                return; // No data source or no sharer selected
            }

            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
                } else {
            return; // No data source or no sharer selected
                }

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                // If we need to aggregate by period (weekly or monthly), do it here
                if (period === "weekly" || period === "monthly") {
                    data = aggregateDataByPeriod(data, period);
                }

                drawTrendChart(data, period);
            },
            error: (xhr, status, error) => {
                // Create empty chart with no data indication
                const emptyData = {
                    labels: ["No Data"],
                    income: [0],
                    expense: [0],
                };
                drawTrendChart(emptyData, period);

                // Show error notification to user
                showNotification(
                    "Error loading chart data. Please check console for details.",
                    "error"
                );
            },
        });
    }

    // Aggregate data by period (weekly or monthly) in JavaScript
    // This avoids database-specific functions
    function aggregateDataByPeriod(data, period) {
        if (!data || !data.labels || !data.income || !data.expense) {
            return data;
        }

        // Creates an aggregated version of the data based on period
        const result = {
            labels: [],
            income: [],
            expense: [],
            period: period,
        };

        // Maps to hold aggregated values
        const incomeMap = {};
        const expenseMap = {};

        // Function to get period key from a date string
        const getPeriodKey = (dateStr) => {
            try {
                const date = new Date(dateStr);
                if (period === "weekly") {
                    // Get year and week number
                    const year = date.getFullYear();
                    // Get ISO week number (1-53)
                    const weekNumber = getWeekNumber(date);
                    return `Week ${weekNumber}, ${year}`;
                } else if (period === "monthly") {
                    // Format as "MMM YYYY" (e.g., "Jan 2023")
                    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                }
                return dateStr; // Default to original for daily
            } catch (e) {
                console.error("Error parsing date:", dateStr, e);
                return dateStr;
            }
        };

        // Aggregate data
        for (let i = 0; i < data.labels.length; i++) {
            const periodKey = getPeriodKey(data.labels[i]);

            // Initialize if first time seeing this period
            if (!incomeMap[periodKey]) {
                incomeMap[periodKey] = 0;
                expenseMap[periodKey] = 0;
            }

            // Add values to the period
            incomeMap[periodKey] += parseFloat(data.income[i] || 0);
            expenseMap[periodKey] += parseFloat(data.expense[i] || 0);
        }

        // Convert maps to arrays
        const periodKeys = Object.keys(incomeMap).sort();

        // Sort period keys if needed
        if (period === "monthly") {
            // Sort by year then month
            periodKeys.sort((a, b) => {
                const dateA = new Date(a);
                const dateB = new Date(b);
                return dateA - dateB;
            });
        } else if (period === "weekly") {
            // Sort by year then week number
            periodKeys.sort((a, b) => {
                const [weekA, yearA] = a.replace("Week ", "").split(", ");
                const [weekB, yearB] = b.replace("Week ", "").split(", ");

                if (yearA !== yearB) {
                    return parseInt(yearA) - parseInt(yearB);
                }
                return parseInt(weekA) - parseInt(weekB);
            });
        }

        // Fill result arrays
        result.labels = periodKeys;
        result.income = periodKeys.map((key) => incomeMap[key]);
        result.expense = periodKeys.map((key) => expenseMap[key]);

        return result;
    }

    // Helper function to get ISO week number
    function getWeekNumber(date) {
        // Create a copy of the date to avoid modifying the original
        const d = new Date(date);
        // Set to nearest Thursday: current date + 4 - current day number
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return weekNo;
    }
});
