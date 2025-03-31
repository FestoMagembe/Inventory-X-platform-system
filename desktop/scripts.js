// Database operations
const { ipcRenderer } = require('electron');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

// DOM Elements
const productCountEl = document.querySelector('h3:first-child');
const lowStockCountEl = document.querySelectorAll('h3')[1];
const totalValueEl = document.querySelectorAll('h3')[2];
const recentActivityEl = document.querySelector('.space-y-4');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupEventListeners();
});

function loadDashboardData() {
    // In a real app, these would come from the database
    updateDashboard({
        totalProducts: 0,
        lowStockItems: 0,
        totalValue: 0
    });
}

function updateDashboard(data) {
    productCountEl.textContent = data.totalProducts;
    lowStockCountEl.textContent = data.lowStockItems;
    totalValueEl.textContent = `$${data.totalValue.toFixed(2)}`;
}

function setupEventListeners() {
    // Report generation button
    document.querySelector('button').addEventListener('click', generateReport);
}

async function generateReport() {
    try {
        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);

        // Draw title
        page.drawText('Inventory Report', {
            x: 50,
            y: 350,
            size: 24,
            color: rgb(0, 0, 0.8),
        });

        // Draw report date
        const now = new Date();
        page.drawText(`Generated: ${now.toLocaleString()}`, {
            x: 50,
            y: 320,
            size: 12,
            color: rgb(0, 0, 0.6),
        });

        // Draw summary table
        const summaryData = [
            ['Total Products', productCountEl.textContent],
            ['Low Stock Items', lowStockCountEl.textContent],
            ['Total Inventory Value', totalValueEl.textContent]
        ];

        let yPosition = 280;
        summaryData.forEach(([label, value]) => {
            page.drawText(`${label}:`, {
                x: 50,
                y: yPosition,
                size: 14,
                color: rgb(0, 0, 0),
            });
            page.drawText(value, {
                x: 200,
                y: yPosition,
                size: 14,
                color: rgb(0, 0, 0),
            });
            yPosition -= 20;
        });

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const reportPath = `inventory_report_${Date.now()}.pdf`;
        fs.writeFileSync(reportPath, pdfBytes);

        // Notify user
        new Notification('Report Generated', {
            body: `PDF report saved as ${reportPath}`,
            icon: 'document.png'
        });

    } catch (error) {
        console.error('Error generating report:', error);
        new Notification('Report Error', {
            body: 'Failed to generate PDF report',
            icon: 'error.png'
        });
    }
}

// Product management functions
function addProduct(product) {
    // TODO: Implement product addition
}

function updateProduct(id, updates) {
    // TODO: Implement product updates
}

function deleteProduct(id) {
    // TODO: Implement product deletion
}

// Sync functions
function syncWithFirebase() {
    // TODO: Implement Firebase sync
}

// Utility functions
function showNotification(title, message) {
    new Notification(title, { body: message });
}