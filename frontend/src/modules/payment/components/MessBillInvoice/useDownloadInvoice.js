import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

export const useDownloadInvoice = () => {
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadPDF = async ({ printRef, fileName, title, subject }) => {
        if (!printRef || !printRef.current) return;
        try {
            setIsDownloading(true);
            await new Promise((r) => setTimeout(r, 100)); // allow React to flush renders

            const canvas = await html2canvas(printRef.current, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',   // Always white
                removeContainer: true,
                imageTimeout: 0,
                width: 680,                   // Fixed width for consistent output
            });

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableW = pageW - margin * 2;
            const usableH = pageH - margin * 2;
            const pageHeightPx = Math.floor((canvas.width * usableH) / usableW);

            let offsetY = 0;
            let page = 0;

            while (offsetY < canvas.height) {
                if (page > 0) pdf.addPage();

                const sliceH = Math.min(pageHeightPx, canvas.height - offsetY);
                const slice = document.createElement('canvas');
                slice.width = canvas.width;
                slice.height = sliceH;
                slice.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

                const sliceData = slice.toDataURL('image/jpeg', 0.85);
                const sliceRenderedH = (sliceH / canvas.width) * usableW;
                pdf.addImage(sliceData, 'JPEG', margin, margin, usableW, sliceRenderedH, undefined, 'FAST');

                offsetY += pageHeightPx;
                page++;
            }

            pdf.setProperties({ 
                title: title || fileName, 
                subject: subject || 'Invoice', 
                creator: 'United Mess' 
            });
            pdf.save(`${fileName}.pdf`);
            toast.success('Invoice downloaded');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to download invoice');
        } finally {
            setIsDownloading(false);
        }
    };

    return { isDownloading, downloadPDF };
};
