const gold = "#febe4c";
const navy = "#0f172a";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string) {
  return `
  <div style="font-family: Poppins, Arial, sans-serif; background:#f8fafc; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden;">
      <div style="background:${navy}; color:#fff; padding:20px 24px;">
        <h1 style="margin:0; font-size:20px;">Dukandar Shandar</h1>
        <p style="margin:6px 0 0; color:${gold}; font-size:13px;">${title}</p>
      </div>
      <div style="padding:24px; color:${navy}; font-size:15px; line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 24px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">
        Stationery &amp; craft supplies
      </div>
    </div>
  </div>`;
}

export function contactShopEmail(input: { name: string; email: string; subject?: string; message: string }) {
  return layout(
    "New contact message",
    `<p><strong>${escapeHtml(input.name)}</strong> (${escapeHtml(input.email)}) wrote:</p>
     <p><strong>Subject:</strong> ${escapeHtml(input.subject || "General enquiry")}</p>
     <p>${escapeHtml(input.message).replace(/\n/g, "<br/>")}</p>`
  );
}

export function contactCustomerEmail(name: string) {
  return layout(
    "We received your message",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Thanks for contacting Dukandar Shandar. We have your message and will reply as soon as we can.</p>
     <p>Warm regards,<br/>The Dukandar Shandar team</p>`
  );
}

export function newsletterWelcomeEmail() {
  return layout(
    "Welcome to the list",
    `<p>You are subscribed to Dukandar Shandar updates, new stationery, craft finds, and shop news.</p>
     <p>We will only send useful notes, never spam.</p>`
  );
}

export function orderConfirmationEmail(input: {
  name: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  address?: string;
  city?: string;
}) {
  const rows = input.items
    .map(
      (item) =>
          `<tr>
          <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">PKR ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  return layout(
    "Order confirmed",
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>Thank you for your order <strong>#${escapeHtml(input.orderId)}</strong>.</p>
     <table style="width:100%; border-collapse:collapse;">${rows}</table>
     <p style="margin-top:16px;"><strong>Total: PKR ${input.total.toLocaleString()}</strong></p>
     ${input.address ? `<p>Shipping to: ${escapeHtml(input.address)}${input.city ? `, ${escapeHtml(input.city)}` : ""}</p>` : ""}
     <p>We will email you again when the status changes.</p>`
  );
}

export function orderStatusEmail(input: { name: string; orderId: string; status: string }) {
  return layout(
    `Order ${input.status}`,
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>Your order <strong>#${escapeHtml(input.orderId)}</strong> is now <strong>${escapeHtml(input.status)}</strong>.</p>
     <p>Thank you for shopping with Dukandar Shandar.</p>`
  );
}
