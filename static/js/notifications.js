// Notification utility functions
function showNotification(title, message, type = 'info') {
    const toast = $('#notificationToast');
    const toastTitle = $('#toastTitle');
    const toastMessage = $('#toastMessage');
    
    // Set icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toastTitle.html(`<i class="fas ${icon} me-2"></i><span style='font-weight:bold;font-size:1.2em;'>${title}</span>`);
    toastMessage.html(`<span style='font-size:1.1em;font-weight:500;'>${message.replace(/\n/g, '<br>')}</span>`);
    
    // Add appropriate classes
    toast.removeClass('bg-success bg-danger bg-warning bg-info')
         .addClass(`bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}`);
    
    // Add custom style for more visible toast
    toast.css({
        'box-shadow': '0 8px 32px rgba(0,0,0,0.22)',
        'border-radius': '12px',
        'border': '2px solid #fff',
        'font-family': 'Segoe UI, Arial, sans-serif',
        'min-width': '340px',
        'max-width': '420px',
        'padding': '0',
        'animation': 'toast-pop 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
    });
    toast.find('.toast-header').css({
        'background': type === 'success' ? '#198754' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#0dcaf0',
        'color': type === 'warning' ? '#222' : '#fff',
        'font-size': '1.1em',
        'font-weight': 'bold',
        'border-radius': '10px 10px 0 0',
        'padding': '10px 16px'
    });
    toast.find('.toast-body').css({
        'padding': '16px',
        'font-size': '1.1em',
        'color': '#222',
        'background': '#fff',
        'border-radius': '0 0 10px 10px'
    });
    // Add animation keyframes if not present
    if (!document.getElementById('toast-pop-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-pop-keyframes';
        style.innerHTML = `@keyframes toast-pop {0%{transform:scale(0.7);opacity:0;} 60%{transform:scale(1.08);opacity:1;} 100%{transform:scale(1);opacity:1;}}`;
        document.head.appendChild(style);
    }
    // Show toast
    const bsToast = new bootstrap.Toast(toast[0], { delay: 4000 });
    bsToast.show();
}

function showConfirmModal(title, message, onConfirm) {
    const modal = $('#confirmModal');
    $('#confirmModalTitle').text(title);
    $('#confirmModalBody').text(message);
    
    // Remove any existing click handlers
    $('#confirmModalConfirm').off('click');
    
    // Add new click handler
    $('#confirmModalConfirm').on('click', function() {
        onConfirm();
        modal.modal('hide');
    });
    
    modal.modal('show');
}

// Common notification types
const notifications = {
    success: (message) => showNotification('Success', message, 'success'),
    error: (message) => showNotification('Error', message, 'error'),
    warning: (message) => showNotification('Warning', message, 'warning'),
    info: (message) => showNotification('Information', message, 'info'),
    
    // Common confirmations
    confirmDelete: (itemName, onConfirm) => {
        showConfirmModal(
            'Confirm Delete',
            `Are you sure you want to delete this ${itemName}?`,
            onConfirm
        );
    },
    
    confirmBulkDelete: (itemName, count, onConfirm) => {
        showConfirmModal(
            'Confirm Delete',
            `Are you sure you want to delete ${count} selected ${itemName}(s)?`,
            onConfirm
        );
    },
    
    confirmAction: (title, message, onConfirm) => {
        showConfirmModal(title, message, onConfirm);
    }
}; 