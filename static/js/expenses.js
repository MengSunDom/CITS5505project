$(document).ready(function () {
    // Set max datetime to current time and default value
    const datetimeInput = document.getElementById('datetime');
    function setCurrentDatetime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`; // 格式化为 "YYYY-MM-DDTHH:mm"
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
    });
}

function updateExpenseTable(expenses) {
    const tbody = $('#expenseTableBody');
    tbody.empty();

    expenses.forEach(expense => {
        const row = `
            <tr>
                <td>${expense.date}</td>
                <td>${expense.category}</td>
                <td>${expense.description}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openShareModal(${expense.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="deleteLine(${expense.id})">
                        Delete
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
    const validRows = [];
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const errors = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const date = row[0];
            const category = row[1];
            const description = row[2];
            const amount = row[3];

            if (!allowedCategories.includes(category)) {
                errors.push(`Row ${i + 1}: Invalid category "${category}"`);
            }

            if (isNaN(amount)) {
                errors.push(`Row ${i + 1}: Amount "${amount}" is not a number`);
            }
            validRows.push({ date, category, description, amount });
        }

        if (errors.length > 0) {
            alert('Upload failed:\n' + errors.join('\n'));
        } else {
            alert('Upload successful!');
            $.ajax({
                url: '/api/expenses/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(validRows),
                success: function (response) {
                    $('#expenseForm')[0].reset();
                    loadExpenses();
                },
                error: function (xhr) {
                    alert('Error adding expense: ' + xhr.responseJSON.error);
                }
            });
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
            select.empty();
            data.forEach(function (user) {
                const option = $('<option></option>')
                    .attr('value', user.username)
                    .text(user.username);
                select.append(option);
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
