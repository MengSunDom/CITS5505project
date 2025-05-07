document.addEventListener("DOMContentLoaded", () => {
    const timeSpanSelect = document.getElementById("timeSpan");
    const insightChartContainer = document.getElementById("insightChart");
    const totalEntriesElement = document.getElementById("totalEntries");
    const totalAmountElement = document.getElementById("totalAmount");
    const categoryDistributionList = document.getElementById("categoryDistributionList");

    const fetchSummaryData = async (days) => {
        try {
            const response = await fetch(`/api/insights/summary?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Update total entries and total amount with animation
            totalEntriesElement.textContent = data.totalEntries;
            totalAmountElement.textContent = data.totalAmount.toFixed(2);

            // Render category distribution with animation
            categoryDistributionList.innerHTML = "";
            const total = data.categoryDistribution.values.reduce((a, b) => a + b, 0);
            data.categoryDistribution.labels.forEach((label, index) => {
                const value = data.categoryDistribution.values[index];
                const percentage = ((value / total) * 100).toFixed(2);

                const item = document.createElement("div");
                item.classList.add("distribution-item");

                const labelContainer = document.createElement("div");
                labelContainer.classList.add("distribution-label-container");

                const labelElement = document.createElement("div");
                labelElement.classList.add("distribution-label");
                labelElement.textContent = label;

                const percentageElement = document.createElement("div");
                percentageElement.classList.add("distribution-percentage");
                percentageElement.textContent = `${percentage}%`;

                labelContainer.appendChild(labelElement);
                labelContainer.appendChild(percentageElement);

                const barContainer = document.createElement("div");
                barContainer.classList.add("distribution-bar-container");

                const bar = document.createElement("div");
                bar.classList.add("distribution-bar");
                bar.style.width = "0"; // Start with 0 width for animation
                setTimeout(() => {
                    bar.style.width = `${percentage}%`; // Animate to target width
                }, 100);

                barContainer.appendChild(bar);
                item.appendChild(labelContainer);
                item.appendChild(barContainer);

                categoryDistributionList.appendChild(item);
            });
        } catch (error) {
            console.error("Error fetching summary data:", error);
        }
    };

    const fetchAndRenderChart = async (days) => {
        try {
            const response = await fetch(`/api/insights?days=${days}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            console.log("Fetched data:", data);

            const trace = {
                x: data.labels,
                y: data.values,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: 'blue' },
                line: { shape: 'linear' },
            };

            const layout = {
                title: 'Expense Trend',
                xaxis: { title: 'Date' },
                yaxis: { title: 'Amount' },
                margin: { t: 40, l: 50, r: 30, b: 50 },
                transition: {
                    duration: 500, // Add transition duration for smooth updates
                    easing: 'cubic-in-out',
                },
            };

            Plotly.react(insightChartContainer, [trace], layout); // Use Plotly.react for smooth updates
        } catch (error) {
            console.error("Error fetching insights data:", error);
        }
    };

    const updateData = () => {
        const days = timeSpanSelect.value;
        fetchSummaryData(days);
        fetchAndRenderChart(days);
    };

    timeSpanSelect.addEventListener("change", updateData);

    // Initial load
    updateData();
});
