import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL for an invite code
 * @param inviteCode The invite code to encode
 * @param baseUrl Base URL of the application (e.g., http://localhost:3000)
 * @returns Data URL of the QR code image
 */
export async function generateInviteQRCode(
  inviteCode: string,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<string> {
  const joinUrl = `${baseUrl}/join/${inviteCode}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    return qrDataUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a QR code as a buffer for storage
 * @param inviteCode The invite code to encode
 * @param baseUrl Base URL of the application
 * @returns Buffer containing the QR code image
 */
export async function generateInviteQRCodeBuffer(
  inviteCode: string,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<Buffer> {
  const joinUrl = `${baseUrl}/join/${inviteCode}`;

  try {
    const buffer = await QRCode.toBuffer(joinUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    return buffer;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}
