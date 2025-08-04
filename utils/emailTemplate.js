// Email template for Paddime
// Usage: emailTemplate({ subject, content })

const LOGO_URL = 'https://raw.githubusercontent.com/yourusername/yourrepo/main/giftcard-app/assets/logo.png'; // Replace with your actual logo URL

export default function emailTemplate({ subject, content }) {
  return `
  <body style="margin:0;padding:0;background:#30399F;min-height:100vh;width:100vw;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#30399F;min-height:100vh;">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;">
            <tr>
              <td align="center" style="background:#30399F;padding:32px 0 16px 0;">
                <img src="${LOGO_URL}" alt="Paddime Logo" style="height:60px;margin-bottom:8px;display:block;" />
                <h1 style="color:#fff;margin:0;font-size:2.2rem;letter-spacing:2px;font-family:sans-serif;">Paddime</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px 32px 24px;">
                <h2 style="color:#30399F;margin-top:0;font-family:sans-serif;">${subject}</h2>
                <div style="font-size:16px;color:#222;font-family:sans-serif;line-height:1.7;">
                  ${content}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#f4f7fb;padding:18px 0;border-radius:0 0 18px 18px;">
                <span style="color:#aaa;font-size:13px;font-family:sans-serif;">&copy; ${new Date().getFullYear()} Paddime</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `;
} 