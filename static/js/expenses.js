$(document).ready(function () {
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('date').value = formattedDate;

    // Load expenses on page load
    loadExpenses();

    // Handle form submission
    $('#expenseForm').on('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            amount: document.getElementById('amount').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value || '',  // Make description optional
            date: document.getElementById('date').value
        };

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (response.ok) {
                $('#expenseForm')[0].reset();
                // Reset date to today after form reset
                document.getElementById('date').value = formattedDate;
                loadExpenses();
                // Close the offcanvas panel
                const offcanvasElement = document.getElementById('addExpenseCanvas');
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
                offcanvasInstance.hide();
            } else {
                alert(data.error || 'Failed to add expense');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the expense');
        }
    });

    // Handle share button click
    $('#shareButton').on('click', function () {
        const username = $('#shareUsername').val();
        const expenseId = $('#expenseIdToShare').val();

        $.ajax({
            url: `/api/expenses/${expenseId}/share`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username
            }),
            success: function (response) {
                $('#shareModal').modal('hide');
                alert('Expense shared successfully!');
            },
            error: function (xhr) {
                alert('Error sharing expense: ' + xhr.responseJSON.error);
            }
        });
    });
});

function loadExpenses() {
    $.get('/api/expenses', function (expenses) {
        currentExpenses = expenses;
        updateExpenseTable(expenses);
        filterAndSearchExpenses();
    });
}

