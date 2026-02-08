/**
 * Copies text to clipboard and opens WhatsApp Web with the text pre-filled.
 */
export async function copyAndShareWhatsApp(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    // Open WhatsApp with pre-filled text
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    return true;
  } catch {
    return false;
  }
}
