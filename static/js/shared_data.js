// Ensure DOM is ready
$(document).ready(() => {
    loadAllSharedData();
    
    // Set up manual refresh button if you have one
    $("#refreshButton").on("click", function() {
        loadAllSharedData();
});
});

// Load all shared data
function loadAllSharedData(cacheBuster) {
    // Use current timestamp if no cache buster provided
    cacheBuster = cacheBuster || new Date().getTime();
    
    // Clear all tables first
    $('#sharedByMeTableBody').empty();
    $('#sharedByMeIncomeTableBody').empty();
    $('#sharedWithMeTableBody').empty();
    $('#sharedWithMeIncomeTableBody').empty();
    
    // Show loading indicators
    const tables = ['#sharedByMeTableBody', '#sharedByMeIncomeTableBody', 
                   '#sharedWithMeTableBody', '#sharedWithMeIncomeTableBody'];
    
    tables.forEach(table => {
        $(table).html('<tr><td colspan="6" class="text-center">Loading...</td></tr>');
    });
    
    // Load shared by me data
    $.ajax({
        url: '/api/share/by-me?_=' + cacheBuster,
        method: 'GET',
        xhrFields: {
        withCredentials: true
    },
        dataType: 'json',
        cache: false,
        success: function(data) {
            renderTable(data, $('#sharedByMeTableBody'), '', false);
        },
        error: function(err) {
            $('#sharedByMeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
            console.error('Error loading shared by me data:', err);
            notifications.error('Failed to load shared expense data');
        }
    });
    
    // Load shared income by me data
    $.ajax({
        url: '/api/share/income/by-me?_=' + cacheBuster,
        method: 'GET',
        xhrFields: {
        withCredentials: true
    },
        dataType: 'json',
        cache: false,
        success: function(data) {
            renderTable(data, $('#sharedByMeIncomeTableBody'), 'Income', false);
        },
        error: function(err) {
            $('#sharedByMeIncomeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
            console.error('Error loading shared income by me data:', err);
            notifications.error('Failed to load shared income data');
        }
    });
    
    // Load shared with me data
    $.ajax({
        url: '/api/share/with-me?_=' + cacheBuster,
        method: 'GET',
        xhrFields: {
        withCredentials: true
    },
        dataType: 'json',
        cache: false,
        success: function(data) {
            renderTable(data, $('#sharedWithMeTableBody'), '', true);
        },
        error: function(err) {
            $('#sharedWithMeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
            console.error('Error loading shared with me data:', err);
            notifications.error('Failed to load expenses shared with you');
        }
    });
    
    // Load shared income with me data
    $.ajax({
        url: '/api/share/income/with-me?_=' + cacheBuster,
        method: 'GET',
        xhrFields: {
        withCredentials: true
    },
        dataType: 'json',
        cache: false,
        success: function(data) {
            renderTable(data, $('#sharedWithMeIncomeTableBody'), 'Income', true);
        },
        error: function(err) {
            $('#sharedWithMeIncomeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
            console.error('Error loading shared income with me data:', err);
            notifications.error('Failed to load income shared with you');
        }
    });
}

// Render a table with data
function renderTable(data, $tableBody, type, isSharedWith) {
    $tableBody.empty();
    
    if (!data || data.length === 0) {
        const label = type === 'Income' ? 'incomes' : 'expenses';
        const message = isSharedWith ? `No ${label} have been shared with you` : `You haven't shared any ${label}`;
        $tableBody.html(`<tr><td colspan="6" class="text-center">${message}</td></tr>`);
        return;
    }
    
    data.forEach(item => {
        const isBulk = item.is_bulk;
        const categories = isBulk ? item.categories : [item.category];
        const displayCategories = categories.length > 2 
            ? `${categories.slice(0, 2).join(', ')} +${categories.length - 2} more` 
            : categories.join(', ');
        
        const sharedLabel = item.shared_with 
            ? `Shared with: ${item.shared_with}` 
            : `Shared by: ${item.shared_by}`;
        
        // Format the description/label
        let mainLabel = '';
        if (isBulk) {
            const count = item.expense_count || item.Income_count || (item.details?.length || 0);
            mainLabel = `Multiple items (${count} merged)`;
        } else {
            mainLabel = `<span class="remark-tooltip" data-remark="${item.description || ''}">${getShortRemark(item.description)}</span>`;
        }
        
        // Create row HTML
        const row = `
            <tr id="share-row-${item.shared_id}">
                <td>
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            ${isBulk ? `<button class="btn btn-link p-0" onclick="toggleDetails(${item.id}, '${type}', '${isBulk}')"><i class="fas fa-chevron-right" id="icon-${type}-${item.id}"></i></button>` : ''}
                            ${isBulk ? `<span class="me-2">${mainLabel}</span>` : mainLabel}
                            ${isBulk && item.details?.some(d => d.is_repeat)
                                ? '<span class="badge bg-warning ms-2">Contains individually shared items</span>'
                                : ''}
                        </div>
                    </div>
                </td>
                <td><small class="text-muted">${sharedLabel}</small></td>
                <td><span class="categories-tooltip" data-bs-toggle="tooltip" title="${categories.join('<br>')}">${displayCategories}</span></td>
                <td>$${(item.total_amount || item.amount).toFixed(2)}</td>
                <td>${item.date}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-danger btn-sm me-2 cancel-share-btn" 
                            data-shared-id="${item.shared_id}" 
                            data-type="${type}"
                            onclick="cancelShare(this, ${item.shared_id}, '${type}')">
                            Cancel Share
                        </button>
                        ${!isBulk && item.is_repeat ? '<span class="badge bg-warning ms-2">Repeat</span>' : ''}
                    </div>
                </td>
            </tr>
        `;

        $tableBody.append(row);

        // Add details row for bulk items
        if (isBulk && item.details && item.details.length) {
            const $detailsRow = $(`<tr id="details-${type}-${item.id}" style="display: none;"><td colspan="6"></td></tr>`);
            const $detailsTable = $('<table class="table table-sm mb-0"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody></tbody></table>');
            
            item.details.forEach(detail => {
                $detailsTable.find('tbody').append(`
                    <tr>
                        <td>${detail.date}</td>
                        <td>${detail.category}</td>
                        <td title="${detail.description}"><span class="remark-tooltip" data-remark="${detail.description}">${getShortRemark(detail.description)}</span></td>
                        <td>$${detail.amount.toFixed(2)}</td>
                        <td>${detail.is_repeat ? '<span class="badge bg-warning">Already shared individually</span>' : ''}</td>
                    </tr>
                `);
            });
            
            $detailsRow.find('td').append($('<div class="ms-4"></div>').append($detailsTable));
            $tableBody.append($detailsRow);
        }
    });

    // Initialize tooltips
    if (bootstrap.Tooltip && bootstrap.Tooltip.getInstance) {
        new bootstrap.Tooltip(document.body, { selector: '[data-bs-toggle="tooltip"]', html: true });
}
}

// Toggle details for bulk items
function toggleDetails(id, type, isBulk) {
    const isVisible = $(`#details-${type}-${id}`).is(':visible');
    $(`#details-${type}-${id}`).toggle(!isVisible);
    $(`#icon-${type}-${id}`).toggleClass('fa-chevron-right fa-chevron-down');
}
window.toggleDetails = toggleDetails;

// Cancel a share
function cancelShare(button, sharedId, type) {
    // Disable button to prevent multiple clicks
    $(button).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
    
    notifications.confirmDelete('share', function() {
    $.ajax({
        url: `/api/share${type ? "/income" : ""}/cancel`,
        method: 'POST',
        xhrFields: {
        withCredentials: true
    },
        contentType: 'application/json',
        data: JSON.stringify({ shared_id: sharedId }),
            success: function(response) {
                // Completely clear and rebuild all tables to ensure clean state
                const tables = ['#sharedByMeTableBody', '#sharedByMeIncomeTableBody', 
                               '#sharedWithMeTableBody', '#sharedWithMeIncomeTableBody'];
                
                tables.forEach(table => {
                    $(table).empty().html('<tr><td colspan="6" class="text-center">Refreshing...</td></tr>');
                });
                
                // Add a small forced delay to ensure backend has time to update all records
                setTimeout(function() {
                    // Force browser to make fresh requests by adding a cache-busting parameter
                    const cacheBuster = new Date().getTime();
                    
                    // Rebuild shared by me data
                    $.ajax({
                        url: '/api/share/by-me?_=' + cacheBuster,
                        method: 'GET',
                        xhrFields: {
        withCredentials: true
    },
                        dataType: 'json',
                        cache: false,
                        success: function(data) {
                            renderTable(data, $('#sharedByMeTableBody'), '', false);
                        },
                        error: function(err) {
                            $('#sharedByMeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
                            console.error('Error loading shared by me data:', err);
                            notifications.error('Failed to refresh shared expense data');
        }
    });
                    
                    // Rebuild shared income by me data
                    $.ajax({
                        url: '/api/share/income/by-me?_=' + cacheBuster,
                        method: 'GET',
                        xhrFields: {
        withCredentials: true
    },
                        dataType: 'json',
                        cache: false,
                        success: function(data) {
                            renderTable(data, $('#sharedByMeIncomeTableBody'), 'Income', false);
                        },
                        error: function(err) {
                            $('#sharedByMeIncomeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
                            console.error('Error loading shared income by me data:', err);
                            notifications.error('Failed to refresh shared income data');
                        }
                    });
                    
                    // Rebuild shared with me data
                    $.ajax({
                        url: '/api/share/with-me?_=' + cacheBuster,
                        method: 'GET',
                        xhrFields: {
        withCredentials: true
    },
                        dataType: 'json',
                        cache: false,
                        success: function(data) {
                            renderTable(data, $('#sharedWithMeTableBody'), '', true);
                        },
                        error: function(err) {
                            $('#sharedWithMeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
                            console.error('Error loading shared with me data:', err);
                            notifications.error('Failed to refresh expenses shared with you');
                        }
                    });
                    
                    // Rebuild shared income with me data
                    $.ajax({
                        url: '/api/share/income/with-me?_=' + cacheBuster,
                        method: 'GET',
                        xhrFields: {
        withCredentials: true
    },
                        dataType: 'json',
                        cache: false,
                        success: function(data) {
                            renderTable(data, $('#sharedWithMeIncomeTableBody'), 'Income', true);
                        },
                        error: function(err) {
                            $('#sharedWithMeIncomeTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
                            console.error('Error loading shared income with me data:', err);
                            notifications.error('Failed to refresh income shared with you');
                        }
                    });
                    
                    notifications.success('Share canceled successfully');
                }, 150);
            },
            error: function(xhr) {
                // Re-enable button on error
                $(button).prop('disabled', false).html('Cancel Share');
                notifications.error(xhr.responseJSON?.error || 'Failed to cancel share');
            }
        });
    });
}
window.cancelShare = cancelShare;

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
