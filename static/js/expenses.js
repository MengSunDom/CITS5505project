// Utility: get short remark for display, with ellipsis if too long
function getShortRemark(desc, maxLen = 20) {
    if (!desc) return '';
    return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
}

function showCustomTooltip($el, text) {
    if (!text) return;
    const $tip = $('<div class="custom-tooltip"></div>').text(text).appendTo('body');
    const offset = $el.offset();
    $tip.css({
        left: offset.left,
        top: offset.top - $tip.outerHeight() - 10,
        position: 'absolute',
        zIndex: 9999,
        background: 'rgba(30,30,40,0.98)',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        fontSize: '1em',
        maxWidth: '420px',
        wordBreak: 'break-all',
        whiteSpace: 'pre-line',
        pointerEvents: 'none',
        opacity: 1,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        letterSpacing: '0.01em',
        lineHeight: '1.5'
    });
}

// Register tooltip handler globally, only once
$(document).off('mouseenter.remark-tooltip mouseleave.remark-tooltip');
$(document).on('mouseenter.remark-tooltip', '.remark-tooltip', function () {
    showCustomTooltip($(this), $(this).data('remark'));
}).on('mouseleave.remark-tooltip', '.remark-tooltip', function () {
    $('.custom-tooltip').remove();
});

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

    // Handle "select all" checkbox with event delegation
    $(document).on('change', '#selectAll', function () {
        console.log('Select all changed:', this.checked);
        $('#expenseTableBody input[type="checkbox"]').prop('checked', this.checked);
    });

    // Handle form submission
    $('#expenseForm').on('submit', async (e) => {
        e.preventDefault();

        const formData = {
            amount: document.getElementById('amount').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value || '',  // Make description optional
            date: document.getElementById('date').value,
            csrf_token: $('input[name="csrf_token"]').val()

        };

        try {
            $.ajax({
                url: '/api/expenses',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function (data) {
                    $('#expenseForm')[0].reset();
                    document.getElementById('date').value = getFormattedDateTime();
                    loadExpenses();
                    const offcanvasElement = document.getElementById('addExpenseCanvas');
                    const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
                    offcanvasInstance.hide();
                },
                error: function (xhr) {
                    const errorMsg = xhr.responseJSON?.error || 'Failed to add expense';
                    notifications.error(errorMsg);
                }
            });

        } catch (error) {
            console.error('Error:', error);
            notifications.error('An error occurred while adding the expense');
        }
    });

    // Handle share button click
    $('#shareButton').off('click').on('click', function () {
        const expenseId = document.getElementById('expenseIdToShare').value;
        const username = document.getElementById('shareUsername').value;

        if (!username) {
            notifications.warning('Please select a user to share with');
            return;
        }

        $.ajax({
            url: `/api/share/${expenseId}`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username
            }),
            success: function (data) {
                if (data.error) {
                    notifications.error(data.error);
                } else {
                    notifications.success(data.message || 'Expense shared successfully');
                    $('#shareModal').modal('hide');
                    loadExpenses(); // Refresh the expenses list
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                notifications.error('Failed to share expense. Please try again.');
            }
        });

    });

    // Handle bulk share button click
    $('#shareSelected').off('click').on('click', function () {
        const selectedIds = getSelectedExpenseIds();
        if (selectedIds.length === 0) {
            notifications.warning('Please select at least one expense to share');
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
    $('#bulkShareButton').off('click').on('click', function () {
        const selectedIds = getSelectedExpenseIds();

        if (selectedIds.length === 0) {
            notifications.warning('No expenses selected');
            return;
        }

        const username = $('#bulkShareUsername').val();
        if (!username) {
            notifications.warning('Please select a username to share with');
            return;
        }

        $.ajax({
            url: '/api/share/bulk',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ ids: selectedIds, username: username }),
            success: function () {
                $('#bulkShareModal').modal('hide');
                notifications.success('Expenses shared successfully');
                // Clear all checkboxes
                $('#expenseTableBody input[type="checkbox"]').prop('checked', false);
                $('#selectAll').prop('checked', false);
                // Reload data to refresh the table
                loadExpenses();
            },
            error: function (xhr) {
                notifications.error(xhr.responseJSON.error || 'Failed to share expenses');
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
                <td><span class="remark-tooltip" data-remark="${expense.description || ''}">${getShortRemark(expense.description)}</span></td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-primary btn-sm form-action" onclick="openShareModal(${expense.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-danger btn-sm form-action" onclick="deleteLine(${expense.id})">
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
    return $.ajax({
        url: '/api/users',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            // Store the full user list for filtering
            window.allUsers = data || [];

            // Update user count display
            $('#shareUserCount').text(`${data.length} users`);
            $('#bulkShareUserCount').text(`${data.length} users`);

            // Populate selects
            populateUserSelects(data);

            // Setup search functionality
            setupUserSearch();
        },
        error: function (xhr, status, error) {
            console.error('Failed to load usernames:', error);
            notifications.error('Failed to load usernames.');
        }
    });
}


// Helper function to populate all user selects
function populateUserSelects(users) {
    const selects = ['#shareUsername', '#bulkShareUsername'];

    selects.forEach(selectId => {
        const $select = $(selectId);
        $select.empty();

        if (!users || users.length === 0) {
            $select.append('<option value="">No users available</option>');
            return;
        }

        // Sort users alphabetically
        users.sort((a, b) => a.username.localeCompare(b.username));

        users.forEach(user => {
            const option = `<option value="${user.username}">${user.username}</option>`;
            $select.append(option);
        });
    });
}

// Setup user search functionality
function setupUserSearch() {
    // For single share modal
    $('#shareSearch').off('input').on('input', function () {
        const searchTerm = $(this).val().toLowerCase().trim();
        filterUsers(searchTerm, '#shareUsername');
    });

    // For bulk share modal
    $('#bulkShareSearch').off('input').on('input', function () {
        const searchTerm = $(this).val().toLowerCase().trim();
        filterUsers(searchTerm, '#bulkShareUsername');
    });

    // Clear search when modals are hidden
    $('#shareModal').on('hidden.bs.modal', function () {
        $('#shareSearch').val('');
        filterUsers('', '#shareUsername');
    });

    $('#bulkShareModal').on('hidden.bs.modal', function () {
        $('#bulkShareSearch').val('');
        filterUsers('', '#bulkShareUsername');
    });
}

// Filter users based on search term
function filterUsers(searchTerm, selectId) {
    if (!window.allUsers) return;

    if (!searchTerm) {
        // If search is empty, show all users
        populateUserSelects(window.allUsers);
        $(selectId === '#shareUsername' ? '#shareUserCount' : '#bulkShareUserCount')
            .text(`${window.allUsers.length} users`);
        return;
    }

    // Filter users based on search term
    const filteredUsers = window.allUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm)
    );

    // Update the specific select
    const $select = $(selectId);
    $select.empty();

    if (filteredUsers.length === 0) {
        $select.append('<option value="">No matching users</option>');
    } else {
        filteredUsers.sort((a, b) => a.username.localeCompare(b.username));
        filteredUsers.forEach(user => {
            const option = `<option value="${user.username}">${user.username}</option>`;
            $select.append(option);
        });
    }

    // Update the counter
    $(selectId === '#shareUsername' ? '#shareUserCount' : '#bulkShareUserCount')
        .text(`${filteredUsers.length} users`);
}

// Handle share button click for single expense
function openShareModal(expenseId) {
    // Load usernames before showing the modal
    loadUsernames().then(() => {
        document.getElementById('expenseIdToShare').value = expenseId;
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }).catch(() => {
        notifications.error('Failed to load user list. Cannot share.');
    });
}
window.openShareModal = openShareModal;

// Function to get selected expense IDs
function getSelectedExpenseIds() {
    // Only select checkboxes within the expense table body, not the header checkbox
    const checkboxes = document.querySelectorAll('#expenseTableBody input[type="checkbox"]:checked');
    // Only return non-empty, numeric ids
    return Array.from(checkboxes)
        .map(cb => cb.dataset.id)
        .filter(id => id && !isNaN(Number(id)));
}

function deleteLine(expenseId) {
    notifications.confirmDelete('expense', function () {
        $.ajax({
            url: '/api/expenses/delete',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id: expenseId
            }),
            success: function (response) {
                $('#expenseForm')[0].reset();
                document.getElementById('date').value = getFormattedDateTime();
                loadExpenses();
                notifications.success('Expense deleted successfully');
            },
            error: function (xhr) {
                notifications.error(xhr.responseJSON.error || 'Failed to delete expense');
            }
        });
    });
}
window.deleteLine = deleteLine;

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
            notifications.error('Upload failed:\n' + errors.join('\n'));
        } else if (validRows.length > 0) {
            $.ajax({
                url: '/api/expenses/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    notifications.success('Upload successful!');
                    $('#expenseForm')[0].reset();
                    document.getElementById('date').value = getFormattedDateTime();
                    loadExpenses();
                },
                error: function (xhr) {
                    notifications.error(xhr.responseJSON.error || 'Failed to upload expenses');
                }
            });
        } else {
            notifications.warning('No valid data found in the file.');
        }
    };

    reader.readAsArrayBuffer(file);
});

