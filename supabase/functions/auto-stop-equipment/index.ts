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
