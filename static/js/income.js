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
                alert(data.error || 'Failed to add income');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the income');
        }
    });

    // Handle share button click
    $('#shareButton').on('click', function () {
        const username = $('#shareUsername').val();
        const incomeId = $('#incomeIdToShare').val();

        $.ajax({
            url: `/api/share/income/${incomeId}`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username
            }),
            success: function (response) {
                $('#shareModal').modal('hide');
                alert('Income shared successfully!');
            },
            error: function (xhr) {
                alert('Error sharing income: ' + xhr.responseJSON.error);
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
                <td>${income.description || ''}</td>
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
    if (!confirm("Are you sure you want to delete this income?")) {
        return;
    }

    $.ajax({
        url: '/api/incomes/delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            id: incomeId
        }),
        success: function (response) {
            $('#incomeForm')[0].reset();
            // Reset date to today after form reset
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            document.getElementById('date').value = formattedDate;
            loadData();
        },
        error: function (xhr) {
            alert('Error deleting income: ' + xhr.responseJSON.error);
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
                url: '/api/incomes/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    alert('Upload successful!');
                    $('#incomeForm')[0].reset();
                    // Reset date to today after form reset
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hours = String(today.getHours()).padStart(2, '0');
                    const minutes = String(today.getMinutes()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                    document.getElementById('date').value = formattedDate;
                    loadData();
                },
                error: function (xhr) {
                    alert('Error uploading incomes: ' + xhr.responseJSON.error);
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
        alert('No incomes selected.');
        return;
    }

    if (!confirm('Are you sure you want to delete the selected incomes?')) {
        return;
    }

    $.ajax({
        url: '/api/incomes/bulk-delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds }),
        success: function () {
            loadData();
        },
        error: function (xhr) {
            alert('Error deleting incomes: ' + xhr.responseJSON.error);
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
    const selectedIds = $('#incomeTableBody input[type="checkbox"]:checked')
        .map(function () {
            return $(this).data('id');
        })
        .get();

    if (selectedIds.length === 0) {
        alert('No incomes selected.');
        return;
    }

    const username = $('#bulkShareUsername').val();
    if (!username) {
        alert('Please select a username to share with.');
        return;
    }

    $.ajax({
        url: '/api/share/income/bulk',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: selectedIds, username: username }),
        success: function () {
            $('#bulkShareModal').modal('hide');
            alert('incomes shared successfully!');
        },
        error: function (xhr) {
            alert('Error sharing incomes: ' + xhr.responseJSON.error);
        }
    });
});

$('#bulkShareModal').on('show.bs.modal', function () {
    loadUsernames();
});