document.getElementById('uploadImageButton').addEventListener('click', async function () {
    const fileInput = document.getElementById('expenseImage');
    const file = fileInput.files[0];

    if (!file) {
        notifications.warning('Please select an image file first');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        // Upload file for OCR
        $.ajax({
            url: '/api/ocr/expense',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (result) {
                // Populate form with OCR results
                if (result.success && result.data) {
                    $('#amount').val(result.data.amount || '');
                    $('#category').val(result.data.category || 'Other');
                    $('#description').val(result.data.description || '');

                    $('#amount').focus();

                    notifications.success('Successfully extracted data from image');
                } else {
                    notifications.warning('Could not extract all data from image. Please fill in the form manually.');
                }
            },
            error: function (xhr) {
                const result = xhr.responseJSON || {};
                notifications.error(`Error: ${result.error || 'Failed to process image'}`);
            }
        });

    } catch (err) {
        console.error(err);
        notifications.error('An error occurred while processing the image.');
    }
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
            notifications.error(xhr.responseJSON?.error || 'Failed to add expense');
        }
    });
}

// Load usernames when the page loads
document.addEventListener('DOMContentLoaded', function () {
    loadUsernames();
});

// Load usernames when share modal is opened
$('#shareModal').on('show.bs.modal', function () {
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
document.addEventListener('DOMContentLoaded', function () {
    loadUsernames();
});

// Load usernames when share modal is opened
$('#shareModal').on('show.bs.modal', function () {
    loadUsernames();
});

// Load usernames when bulk share modal is opened
$('#bulkShareModal').on('show.bs.modal', function () {
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

$('#deleteSelected').on('click', function () {
    const selectedIds = getSelectedExpenseIds();

    if (selectedIds.length === 0) {
        notifications.warning('No expenses selected');
        return;
    }

    notifications.confirmBulkDelete('expense', selectedIds.length, function () {
        $.ajax({
            url: '/api/expenses/bulk-delete',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ ids: selectedIds }),
            success: function () {
                loadExpenses();
                notifications.success('Selected expenses deleted successfully');
            },
            error: function (xhr) {
                notifications.error(xhr.responseJSON.error || 'Failed to delete expenses');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    $('#filterMonth').val(`${year}-${month}`);
});

$('#processClipboardButton').on('click', function () {
    const clipboardText = $('#clipboardText').val();

    if (!clipboardText) {
        notifications.warning('Please paste some text first');
        return;
    }

    $.ajax({
        url: '/api/expenses/from-clipboard',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ text: clipboardText }),
        success: function (response) {
            // Hide modal
            $('#uploadFromClipboardModal').modal('hide');

            // Update form with values
            $('#amount').val(response.amount || '');
            $('#category').val(response.category || 'Other');
            $('#description').val(response.description || '');

            notifications.success('Successfully extracted data from clipboard');
        },
        error: function (xhr) {
            notifications.error(xhr.responseJSON?.error || 'Failed to process clipboard data');
        }
    });
});
