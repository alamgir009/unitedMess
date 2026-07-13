import { useState } from 'react';
import { toast } from 'react-hot-toast';

export const useDownloadInvoice = () => {
    const [isDownloading, setIsDownloading] = useState(false);

    /**
     * Core PDF rendering logic — shared by download and email flows.
     * html2canvas + jspdf loaded lazily to keep PaymentPage chunk small.
     * Returns { pdf, pdfBlob } so callers can either save or convert to Base64.
     */
    const renderPDF = async ({ printRef, title, subject }) => {
        if (!printRef || !printRef.current) return null;

        const [html2canvasModule, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);
        const html2canvas = html2canvasModule.default;

        await new Promise((r) => setTimeout(r, 100));

        const canvas = await html2canvas(printRef.current, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            removeContainer: true,
            imageTimeout: 0,
            width: 680,
        });

        const margin = 10;
        const pageW = 210;
        const usableW = pageW - margin * 2;
        const canvasImgAspectRatio = canvas.height / canvas.width;
        const usableH = usableW * canvasImgAspectRatio;
        const pageH = usableH + margin * 2;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageW, pageH],
            compress: true,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        pdf.addImage(imgData, 'JPEG', margin, margin, usableW, usableH, undefined, 'FAST');

        pdf.setProperties({
            title: title || 'Invoice',
            subject: subject || 'Invoice',
            creator: 'United Mess',
        });

        const pdfBlob = pdf.output('blob');
        return { pdf, pdfBlob };
    };

    const downloadPDF = async ({ printRef, fileName, title, subject }) => {
        if (!printRef || !printRef.current) return;
        try {
            setIsDownloading(true);
            const result = await renderPDF({ printRef, title, subject });
            if (!result) return;
            result.pdf.save(`${fileName}.pdf`);
            toast.success('Invoice downloaded');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to download invoice');
        } finally {
            setIsDownloading(false);
        }
    };

    /**
     * Generate PDF and return it as a Base64 string (for email sending).
     */
    const generatePDFBase64 = async ({ printRef, title, subject }) => {
        try {
            const result = await renderPDF({ printRef, title, subject });
            if (!result) return null;

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1]; // strip data:application/pdf;base64,
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(result.pdfBlob);
            });
        } catch (err) {
            console.error('PDF base64 error:', err);
            return null;
        }
    };

    return { isDownloading, downloadPDF, generatePDFBase64 };
};
