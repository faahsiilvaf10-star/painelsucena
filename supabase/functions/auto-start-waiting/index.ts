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
    console.log("Starting auto-start-waiting job at:", new Date().toISOString());

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all Pipa and Munk equipment that is in "end_of_shift" status and has no driver
    // These should be set to "waiting" status at 07:00
    const { data: equipmentToUpdate, error: fetchError } = await supabase
      .from("equipment")
      .select("id, name, plate, stop_reason, driver, equipment_type")
      .in("equipment_type", ["pipa", "munk"])
      .or("stop_reason.eq.end_of_shift,stop_reason.is.null,stop_reason.eq.none")
      .or("driver.eq.,driver.is.null");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${equipmentToUpdate?.length || 0} equipment to set to waiting status`);

    if (!equipmentToUpdate || equipmentToUpdate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No equipment to update - all have drivers or are already waiting",
          updated: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const now = new Date().toISOString();

    // Update equipment to "waiting" status (awaiting driver to start shift)
    const { data: updatedEquipment, error: updateError } = await supabase
      .from("equipment")
      .update({
        stop_reason: "waiting",
        stop_start_time: now,
        driver: "",
        helper: "",
      })
      .in("equipment_type", ["pipa", "munk"])
      .or("stop_reason.eq.end_of_shift,stop_reason.is.null,stop_reason.eq.none")
      .or("driver.eq.,driver.is.null")
      .select();

    if (updateError) {
      console.error("Error updating equipment:", updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedEquipment?.length || 0} equipment to waiting status`);

    // Log each equipment that was updated for history tracking
    for (const eq of equipmentToUpdate) {
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: eq.id,
          stop_reason: "waiting",
          started_at: now,
          changed_by_driver: "Sistema (Auto 07:00)",
        });

      if (historyError) {
        console.error(`Error creating history for equipment ${eq.id}:`, historyError);
      } else {
        console.log(`Created history record for equipment: ${eq.name} (${eq.plate})`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedEquipment?.length || 0} equipment to waiting status`,
        updated: updatedEquipment?.length || 0,
        equipment: equipmentToUpdate.map((eq) => ({
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
    console.error("Error in auto-start-waiting:", error);
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
