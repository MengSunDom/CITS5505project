document.addEventListener("DOMContentLoaded", () => {
    console.log("Shared Data page loaded.");
    fetchSharedByMeExpenses();
    fetchSharedWithMeExpenses();
});

function fetchSharedByMeExpenses() {
    fetch('/api/shared-expenses/by-me')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch shared by me expenses');
            }
            return response.json();
        })
        .then(data => populateSharedByMeTable(data))
        .catch(error => console.error('Error:', error));
}

function fetchSharedWithMeExpenses() {
    fetch('/api/shared-expenses/with-me')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch shared with me expenses');
            }
            return response.json();
        })
        .then(data => populateSharedWithMeTable(data))
        .catch(error => console.error('Error:', error));
}

function populateSharedByMeTable(expenses) {
    const tableBody = document.getElementById('sharedByMeTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expense.shared_with}</td>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>${expense.description}</td>
            <td>${expense.amount.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-danger cancel-share-btn" onclick="cancelSharedExpense(${expense.shared_id})">
                    Cancel Share
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function populateSharedWithMeTable(expenses) {
    const tableBody = document.getElementById('sharedWithMeTableBody');
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
                <button class="btn btn-sm btn-danger cancel-share-btn" onclick="cancelSharedExpense(${expense.shared_id})">
                    Cancel Share
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function cancelSharedExpense(sharedExpenseId) {
    fetch('/api/shared-expenses/cancel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: sharedExpenseId }),
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Unknown error occurred');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            fetchSharedByMeExpenses();
            fetchSharedWithMeExpenses();
        })
        .catch(error => console.error(error));
}