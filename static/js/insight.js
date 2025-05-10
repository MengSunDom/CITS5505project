$(document).ready(() => {
    const today = new Date().toISOString().split('T')[0];
    $('#startDate').val(today);
    $('#endDate').val(today);
    $('#startDate, #endDate').attr('max', today);

    $('#startDate').on('change', function () {
        $('#endDate').attr('min', $(this).val());
    }).trigger('change');

    $('#endDate').on('change', function () {
        $('#startDate').attr('max', $(this).val());
    }).trigger('change');

    const fetchSummaryData = (startDate, endDate) => {
        $.ajax({
            url: '/api/insights/summary',
            method: 'GET',
            data: { startDate, endDate },
            dataType: 'json',
            success: (data) => {
                $('#totalEntries').text(data.totalEntries);
                $('#totalAmount').text(data.totalAmount.toFixed(2));
                $('#averageAmount').text((data.totalAmount / data.totalEntries || 0).toFixed(2));

                const $list = $('#categoryDistributionList').empty();
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
                                <div class="distribution-bar" style="width: 0;"></div>
                            </div>
                        </div>
                    `);
                    $list.append($item);
                    setTimeout(() => {
                        $item.find('.distribution-bar').css('width', `${percentage}%`);
                    }, 100);
                });
            },
            error: (xhr, status, error) => {
                console.error('Error fetching summary data:', error);
            }
        });
    };

    const fetchAndRenderChart = (startDate, endDate) => {
        $.ajax({
            url: '/api/insights',
            method: 'GET',
            data: { startDate, endDate },
            dataType: 'json',
            success: (data) => {
                drawPieChart(data);
                drawLineChart(data);
                drawYoYChart(startDate, endDate);
                drawMoMChart(startDate, endDate);
            },
            error: (xhr, status, error) => {
                console.error('Error fetching insights data:', error);
            }
        });
    };

    const drawPieChart = (data) => {
        const traces = [{
            values: data.category.values,
            labels: data.category.labels,
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            marker: { colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'] }
        }];
        const layout = {
            title: 'Category Distribution',
            margin: { t: 100, l: 50, r: 30, b: 50 }
        };
        Plotly.react($('#pieChart')[0], traces, layout);
    };

    const drawLineChart = (data) => {
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();
        let traces = [], layout = {};

        if (startDate === endDate) {
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
                xaxis: { title: 'Date', tickformat: '%b %d, %Y' },
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
                xaxis: { title: 'Date', type: 'date', tickformat: '%b %d, %Y' },
                yaxis: { title: 'Amount', type: 'linear' },
                margin: { t: 100, l: 70, r: 30, b: 50 }
            };
        }
        Plotly.react($('#lineChart')[0], traces, layout);
    };

    const drawYoYChart = (startDate, endDate) => {
        const thisYear = new Date(startDate).getFullYear();
        const lastYear = thisYear - 1;

        const formatDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const thisYearStart = formatDate(thisYear, 1, 1);
        const thisYearEnd = formatDate(thisYear, 12, 31);
        const lastYearStart = formatDate(lastYear, 1, 1);
        const lastYearEnd = formatDate(lastYear, 12, 31);

        $.when(
            $.getJSON('/api/insights', { startDate: lastYearStart, endDate: lastYearEnd }),
            $.getJSON('/api/insights', { startDate: thisYearStart, endDate: thisYearEnd })
        ).done((lastRes, thisRes) => {
            const lastYearAmount = lastRes[0].totalAmount;
            const thisYearAmount = thisRes[0].totalAmount;

            const traces = [{
                x: [lastYear.toString(), thisYear.toString()],
                y: [lastYearAmount, thisYearAmount],
                type: 'bar',
                text: [lastYearAmount.toFixed(2), thisYearAmount.toFixed(2)],
                textposition: 'auto',
                marker: { color: ['gray', 'blue'] }
            }];

            const layout = {
                title: 'Year-over-Year Total Comparison',
                xaxis: { title: 'Year' },
                yaxis: { title: 'Amount ($)' },
                margin: { t: 80, l: 60, r: 30, b: 50 }
            };

            Plotly.react($('#yoyChart')[0], traces, layout);
        });
    };


    const drawMoMChart = (startDate, endDate) => {
        const start = new Date(startDate);
        const year = start.getFullYear();
        const month = start.getMonth() + 1;
        const lastMonthDate = new Date(start);
        lastMonthDate.setMonth(month - 2);

        const formatDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const thisMonthStart = formatDate(year, month, 1);
        const thisMonthEnd = formatDate(year, month + 1, 1);

        const lastMonthStart = formatDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 1);
        const lastMonthEnd = formatDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 2, 1);

        $.when(
            $.getJSON('/api/insights', { startDate: lastMonthStart, endDate: lastMonthEnd }),
            $.getJSON('/api/insights', { startDate: thisMonthStart, endDate: thisMonthEnd })
        ).done((lastRes, thisRes) => {
            const lastAmount = lastRes[0].totalAmount;
            const thisAmount = thisRes[0].totalAmount;

            const traces = [{
                x: ['Last Month', 'This Month'],
                y: [lastAmount, thisAmount],
                type: 'bar',
                text: [lastAmount.toFixed(2), thisAmount.toFixed(2)],
                textposition: 'auto',
                marker: { color: ['orange', 'green'] }
            }];

            const layout = {
                title: 'Month-over-Month Total Comparison',
                xaxis: { title: 'Month' },
                yaxis: { title: 'Amount ($)' },
                margin: { t: 80, l: 60, r: 30, b: 50 }
            };

            Plotly.react($('#momChart')[0], traces, layout);
        });
    };

    const updateData = () => {
        const start = $('#startDate').val();
        const end = $('#endDate').val();
        fetchSummaryData(start, end);
        fetchAndRenderChart(start, end);
    };

    $('#search').click(updateData);
    updateData(); // auto-load on page ready
});
