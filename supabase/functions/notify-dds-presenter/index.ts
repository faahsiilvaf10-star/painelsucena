import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DDSSchedule {
  id: string;
  scheduled_date: string;
  theme: string;
  presenter_user_id: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  cargo: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Looking for DDS scheduled for: ${tomorrowStr}`);

    // Fetch tomorrow's DDS
    const { data: ddsData, error: ddsError } = await supabase
      .from("dds_schedule")
      .select("*")
      .eq("scheduled_date", tomorrowStr)
      .maybeSingle();

    if (ddsError) {
      console.error("Error fetching DDS schedule:", ddsError);
      throw ddsError;
    }

    if (!ddsData) {
      console.log("No DDS scheduled for tomorrow");
      return new Response(
        JSON.stringify({ message: "No DDS scheduled for tomorrow", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dds = ddsData as DDSSchedule;
    console.log(`Found DDS: ${dds.theme} for user ${dds.presenter_user_id}`);

    // Fetch presenter's profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name, cargo")
      .eq("user_id", dds.presenter_user_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    if (!profileData) {
      console.error("Presenter profile not found");
      return new Response(
        JSON.stringify({ error: "Presenter profile not found", sent: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profile = profileData as Profile;

    // Get presenter's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      dds.presenter_user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("Error fetching user email:", userError);
      return new Response(
        JSON.stringify({ error: "Could not find presenter email", sent: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const presenterEmail = userData.user.email;
    console.log(`Sending notification to: ${presenterEmail}`);

    // Format date for display
    const formattedDate = new Date(dds.scheduled_date).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send email notification
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Painel Sucena <onboarding@resend.dev>",
      to: [presenterEmail],
      subject: `🎤 Lembrete: Você é o palestrante do DDS de amanhã!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">☀️ DDS de Amanhã</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Diálogo Diário de Segurança</p>
            </div>
            
            <!-- Content -->
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; color: #1e293b; margin-bottom: 20px;">
                Olá, <strong>${profile.full_name}</strong>! 👋
              </p>
              
              <p style="color: #475569; line-height: 1.6;">
                Este é um lembrete de que você é o <strong>palestrante do DDS</strong> de amanhã.
              </p>
              
              <!-- Info Card -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="margin-bottom: 16px;">
                  <span style="color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">📅 Data</span>
                  <p style="color: #78350f; font-size: 16px; font-weight: 600; margin: 4px 0 0 0; text-transform: capitalize;">${formattedDate}</p>
                </div>
                
                <div>
                  <span style="color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">📋 Tema</span>
                  <p style="color: #78350f; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">${dds.theme}</p>
                </div>
              </div>
              
              <p style="color: #475569; line-height: 1.6;">
                Por favor, prepare-se para conduzir a discussão sobre este tema com sua equipe.
              </p>
              
              <!-- Tips -->
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #334155; font-weight: 600; margin: 0 0 8px 0;">💡 Dicas para um bom DDS:</p>
                <ul style="color: #64748b; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Prepare exemplos práticos relacionados ao tema</li>
                  <li>Incentive a participação de todos</li>
                  <li>Mantenha o foco em segurança</li>
                  <li>Seja breve e objetivo (5-10 minutos)</li>
                </ul>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
                Esta é uma mensagem automática do Painel Sucena
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        message: `Notification sent to ${profile.full_name}`,
        email: presenterEmail,
        theme: dds.theme,
        date: dds.scheduled_date,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-dds-presenter:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
