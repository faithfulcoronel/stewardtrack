// @ts-expect-error - Remote module provided by Deno at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Deno provides global `Deno` object in the execution environment
// Declare minimal types to satisfy the TypeScript compiler
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface EmailRequest {
  template_id: string;
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

function inviteUserTemplate(data: Record<string, unknown>): string {
  const firstName = data['first_name'] ?? 'there';
  const tenant = data['tenant_name'] ?? 'our site';
  const url = data['invitation_url'] ?? '#';
  return `
    <div>
      <p>Hello ${firstName},</p>
      <p>You have been invited to join <strong>${tenant}</strong>.</p>
      <p><a href="${url}">Accept Invitation</a></p>
    </div>
  `;
}

const templates: Record<string, (d: Record<string, unknown>) => string> = {
  'invite-user': inviteUserTemplate,
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return new Response('Unauthorized', { headers: corsHeaders, status: 401 });
    }

    const { template_id, to, subject, data } = await req.json() as EmailRequest;
    const templateFn = templates[template_id];
    if (!templateFn) {
      throw new Error('Unknown email template');
    }

    const html = templateFn(data);
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM_EMAIL');
    if (!apiKey || !from) {
      throw new Error('Email service not configured');
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
