/**
 * Copies text to clipboard and opens WhatsApp Web with the text pre-filled.
 */
export async function copyAndShareWhatsApp(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    // Open WhatsApp directly via API URL (avoids wa.me redirect that corrupts emojis)
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    return true;
  } catch {
    return false;
  }
}
