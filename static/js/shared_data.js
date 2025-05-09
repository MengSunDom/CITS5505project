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
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to fetch shared with me expenses');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Shared with me data:', data); // Debug log
            populateSharedWithMeTable(data);
        })
        .catch(error => {
            console.error('Error fetching shared with me expenses:', error);
            // Show error to user
            const tbody = document.getElementById('sharedWithMeTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Failed to load shared expenses: ${error.message}
                    </td>
                </tr>
            `;
        });
}

function populateSharedByMeTable(expenses) {
    const tbody = document.getElementById('sharedByMeTableBody');
    tbody.innerHTML = '';

    expenses.forEach(expense => {
        if (expense.is_bulk) {
            // Check if any details have is_repeat flag
            const hasRepeatedItems = expense.details.some(detail => detail.is_repeat);
            
            // Format categories for display
            const categories = expense.categories;
            const displayCategories = categories.length > 2 ? 
                `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more` : 
                categories.join(', ');
            
            // Create main row for bulk share
            const mainRow = document.createElement('tr');
            mainRow.innerHTML = `
                <td style="width: 5%">
                    <button class="btn btn-link p-0" onclick="toggleBulkDetails(${expense.id})">
                        <i class="fas fa-chevron-right" id="icon-${expense.id}"></i>
                    </button>
                </td>
                <td style="width: 25%">
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="me-2">${expense.expense_count} expenses</span>
                            ${hasRepeatedItems ? 
                                '<span class="badge bg-warning">Contains individually shared items</span>' : 
                                ''}
                        </div>
                        <small class="text-muted">Shared with: ${expense.shared_with}</small>
                    </div>
                </td>
                <td style="width: 20%">
                    <span class="categories-tooltip" 
                          data-bs-toggle="tooltip" 
                          data-bs-html="true"
                          data-bs-placement="top"
                          title="${categories.join('<br>')}">
                        ${displayCategories}
                    </span>
                </td>
                <td style="width: 15%">$${expense.total_amount.toFixed(2)}</td>
                <td style="width: 15%">${expense.date}</td>
                <td style="width: 20%">
                    <button class="btn btn-danger btn-sm" onclick="cancelShare(${expense.shared_id})">
                        <i class="fas fa-times"></i> Cancel Share
                    </button>
                </td>
            `;
            tbody.appendChild(mainRow);

            // Create details row
            const detailsRow = document.createElement('tr');
            detailsRow.id = `details-${expense.id}`;
            detailsRow.style.display = 'none';
            detailsRow.innerHTML = `
                <td colspan="6">
                    <div class="ms-4">
                        <table class="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th style="width: 20%">Date</th>
                                    <th style="width: 20%">Category</th>
                                    <th style="width: 30%">Description</th>
                                    <th style="width: 15%">Amount</th>
                                    <th style="width: 15%">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expense.details.map(detail => `
                                    <tr>
                                        <td>${detail.date}</td>
                                        <td>${detail.category}</td>
                                        <td>${detail.description}</td>
                                        <td>$${detail.amount.toFixed(2)}</td>
                                        <td>
                                            ${detail.is_repeat ? 
                                                '<span class="badge bg-warning">Already shared individually</span>' : 
                                                ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsRow);
        } else {
            // Create row for single expense share
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 5%"></td>
                <td style="width: 25%">
                    <div class="d-flex flex-column">
                        <div>${expense.description}</div>
                        <small class="text-muted">Shared with: ${expense.shared_with}</small>
                    </div>
                </td>
                <td style="width: 20%">${expense.category}</td>
                <td style="width: 15%">$${expense.amount.toFixed(2)}</td>
                <td style="width: 15%">${expense.date}</td>
                <td style="width: 20%">
                    <div class="d-flex align-items-center justify-content-between">
                        ${expense.is_repeat ? 
                            '<span class="badge bg-warning">Already shared</span>' : 
                            ''}
                        <button class="btn btn-danger btn-sm" onclick="cancelShare(${expense.shared_id})">
                            <i class="fas fa-times"></i> Cancel Share
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true
        });
    });
}

function populateSharedWithMeTable(expenses) {
    const tbody = document.getElementById('sharedWithMeTableBody');
    tbody.innerHTML = '';

    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    No expenses have been shared with you
                </td>
            </tr>
        `;
        return;
    }

    expenses.forEach(expense => {
        if (expense.is_bulk) {
            // Format categories for display
            const categories = expense.categories;
            const displayCategories = categories.length > 2 ? 
                `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more` : 
                categories.join(', ');
            
            // Create main row for bulk share
            const mainRow = document.createElement('tr');
            mainRow.innerHTML = `
                <td style="width: 5%">
                    <button class="btn btn-link p-0" onclick="toggleBulkDetails(${expense.id})">
                        <i class="fas fa-chevron-right" id="icon-${expense.id}"></i>
                    </button>
                </td>
                <td style="width: 25%">
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="me-2">${expense.expense_count} expenses</span>
                            ${expense.is_repeat ? 
                                '<span class="badge bg-warning">Contains individually shared items</span>' : 
                                ''}
                        </div>
                        <small class="text-muted">Shared by: ${expense.shared_by}</small>
                    </div>
                </td>
                <td style="width: 20%">
                    <span class="categories-tooltip" 
                          data-bs-toggle="tooltip" 
                          data-bs-html="true"
                          data-bs-placement="top"
                          title="${categories.join('<br>')}">
                        ${displayCategories}
                    </span>
                </td>
                <td style="width: 15%">$${expense.total_amount.toFixed(2)}</td>
                <td style="width: 15%">${expense.date}</td>
                <td style="width: 20%">
                    <button class="btn btn-danger btn-sm" onclick="cancelSharedExpense(${expense.shared_id})">
                        <i class="fas fa-times"></i> Cancel Share
                    </button>
                </td>
            `;
            tbody.appendChild(mainRow);

            // Create details row
            const detailsRow = document.createElement('tr');
            detailsRow.id = `details-${expense.id}`;
            detailsRow.style.display = 'none';
            detailsRow.innerHTML = `
                <td colspan="6">
                    <div class="ms-4">
                        <table class="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th style="width: 20%">Date</th>
                                    <th style="width: 20%">Category</th>
                                    <th style="width: 30%">Description</th>
                                    <th style="width: 15%">Amount</th>
                                    <th style="width: 15%">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expense.details.map(detail => `
                                    <tr>
                                        <td>${detail.date}</td>
                                        <td>${detail.category}</td>
                                        <td>${detail.description}</td>
                                        <td>$${detail.amount.toFixed(2)}</td>
                                        <td>
                                            ${detail.is_repeat ? 
                                                '<span class="badge bg-warning">Already shared individually</span>' : 
                                                ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsRow);
        } else {
            // Create row for single expense share
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 5%"></td>
                <td style="width: 25%">
                    <div class="d-flex flex-column">
                        <div>${expense.description}</div>
                        <small class="text-muted">Shared by: ${expense.shared_by}</small>
                    </div>
                </td>
                <td style="width: 20%">${expense.category}</td>
                <td style="width: 15%">$${expense.amount.toFixed(2)}</td>
                <td style="width: 15%">${expense.date}</td>
                <td style="width: 20%">
                    <div class="d-flex align-items-center justify-content-between">
                        ${expense.is_repeat ? 
                            '<span class="badge bg-warning">Already shared</span>' : 
                            ''}
                        <button class="btn btn-danger btn-sm" onclick="cancelSharedExpense(${expense.shared_id})">
                            <i class="fas fa-times"></i> Cancel Share
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        }
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true
        });
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

function toggleBulkDetails(expenseId) {
    const detailsRow = document.getElementById(`details-${expenseId}`);
    const icon = document.getElementById(`icon-${expenseId}`);
    
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