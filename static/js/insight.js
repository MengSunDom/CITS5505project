$(document).ready(() => {
    console.log("Insight page initializing...");

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
        console.error("AJAX Error:", status, error);

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

    // Add CSS fixes for UI elements
    function addUIStyleFixes() {
        $("<style>")
            .prop("type", "text/css")
            .html(
                `
                /* Modern UI improvements for insight page */
                .insight-page .card {
                    border: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    transition: transform 0.2s, box-shadow 0.2s;
                    margin-bottom: 24px;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .insight-page .card:hover {
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
                    transform: translateY(-3px);
                }
                
                /* Card header improvements */
                .insight-page .card-header {
                    background: linear-gradient(to right, #f8f9fa, #ffffff);
                    border-bottom: none;
                    padding: 16px 20px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    font-size: 1.05rem;
                    color: #2c3e50;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                /* Card body improvements */
                .insight-page .card-body {
                    padding: 20px;
                    background: #ffffff;
                }
                
                /* Summary card styling */
                .insight-page .summary-card {
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    border-left: 4px solid #3498db;
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    transition: all 0.2s ease;
                }
                
                .insight-page .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                }
                
                .insight-page .summary-card h5 {
                    margin-bottom: 8px;
                    color: #2c3e50;
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .insight-page .summary-card .summary-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #2c3e50;
                }
                
                /* Income card styling */
                .insight-page .summary-card.income-card {
                    border-left-color: #2ecc71;
                }
                
                .insight-page .summary-card.income-card .summary-value {
                    color: #27ae60;
                }
                
                /* Expense card styling */
                .insight-page .summary-card.expense-card {
                    border-left-color: #e74c3c;
                }
                
                .insight-page .summary-card.expense-card .summary-value {
                    color: #c0392b;
                }
                
                /* Balance card styling */
                .insight-page .summary-card.balance-card {
                    border-left-color: #3498db;
                }
                
                .insight-page .summary-card.balance-card .summary-value {
                    color: #2980b9;
                }
                
                /* Shared user selector improvements */
                .shared-user-selector {
                    background: linear-gradient(to right, #f5f7fa, #f8f9fa);
                    border-radius: 10px;
                    padding: 14px 16px;
                    border: 1px solid #e9ecef;
                    margin-right: 12px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                }
                
                .shared-user-selector label {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-right: 12px;
                    font-size: 0.9rem;
                }
                
                .shared-user-selector select {
                    border-radius: 6px;
                    border-color: #e9ecef;
                    color: #2c3e50;
                    padding: 6px 12px;
                    background-color: white;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                    font-size: 0.9rem;
                }
                
                /* Date range selector improvements */
                .date-range-selector {
                    background: linear-gradient(to right, #f5f7fa, #f8f9fa);
                    border-radius: 10px;
                    padding: 14px 16px;
                    border: 1px solid #e9ecef;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    margin-bottom: 12px;
                }
                
                .period-selector .btn {
                    font-size: 0.85rem;
                    font-weight: 500;
                    padding: 6px 12px;
                    border-radius: 6px;
                    margin-right: 4px;
                    color: #4a5568;
                    border-color: #e2e8f0;
                    background: white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                }
                
                .period-selector .btn.active {
                    background: #3498db;
                    border-color: #2980b9;
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
                }
                
                /* Custom date inputs */
                .custom-date-range input[type="date"] {
                    border-radius: 6px;
                    border-color: #e9ecef;
                    color: #2c3e50;
                    padding: 6px 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                    font-size: 0.85rem;
                }
                
                .custom-date-range .btn {
                    font-size: 0.85rem;
                    background: #3498db;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
                    border: none;
                    padding: 6px 14px;
                }
                
                /* Chart improvements */
                .chart-container {
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    padding: 10px;
                    transition: all 0.3s ease;
                }
                
                .chart-container:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                
                /* Period selectors styling */
                .chart-period-selector, .comparison-period-selector {
                    margin-left: 10px;
                    margin-right: 10px;
                }
                
                .chart-period-selector .btn, .comparison-period-selector .btn {
                    font-size: 0.85rem;
                    font-weight: 500;
                    padding: 6px 12px;
                    border-radius: 6px;
                    margin-right: 4px;
                    color: #4a5568;
                    border-color: #e2e8f0;
                    background: white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                }
                
                .chart-period-selector .btn.active, .comparison-period-selector .btn.active {
                    background: #3498db;
                    border-color: #2980b9;
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
                }

                /* Data source selector styling */
                .data-source-selector .btn {
                    font-size: 0.85rem;
                    font-weight: 500;
                    padding: 6px 12px;
                    border-radius: 6px;
                    margin-right: 4px;
                    color: #4a5568;
                    border-color: #e2e8f0;
                    background: white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                }
                
                .data-source-selector .btn.active {
                    background: #3498db;
                    border-color: #2980b9;
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
                }
                
                /* Top categories chart styling */
                .top-categories-type-selector .btn {
                    font-size: 0.8rem;
                    padding: 4px 10px;
                    border-radius: 4px;
                }
                
                /* Back button styling */
                #backToMyData {
                    background-color: #f8f9fa;
                    color: #2c3e50;
                    border: 1px solid #e2e8f0;
                    font-size: 0.85rem;
                    padding: 6px 12px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }
                
                #backToMyData:hover {
                    background-color: #e2e8f0;
                    color: #1a202c;
                }
                
                /* Loading indicator styling */
                .loading-indicator {
                    background-color: rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                    font-weight: 500;
                    color: #3498db;
                }
                
                .loading-indicator:after {
                    border: 2px solid rgba(52, 152, 219, 0.2);
                    border-top: 2px solid #3498db;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .insight-page .card-header {
                        padding: 14px 16px;
                        font-size: 0.95rem;
                    }
                    
                    .insight-page .summary-card .summary-value {
                        font-size: 1.3rem;
                    }
                    
                    .period-selector, .chart-period-selector, .comparison-period-selector {
                        display: flex;
                        overflow-x: auto;
                        padding-bottom: 4px;
                    }
                    
                    .period-selector .btn, .chart-period-selector .btn, .comparison-period-selector .btn {
                        font-size: 0.8rem;
                        padding: 5px 10px;
                        white-space: nowrap;
                    }
                }
            `
            )
            .appendTo("head");
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

    // Add CSS fixes when document is ready
    addUIStyleFixes();

    // ----- Event Handlers -----
    // Data source selector (My Data / Shared With Me)
    $(".data-source-selector .btn")
        .off("click")
        .on("click", function () {
            console.log("Data source button clicked:", $(this).data("source"));
            $(".data-source-selector .btn").removeClass("active");
            $(this).addClass("active");

            const newDataSource = $(this).data("source");

            // Only reload if data source changed
            if (newDataSource !== currentDataSource) {
                currentDataSource = newDataSource;
                console.log("Switched to data source:", currentDataSource);

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
            console.log("Sharer selected:", sharerId);

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
            console.log("Back to my data clicked");
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
                $(".custom-date-range").classList.add("show");
                return;
            } else {
                $(".custom-date-range").classList.remove("show");
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

            // Log the date range for debugging
            console.log(
                "Date range set to:",
                formatDateForInput(startDate),
                "to",
                formatDateForInput(endDate)
            );

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
        console.log("Setting up chart toggle listeners");

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
        console.log("Loading shared users...");

        $.ajax({
            url: "/api/shared-insights/users",
            method: "GET",
            dataType: "json",
            success: (data) => {
                console.log("Shared users data:", data);
                const dropdown = $("#sharerSelect");
                dropdown.empty();

                // Add an "All Shared Data" option at the top
                dropdown.append('<option value="all" selected>All Shared Data</option>');

                if (data && data.length > 0) {
                    data.forEach((user) => {
                        dropdown.append(`<option value="${user.id}">${user.username}</option>`);
                    });
                    console.log("Added shared users to dropdown");

                    // Make sure Back button exists
                    if ($("#backToMyData").length === 0) {
                        $(".shared-user-selector .d-flex").append(
                            $("<button>")
                                .attr("id", "backToMyData")
                                .addClass("btn btn-sm btn-outline-secondary ms-2")
                                .html('<i class="fas fa-arrow-left me-1"></i> Back')
                                .on("click", function () {
                                    $(".data-source-selector .btn").removeClass("active");
                                    $('.data-source-selector .btn[data-source="my-data"]').addClass(
                                        "active"
                                    );
                                    currentDataSource = "my-data";
                                    selectedSharerId = null;
                                    $(".shared-user-selector").hide();
                                    loadAllData();
                                })
                        );
                    }

                    // Automatically select "All Shared Data" and load combined data
                    selectedSharerId = "all";

                    // Now load data after selection is made
                    loadAllData();
                } else {
                    dropdown.append('<option value="" disabled>No shared data available</option>');
                    console.log("No shared users available");
                    clearAllDataDisplays();
                }
            },
            error: handleAjaxError,
        });
    }

    // Load all data elements
    function loadAllData() {
        console.log("Loading all data with settings:", getFilterSettings());

        // Clear previous charts first
        clearCharts();

        // If shared data is selected but no sharer is selected, only load the shared user list
        if (currentDataSource === "shared-data" && !selectedSharerId) {
            console.log("Shared data selected but no sharer chosen - waiting for selection");
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

        console.log("Enhanced API params:", enhancedParams);
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

        console.log("Loading summary cards with data source:", currentDataSource);
        console.log("Selected sharer ID:", selectedSharerId);

        if (currentDataSource === "my-data") {
            apiUrl = "/api/insights/summary";
        } else if (currentDataSource === "shared-data") {
            if (selectedSharerId === "all") {
                apiUrl = "/api/shared-insights/summary-all"; // Endpoint for combined data
            } else if (selectedSharerId) {
                apiUrl = "/api/shared-insights/summary";
            } else {
                console.log("No data source or no sharer selected, skipping load");
                return; // No data source or no sharer selected
            }

            // Enhance API parameters
            apiParams = enhanceAPIParams(apiParams, true, selectedSharerId);
            console.log("Final API params for summary:", apiParams); // Debug log
        } else {
            return;
        }

        console.log("Loading summary from API:", apiUrl, apiParams);

        // Load expense summary
        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                console.log("Summary API response:", data);

                if (currentDataSource === "my-data") {
                    // Handle standard format
                    const totalExpenses = data.totalAmount || 0;
                    $("#totalExpenses").text(formatCurrency(totalExpenses));

                    // Load income summary
                    $.ajax({
                        url: "/api/income-summary",
                        method: "GET",
                        data: apiParams,
                        dataType: "json",
                        success: (incomeData) => {
                            console.log("Income API response:", incomeData);
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
                } else if (currentDataSource === "shared-data" && data.expense && data.income) {
                    // Handle shared data format
                    const totalExpenses = data.expense.totalAmount || 0;
                    const totalIncome = data.income.totalAmount || 0;
                    const netBalance = totalIncome - totalExpenses;

                    console.log(
                        "Shared data totals - Expenses:",
                        totalExpenses,
                        "Income:",
                        totalIncome
                    );

                    $("#totalExpenses").text(formatCurrency(totalExpenses));
                    $("#totalIncome").text(formatCurrency(totalIncome));
                    $("#netBalance").text(formatCurrency(netBalance));

                    // Update top category for shared data
                    updateTopCategory(data.expense.categoryDistribution);

                    // Update average daily stats
                    updateAverageDailyStats(totalIncome, totalExpenses, filters);
                } else {
                    console.error("Unexpected data format received:", data);
                    showNotification(
                        "Unexpected data format received. See console for details.",
                        "error"
                    );
                }
            },
            error: handleAjaxError,
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
                    console.log("Created new canvas for trend chart");
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                console.error("Could not find or create trend chart canvas");
                return;
            }

            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                console.error("Could not get 2D context for trend chart");
                return;
            }

            // Destroy existing chart if any
            if (trendChart) {
                trendChart.destroy();
                trendChart = null;
            }

            // Check if data exists and is valid
            if (!data || !data.labels || !data.income || !data.expense) {
                console.error("Invalid data for trend chart:", data);
                $("#trendChart").html(
                    '<div class="chart-error">No data available for selected period</div>'
                );
                return;
            }

            console.log("Drawing trend chart with data:", data);

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

            console.log("Trend chart created with data length:", data.labels.length);
        } catch (error) {
            console.error("Error creating trend chart:", error);
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

        console.log("Loading category pie chart from API:", apiUrl, apiParams);

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
                    console.log("Created new canvas for category pie chart");
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                console.error("Could not find or create category pie chart canvas");
                return;
            }

            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                console.error("Could not get 2D context for category pie chart");
                return;
            }

            // Check if data is valid
            if (!data || !data.labels || !data.values || data.labels.length === 0) {
                console.error("Invalid data for pie chart:", data);
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

            console.log("Drawing pie chart with data:", data);

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

            console.log("Pie chart created with data:", data);
        } catch (error) {
            console.error("Error creating pie chart:", error);
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

        console.log("Loading top categories from API:", apiUrl, apiParams);

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                drawTopCategoriesChart(data, topCategoriesType);
            },
            error: (xhr, status, error) => {
                console.error("Error loading top categories:", error);
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
                console.error("Could not find top categories chart canvas");
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
            console.error("Error creating top categories chart:", error);
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

        console.log("Using period for comparison chart:", period);

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

        console.log("Loading comparison chart from API:", apiUrl, apiParams);

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                console.log("Comparison chart data received:", data);

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
                console.error("Error loading comparison chart:", error);
                console.error("Error details:", xhr.responseText);

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
                    console.log("Created new canvas for comparison chart");
                }
            }

            // Ensure we have a canvas context
            if (!canvas || canvas.length === 0) {
                console.error("Could not find or create comparison chart canvas");
                return;
            }

            const ctx = canvas[0].getContext("2d");
            if (!ctx) {
                console.error("Could not get 2D context for comparison chart");
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

            console.log("Drawing comparison chart with data:", data);

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
            console.error("Error creating comparison chart:", error);
            // Show error message
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
        console.log("Document ready, initializing charts...");

        // Add insight-page class to the main container for better styling
        $(".container:first").addClass("insight-page");

        // Add classes to summary cards for custom styling
        $("#totalIncome").closest(".card").addClass("summary-card income-card");
        $("#totalExpenses").closest(".card").addClass("summary-card expense-card");
        $("#netBalance").closest(".card").addClass("summary-card balance-card");
        $("#topCategoryName").closest(".card").addClass("summary-card");

        // Add summary-value class to the values
        $("#totalIncome, #totalExpenses, #netBalance").addClass("summary-value");

        // Fix CSS layout issues
        fixLayoutIssues();

        // Initialize UI and chart elements
        initializeUI();

        // Add debugging functionality
        //addDebugButton();

        // Load data
        loadAllData();
    });

    // Function to fix layout issues
    function fixLayoutIssues() {
        // Add CSS fixes
        $("<style>")
            .prop("type", "text/css")
            .html(
                `
                /* Fix shared user selector layout */
                .shared-user-selector {
                    flex-shrink: 0;
                    min-width: 350px;
                    background: #f8f9fa;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid #e9ecef;
                    margin-right: 10px;
                    margin-bottom: 10px;
                    height: auto !important;
                }
                
                /* Fix for "view data from" text */
                .shared-user-selector label {
                    white-space: nowrap;
                    margin-right: 8px;
                    margin-bottom: 0;
                    min-width: 95px;
                }
                
                /* Improved shared selector button styles */
                .shared-user-selector .btn-sm {
                    min-width: 60px;
                    height: 31px;
                    vertical-align: middle;
                }
                
                /* Make sure the select doesn't cause layout shifts */
                .shared-user-selector select {
                    min-width: 150px;
                    width: auto;
                    flex-grow: 1;
                }
                
                /* Ensure the shared selector has consistent height */
                .shared-user-selector .d-flex.align-items-center {
                    height: 31px;
                }
                
                /* Fix date range selector to maintain height even when empty */
                .date-range-selector {
                    flex-grow: 1;
                    min-height: 38px;
                    width: 100%;
                    position: relative;
                    padding-bottom: 45px; /* Reserve space for custom date range */
                }
                
                .period-selector-container {
                    width: 100%;
                }
                
                .period-selector {
                    white-space: nowrap;
                    display: flex;
                    flex-wrap: nowrap !important;
                    overflow-x: auto;
                    max-width: 100%;
                    margin-bottom: 5px;
                }
                
                .period-selector .btn {
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                
                /* Custom date range styles */
                .custom-date-range {
                    position: absolute;
                    top: 40px;
                    left: 0;
                    right: 0;
                }
                
                .custom-date-range.show {
                    display: flex !important; /* Only display when show class is added */
                    flex-wrap: nowrap;
                }
                
                .custom-date-range input[type="date"] {
                    min-width: 130px;
                }
                
                .custom-date-range .btn {
                    height: 31px;
                    min-width: 70px;
                }
                
                /* Ensure buttons don't wrap on small screens */
                @media (max-width: 768px) {
                    .date-range-selector {
                        width: 100%;
                    }
                    
                    .shared-user-selector label {
                        min-width: 80px;
                    }
                    
                    .data-source-selector,
                    .shared-user-selector,
                    .export-options {
                        width: 100%;
                        margin-bottom: 10px;
                    }
                    
                    .d-flex.flex-wrap.justify-content-between {
                        flex-direction: column;
                    }
                }

                /* Improved layout for consistency */
                .d-flex.flex-wrap.justify-content-between {
                    align-items: flex-start !important;
                }

                /* Fix flex layout issues */
                .d-flex.flex-wrap.align-items-center {
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    width: 100%;
                }
            `
            )
            .appendTo("head");

        // Add back button to shared user selector
        if ($("#backToMyData").length === 0) {
            $(".shared-user-selector .d-flex").append(
                $("<button>")
                    .attr("id", "backToMyData")
                    .addClass("btn btn-sm btn-outline-secondary ms-2")
                    .html('<i class="fas fa-arrow-left me-1"></i> Back')
                    .on("click", function () {
                        $(".data-source-selector .btn").removeClass("active");
                        $('.data-source-selector .btn[data-source="my-data"]').addClass("active");
                        currentDataSource = "my-data";
                        selectedSharerId = null;
                        $(".shared-user-selector").hide();
                        loadAllData();
                    })
            );
        }

        // Restructure the date selector layout for better consistency
        setTimeout(() => {
            // Wrap period selector in a container if needed
            if ($(".period-selector-container").length === 0) {
                $(".period-selector").wrap('<div class="period-selector-container"></div>');
            }

            // Ensure consistent display across shared/non-shared modes
            $(".d-flex.flex-wrap.align-items-center").css({
                display: "flex",
                "flex-wrap": "nowrap",
                "overflow-x": "auto",
                width: "100%",
            });
        }, 0);

        // Change handling of "Custom" button click
        $('.period-selector .btn[data-period="custom"]')
            .off("click")
            .on("click", function () {
                $(".period-selector .btn").removeClass("active");
                $(this).addClass("active");

                // Use show class to control display
                $(".custom-date-range").addClass("show");
            });

        // Change handling of other period buttons
        $('.period-selector .btn:not([data-period="custom"])')
            .off("click")
            .on("click", function () {
                $(".period-selector .btn").removeClass("active");
                $(this).addClass("active");

                // Remove show class to hide
                $(".custom-date-range").removeClass("show");

                let startDate, endDate;
                const today = new Date();
                const period = $(this).data("period");

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

                // Set input field values
                $("#startDate").val(formatDateForInput(startDate));
                $("#endDate").val(formatDateForInput(endDate));

                // Show loading indicator
                $(".chart-container").html('<div class="loading-indicator">Loading data...</div>');

                // Log the date range for debugging
                console.log(
                    "Date range set to:",
                    formatDateForInput(startDate),
                    "to",
                    formatDateForInput(endDate)
                );

                // Load all data with the new date range
                setTimeout(() => loadAllData(), 100);
            });
    }

    // Initialize all charts and UI elements
    function initializeUI() {
        console.log("Initializing UI and charts");

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

        // Add CSS fixes
        addUIStyleFixes();
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

        // Apply common chart styles
        $(".chart-container").css({
            "background-color": "#ffffff",
            "border-radius": "8px",
            overflow: "hidden",
            width: "100%",
            "min-height": "250px",
        });

        // Make all chart canvases resize properly
        $("canvas.chart-container").css({
            width: "100%",
            height: "100%",
        });

        console.log("Chart containers initialized with canvas elements");
    }

    // Helper function to ensure each chart container has a canvas element
    function createCanvasIfNeeded(containerId) {
        const container = $("#" + containerId);

        // If the container is a div and doesn't contain a canvas, replace it with a canvas
        if (container.is("div") && container.find("canvas").length === 0) {
            const canvas = $("<canvas>").attr("id", containerId + "Canvas");
            container.empty().append(canvas);
            console.log("Created canvas element for " + containerId);
        }
    }

    // Add CSS for chart error messages
    $("<style>")
        .prop("type", "text/css")
        .html(
            `
            .chart-error {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                color: #6c757d;
                text-align: center;
                font-style: italic;
                padding: 20px;
            }
        `
        )
        .appendTo("head");

    // Add loading indicator CSS
    $("<style>")
        .prop("type", "text/css")
        .html(
            `
            .loading-indicator {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                color: #6c757d;
                text-align: center;
                padding: 20px;
            }
            .loading-indicator:after {
                content: '';
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #3498db;
                border-radius: 50%;
                margin-left: 10px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `
        )
        .appendTo("head");

    // Display notification to users
    function showNotification(message, type = "info") {
        // Remove existing notifications
        $(".notification").remove();

        // Create notification element
        const notification = $("<div>")
            .addClass("notification")
            .addClass(`notification-${type}`)
            .text(message);

        // Add close button
        const closeBtn = $("<button>")
            .addClass("notification-close")
            .html("&times;")
            .on("click", function () {
                $(this)
                    .parent()
                    .fadeOut(300, function () {
                        $(this).remove();
                    });
            });

        notification.append(closeBtn);

        // Add to document and animate
        $("body").append(notification);
        notification.fadeIn(300);

        // Auto remove after 5 seconds
        setTimeout(function () {
            notification.fadeOut(300, function () {
                $(this).remove();
            });
        }, 5000);
    }

    // Add CSS for notifications
    $("<style>")
        .html(
            `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            display: none;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            max-width: 350px;
        }
        .notification-info {
            background-color: #cce5ff;
            color: #004085;
            border: 1px solid #b8daff;
        }
        .notification-error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .notification-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .notification-close {
            background: transparent;
            border: none;
            float: right;
            font-size: 20px;
            line-height: 1;
            font-weight: 700;
            color: inherit;
            opacity: 0.7;
            cursor: pointer;
            padding: 0 0 0 10px;
            margin-left: 10px;
        }
        .notification-close:hover {
            opacity: 1;
        }
    `
        )
        .appendTo("head");

    // Add debug function to check API response data
    function addDebugButton() {
        // Add a hidden debug button
        $("<button>")
            .attr("id", "debugApiButton")
            .text("Debug API")
            .css({
                position: "fixed",
                bottom: "10px",
                right: "10px",
                "z-index": "9999",
                background: "#f8f9fa",
                border: "1px solid #ddd",
                padding: "5px 10px",
                "border-radius": "4px",
                "font-size": "12px",
                opacity: "0.7",
            })
            .on("click", function () {
                debugApiCalls();
            })
            .appendTo("body");
    }

    function debugApiCalls() {
        // Get current settings
        const filters = getFilterSettings();
        const debug = {
            currentSettings: filters,
            apiTests: {},
        };

        // Test main API calls
        const apiEndpoints = [
            { name: "summary", url: "/api/insights/summary" },
            { name: "income-summary", url: "/api/income-summary" },
            { name: "income-expense-comparison", url: "/api/income-expense-comparison" },
            { name: "top-categories", url: "/api/insights/top-categories" },
            { name: "top-income-categories", url: "/api/insights/top-income-categories" },
            { name: "shared-summary", url: "/api/shared-insights/summary" },
            { name: "shared-summary-all", url: "/api/shared-insights/summary-all" },
            { name: "shared-comparison", url: "/api/shared-insights/comparison" },
            { name: "shared-comparison-all", url: "/api/shared-insights/comparison-all" },
            { name: "shared-top-categories", url: "/api/shared-insights/top-categories" },
            { name: "shared-top-categories-all", url: "/api/shared-insights/top-categories-all" },
        ];

        let promises = [];

        // For shared-data mode, test different parameter combinations
        if (currentDataSource === "shared-data" && selectedSharerId) {
            const testParams = [
                { startDate: filters.startDate, endDate: filters.endDate },
                { startDate: filters.startDate, endDate: filters.endDate, count_all: true },
                { startDate: filters.startDate, endDate: filters.endDate, include_merged: true },
                {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    count_all: true,
                    include_merged: true,
                },
                {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    count_all: true,
                    include_merged: true,
                    deduplicate: true,
                },
                {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    count_all: true,
                    include_merged: true,
                    process_all_items: true,
                },
            ];

            // If specific user, add sharer_id parameter
            if (selectedSharerId !== "all") {
                testParams.forEach((param) => (param.sharer_id = selectedSharerId));
            }

            // Test each API endpoint with each parameter combination
            apiEndpoints.forEach((endpoint) => {
                if (endpoint.url.includes("shared-insights")) {
                    testParams.forEach((params, index) => {
                        const testKey = `${endpoint.name}_params${index}`;
                        const promise = $.ajax({
                            url: endpoint.url,
                            method: "GET",
                            data: params,
                            dataType: "json",
                        })
                            .done((data) => {
                                debug.apiTests[testKey] = {
                                    params: params,
                                    response: data,
                                    dataCount: calculateDataCount(data),
                                };
                            })
                            .fail((error) => {
                                debug.apiTests[testKey] = {
                                    params: params,
                                    error: error.statusText,
                                };
                            });
                        promises.push(promise);
                    });
                }
            });
        }

        // Add specific test for analyzing shared data structure
        if (currentDataSource === "shared-data" && selectedSharerId) {
            // Special test for getting raw shared data structure
            const promise = $.ajax({
                url: "/api/shared-insights/raw-data",
                method: "GET",
                data: {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    sharer_id: selectedSharerId === "all" ? undefined : selectedSharerId,
                },
                dataType: "json",
            })
                .done((data) => {
                    debug.rawSharedData = {
                        count: data.length,
                        firstItems: data.slice(0, 5),
                        sharers: [...new Set(data.map((item) => item.sharer_id))],
                        itemsBySharer: {},
                    };

                    // Group items by sharer
                    const sharerMap = {};
                    data.forEach((item) => {
                        if (!sharerMap[item.sharer_id]) {
                            sharerMap[item.sharer_id] = [];
                        }
                        sharerMap[item.sharer_id].push(item);
                    });

                    // Add summary for each sharer
                    Object.keys(sharerMap).forEach((sharerId) => {
                        debug.rawSharedData.itemsBySharer[sharerId] = {
                            count: sharerMap[sharerId].length,
                            sample: sharerMap[sharerId][0],
                        };
                    });
                })
                .fail((error) => {
                    debug.rawSharedData = {
                        error: error.statusText,
                    };
                });
            promises.push(promise);
        }

        // Wait for all API calls to complete
        $.when.apply($, promises).always(() => {
            console.log("===== API DEBUG RESULTS =====");
            console.log(JSON.stringify(debug, null, 2));
            alert("API debugging complete. Check console for results.");
        });
    }

    // Calculate the number of records in API response data
    function calculateDataCount(data) {
        const counts = {};

        if (!data) return { error: "No data" };

        // Calculate expense totals
        if (data.expense) {
            if (data.expense.totalAmount) counts.expenseTotal = data.expense.totalAmount;
            if (data.expense.categoryDistribution && data.expense.categoryDistribution.values) {
                counts.expenseCategoryCount = data.expense.categoryDistribution.values.length;
                counts.expenseCategorySum = data.expense.categoryDistribution.values.reduce(
                    (sum, val) => sum + val,
                    0
                );
            }
        }

        // Calculate income totals
        if (data.income) {
            if (data.income.totalAmount) counts.incomeTotal = data.income.totalAmount;
            if (data.income.categoryDistribution && data.income.categoryDistribution.values) {
                counts.incomeCategoryCount = data.income.categoryDistribution.values.length;
                counts.incomeCategorySum = data.income.categoryDistribution.values.reduce(
                    (sum, val) => sum + val,
                    0
                );
            }
        }

        // Calculate pie chart data
        if (data.categoryDistribution) {
            counts.categoryCount = data.categoryDistribution.labels
                ? data.categoryDistribution.labels.length
                : 0;
            counts.categorySum = data.categoryDistribution.values
                ? data.categoryDistribution.values.reduce((sum, val) => sum + val, 0)
                : 0;
        }

        // Calculate trend chart data
        if (data.labels) {
            counts.dataPointCount = data.labels.length;
            counts.incomeSum = data.income ? data.income.reduce((sum, val) => sum + val, 0) : 0;
            counts.expenseSum = data.expense ? data.expense.reduce((sum, val) => sum + val, 0) : 0;
        }

        // Calculate totalAmount
        if (data.totalAmount) {
            counts.totalAmount = data.totalAmount;
        }

        // Calculate values list
        if (data.values) {
            counts.valuesCount = data.values.length;
            counts.valuesSum = data.values.reduce((sum, val) => sum + val, 0);
        }

        return counts;
    }

    // Function to clear all data displays
    function clearAllDataDisplays() {
        // Clear summary cards
        $("#totalIncome").text("$0.00");
        $("#totalExpenses").text("$0.00");
        $("#netBalance").text("$0.00");
        $("#topCategoryName").text("Select a user");
        $("#topCategoryAmount").text("$0.00");
        $("#categoryPercentage").text("0% of total");
        $("#averageDailyIncome").text("$0.00");
        $("#averageDailyExpense").text("$0.00");

        // Destroy all charts
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
    }

    // Clear all charts
    function clearCharts() {
        // Destroy existing chart instances
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

        // Re-initialize chart containers
        initChartContainers();
    }

    window.debugInsights = function () {
        console.log("===== INSIGHTS DEBUG =====");
        console.log("Current data source:", currentDataSource);
        console.log("Selected sharer ID:", selectedSharerId);
        console.log("Filter settings:", getFilterSettings());
        console.log("Charts:", {
            trendChart,
            pieChart,
            topCategoriesChart,
            monthlyComparisonChart,
        });

        console.log("Chart containers:");
        console.log(
            "trendChart container:",
            $("#trendChart").length ? "exists" : "missing",
            $("#trendChart").width(),
            "x",
            $("#trendChart").height()
        );
        console.log(
            "categoryPieChart container:",
            $("#categoryPieChart").length ? "exists" : "missing",
            $("#categoryPieChart").width(),
            "x",
            $("#categoryPieChart").height()
        );
        console.log(
            "topCategoriesChart container:",
            $("#topCategoriesChart").length ? "exists" : "missing",
            $("#topCategoriesChart").width(),
            "x",
            $("#topCategoriesChart").height()
        );
        console.log(
            "monthlyComparisonChart container:",
            $("#monthlyComparisonChart").length ? "exists" : "missing",
            $("#monthlyComparisonChart").width(),
            "x",
            $("#monthlyComparisonChart").height()
        );

        return "Debug info logged to console";
    };

    // Add a more detailed debug function for shared data issues
    window.debugSharedData = function () {
        console.log("===== SHARED DATA DEBUG =====");
        console.log("Current data source:", currentDataSource);
        console.log("Selected sharer ID:", selectedSharerId);

        if (currentDataSource !== "shared-data") {
            console.log(
                'Not in shared data mode. Switch to "Shared With Me" to debug shared data.'
            );
            return "Not in shared data mode";
        }

        // Get current filter settings
        const filters = getFilterSettings();

        // Create a special debug log
        const enhancedParams = enhanceAPIParams(
            {
                startDate: filters.startDate,
                endDate: filters.endDate,
            },
            true,
            selectedSharerId
        );

        console.log("Enhanced API params that will be used:", enhancedParams);

        // Make API calls to test shared data processing
        const apiEndpoints = [
            { name: "summary-all", url: "/api/shared-insights/summary-all" },
            { name: "comparison-all", url: "/api/shared-insights/comparison-all" },
        ];

        const results = {};
        let pendingCalls = apiEndpoints.length;

        // Show loading indicator
        alert("Debugging shared data. Please wait...");

        apiEndpoints.forEach((endpoint) => {
            $.ajax({
                url: endpoint.url,
                method: "GET",
                data: enhancedParams,
                dataType: "json",
                success: (data) => {
                    results[endpoint.name] = {
                        data: data,
                        counts: calculateDataCount(data),
                    };
                    pendingCalls--;
                    if (pendingCalls === 0) {
                        console.log("Shared data debug results:", results);
                        alert("Shared data debug complete. Check console for results.");
                    }
                },
                error: (xhr) => {
                    results[endpoint.name] = {
                        error: xhr.responseText || xhr.statusText,
                    };
                    pendingCalls--;
                    if (pendingCalls === 0) {
                        console.log("Shared data debug results (with errors):", results);
                        alert("Shared data debug complete with errors. Check console for results.");
                    }
                },
            });
        });

        return "Debugging shared data...";
    };

    // Add a debug function for date handling issues
    window.debugDates = function () {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Test different date scenarios
        const dateTests = {
            "Today raw": today,
            "Today formatted": formatDateForInput(today),
            "Today with time 23:59:59": new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                23,
                59,
                59
            ),
            "Today with time 23:59:59 formatted": formatDateForInput(
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
            ),
            "First day of month": firstDayOfMonth,
            "First day of month formatted": formatDateForInput(firstDayOfMonth),
            "Current filter start date": $("#startDate").val(),
            "Current filter end date": $("#endDate").val(),
            "Current data source": currentDataSource,
            "Selected sharer ID": selectedSharerId,
        };

        console.log("===== DATE DEBUG INFO =====");
        console.table(dateTests);

        // Check if the backend is receiving the correct date range
        const filters = getFilterSettings();
        console.log("Current filter settings being sent to backend:", filters);

        return "Date debug info logged to console";
    };

    // Load trend chart
    function loadTrendChart() {
        const filters = getFilterSettings();
        const period = $(".chart-period-selector .btn.active").data("trend-period") || "daily";

        console.log("Loading trend chart with period:", period);

        // We'll use the daily data endpoint for all periods, then aggregate in JavaScript
        // This avoids database-specific functions
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

        console.log("Loading trend chart from API:", apiUrl, apiParams);

        $.ajax({
            url: apiUrl,
            method: "GET",
            data: apiParams,
            dataType: "json",
            success: (data) => {
                console.log("Trend chart data received:", data);

                // If we need to aggregate by period (weekly or monthly), do it here
                if (period === "weekly" || period === "monthly") {
                    data = aggregateDataByPeriod(data, period);
                }

                drawTrendChart(data, period);
            },
            error: (xhr, status, error) => {
                console.error("Error loading trend chart:", error);
                console.error("Error details:", xhr.responseText);

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

        console.log("Aggregated data:", result);
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
