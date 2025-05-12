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

    loadData();

    // Handle form submission
    $('#incomeForm').on('submit', async (e) => {
        e.preventDefault();

        const formData = {
            amount: document.getElementById('amount').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value || '',  // Make description optional
            date: document.getElementById('date').value
        };

        try {
            const response = await fetch('/api/incomes', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                $('#incomeForm')[0].reset();
                // Reset date to today after form reset
                document.getElementById('date').value = getFormattedDateTime();
                loadData();
                // Close the offcanvas panel
                const offcanvasElement = document.getElementById('addIncomeCanvas');
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
                offcanvasInstance.hide();
            } else {
                notifications.error(data.error || 'Failed to add income');
            }
        } catch (error) {
            console.error('Error:', error);
            notifications.error('An error occurred while adding the income');
        }
    });

    // Handle share button click
    $('#shareButton').on('click', function () {
        const username = $('#shareUsername').val();
        const incomeId = $('#incomeIdToShare').val();

        if (!username) {
            notifications.warning('Please select a user to share with');
            return;
        }

        $.ajax({
            url: `/api/share/income/${incomeId}`,
            method: 'POST',
            xhrFields: {
        withCredentials: true
    },
            contentType: 'application/json',
            data: JSON.stringify({
                username: username
            }),
            success: function (response) {
                $('#shareModal').modal('hide');
                notifications.success(response.message || 'Income shared successfully');
            },
            error: function (xhr) {
                notifications.error(xhr.responseJSON?.error || 'Failed to share income');
            }
        });
    });
});

function loadData() {
    $.get('/api/incomes', function (incomes) {
        currentincomes = incomes;
        updateIncomeTable(incomes);
        filterAndSearchincomes();
    });
}

