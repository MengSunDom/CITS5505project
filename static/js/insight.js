document.addEventListener('DOMContentLoaded', () => {
    // const timeSpanSelect = document.getElementById('timeSpan');
    const startDateSelect = document.getElementById('startDate');
    const endDateSelect = document.getElementById('endDate');
    const chartTypeSelect = document.getElementById('chartType');
    const expenseChartContainer = document.getElementById('expenseChart');
    const totalEntriesElement = document.getElementById('totalEntries');
    const totalAmountElement = document.getElementById('totalAmount');
    const averageAmountElement = document.getElementById('averageAmount');
    const categoryDistributionList = document.getElementById('categoryDistributionList');

    // time selector default value
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    const fetchSummaryData = async (startDate, endDate) => {
        try {
            const response = await fetch(`/api/insights/summary?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Update summary statistics
            totalEntriesElement.textContent = data.totalEntries;
            totalAmountElement.textContent = data.totalAmount.toFixed(2);
            averageAmountElement.textContent = (data.totalAmount / data.totalEntries || 0).toFixed(2);

            // Render category distribution
            categoryDistributionList.innerHTML = '';
            const total = data.categoryDistribution.values.reduce((a, b) => a + b, 0);
            data.categoryDistribution.labels.forEach((label, index) => {
                const value = data.categoryDistribution.values[index];
                const percentage = ((value / total) * 100).toFixed(2);

                const item = document.createElement('div');
                item.classList.add('distribution-item');

                const labelContainer = document.createElement('div');
                labelContainer.classList.add('distribution-label-container');

                const labelElement = document.createElement('div');
                labelElement.classList.add('distribution-label');
                labelElement.textContent = label;

                const percentageElement = document.createElement('div');
                percentageElement.classList.add('distribution-percentage');
                percentageElement.textContent = `${percentage}%`;

                labelContainer.appendChild(labelElement);
                labelContainer.appendChild(percentageElement);

                const barContainer = document.createElement('div');
                barContainer.classList.add('distribution-bar-container');

                const bar = document.createElement('div');
                bar.classList.add('distribution-bar');
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = `${percentage}%`;
                }, 100);

                barContainer.appendChild(bar);
                item.appendChild(labelContainer);
                item.appendChild(barContainer);

                categoryDistributionList.appendChild(item);
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
        }
    };

    let previousChartType = null;
    const fetchAndRenderChart = async (startDate, endDate) => {
        try {
            const response = await fetch(`/api/insights?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const chartType = chartTypeSelect.value;
            let traces = [];
            let layout = {};

            if (chartType === 'pie') {
                traces = [{
                    values: data.category.values,
                    labels: data.category.labels,
                    type: 'pie',
                    textinfo: 'label+percent',
                    insidetextorientation: 'radial',
                    marker: {
                        colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
                    }
                }];
                layout = {
                    title: 'Category Distribution',
                    margin: { t: 100, l: 50, r: 30, b: 50 }
                };
            } else if (chartType === 'bar') {
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
            } else if (chartType === 'line') {
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

            const isAnimated =
                previousChartType === chartType ||
                (['bar', 'line'].includes(previousChartType) && ['bar', 'line'].includes(chartType));

            if (isAnimated && chartType !== 'pie') {
                layout.transition = {
                    duration: 500,
                    easing: 'cubic-in-out'
                };
            }

            Plotly.react(expenseChartContainer, traces, layout);
            previousChartType = chartType;

        } catch (error) {
            console.error('Error fetching insights data:', error);
        }
    };


    const updateData = () => {
        const startDate = startDateSelect.value;
        const endDate = endDateSelect.value;
        fetchSummaryData(startDate, endDate);
        fetchAndRenderChart(startDate, endDate);
    };

    startDateSelect.addEventListener('change', updateData);
    endDateSelect.addEventListener('change', updateData);
    chartTypeSelect.addEventListener('change', updateData);

    // Initial load
    updateData();
});