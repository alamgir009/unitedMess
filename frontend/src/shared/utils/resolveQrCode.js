export function resolveQrCode(context, adminQrCodes = {}) {
    if (context === 'payment') {
        return adminQrCodes.paymentQrCode || adminQrCodes.gasBillQrCode || null;
    }
    if (context === 'gasBill') {
        return adminQrCodes.gasBillQrCode || adminQrCodes.paymentQrCode || null;
    }
    return null;
}
