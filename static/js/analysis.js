document.addEventListener('DOMContentLoaded', () => {
    const timeSpanSelect = document.getElementById('timeSpan');
    const chartTypeSelect = document.getElementById('chartType');
    const expenseChartContainer = document.getElementById('expenseChart');
    const totalEntriesElement = document.getElementById('totalEntries');
    const totalAmountElement = document.getElementById('totalAmount');
    const averageAmountElement = document.getElementById('averageAmount');
    const categoryDistributionList = document.getElementById('categoryDistributionList');

    const fetchSummaryData = async (days) => {
        try {
            const response = await fetch(`/api/insights/summary?days=${days}`);
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

    const fetchAndRenderChart = async (days) => {
        try {
            const response = await fetch(`/api/insights?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            const chartType = chartTypeSelect.value;
            let trace;

            if (chartType === 'pie') {
                trace = {
                    values: data.values,
                    labels: data.labels,
                    type: 'pie',
                    textinfo: 'label+percent',
                    insidetextorientation: 'radial',
                    marker: {
                        colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
                    }
                };
            } else if (chartType === 'bar') {
                trace = {
                    x: data.labels,
                    y: data.values,
                    type: 'bar',
                    marker: {
                        color: '#1f77b4'
                    }
                };
            } else {
                trace = {
                    x: data.labels,
                    y: data.values,
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: {
                        color: '#1f77b4',
                        size: 10
                    },
                    line: {
                        color: '#1f77b4',
                        width: 2
                    }
                };
            }

            const layout = {
                title: 'Expense Analysis by Category',
                xaxis: { 
                    title: 'Category',
                    tickangle: -45
                },
                yaxis: { 
                    title: 'Amount ($)',
                    tickprefix: '$'
                },
                margin: { t: 40, l: 50, r: 30, b: 100 },
                transition: {
                    duration: 500,
                    easing: 'cubic-in-out'
                }
            };

            Plotly.react(expenseChartContainer, [trace], layout);
        } catch (error) {
            console.error('Error fetching insights data:', error);
        }
    };

    const updateData = () => {
        const days = timeSpanSelect.value;
        fetchSummaryData(days);
        fetchAndRenderChart(days);
    };

    timeSpanSelect.addEventListener('change', updateData);
    chartTypeSelect.addEventListener('change', updateData);

    // Initial load
    updateData();
}); 