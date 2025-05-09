$(document).ready(() => {
    const today = new Date().toISOString().split('T')[0];
    $('#startDate').val(today);
    $('#endDate').val(today);
    $('#startDate, #endDate').attr('max', today);

    $('#startDate').on('change', function () {
        $('#endDate').attr('min', $(this).val());
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
                drawYoYChart(data, startDate, endDate);
                drawMoMChart(data, startDate, endDate);
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

    const drawYoYChart = (currentData, startDate, endDate) => {
        const lastYearStart = new Date(startDate);
        const lastYearEnd = new Date(endDate);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

        const formatDate = date => date.toISOString().split('T')[0];

        $.ajax({
            url: '/api/insights',
            method: 'GET',
            data: {
                startDate: formatDate(lastYearStart),
                endDate: formatDate(lastYearEnd)
            },
            dataType: 'json',
            success: (lastYearData) => {
                const currentX = currentData.date.labels.map(formatToMonthDay);
                const currentY = currentData.date.values;

                const lastYearX = lastYearData.date.labels.map(formatToMonthDay);
                const lastYearY = lastYearData.date.values;

                const traces = [
                    {
                        x: currentX,
                        y: currentY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'This Year',
                        line: { color: 'blue' }
                    },
                    {
                        x: lastYearX,
                        y: lastYearY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Last Year',
                        line: { color: 'gray', dash: 'dot' }
                    }
                ];

                const layout = {
                    title: 'Year-over-Year Comparison',
                    xaxis: { title: 'Date (MM-DD)', tickformat: '%b %d' },
                    yaxis: { title: 'Amount ($)' },
                    margin: { t: 80, l: 60, r: 30, b: 50 }
                };

                Plotly.react($('#yoyChart')[0], traces, layout);
            },
            error: (xhr, status, err) => {
                console.error('Error fetching YoY data:', err);
            }
        });
    };



    const drawMoMChart = (currentData, startDate, endDate) => {
        const thisStart = new Date(startDate);
        const thisEnd = new Date(endDate);

        const lastMonthStart = new Date(thisStart);
        lastMonthStart.setMonth(thisStart.getMonth() - 1);

        const lastMonthEnd = new Date(thisEnd);
        lastMonthEnd.setMonth(thisEnd.getMonth() - 1);

        const formatDate = date => date.toISOString().split('T')[0];

        $.ajax({
            url: '/api/insights',
            method: 'GET',
            data: {
                startDate: formatDate(lastMonthStart),
                endDate: formatDate(lastMonthEnd)
            },
            dataType: 'json',
            success: (lastMonthData) => {
                const currentX = currentData.date.labels.map(formatToMonthDay);
                const currentY = currentData.date.values;

                const lastMonthX = lastMonthData.date.labels.map(formatToMonthDay);
                const lastMonthY = lastMonthData.date.values;

                const traces = [
                    {
                        x: currentX,
                        y: currentY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'This Month',
                        line: { color: 'green' }
                    },
                    {
                        x: lastMonthX,
                        y: lastMonthY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Last Month',
                        line: { color: 'orange', dash: 'dot' }
                    }
                ];

                const layout = {
                    title: 'Month-over-Month Comparison',
                    xaxis: { title: 'Date (MM-DD)', tickformat: '%b %d' },
                    yaxis: { title: 'Amount ($)' },
                    margin: { t: 80, l: 60, r: 30, b: 50 }
                };

                Plotly.react($('#momChart')[0], traces, layout);
            },
            error: (xhr, status, err) => {
                console.error('Error fetching MoM data:', err);
            }
        });
    };


    const formatToMonthDay = (dateStr) => {
        const d = new Date(dateStr);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}-${day}`;
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
