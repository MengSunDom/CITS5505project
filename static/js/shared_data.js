document.addEventListener("DOMContentLoaded", () => {
    fetchSharedByMeExpenses();
    fetchSharedWithMeExpenses();
});

function fetchSharedByMeExpenses() {
    fetch('/api/share/by-me')
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
    fetch('/api/share/with-me')
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
    const tbody = document.getElementById('sharedByMeTableBody');
    tbody.innerHTML = '';

    expenses.forEach(expense => {
        if (expense.is_bulk) {
            // Create main row for bulk share
            const mainRow = document.createElement('tr');
            mainRow.className = 'bulk-share-row';
            mainRow.innerHTML = `
                <td>
                    <button class="btn btn-link btn-sm toggle-details" onclick="toggleBulkDetails(this)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <span>${expense.expense_count} expenses</span>
                </td>
                <td>${expense.shared_with}</td>
                <td>${expense.categories.join(', ')}</td>
                <td>$${expense.total_amount.toFixed(2)}</td>
                <td>${expense.date}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="cancelShare(${expense.shared_id})">
                        Cancel Share
                    </button>
                </td>
            `;
            tbody.appendChild(mainRow);

            // Create details row
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'bulk-details-row';
            detailsRow.style.display = 'none';
            detailsRow.innerHTML = `
                <td colspan="6">
                    <div class="bulk-details-content">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expense.details.map(detail => `
                                    <tr>
                                        <td>${detail.date}</td>
                                        <td>${detail.category}</td>
                                        <td>${detail.description}</td>
                                        <td>$${detail.amount.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsRow);
        } else {
            // Single expense share
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${expense.description}</td>
                <td>${expense.shared_with}</td>
                <td>${expense.category}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>${expense.date}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="cancelShare(${expense.shared_id})">
                        Cancel Share
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
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
    if (!confirm("Are you sure you want to cancel this shared expense?")) {
        return;
    }

    fetch('/api/share/cancel', {
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
            fetchSharedByMeExpenses();
            fetchSharedWithMeExpenses();
        })
        .catch(error => console.error(error));
}

function toggleBulkDetails(button) {
    const row = button.closest('tr');
    const detailsRow = row.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    } else {
        detailsRow.style.display = 'none';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    }
}

function cancelShare(sharedId) {
    if (confirm('Are you sure you want to cancel this share?')) {
        fetch('/api/share/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shared_id: sharedId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadSharedData();
            } else {
                alert(data.error || 'Failed to cancel share');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to cancel share');
        });
    }
}