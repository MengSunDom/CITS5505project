// Ensure DOM is ready
$(document).ready(() => {
    updateTable();
});

const updateTable = () => {
    fetchSharedByMe();
    fetchSharedWithMe();
}

// Fetch shared by me
const fetchSharedByMe = () => {
    $.ajax({
        url: '/api/share/by-me',
        method: 'GET',
        dataType: 'json',
        success: data => { populateSharedByMeTable(data, '', 'ByMe') },
        error: err => console.error('Error fetching shared by me:', err)
    });
    $.ajax({
        url: '/api/share/income/by-me',
        method: 'GET',
        dataType: 'json',
        success: data => populateSharedByMeTable(data, 'Income', 'ByMe'),
        error: err => console.error('Error fetching shared by me:', err)
    });
}

// Fetch shared with me
const fetchSharedWithMe = () => {
    $.ajax({
        url: '/api/share/with-me',
        method: 'GET',
        dataType: 'json',
        success: data => populateSharedWithMeTable(data, '', 'WithMe'),
        error: xhr => {
            const errorMsg = xhr.responseJSON?.error || 'Failed to fetch data';
            console.error(errorMsg);
            $('#sharedWithMeTableBody').html(`
                <tr><td colspan="6" class="text-center text-danger">${errorMsg}</td></tr>
            `);
        }
    });
    $.ajax({
        url: '/api/share/income/with-me',
        method: 'GET',
        dataType: 'json',
        success: data => populateSharedWithMeTable(data, 'Income', 'WithMe'),
        error: xhr => {
            const errorMsg = xhr.responseJSON?.error || 'Failed to fetch data';
            console.error(errorMsg);
            $('#sharedWithMeTableBody').html(`
                <tr><td colspan="6" class="text-center text-danger">${errorMsg}</td></tr>
            `);
        }
    });
}

// Render shared-by-me table
const populateSharedByMeTable = (data, type, methods) => {
    const $tbody = $(`#shared${methods}${type}TableBody`)
    $tbody.empty();

    data.forEach(exp => {
        const isBulk = exp.is_bulk;
        const categories = isBulk ? exp.categories : [exp.category]; // Unified data structure
        const displayCategories = categories.length > 2 ? `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more` : categories.join(', ');
        const sharedLabel = exp.shared_with ? `Shared with: ${exp.shared_with}` : `Shared by: ${exp.shared_by}`;

        const $mainRow = $(
            `<tr>
                <td>${isBulk ? `<button class="btn btn-link p-0" onclick="toggleBulkDetails(${exp.id}, '${methods}', '${type}')"><i class="fas fa-chevron-right" id="icon-${methods}-${type}-${exp.id}"></i></button>` : ''}</td>
                <td>
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <span class="me-2">${isBulk ? `${exp.expense_count} ${type}` : exp.description}</span>
                            ${(exp.is_repeat || exp.details?.some(d => d.is_repeat)) ? '<span class="badge bg-warning">Contains individually shared items</span>' : ''}
                        </div>
                        <small class="text-muted">${sharedLabel}</small>
                    </div>
                </td>
                <td><span class="categories-tooltip" data-bs-toggle="tooltip" title="${categories.join('<br>')}">${displayCategories}</span></td>
                <td>$${(exp.total_amount || exp.amount).toFixed(2)}</td>
                <td>${exp.date}</td>
                <td class="text-end">
                    <button class="btn btn-danger btn-sm me-2" onclick="cancelSharedExpense(${exp.shared_id})">Cancel Share</button>
                    ${exp.is_repeat ? '<span class="badge bg-warning">Repeat</span>' : ''}
                </td>
            </tr>`
        );

        $tbody.append($mainRow);

        if (isBulk) {
            const $detailsRow = $(`<tr id="details-${methods}-${type}-${exp.id}" style="display: none;"><td colspan="6"></td></tr>`);
            const $detailsTable = $('<table class="table table-sm mb-0"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody></tbody></table>');
            exp.details.forEach(detail => {
                $detailsTable.find('tbody').append(
                    `<tr>
                        <td>${detail.date}</td>
                        <td>${detail.category}</td>
                        <td>${detail.description}</td>
                        <td>$${detail.amount.toFixed(2)}</td>
                        <td>${detail.is_repeat ? '<span class="badge bg-warning">Already shared individually</span>' : ''}</td>
                    </tr>`
                );
            });
            $detailsRow.find('td').append($('<div class="ms-4"></div>').append($detailsTable));
            $tbody.append($detailsRow);
        }
    });

    bootstrap.Tooltip && bootstrap.Tooltip.getInstance &&
        new bootstrap.Tooltip(document.body, { selector: '[data-bs-toggle="tooltip"]', html: true });
}

// Same structure for shared-with-me
const populateSharedWithMeTable = (data, type, methods) => {
    const $tbody = $(`#shared${methods}${type}TableBody`).empty();

    if (!data || !data.length) {
        $tbody.html(`<tr><td colspan="6" class="text-center">No ${type} have been shared with you</td></tr>`);
        return;
    }

    data.forEach(exp => populateSharedByMeTable([exp], type, methods)); // Reuse same logic
}

// Cancel share
const cancelSharedExpense = (sharedId) => {
    if (!confirm('Are you sure you want to cancel this shared expense?')) return;

    $.ajax({
        url: '/api/share/cancel',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ shared_id: sharedId }),
        success: () => {
            updateTable()
        },
        error: xhr => {
            const errMsg = xhr.responseJSON?.error || 'Failed to cancel';
            alert(errMsg);
        }
    });
}

// Toggle bulk detail row
const toggleBulkDetails = (id, methods, type = '') => {
    const isVisible = $(`#details-${methods}-${type}-${id}`).is(':visible');
    $(`#details-${methods}-${type}-${id}`).toggle(!isVisible);
    $(`#icon-${methods}-${type}-${id}`).toggleClass('fa-chevron-right fa-chevron-down');
}
