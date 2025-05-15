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
        // Use the empty state template if available
        const $emptyTemplate = $('#emptyStateTemplate');
        if ($emptyTemplate.length) {
            $tableBody.append($emptyTemplate.html());
        } else {
            const label = type === 'Income' ? 'incomes' : 'expenses';
            const message = isSharedWith ? `No ${label} have been shared with you` : `You haven't shared any ${label}`;
            $tableBody.html(`<tr><td colspan="6" class="text-center">${message}</td></tr>`);
        }
        return;
    }
    
    // Define category icons
    const categoryIcons = {
        'Food': 'fa-utensils',
        'Transportation': 'fa-car',
        'Entertainment': 'fa-film',
        'Shopping': 'fa-shopping-bag',
        'Bills': 'fa-file-invoice-dollar',
        'Other': 'fa-tags',
        'Salary': 'fa-money-bill-wave',
        'Bonus': 'fa-gift',
        'Interest': 'fa-piggy-bank',
        'Transfer_family': 'fa-home',
        'Gift': 'fa-gift'
    };
    
    data.forEach(item => {
        const isBulk = item.is_bulk;
        const categories = isBulk ? item.categories : [item.category];
        
        // Format category display with badges and tooltip for multiple categories
        let categoryDisplay = '';
        if (categories.length > 2) {
            // For more than 2 categories, show 2 with badges and +X more
            const allCategoriesText = categories.join(', ');
            categoryDisplay = `
                <div class="category-container" title="${allCategoriesText}">
                    ${formatCategoryBadge(categories[0], categoryIcons)}
                    ${formatCategoryBadge(categories[1], categoryIcons)}
                    <span class="badge bg-secondary ms-1 category-more">+${categories.length - 2} more</span>
                </div>
            `;
        } else {
            // For 1-2 categories, show all with badges
            categoryDisplay = categories.map(cat => formatCategoryBadge(cat, categoryIcons)).join(' ');
        }
        
        // Format user display with badge
        const userIcon = isSharedWith ? 'fa-user' : 'fa-share-alt';
        const userName = isSharedWith ? item.shared_by : item.shared_with;
        const userDisplay = `
            <span class="user-badge">
                <i class="fas ${userIcon}"></i>${userName}
            </span>
        `;
        
        // Format amount
        const amountClass = type === 'Income' ? 'amount-positive' : 'amount-negative';
        const amountDisplay = `<span class="${amountClass}">$${(item.total_amount || item.amount).toFixed(2)}</span>`;
        
        // Format date
        const dateDisplay = `<span class="date-text">${formatDate(item.date)}</span>`;
        
        // Format description/label
        let mainLabel = '';
        if (isBulk) {
            const count = item.expense_count || item.Income_count || (item.details?.length || 0);
            mainLabel = `<span class="description-text"><i class="fas fa-layer-group me-1"></i>Multiple items (${count})</span>`;
        } else {
            mainLabel = `<span class="description-text" title="${item.description || ''}">${getShortRemark(item.description)}</span>`;
        }
        
        // Create row HTML
        const row = `
            <tr id="share-row-${item.shared_id}">
                <td>
                    <div class="d-flex flex-column">
                        <div class="d-flex align-items-center">
                            ${isBulk ? `<button class="btn btn-link p-0 me-2" onclick="toggleDetails(${item.id}, '${type}', '${isBulk}')"><i class="fas fa-chevron-right" id="icon-${type}-${item.id}"></i></button>` : ''}
                            ${mainLabel}
                            ${isBulk && item.details?.some(d => d.is_repeat)
                                ? '<span class="badge bg-warning ms-2">Contains individually shared items</span>'
                                : ''}
                        </div>
                    </div>
                </td>
                <td>${userDisplay}</td>
                <td>${categoryDisplay}</td>
                <td>${amountDisplay}</td>
                <td>${dateDisplay}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <button class="action-btn delete-btn" 
                            data-shared-id="${item.shared_id}" 
                            data-type="${type}"
                            onclick="cancelShare(this, ${item.shared_id}, '${type}')"
                            title="Cancel Share">
                            <i class="fas fa-times"></i>
                        </button>
                        ${!isBulk && item.is_repeat ? '<span class="badge bg-warning ms-2">Repeat</span>' : ''}
                    </div>
                </td>
            </tr>
        `;

        $tableBody.append(row);

        // Add details row for bulk items
        if (isBulk && item.details && item.details.length) {
            const $detailsRow = $(`<tr id="details-${type}-${item.id}" class="details-row" style="display: none;"><td colspan="6"></td></tr>`);
            const $detailsTable = $('<table class="table table-sm mb-0"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody></tbody></table>');
            
            item.details.forEach(detail => {
                $detailsTable.find('tbody').append(`
                    <tr>
                        <td><span class="date-text">${formatDate(detail.date)}</span></td>
                        <td>${formatCategoryBadge(detail.category, categoryIcons)}</td>
                        <td title="${detail.description}"><span class="description-text">${getShortRemark(detail.description)}</span></td>
                        <td><span class="${type === 'Income' ? 'amount-positive' : 'amount-negative'}">$${detail.amount.toFixed(2)}</span></td>
                        <td>${detail.is_repeat ? '<span class="badge bg-warning">Already shared individually</span>' : ''}</td>
                    </tr>
                `);
            });
            
            $detailsRow.find('td').append($('<div class="ms-4 p-3 mt-2" style="background: rgba(185, 168, 194, 0.03); border-radius: 8px;"></div>').append($detailsTable));
            $tableBody.append($detailsRow);
        }
    });
    
    // Initialize tooltips for categories
    initializeCategoryTooltips();
}

