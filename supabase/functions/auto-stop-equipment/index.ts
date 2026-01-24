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

    console.log("Starting auto-stop equipment job at", new Date().toISOString());

    // Get all equipment that is currently operating (not stopped)
    const { data: operatingEquipment, error: fetchError } = await supabase
      .from("equipment")
      .select("*")
      .eq("stop_reason", "none");

    if (fetchError) {
      console.error("Error fetching equipment:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${operatingEquipment?.length || 0} equipment still operating`);

    const endTime = new Date().toISOString();
    const results = [];

    for (const equipment of operatingEquipment || []) {
      // Calculate duration if there was a start time (shouldn't be for "none" but just in case)
      const startTime = equipment.stop_start_time || equipment.updated_at;
      const startedAt = new Date(startTime);
      const endedAt = new Date(endTime);
      const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000);

      // Create history entry for end of day
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: equipment.id,
          stop_reason: "end_of_day",
          started_at: endTime,
          ended_at: endTime,
          duration_minutes: 0,
        });

      if (historyError) {
        console.error(`Error creating history for ${equipment.name}:`, historyError);
      }

      // Update equipment to stopped state
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          stop_reason: "none",
          stop_start_time: null,
          updated_at: endTime,
        })
        .eq("id", equipment.id);

      if (updateError) {
        console.error(`Error updating ${equipment.name}:`, updateError);
      }

      results.push({
        equipment: equipment.name,
        success: !historyError && !updateError,
      });

      console.log(`Processed ${equipment.name}: ${!historyError && !updateError ? 'success' : 'failed'}`);
    }

    return new Response(
      JSON.stringify({
        message: "Auto-stop completed",
        processed: results.length,
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
