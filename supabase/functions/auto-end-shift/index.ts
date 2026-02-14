import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Only these equipment names should have auto end-of-shift
const ALLOWED_EQUIPMENT_NAMES = ["Sucena", "Toro"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting auto end-shift job at:", new Date().toISOString());

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only fetch Sucena and Toro equipment that are NOT already end_of_shift, maintenance, or any maintenance-related status
    const { data: activeEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select("id, name, plate, stop_reason, driver, equipment_type")
      .in("name", ALLOWED_EQUIPMENT_NAMES)
      .neq("stop_reason", "end_of_shift")
      .neq("stop_reason", "maintenance")
      .neq("stop_reason", "manutencao_corretiva")
      .neq("stop_reason", "manutencao_preventiva")
      .neq("stop_reason", "vistoria");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${activeEquipment?.length || 0} allowed equipment to update (Sucena/Toro)`);

    if (!activeEquipment || activeEquipment.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No Sucena/Toro equipment to update",
          updated: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const now = new Date().toISOString();
    const equipmentIds = activeEquipment.map((eq) => eq.id);

    // Update only Sucena and Toro to end_of_shift
    const { data: updatedEquipment, error: updateError } = await supabase
      .from("equipment")
      .update({
        stop_reason: "end_of_shift",
        stop_start_time: now,
        driver: "",
        helper: "",
      })
      .in("id", equipmentIds)
      .select();

    if (updateError) {
      console.error("Error updating equipment:", updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedEquipment?.length || 0} equipment to end_of_shift`);

    // Log history for each updated equipment
    for (const eq of activeEquipment) {
      // Close any open stop history records for this equipment
      await supabase
        .from("equipment_stop_history")
        .update({
          ended_at: now,
          duration_minutes: 0,
        })
        .eq("equipment_id", eq.id)
        .is("ended_at", null)
        .neq("stop_reason", "end_of_shift");

      // Create new end_of_shift history record
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: eq.id,
          stop_reason: "end_of_shift",
          started_at: now,
          changed_by_driver: "Sistema (Auto 19:00)",
        });

      if (historyError) {
        console.error(`Error creating history for ${eq.name}:`, historyError);
      } else {
        console.log(`Created history record for: ${eq.name} (${eq.plate})`);
      }
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
