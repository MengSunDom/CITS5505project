function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

$(document).ready(function () {
    // Set default date to today
    document.getElementById('date').value = getFormattedDateTime();

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
                document.getElementById('date').value = getFormattedDateTime();
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
    $('#shareButton').off('click').on('click', function() {
        const expenseId = document.getElementById('expenseIdToShare').value;
        const username = document.getElementById('shareUsername').value;
        
        if (!username) {
            alert('Please select a user to share with');
            return;
        }
        
        fetch(`/api/share/${expenseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message || 'Expense shared successfully');
                $('#shareModal').modal('hide');
                loadExpenses(); // Refresh the expenses list
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to share expense. Please try again.');
        });
    });

    // Handle bulk share button click
    $('#shareSelected').off('click').on('click', function() {
        const selectedIds = getSelectedExpenseIds();
        if (selectedIds.length === 0) {
            alert('Please select at least one expense to share');
            return;
        }
        
        // Store selected IDs in the modal
        document.getElementById('bulkShareModal').dataset.selectedIds = selectedIds.join(',');
        
        // Load usernames into the select
        loadUsernames();
        
        // Show the modal
        $('#bulkShareModal').modal('show');
    });

    // Handle bulk share button click in modal
    $('#bulkShareButton').off('click').on('click', function() {
        const selectedIds = document.getElementById('bulkShareModal').dataset.selectedIds.split(',');
        const username = document.getElementById('bulkShareUsername').value;
        
        if (!username) {
            alert('Please select a user to share with');
            return;
        }
        
        fetch('/api/share/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ids: selectedIds,
                username: username
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                $('#bulkShareModal').modal('hide');
                loadExpenses(); // Refresh the expenses list
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to share expenses');
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

// Function to load usernames for sharing
function loadUsernames() {
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('shareUsername');
            const bulkSelect = document.getElementById('bulkShareUsername');
            
            // Clear existing options
            select.innerHTML = '<option value="">Select a user...</option>';
            bulkSelect.innerHTML = '<option value="">Select a user...</option>';
            
            // Add new options
            data.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = user.username;
                select.appendChild(option);
                bulkSelect.appendChild(option.cloneNode(true));
            });
        })
        .catch(error => {
            console.error('Failed to load usernames:', error);
            alert('Failed to load usernames.');
        });
}

// Handle share button click for single expense
function openShareModal(expenseId) {
    // Load usernames before showing the modal
    loadUsernames();
    
    // Set the expense ID in the hidden input
    document.getElementById('expenseIdToShare').value = expenseId;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
}

// Function to get selected expense IDs
function getSelectedExpenseIds() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.dataset.id);
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

            let date = row[0]?.toString(); // Ensure date is a string
            const category = row[1];
            const description = row[2] || '';  // Make description optional
            const amount = parseFloat(row[3]);

            // Handle Excel numeric date format
            if (!isNaN(date) && date.length <= 5) {
                const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel epoch starts on 1899-12-30
                date = new Date(excelEpoch.getTime() + date * 86400000) // Convert days to milliseconds
                    .toISOString()
                    .split('T')[0]; // Extract YYYY-MM-DD
            }

            // Validate date
            if (!date || !date.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
                errors.push(`Row ${i + 1}: Invalid date format "${date}". Use YYYY-MM-DD or YYYY/MM/DD format.`);
                continue;
            }

            // Normalize date to YYYY-MM-DD format
            const normalizedDate = date.replace(/\//g, '-');
            const [year, month, day] = normalizedDate.split('-').map(part => part.padStart(2, '0'));
            const dateWithTime = `${year}-${month}-${day}T00:00`;

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

document.getElementById('uploadPicture').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Show progress bar and disable buttons
    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.style.position = 'fixed';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '100%';
    progressBar.style.height = '5px';
    progressBar.style.backgroundColor = '#0d6efd';
    progressBar.style.transition = 'width 0.4s ease';
    progressBar.style.zIndex = '1050';
    document.body.appendChild(progressBar);

    const disableUI = () => {
        document.querySelectorAll('button, input, select').forEach(el => el.disabled = true);
    };

    const enableUI = () => {
        document.querySelectorAll('button, input, select').forEach(el => el.disabled = false);
    };

    disableUI();

    $.ajax({
        url: '/api/expenses/by-ocr',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhr: function () {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = `${percentComplete}%`;
                }
            });
            return xhr;
        },
        success: function (response) {
            try {
                if (response.error) {
                    alert(`Error: ${response.error}`);
                    return;
                }
                data = JSON.parse(response.result);
                addExpense(data);
            } catch (e) {
                console.error('Error parsing response:', e);
                alert('An unexpected error occurred. Please try again.');
            }
        },
        error: function (xhr) {
            console.error('Error:', xhr);
            alert('An error occurred while processing the Picture.');
        },
        complete: function () {
            document.body.removeChild(progressBar);
            enableUI();

        }
    });
});

async function addExpense(expenseData) {
    const formData = {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description || '',  // Make description optional
        date: expenseData.date
    };
    
    $.ajax({
        url: '/api/expenses',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function () {
            $('#expenseForm')[0].reset();
            document.getElementById('date').value = getFormattedDateTime();
            loadExpenses();
            const offcanvasElement = document.getElementById('addExpenseCanvas');
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
            offcanvasInstance.hide();
        },
        error: function (xhr) {
            alert(xhr.responseJSON?.error || 'Failed to add expense');
        }
    });
}

// Load usernames when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUsernames();
});

// Load usernames when share modal is opened
$('#shareModal').on('show.bs.modal', function() {
    loadUsernames();
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('uploadButton').addEventListener('click', function () {
        document.getElementById('uploadTemplate').click();
    });
    document.getElementById('ocrButton').addEventListener('click', function () {
        const fileInput = document.getElementById('uploadPicture');
        fileInput.click();
    });
});

// Load usernames when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUsernames();
});

// Load usernames when share modal is opened
$('#shareModal').on('show.bs.modal', function() {
    loadUsernames();
});

// Load usernames when bulk share modal is opened
$('#bulkShareModal').on('show.bs.modal', function() {
    loadUsernames();
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

    fetch('/api/expenses/bulk-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('Selected expenses deleted successfully');
            loadExpenses();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while deleting expenses');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    $('#filterMonth').val(`${year}-${month}`);
});

$('#bulkShareButton').on('click', shareSelectedExpenses);
$('#deleteSelected').on('click', deleteSelectedExpenses);
$('#cancelSelected').on('click', cancelSelectedShares);
