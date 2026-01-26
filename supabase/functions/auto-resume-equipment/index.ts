import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current day of week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only run on weekdays (Monday to Friday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("Weekend detected, skipping auto-resume");
      return new Response(
        JSON.stringify({
          message: "Skipped - Weekend",
          processed: 0,
          timestamp: now.toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("Starting auto-resume equipment job at", now.toISOString());

    // Get all equipment that is currently in "end_of_shift" status
    // Excluding maintenance - those should stay as they are
    const { data: endOfShiftEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select("*")
      .eq("stop_reason", "end_of_shift");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${endOfShiftEquipment?.length || 0} equipment in end_of_shift status`);

    const resumeTime = now.toISOString();
    const results = [];
    const resumedEquipmentNames: string[] = [];

    for (const equipment of endOfShiftEquipment || []) {
      // Close the end_of_shift history entry
      const { error: historyUpdateError } = await supabase
        .from("equipment_stop_history")
        .update({
          ended_at: resumeTime,
          duration_minutes: equipment.stop_start_time 
            ? Math.floor((now.getTime() - new Date(equipment.stop_start_time).getTime()) / 60000)
            : 0,
        })
        .eq("equipment_id", equipment.id)
        .eq("stop_reason", "end_of_shift")
        .is("ended_at", null);

      if (historyUpdateError) {
        console.error(`Error updating history for ${equipment.name}:`, historyUpdateError);
      }

      // Update equipment to operating state
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          stop_reason: "none",
          stop_start_time: null,
          updated_at: resumeTime,
        })
        .eq("id", equipment.id);

      if (updateError) {
        console.error(`Error updating ${equipment.name}:`, updateError);
      }

      const success = !historyUpdateError && !updateError;
      results.push({
        equipment: equipment.name,
        success,
      });

      if (success) {
        resumedEquipmentNames.push(equipment.name);
      }

      console.log(`Resumed ${equipment.name}: ${success ? 'success' : 'failed'}`);
    }

    // Create notifications for users if any equipment was resumed
    if (resumedEquipmentNames.length > 0) {
      console.log("Creating notifications for resumed equipment...");

      // Get all users who should be notified (admins and relevant cargo types)
      const { data: usersToNotify, error: usersError } = await supabase
        .from("profiles")
        .select("user_id, cargo")
        .in("cargo", [
          "preposto",
          "encarregado_geral", 
          "encarregado_i", 
          "encarregado_ii",
          "tecnico_seguranca_i",
          "tecnico_seguranca_ii"
        ]);

      if (usersError) {
        console.error("Error fetching users to notify:", usersError);
      } else if (usersToNotify && usersToNotify.length > 0) {
        // Also get admin users
        const { data: adminRoles, error: adminError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminError) {
          console.error("Error fetching admin users:", adminError);
        }

        // Combine user IDs (avoid duplicates)
        const userIds = new Set<string>();
        usersToNotify.forEach(u => userIds.add(u.user_id));
        adminRoles?.forEach(a => userIds.add(a.user_id));

        const equipmentList = resumedEquipmentNames.length <= 3 
          ? resumedEquipmentNames.join(", ")
          : `${resumedEquipmentNames.slice(0, 3).join(", ")} e mais ${resumedEquipmentNames.length - 3}`;

        const notifications = Array.from(userIds).map(userId => ({
          user_id: userId,
          type: "equipment_auto_resume",
          title: "⚙️ Equipamentos Retomados Automaticamente",
          message: `${resumedEquipmentNames.length} equipamento(s) retomado(s) às 08:00: ${equipmentList}`,
          reference_type: "equipment",
        }));

        const { error: notifyError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifyError) {
          console.error("Error creating notifications:", notifyError);
        } else {
          console.log(`Created ${notifications.length} notifications for ${resumedEquipmentNames.length} resumed equipment`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Auto-resume completed",
        processed: results.length,
        resumed: resumedEquipmentNames.length,
        results,
        timestamp: resumeTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto-resume equipment error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});