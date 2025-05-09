$(document).ready(() => {
    // Cache DOM elements using jQuery
    const $startDate = $('#startDate');
    const $endDate = $('#endDate');
    // const $expenseChart = $('#expenseChart');
    const $totalEntries = $('#totalEntries');
    const $totalAmount = $('#totalAmount');
    const $averageAmount = $('#averageAmount');
    const $categoryList = $('#categoryDistributionList');

    // Set current date as default value
    const today = new Date().toISOString().split('T')[0];
    $startDate.val(today);
    $endDate.val(today);

    // Fetch and update summary statistics
    const fetchSummaryData = async (startDate, endDate) => {
        try {
            const response = await fetch(`/api/insights/summary?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Update numeric summary
            $totalEntries.text(data.totalEntries);
            $totalAmount.text(data.totalAmount.toFixed(2));
            $averageAmount.text((data.totalAmount / data.totalEntries || 0).toFixed(2));

            // Clear and render new category distribution bars
            $categoryList.empty();
            const total = data.categoryDistribution.values.reduce((a, b) => a + b, 0);

            data.categoryDistribution.labels.forEach((label, i) => {
                const value = data.categoryDistribution.values[i];
                const percentage = ((value / total) * 100).toFixed(2);

                const $item = $(`
                    <div class="distribution-item">
                        <div class="distribution-label-container">
                            <div class="distribution-label">${label}</div>
                            <div class="distribution-percentage">${percentage}%</div>
                        </div>
                        <div class="distribution-bar-container">
                            <div class="distribution-bar" style="width: 0"></div>
                        </div>
                    </div>
                `);

                $categoryList.append($item);
                setTimeout(() => {
                    $item.find('.distribution-bar').css('width', `${percentage}%`);
                }, 100);
            });
        } catch (err) {
            console.error('Error fetching summary data:', err);
        }
    };

    let previousChartType = null;

    // Fetch and render chart (pie, bar, or line)
    const fetchAndRenderChart = async (startDate, endDate) => {
        try {
            const response = await fetch(`/api/insights?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            drawPieChart(data)
            drawLineChart(data)
            drawYoYChart(data)
            drawMoMChart(data)

        } catch (err) {
            console.error('Error fetching insights data:', err);
        }
    };
    const drawLineChart = (data) => {
        if ($startDate.val() == $endDate.val()) {
            const dates = Object.keys(data.date_category || {});
            const categories = Array.from(new Set(data.category.labels));

            traces = categories.map(category => ({
                x: dates,
                y: dates.map(date => data.date_category[date]?.[category] || 0),
                name: category,
                type: 'bar'
            }));

            layout = {
                title: 'Daily Category Breakdown',
                barmode: 'group',
                xaxis: { title: 'Date' },
                yaxis: { title: 'Amount ($)', tickprefix: '$' },
                margin: { t: 100, l: 70, r: 30, b: 50 }
            };
        } else {
            traces = [{
                x: data.date.labels,
                y: data.date.values,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: 'blue' },
                line: { shape: 'linear' }
            }];
            layout = {
                title: 'Expense Trend',
                xaxis: { title: 'Date', type: 'date' },
                yaxis: { title: 'Amount', type: 'linear' },
                margin: { t: 100, l: 70, r: 30, b: 50 }
            };
        }
        Plotly.react($('#lineChart')[0], traces, layout);
    }
    const drawPieChart = (data) => {
        traces = [{
            values: data.category.values,
            labels: data.category.labels,
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            marker: { colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'] }
        }];
        layout = {
            title: 'Category Distribution',
            margin: { t: 100, l: 50, r: 30, b: 50 }
        };
        Plotly.react($('#pieChart')[0], traces, layout);
    }
    const drawYoYChart = (data) => {

    }
    const drawMoMChart = (data) => {

    }

    // When the start date changes, the restriction end date cannot be less than the start date
    $('#startDate').on('change', function () {
        const startDate = $(this).val();
        $('#endDate').attr('min', startDate);
    });

    $('#startDate, #endDate').attr('max', today);
    $('#startDate').trigger('change');

    // Unified update function triggered by UI changes
    const updateData = () => {
        const startDate = $startDate.val();
        const endDate = $endDate.val();
        fetchSummaryData(startDate, endDate);
        fetchAndRenderChart(startDate, endDate);
    };

    // Bind event to search button
    $('#search').click(updateData);

    // Initial page load
    updateData();
});
