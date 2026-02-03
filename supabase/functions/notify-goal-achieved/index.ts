import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoalAchievedRequest {
  goalType: "jardinagem" | "gabiao";
  goalName: string;
  currentValue: number;
  targetValue: number;
  periodLabel: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, message: "Email not configured, notification skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { goalType, goalName, currentValue, targetValue, periodLabel }: GoalAchievedRequest = await req.json();

    console.log(`Goal achieved notification request:`, { goalType, goalName, currentValue, targetValue, periodLabel });

    // Get admin users and planejador to notify
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, cargo");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get admin user IDs
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw adminError;
    }

    const adminUserIds = adminRoles?.map(r => r.user_id) || [];

    // Filter profiles to get admins and planejadores
    const targetProfiles = profiles?.filter(p => 
      adminUserIds.includes(p.user_id) || p.cargo === "planejador"
    ) || [];

    if (targetProfiles.length === 0) {
      console.log("No admin or planejador users found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get email addresses from auth.users
    const userIds = targetProfiles.map(p => p.user_id);
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const allEmails = authData.users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!);

    if (allEmails.length === 0) {
      console.log("No email addresses found for target users");
      return new Response(
        JSON.stringify({ success: true, message: "No email addresses found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Resend sandbox mode only allows sending to the verified account email
    // Filter to only include the verified email to avoid 403 errors
    const verifiedEmail = "ffaahsiilva@gmail.com";
    const targetEmails = allEmails.filter(email => email === verifiedEmail);

    if (targetEmails.length === 0) {
      console.log("No verified emails found among recipients. Sandbox mode restricts sending to:", verifiedEmail);
      console.log("Intended recipients were:", allEmails);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email skipped - Resend sandbox mode. Configure domain at resend.com/domains to send to all recipients.",
          intendedRecipients: allEmails 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emoji = goalType === "jardinagem" ? "🌿" : "🧱";
    const teamName = goalType === "jardinagem" ? "Jardinagem" : "Gabião";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meta Atingida!</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${goalType === 'jardinagem' ? '#16a34a' : '#ea580c'} 0%, ${goalType === 'jardinagem' ? '#22c55e' : '#f97316'} 100%); padding: 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">${emoji}🎉</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Meta Atingida!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Equipe ${teamName}</p>
              <h2 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">${goalName}</h2>
            </div>
            
            <!-- Stats -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Realizado:</span>
                <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${currentValue.toLocaleString('pt-BR')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Meta:</span>
                <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${targetValue.toLocaleString('pt-BR')}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 14px;">Período:</span>
                <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${periodLabel}</span>
              </div>
            </div>
            
            <!-- Progress bar -->
            <div style="background-color: #e2e8f0; border-radius: 999px; height: 12px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); height: 100%; width: 100%; border-radius: 999px;"></div>
            </div>
            <p style="text-align: center; color: #22c55e; font-weight: 600; margin-top: 8px;">100% Concluído ✓</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              Painel Sucena - Sistema de Gestão
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending email to ${targetEmails.length} recipients:`, targetEmails);

    // Send email to all recipients
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Painel Sucena <noreply@resend.dev>",
      to: targetEmails,
      subject: `${emoji} Meta Atingida: ${goalName} - ${teamName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, message: "Email notification sent", emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-goal-achieved:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
