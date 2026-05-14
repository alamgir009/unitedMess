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
                scale: 3, // Increased scale for ultra-crisp fintech grade quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',   // Always white
                removeContainer: true,
                imageTimeout: 0,
                width: 680,                   // Fixed width for consistent output
            });

            const margin = 10;
            const pageW = 210; // Standard A4 width in mm
            const usableW = pageW - margin * 2;
            const canvasImgAspectRatio = canvas.height / canvas.width;
            const usableH = usableW * canvasImgAspectRatio;
            const pageH = usableH + margin * 2;

            const pdf = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: [pageW, pageH], 
                compress: true 
            });

            // Adjusted JPEG quality to 0.75 to keep file size small while maintaining crisp text due to high scale
            const imgData = canvas.toDataURL('image/jpeg', 0.75);
            pdf.addImage(imgData, 'JPEG', margin, margin, usableW, usableH, undefined, 'FAST');

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
