$(document).ready(function () {
    // Set max datetime to current time and default value
    const datetimeInput = document.getElementById('datetime');
    function setCurrentDatetime() {
        const now = new Date();
        const year = now.getFullYear();

        const month = String(now.getMonth() + 1).padStart(2, '0'); // Month starts from 0
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`; // Format "YYYY-MM-DDTHH:mm"

        datetimeInput.setAttribute('max', formattedNow);
        datetimeInput.value = formattedNow; // Set default value to current time
    }
    setCurrentDatetime();

    // Reset datetime to current time on form reset
    $('#expenseForm').on('reset', setCurrentDatetime);

    // Load expenses on page load
    loadExpenses();

    // Handle form submission
    $('#expenseForm').on('submit', function (e) {
        e.preventDefault();
        const amount = $('#amount').val();
        const category = $('#category').val();
        const description = $('#description').val();
        const datetime = $('#datetime').val();
        let data = {
            amount: amount,
            category: category,
            description: description,
            date: datetime
        };
        $.ajax({
            url: '/api/expenses',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (response) {
                $('#expenseForm')[0].reset();
                loadExpenses();
                setCurrentDatetime();
            },
            error: function (xhr) {
                alert('Error adding expense: ' + xhr.responseJSON.error);
            }
        });
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
        refreshExpenses(expenses);

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
                <td>${expense.description}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openShareModal(${expense.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>

                    <button class="btn btn-sm btn-danger" onclick="deleteLine(${expense.id})">
                        <i class="fas fa-trash-alt"></i> Delete

                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function updateExpenseChart(expenses) {
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });

    const chartType = document.getElementById('chartType').value;

    let data = [];
    let layout = {
        title: 'Expense Distribution by Category',
        height: 400
    };

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    if (chartType === 'pie') {
        data = [{
            values: values,
            labels: labels,
            type: 'pie'
        }];
    } else if (chartType === 'bar') {
        data = [{
            x: labels,
            y: values,
            type: 'bar'
        }];
    } else if (chartType === 'line') {
        data = [{
            x: labels,
            y: values,
            type: 'scatter',
            mode: 'lines+markers'
        }];
    }

    Plotly.newPlot('expenseChart', data, layout);
}

document.getElementById('chartType').addEventListener('change', function () {
    updateExpenseChart(currentExpenses);
});

let currentExpenses = [];

function refreshExpenses(expenses) {
    currentExpenses = expenses;
    updateExpenseChart(expenses);
}

function openShareModal(expenseId) {
    $('#expenseIdToShare').val(expenseId);
    $('#shareModal').modal('show');
}

function deleteLine(expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return; // If the user cancels, exit the function
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
            loadExpenses();
        },
        error: function (xhr) {
            alert('Error deleting expense: ' + xhr.responseJSON.error);
        }
    });
}

const allowedCategories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other'];

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
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Check if file has header row
            if (jsonData.length < 2) {
                alert('File is empty or missing data rows.');
                $('#uploadTemplate').val('');
                return;
            }

            const validRows = [];
            const allErrors = [];

            for (let i = 1; i < jsonData.length; i++) {
                const result = validateExpenseData(jsonData[i], i);
                if (result.valid) {
                    validRows.push(result.data);
                } else {
                    allErrors.push(...result.errors);
                }
            }

            if (allErrors.length > 0) {
                alert('Upload failed:\n\n' + allErrors.join('\n') + '\n\nPlease correct these errors and try again.');
                $('#uploadTemplate').val('');
                return;
            }

            if (validRows.length === 0) {
                alert('No valid data found in the file. Please check the file format and try again.');
                $('#uploadTemplate').val('');
                return;
            }

            // Upload valid data
            $.ajax({
                url: '/api/expenses/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    alert(`Successfully uploaded ${validRows.length} expenses!`);
                    $('#uploadTemplate').val('');
                    loadExpenses();
                },
                error: function (xhr) {
                    alert('Error uploading expenses: ' + (xhr.responseJSON?.error || 'Unknown error'));
                    $('#uploadTemplate').val('');
                }
            });
        } catch (error) {
            alert('Error processing file: ' + error.message);
            $('#uploadTemplate').val('');
        }
    };

    reader.readAsArrayBuffer(file);
});

function isValidDate(dateStr) {
    if (!dateStr) return false;
    
    // Handle Excel date format
    if (typeof dateStr === 'number') {
        return true;
    }
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

function formatDate(dateStr) {
    if (typeof dateStr === 'number') {
        // Convert Excel date number to string
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

function validateExpenseData(row, rowIndex) {
    const errors = [];
    
    if (!row || row.length < 4) {
        errors.push(`Row ${rowIndex + 1}: Missing required fields`);
        return { valid: false, errors };
    }

    const date = row[0];
    const category = row[1];
    const description = row[2];
    const amount = row[3];

    // Validate date
    if (!date) {
        errors.push(`Row ${rowIndex + 1}: Date is required`);
    } else {
        let dateStr = date;
        if (typeof date === 'number') {
            dateStr = XLSX.SSF.format('yyyy-mm-dd', date);
        }
        if (!isValidDate(dateStr)) {
            errors.push(`Row ${rowIndex + 1}: Invalid date format "${dateStr}". Please use YYYY-MM-DD format.`);
        }
    }

    // Validate category
    if (!category) {
        errors.push(`Row ${rowIndex + 1}: Category is required`);
    } else if (!allowedCategories.includes(category)) {
        errors.push(`Row ${rowIndex + 1}: Invalid category "${category}". Allowed categories are: ${allowedCategories.join(', ')}`);
    }

    // Validate amount
    if (amount === undefined || amount === null || amount === '') {
        errors.push(`Row ${rowIndex + 1}: Amount is required`);
    } else {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid amount "${amount}". Amount must be a positive number.`);
        }
    }

    // Validate description (optional)
    if (description !== undefined && description !== null && typeof description !== 'string') {
        errors.push(`Row ${rowIndex + 1}: Invalid description format`);
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? {
            date: formatDate(date),
            category: category,
            description: description || '',
            amount: parseFloat(amount)
        } : null
    };
}

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
    // Trigger file input when upload button is clicked
    document.getElementById('uploadButton').addEventListener('click', function () {
        document.getElementById('uploadTemplate').click();
    });
});

// Filter and search functionality
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

// Event listeners for search and filters
$('#searchInput').on('input', filterAndSearchExpenses);
$('#filterCategory').on('change', filterAndSearchExpenses);
$('#filterMonth').on('change', filterAndSearchExpenses);

// Multi-select delete functionality
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

// Set default month filter to the current month
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

// Load usernames for bulk share modal
$('#bulkShareModal').on('show.bs.modal', function () {
    loadUsernames();
});
