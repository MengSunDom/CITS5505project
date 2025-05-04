document.addEventListener("DOMContentLoaded", () => {
    console.log("Shared Data page loaded.");
    fetchSharedExpenses();
});

function fetchSharedExpenses() {
    fetch('/api/shared-expenses')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch shared expenses');
            }
            return response.json();
        })
        .then(data => populateExpenseTable(data))
        .catch(error => console.error('Error:', error));
}

function populateExpenseTable(expenses) {
    const tableBody = document.getElementById('expenseTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expense.shared_by}</td>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>${expense.description}</td>
            <td>${expense.amount.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-primary">View</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}