function updateIncomeTable(incomes) {
    const tbody = $('#incomeTableBody');
    tbody.empty();

    // Sort incomes by date in descending order
    incomes.sort((a, b) => new Date(b.date) - new Date(a.date));

    incomes.forEach(income => {
        const row = `
            <tr>
                <td><input type="checkbox" data-id="${income.id}" /></td>
                <td>${income.date}</td>
                <td>${income.category}</td>
                <td><span class="remark-tooltip" data-remark="${income.description || ''}">${getShortRemark(income.description)}</span></td>
                <td>$${income.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-primary btn-sm me-1" onclick="openShareModal(${income.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLine(${income.id})">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

let currentincomes = [];

function openShareModal(incomeId) {
    $('#incomeIdToShare').val(incomeId);
    $('#shareModal').modal('show');
}

function deleteLine(incomeId) {
    notifications.confirmDelete('income', function() {
    $.ajax({
        url: '/api/incomes/delete',
        method: 'POST',
        xhrFields: {
        withCredentials: true
    },
        contentType: 'application/json',
        data: JSON.stringify({
            id: incomeId
        }),
        success: function (response) {
            $('#incomeForm')[0].reset();
                document.getElementById('date').value = getFormattedDateTime();
            loadData();
                notifications.success('Income deleted successfully');
        },
        error: function (xhr) {
                notifications.error(xhr.responseJSON?.error || 'Failed to delete income');
        }
        });
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

    XLSX.writeFile(workbook, 'income_template.xlsx');
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
            if (!row || row.length < 4) continue;

            let date = row[0]?.toString();
            const category = row[1];
            const description = row[2] || '';
            const amount = parseFloat(row[3]);

            if (!isNaN(date) && date.length <= 5) {
                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                date = new Date(excelEpoch.getTime() + date * 86400000)
                    .toISOString()
                    .split('T')[0];
            }

            if (!date || !date.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
                errors.push(`Row ${i + 1}: Invalid date format "${date}". Use YYYY-MM-DD or YYYY/MM/DD format.`);
                continue;
            }

            const normalizedDate = date.replace(/\//g, '-');
            const [year, month, day] = normalizedDate.split('-').map(part => part.padStart(2, '0'));
            const dateWithTime = `${year}-${month}-${day}T00:00`;

            if (!allowedCategories.includes(category)) {
                errors.push(`Row ${i + 1}: Invalid category "${category}". Allowed categories: ${allowedCategories.join(', ')}`);
                continue;
            }

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
                url: '/api/incomes/bulk',
                method: 'POST',
                xhrFields: {
        withCredentials: true
    },
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    notifications.success('Upload successful!');
                    $('#incomeForm')[0].reset();
                    document.getElementById('date').value = getFormattedDateTime();
                    loadData();
                },
                error: function (xhr) {
                    notifications.error(xhr.responseJSON?.error || 'Failed to upload incomes');
                }
            });
        } else {
            notifications.warning('No valid data found in the file.');
        }
    };

    reader.readAsArrayBuffer(file);
});

let loadUsernames = () => {
    return fetch('/api/users', {credentials: 'include'})
        .then(response => response.json())
        .then(data => {
            // Store the full user list for filtering
            window.allUsers = data || [];
            
            // Update user count display
            $('#shareUserCount').text(`${data.length} users`);
            $('#bulkShareUserCount').text(`${data.length} users`);
            
            // Populate selects
            populateUserSelects(data);
            
            // Setup search functionality
            setupUserSearch();
        })
        .catch(() => {
            notifications.error('Failed to load usernames. Cannot share.');
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
    $('#shareSearch').off('input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        filterUsers(searchTerm, '#shareUsername');
    });
    
    // For bulk share modal
    $('#bulkShareSearch').off('input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        filterUsers(searchTerm, '#bulkShareUsername');
    });
    
    // Clear search when modals are hidden
    $('#shareModal').on('hidden.bs.modal', function() {
        $('#shareSearch').val('');
        filterUsers('', '#shareUsername');
    });
    
    $('#bulkShareModal').on('hidden.bs.modal', function() {
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

$('#shareModal').on('show.bs.modal', function () {
    loadUsernames();
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('uploadButton').addEventListener('click', function () {
        document.getElementById('uploadTemplate').click();
    });
});

function filterAndSearchincomes() {
    const searchValue = $('#searchInput').val().toLowerCase();
    const selectedCategory = $('#filterCategory').val();
    const selectedMonth = $('#filterMonth').val();

    const filteredincomes = currentincomes.filter(income => {
        const matchesSearch = income.description.toLowerCase().includes(searchValue);
        const matchesCategory = !selectedCategory || income.category === selectedCategory;
        const matchesMonth = !selectedMonth || income.date.startsWith(selectedMonth);
        return matchesSearch && matchesCategory && matchesMonth;
    });

    updateIncomeTable(filteredincomes);
}

$('#searchInput').on('input', filterAndSearchincomes);
$('#filterCategory').on('change', filterAndSearchincomes);
$('#filterMonth').on('change', filterAndSearchincomes);

$('#selectAll').on('change', function () {
    const isChecked = $(this).is(':checked');
    $('#incomeTableBody input[type="checkbox"]').prop('checked', isChecked);
});

$('#deleteSelected').on('click', function () {
    const selectedIds = $('#incomeTableBody input[type="checkbox"]:checked')
        .map(function () {
            return $(this).data('id');
        })
        .get();

    if (selectedIds.length === 0) {
        notifications.warning('No incomes selected');
        return;
    }

    notifications.confirmDelete('incomes', function() {
    $.ajax({
        url: '/api/incomes/bulk-delete',
        method: 'POST',
        xhrFields: {
        withCredentials: true
    },
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds }),
        success: function () {
            loadData();
                notifications.success('Selected incomes deleted successfully');
        },
        error: function (xhr) {
                notifications.error(xhr.responseJSON?.error || 'Failed to delete incomes');
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

$('#bulkShareButton').on('click', function () {
    const selectedIds = $('#incomeTableBody input[type="checkbox"]:checked')
        .map(function () {
            return $(this).data('id');
        })
        .get();

    if (selectedIds.length === 0) {
        notifications.warning('No incomes selected');
        return;
    }

    const username = $('#bulkShareUsername').val();
    if (!username) {
        notifications.warning('Please select a username to share with');
        return;
    }

    $.ajax({
        url: '/api/share/income/bulk',
        method: 'POST',
        xhrFields: {
        withCredentials: true
    },
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds, username: username }),
        success: function () {
            $('#bulkShareModal').modal('hide');
            notifications.success('Incomes shared successfully');
            // Clear all checkboxes
            $('#incomeTableBody input[type="checkbox"]').prop('checked', false);
            $('#selectAll').prop('checked', false);
            // Reload data to refresh the table
            loadData();
        },
        error: function (xhr) {
            notifications.error(xhr.responseJSON?.error || 'Failed to share incomes');
        }
    });
});

$('#bulkShareModal').on('show.bs.modal', function () {
    loadUsernames();
});

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

$(document).off('mouseenter.remark-tooltip mouseleave.remark-tooltip');
$(document).on('mouseenter.remark-tooltip', '.remark-tooltip', function() {
    showCustomTooltip($(this), $(this).data('remark'));
}).on('mouseleave.remark-tooltip', '.remark-tooltip', function() {
    $('.custom-tooltip').remove();
});
