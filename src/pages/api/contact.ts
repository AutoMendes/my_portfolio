export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get('name')?.toString().trim() ?? '';
  const email = formData.get('email')?.toString().trim() ?? '';
  const subject = formData.get('_subject')?.toString().trim() ?? '';
  const message = formData.get('message')?.toString().trim() ?? '';
  const redirectTo = formData.get('redirect')?.toString() ?? '/contact';

  const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/contact';

  if (!name || !email || !message) {
    return redirect(`${safeRedirect}?error=missing`, 303);
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return redirect(`${safeRedirect}?error=send`, 303);
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `${name} via Portfolio Contact <onboarding@resend.dev>`,
      to: 'tiagolobo.eng@gmail.com',
      replyTo: email,
      subject: subject || `New message from ${name}`,
      text: `${message}\n\n—\n${name} <${email}>`,
    });

    if (error) {
      console.error('Resend send failed:', error);
      return redirect(`${safeRedirect}?error=send`, 303);
    }
  } catch (err) {
    console.error('Resend send threw:', err);
    return redirect(`${safeRedirect}?error=send`, 303);
  }

  return redirect(`${safeRedirect}?sent=true`, 303);
};