// Helper to format date nicely
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

// Helper to format category with badge and icon
function formatCategoryBadge(category, categoryIcons) {
    const icon = categoryIcons[category] || 'fa-tag';
    return `
        <span class="category-badge">
            <i class="fas ${icon}"></i>${category}
        </span>
    `;
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
            contentType: 'application/json',
            data: JSON.stringify({ shared_id: sharedId }),
            success: function(response) {
                notifications.success('Share canceled successfully');
                // Reload all data after a successful operation
                loadAllSharedData(new Date().getTime());
            },
            error: function(err) {
                $(button).prop('disabled', false).html('<i class="fas fa-times"></i>');
                console.error('Error canceling share:', err);
                notifications.error('Failed to cancel sharing');
            }
        });
    }, function() {
        // If user cancels the confirmation, re-enable the button
        $(button).prop('disabled', false).html('<i class="fas fa-times"></i>');
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

// Add initializeCategoryTooltips function
function initializeCategoryTooltips() {
    // Use Bootstrap tooltips if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('.category-container'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl, {
                placement: 'top',
                trigger: 'hover',
                html: true
            });
        });
    } else {
        // Fallback to custom tooltip handling
        $('.category-container').on('mouseenter', function() {
            const allCategories = $(this).attr('title');
            if (allCategories) {
                showCategoryTooltip($(this), allCategories);
                $(this).attr('data-original-title', allCategories).removeAttr('title');
            }
        }).on('mouseleave', function() {
            $('.category-tooltip').remove();
        });
    }
}

// Helper function to show custom tooltip for categories
function showCategoryTooltip($el, categories) {
    const categoriesArray = categories.split(', ');
    let tooltipContent = categoriesArray.map(cat => `<div class="tooltip-category">${cat}</div>`).join('');
    
    const $tip = $(`<div class="category-tooltip"><div class="tooltip-inner">${tooltipContent}</div><div class="tooltip-arrow"></div></div>`).appendTo('body');
    const offset = $el.offset();
    const width = $el.outerWidth();
    const height = $el.outerHeight();
    
    $tip.css({
        left: offset.left + (width / 2) - ($tip.outerWidth() / 2),
        top: offset.top - $tip.outerHeight() - 5,
        position: 'absolute',
        zIndex: 1070,
        display: 'block'
    });
}