function updateExpenseTable(expenses) {
    const tbody = $('#expenseTableBody');
    tbody.empty();

    // Sort expenses by date in descending order
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    expenses.forEach(expense => {
        const row = `
            <tr>
                <td><input type="checkbox" data-id="${expense.id}" /></td>
                <td>${expense.date}</td>
                <td>${expense.category}</td>
                <td>${expense.description || ''}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-primary btn-sm me-1" onclick="openShareModal(${expense.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLine(${expense.id})">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

let currentExpenses = [];

function openShareModal(expenseId) {
    $('#expenseIdToShare').val(expenseId);
    $('#shareModal').modal('show');
}

function deleteLine(expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }

    $.ajax({
        url: '/api/expenses/delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            id: expenseId
        }),
        success: function (response) {
            $('#expenseForm')[0].reset();
            // Reset date to today after form reset
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            document.getElementById('date').value = formattedDate;
            loadExpenses();
        },
        error: function (xhr) {
            alert('Error deleting expense: ' + xhr.responseJSON.error);
        }
    });
}

const allowedCategories = ['Food', 'Entertainment', 'Shopping', 'Bills', 'Other'];

document.getElementById('downloadTemplate').addEventListener('click', function () {
    const ws_data = [
        ['Date', 'Category', 'Description', 'Amount'],
        ['2024-01-01', 'Food', 'Example description', 12.50]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'expense_template.xlsx');
});

document.getElementById('uploadTemplate').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const errors = [];
        const validRows = [];
        
        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 4) continue;  // Skip empty rows or rows with insufficient data

            const date = row[0];
            const category = row[1];
            const description = row[2] || '';  // Make description optional
            const amount = parseFloat(row[3]);

            // Validate date
            if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                errors.push(`Row ${i + 1}: Invalid date format "${date}". Use YYYY-MM-DD format.`);
                continue;
            }

            // Add time to date
            const dateWithTime = `${date}T00:00`;

            // Validate category
            if (!allowedCategories.includes(category)) {
                errors.push(`Row ${i + 1}: Invalid category "${category}". Allowed categories: ${allowedCategories.join(', ')}`);
                continue;
            }

            // Validate amount
            if (isNaN(amount) || amount <= 0) {
                errors.push(`Row ${i + 1}: Invalid amount "${amount}". Must be a positive number.`);
                continue;
            }

            validRows.push({ date: dateWithTime, category, description, amount });
        }

        if (errors.length > 0) {
            alert('Upload failed:\n' + errors.join('\n'));
        } else if (validRows.length > 0) {
            $.ajax({
                url: '/api/expenses/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    alert('Upload successful!');
                    $('#expenseForm')[0].reset();
                    // Reset date to today after form reset
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hours = String(today.getHours()).padStart(2, '0');
                    const minutes = String(today.getMinutes()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                    document.getElementById('date').value = formattedDate;
                    loadExpenses();
                },
                error: function (xhr) {
                    alert('Error uploading expenses: ' + xhr.responseJSON.error);
                }
            });
        } else {
            alert('No valid data found in the file.');
        }
    };

    reader.readAsArrayBuffer(file);
});

let loadUsernames = () => {
    $.ajax({
        url: '/api/users',
        method: 'GET',
        success: function (data) {
            const select = $('#shareUsername');
            const bulkSelect = $('#bulkShareUsername');
            select.empty();
            bulkSelect.empty();
            data.forEach(function (user) {
                const option = $('<option></option>')
                    .attr('value', user.username)
                    .text(user.username);
                select.append(option);
                bulkSelect.append(option.clone());
            });
        },
        error: function (xhr, status, error) {
            console.error('Failed to load usernames:', error);
            alert('Failed to load usernames.');
        }
    });
};

$('#shareModal').on('show.bs.modal', function () {
    loadUsernames();
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('uploadButton').addEventListener('click', function () {
        document.getElementById('uploadTemplate').click();
    });
});

function filterAndSearchExpenses() {
    const searchValue = $('#searchInput').val().toLowerCase();
    const selectedCategory = $('#filterCategory').val();
    const selectedMonth = $('#filterMonth').val();

    const filteredExpenses = currentExpenses.filter(expense => {
        const matchesSearch = expense.description.toLowerCase().includes(searchValue);
        const matchesCategory = !selectedCategory || expense.category === selectedCategory;
        const matchesMonth = !selectedMonth || expense.date.startsWith(selectedMonth);
        return matchesSearch && matchesCategory && matchesMonth;
    });

    updateExpenseTable(filteredExpenses);
}

$('#searchInput').on('input', filterAndSearchExpenses);
$('#filterCategory').on('change', filterAndSearchExpenses);
$('#filterMonth').on('change', filterAndSearchExpenses);

$('#selectAll').on('change', function () {
    const isChecked = $(this).is(':checked');
    $('#expenseTableBody input[type="checkbox"]').prop('checked', isChecked);
});

$('#deleteSelected').on('click', function () {
    const selectedIds = $('#expenseTableBody input[type="checkbox"]:checked')
        .map(function () {
            return $(this).data('id');
        })
        .get();

    if (selectedIds.length === 0) {
        alert('No expenses selected.');
        return;
    }

    if (!confirm('Are you sure you want to delete the selected expenses?')) {
        return;
    }

    $.ajax({
        url: '/api/expenses/bulk-delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds }),
        success: function () {
            loadExpenses();
        },
        error: function (xhr) {
            alert('Error deleting expenses: ' + xhr.responseJSON.error);
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    $('#filterMonth').val(`${year}-${month}`);
});

$('#bulkShareButton').on('click', function () {
    const selectedIds = $('#expenseTableBody input[type="checkbox"]:checked')
        .map(function () {
            return $(this).data('id');
        })
        .get();

    if (selectedIds.length === 0) {
        alert('No expenses selected.');
        return;
    }

    const username = $('#bulkShareUsername').val();
    if (!username) {
        alert('Please select a username to share with.');
        return;
    }

    $.ajax({
        url: '/api/expenses/bulk-share',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds, username: username }),
        success: function () {
            $('#bulkShareModal').modal('hide');
            alert('Expenses shared successfully!');
        },
        error: function (xhr) {
            alert('Error sharing expenses: ' + xhr.responseJSON.error);
        }
    });
});

$('#bulkShareModal').on('show.bs.modal', function () {
    loadUsernames();
});
