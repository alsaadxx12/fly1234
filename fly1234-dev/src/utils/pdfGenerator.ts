import html2canvas from 'html2canvas';
import { Employee } from '../lib/collections/employees';

const createPdfPage = (employee: Employee, images: { name: string; url: string }[]): string => {
    const imageElements = images.map(img => `
        <div class="image-container">
            <h2>${img.name}</h2>
            <img src="${img.url}" />
        </div>
    `).join('');

    return `
        <html>
            <head>
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .image-container { page-break-inside: avoid; border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; text-align: center; }
                    img { max-width: 100%; max-height: 80vh; }
                </style>
            </head>
            <body>
                <h1>ملفات الموظف: ${employee.name}</h1>
                ${imageElements}
            </body>
        </html>
    `;
};

export const generatePdf = async (employee: Employee) => {
    if (!employee.files || employee.files.length === 0) {
        alert('No files to export.');
        return;
    }

    const images = employee.files
        .filter(file => file.url)
        .map(file => ({ name: file.name, url: file.url }));
        
    const htmlContent = createPdfPage(employee, images);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
    } else {
        alert('Please allow popups to print the document.');
    }
};
