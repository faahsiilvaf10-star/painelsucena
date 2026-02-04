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
      console.log("Weekend detected, skipping auto-stop");
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

    console.log("Starting auto-stop equipment job at", now.toISOString());

    // Get all equipment that is currently operating, waiting, or rain (not maintenance or already end_of_shift)
    // Munk equipment is excluded - drivers must manually end their shifts
    const { data: activeEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select("*")
      .in("stop_reason", ["none", "waiting", "rain"])
      .neq("equipment_type", "munk");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${activeEquipment?.length || 0} equipment to stop (operating, waiting, or rain - excluding munk)`);

    const endTime = now.toISOString();
    const results = [];
    const stoppedEquipmentNames: string[] = [];

    for (const equipment of activeEquipment || []) {
      // Create history entry for end of shift
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: equipment.id,
          stop_reason: "end_of_shift",
          started_at: endTime,
          ended_at: null,
          duration_minutes: null,
        });

      if (historyError) {
        console.error(`Error creating history for ${equipment.name}:`, historyError);
      }

      // Update equipment to end_of_shift state
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          stop_reason: "end_of_shift",
          stop_start_time: endTime,
          updated_at: endTime,
        })
        .eq("id", equipment.id);

      if (updateError) {
        console.error(`Error updating ${equipment.name}:`, updateError);
      }

      const success = !historyError && !updateError;
      results.push({
        equipment: equipment.name,
        previousStatus: equipment.stop_reason,
        success,
      });

      if (success) {
        stoppedEquipmentNames.push(equipment.name);
      }

      console.log(`Processed ${equipment.name} (was: ${equipment.stop_reason}): ${success ? 'success' : 'failed'}`);
    }

    // Create notifications for users if any equipment was stopped
    if (stoppedEquipmentNames.length > 0) {
      console.log("Creating notifications for stopped equipment...");

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

        const equipmentList = stoppedEquipmentNames.length <= 3 
          ? stoppedEquipmentNames.join(", ")
          : `${stoppedEquipmentNames.slice(0, 3).join(", ")} e mais ${stoppedEquipmentNames.length - 3}`;

        const notifications = Array.from(userIds).map(userId => ({
          user_id: userId,
          type: "equipment_auto_stop",
          title: "🌙 Fim de Turno Automático",
          message: `${stoppedEquipmentNames.length} equipamento(s) encerrado(s) às 16:30: ${equipmentList}`,
          reference_type: "equipment",
        }));

        const { error: notifyError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifyError) {
          console.error("Error creating notifications:", notifyError);
        } else {
          console.log(`Created ${notifications.length} notifications for ${stoppedEquipmentNames.length} stopped equipment`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Auto-stop completed",
        processed: results.length,
        stopped: stoppedEquipmentNames.length,
        results,
        timestamp: endTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto-stop equipment error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
