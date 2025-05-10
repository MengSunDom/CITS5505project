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
        success: data => populateSharedByMeTable(data, '', 'ByMe'),
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

    data.forEach(exp => {
        const isBulk = exp.is_bulk;
        const categories = isBulk ? exp.categories : [exp.category]; // Unified data structure
        const displayCategories = categories.length > 2 ? `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more` : categories.join(', ');
        const sharedLabel = exp.shared_with ? `Shared with: ${exp.shared_with}` : `Shared by: ${exp.shared_by}`;

        // Compose main label and tooltip for Description column
        let mainLabel = '';
        let tooltip = '';
        if (isBulk) {
            const count = exp.expense_count || exp.Income_count || (exp.details?.length || 0);
            mainLabel = `Multiple items (${count} merged)`;
            const descs = exp.details?.map(d => d.description).filter(Boolean) || [];
            if (descs.length === 0) {
                tooltip = 'No remarks.';
            } else {
                const shortList = descs.slice(0, 2).join(', ');
                tooltip = descs.length > 2 ? `${shortList}, ...` : shortList;
            }
        } else {
            mainLabel = `<span class=\"remark-tooltip\" data-remark=\"${exp.description || ''}\">${getShortRemark(exp.description)}</span>`;
            tooltip = '';
        }

        const getBulkDescription = (exp) => {
            if (exp.details && exp.details.length) {
                const descs = exp.details.map(d => d.description).filter(Boolean);
                if (descs.length) return descs.join(', ');
            }
            return 'Multiple items';
        };

        const $mainRow = $(
            `<tr>
                <td>
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            ${isBulk ? `<button class=\"btn btn-link p-0\" onclick=\"toggleBulkDetails(${exp.id}, '${methods}', '${type}')\"><i class=\"fas fa-chevron-right\" id=\"icon-${methods}-${type}-${exp.id}\"></i></button>` : ''}
                            ${isBulk ? `<span class=\"me-2\">${mainLabel}</span>` : mainLabel}
                            ${isBulk && exp.details?.some(d => d.is_repeat)
                                ? '<span class="badge bg-warning ms-2">Contains individually shared items</span>'
                                : ''}
                        </div>
                        ${isBulk ? '' : ''}
                    </div>
                </td>
                <td><small class="text-muted">${sharedLabel}</small></td>
                <td><span class="categories-tooltip" data-bs-toggle="tooltip" title="${categories.join('<br>')}">${displayCategories}</span></td>
                <td>$${(exp.total_amount || exp.amount).toFixed(2)}</td>
                <td>${exp.date}</td>
                <td>
                  <div class="d-flex align-items-center">
                    <button class="btn btn-danger btn-sm me-2" onclick="cancelSharedExpense(${exp.shared_id},'${type}')">Cancel Share</button>
                    ${!isBulk && exp.is_repeat ? '<span class="badge bg-warning ms-2">Repeat</span>' : ''}
                  </div>
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
                        <td title="${detail.description}"><span class="remark-tooltip" data-remark="${detail.description}">${getShortRemark(detail.description)}</span></td>
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
        const label = type === 'Income' ? 'incomes' : 'expenses';
        $tbody.html(`<tr><td colspan="6" class="text-center">No ${label} have been shared with you</td></tr>`);
        return;
    }

    data.forEach(exp => populateSharedByMeTable([exp], type, methods)); // Reuse same logic
}

// Cancel share
const cancelSharedExpense = (sharedId, type) => {
    notifications.confirmDelete('share', function() {
        $.ajax({
            url: `/api/share${type ? "/income" : ""}/cancel`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ shared_id: sharedId }),
            success: () => {
                updateTable();
            },
            error: xhr => {
                const errMsg = xhr.responseJSON?.error || 'Failed to cancel share';
                notifications.error(errMsg);
            }
        });
    });
}
window.cancelSharedExpense = cancelSharedExpense;

// Toggle bulk detail row
const toggleBulkDetails = (id, methods, type = '') => {
    const isVisible = $(`#details-${methods}-${type}-${id}`).is(':visible');
    $(`#details-${methods}-${type}-${id}`).toggle(!isVisible);
    $(`#icon-${methods}-${type}-${id}`).toggleClass('fa-chevron-right fa-chevron-down');
}

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

$(document).off('mouseenter.remark-tooltip mouseleave.remark-tooltip');
$(document).on('mouseenter.remark-tooltip', '.remark-tooltip', function() {
    showCustomTooltip($(this), $(this).data('remark'));
}).on('mouseleave.remark-tooltip', '.remark-tooltip', function() {
    $('.custom-tooltip').remove();
});
