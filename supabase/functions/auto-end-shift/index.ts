import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting auto end-shift job at:", new Date().toISOString());

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all equipment that is NOT already in "end_of_shift" status AND NOT in "maintenance" status
    // Equipment in maintenance should NOT be affected by auto end-of-shift
    const { data: activeEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select("id, name, plate, stop_reason, driver")
      .neq("stop_reason", "end_of_shift")
      .neq("stop_reason", "maintenance");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${activeEquipment?.length || 0} equipment not in end_of_shift or maintenance status`);

    if (!activeEquipment || activeEquipment.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No equipment to update - all already in end_of_shift or maintenance",
          updated: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const now = new Date().toISOString();

    // Update all active equipment to end_of_shift (except maintenance)
    const { data: updatedEquipment, error: updateError } = await supabase
      .from("equipment")
      .update({
        stop_reason: "end_of_shift",
        stop_start_time: now,
        driver: "",
        helper: "",
      })
      .neq("stop_reason", "end_of_shift")
      .neq("stop_reason", "maintenance")
      .select();

    if (updateError) {
      console.error("Error updating equipment:", updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedEquipment?.length || 0} equipment to end_of_shift`);

    // Log each equipment that was updated for history tracking
    for (const eq of activeEquipment) {
      // Only create history record if equipment was actually active (had a driver or was operating)
      if (eq.stop_reason !== "end_of_shift") {
        const { error: historyError } = await supabase
          .from("equipment_stop_history")
          .insert({
            equipment_id: eq.id,
            stop_reason: "end_of_shift",
            started_at: now,
            changed_by_driver: "Sistema (Auto 17:00)",
          });

        if (historyError) {
          console.error(`Error creating history for equipment ${eq.id}:`, historyError);
        } else {
          console.log(`Created history record for equipment: ${eq.name} (${eq.plate})`);
        }
      }
    }

    // Also close any open stop history records
    const { error: closeHistoryError } = await supabase
      .from("equipment_stop_history")
      .update({
        ended_at: now,
        duration_minutes: 0, // Will be calculated by the system
      })
      .is("ended_at", null)
      .neq("stop_reason", "end_of_shift");

    if (closeHistoryError) {
      console.error("Error closing history records:", closeHistoryError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedEquipment?.length || 0} equipment to end_of_shift`,
        updated: updatedEquipment?.length || 0,
        equipment: activeEquipment.map((eq) => ({
          name: eq.name,
          plate: eq.plate,
          previousStatus: eq.stop_reason,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-end-shift:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
